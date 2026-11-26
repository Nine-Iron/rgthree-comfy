import { app } from "../../scripts/app.js";
export function isVueNodesMode() {
    return !!LiteGraph.vueNodesMode;
}
export function redrawVueNodeWidgets(node) {
    var _a, _b;
    if (!node || !isVueNodesMode())
        return;
    for (const widget of node.widgets || []) {
        (_b = (_a = widget).triggerDraw) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
}
let pendingRedraw = false;
export function scheduleVueWidgetsRedraw() {
    if (pendingRedraw || !isVueNodesMode())
        return;
    pendingRedraw = true;
    requestAnimationFrame(() => {
        var _a, _b, _c;
        var _d;
        pendingRedraw = false;
        const graph = (_d = (_b = (_a = app.canvas) === null || _a === void 0 ? void 0 : _a.getCurrentGraph) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _d !== void 0 ? _d : app.graph;
        for (const node of ((graph === null || graph === void 0 ? void 0 : graph.nodes) || [])) {
            if ((_c = node.widgets) === null || _c === void 0 ? void 0 : _c.some((w) => w.isRgthreeCanvasWidget)) {
                redrawVueNodeWidgets(node);
            }
        }
    });
}
export function getVueWidgetLocalPos(event, el) {
    if (!el)
        return null;
    const rect = el.getBoundingClientRect();
    const cssWidth = el.offsetWidth || rect.width;
    const scale = cssWidth ? rect.width / cssWidth : 1;
    return [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale];
}
let initialized = false;
export function initVueNodesSupport() {
    if (initialized)
        return;
    initialized = true;
    const setDirty = LGraphCanvas.prototype.setDirty;
    LGraphCanvas.prototype.setDirty = function (fgcanvas, bgcanvas) {
        const returnValue = setDirty.apply(this, [...arguments]);
        if (fgcanvas && isVueNodesMode() && !this.dragging_canvas) {
            scheduleVueWidgetsRedraw();
        }
        return returnValue;
    };
}
export function addVueOnlyBadge(node, getText, options = {}) {
    const LGraphBadge = window.LGraphBadge;
    if (!LGraphBadge || !Array.isArray(node.badges))
        return;
    node.badges.push(() => new LGraphBadge({ text: isVueNodesMode() ? getText() : "", ...options }));
}
