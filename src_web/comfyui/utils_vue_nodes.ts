/**
 * Support for ComfyUI's "Nodes 2.0" (Vue nodes) rendering.
 *
 * How the ComfyUI frontend (verified against v1.60) behaves when Nodes 2.0 is enabled, and what
 * rgthree-comfy relies on from it:
 *
 *  - `LiteGraph.vueNodesMode` mirrors the `Comfy.VueNodes.Enabled` setting. It is toggled live,
 *    without re-creating nodes, so it must always be checked at call time and never cached.
 *  - LiteGraph skips drawing node bodies entirely, so node `onDrawForeground`/`onDrawBackground`
 *    are not called. Node-level `onMouseDown`/`onMouseEnter`/`onMouseMove`/`onDblClick` are not
 *    called either; Vue owns node interaction.
 *  - Any non-DOM widget with a `draw()` method (all of our `RgthreeBaseWidget`s) is rendered by the
 *    frontend's `WidgetLegacy` component into its own small <canvas>:
 *      - `draw(ctx, node, width, 1, height)` is called with a widget-local y of 1 and the width of
 *        the widget's container (NOT `node.size[0]`).
 *      - Height is `computeLayoutSize(node).minHeight ?? computeSize(width)[1] ?? 20`.
 *      - It only redraws when `widget.triggerDraw()` is called (or on resize/palette change), not
 *        when the canvas is marked dirty.
 *      - `mouse()` receives widget-local positions for pointerdown and drags, but a node-relative
 *        graph-coordinate position for pointerup. Right-clicks also reach `mouse()`.
 *  - Slot positions are computed from the Vue DOM layout, so `getConnectionPos` overrides (our
 *    "Connections Layout" feature) are ignored.
 *  - The node context menu drops LiteGraph's "Properties" and "Properties Panel" items, but still
 *    includes items from `getExtraMenuOptions`.
 *  - `title_mode = NO_TITLE` is honored. Groups are still drawn on the LiteGraph canvas.
 */

import type {LGraphNode, IBaseWidget, Point} from "@comfyorg/frontend";

import {app} from "scripts/app.js";

/** Returns whether ComfyUI is currently rendering nodes with Nodes 2.0 (Vue nodes). */
export function isVueNodesMode(): boolean {
  return !!(LiteGraph as any).vueNodesMode;
}

/**
 * Calls the Nodes 2.0 `triggerDraw` on all widgets of the passed node. A no-op in classic mode, as
 * marking the canvas dirty is enough there.
 */
export function redrawVueNodeWidgets(node: LGraphNode | null | undefined) {
  if (!node || !isVueNodesMode()) return;
  for (const widget of node.widgets || []) {
    (widget as IBaseWidget).triggerDraw?.();
  }
}

let pendingRedraw = false;

/**
 * Redraws all canvas-drawn widgets on rgthree nodes in the current graph on the next frame.
 * Multiple calls in a single frame are coalesced.
 */
export function scheduleVueWidgetsRedraw() {
  if (pendingRedraw || !isVueNodesMode()) return;
  pendingRedraw = true;
  requestAnimationFrame(() => {
    pendingRedraw = false;
    const graph = app.canvas?.getCurrentGraph?.() ?? app.graph;
    for (const node of (graph?.nodes || []) as LGraphNode[]) {
      if (node.widgets?.some((w) => (w as any).isRgthreeCanvasWidget)) {
        redrawVueNodeWidgets(node);
      }
    }
  });
}

/**
 * Normalizes a pointer position passed to a widget's `mouse()` into widget-local coordinates when
 * in Nodes 2.0. `WidgetLegacy` passes widget-local coordinates for pointerdown and moves, but
 * node-relative graph coordinates on pointerup, so we compute it from the element instead.
 */
export function getVueWidgetLocalPos(event: PointerEvent, el: Element | null): Point | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const cssWidth = (el as HTMLElement).offsetWidth || rect.width;
  // The Vue node layer is CSS-transformed by the canvas zoom; undo it to get draw coordinates.
  const scale = cssWidth ? rect.width / cssWidth : 1;
  return [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale];
}

let initialized = false;

/** Sets up the global hooks needed for Nodes 2.0. Safe to call multiple times. */
export function initVueNodesSupport() {
  if (initialized) return;
  initialized = true;

  // Many rgthree features change widget state and then mark the canvas dirty, expecting the widget
  // to be redrawn. In Nodes 2.0 our widgets live in their own canvases that are only redrawn on
  // `triggerDraw`, so forward a dirty foreground to them.
  const setDirty = LGraphCanvas.prototype.setDirty;
  LGraphCanvas.prototype.setDirty = function (this: any, fgcanvas?: boolean, bgcanvas?: boolean) {
    const returnValue = setDirty.apply(this, [...arguments] as any);
    if (fgcanvas && isVueNodesMode() && !this.dragging_canvas) {
      scheduleVueWidgetsRedraw();
    }
    return returnValue;
  } as typeof setDirty;
}

/**
 * Adds a title badge to a node that only shows in Nodes 2.0, where node `onDrawForeground` isn't
 * called. Used to surface information we otherwise draw on the canvas. In classic mode the badge
 * has no text, which LiteGraph treats as invisible.
 */
export function addVueOnlyBadge(
  node: LGraphNode,
  getText: () => string,
  options: {fgColor?: string; bgColor?: string} = {},
) {
  const LGraphBadge = (window as any).LGraphBadge;
  if (!LGraphBadge || !Array.isArray((node as any).badges)) return;
  (node as any).badges.push(
    () => new LGraphBadge({text: isVueNodesMode() ? getText() : "", ...options}),
  );
}
