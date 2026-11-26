import type {LGraphNode} from "@comfyorg/frontend";

import {RgthreeDialog} from "rgthree/common/dialog.js";
import {createElement as $el} from "rgthree/common/utils_dom.js";
import {redrawVueNodeWidgets} from "./utils_vue_nodes.js";

/** A LiteGraph-style property definition, as defined with a static "@propName" on a node class. */
type PropertyDefinition = {
  type?: "combo" | "boolean" | "number" | "string" | string;
  values?: string[];
};

type PropertyField = {
  key: string;
  type: "combo" | "boolean" | "number" | "string";
  values?: string[];
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

/**
 * Gets the "@propName" property definition for a node by looking up the class hierarchy, the same
 * way LiteGraph's own Properties Panel does.
 */
function getPropertyDefinition(node: LGraphNode, key: string): PropertyDefinition | null {
  let ctor = node.constructor as any;
  while (ctor && ctor !== Object) {
    if (Object.prototype.hasOwnProperty.call(ctor, `@${key}`)) {
      return ctor[`@${key}`] as PropertyDefinition;
    }
    ctor = Object.getPrototypeOf(ctor);
  }
  return null;
}

/**
 * A dialog to edit a node's properties. ComfyUI's Nodes 2.0 removes LiteGraph's "Properties" and
 * "Properties Panel" menu items, which are the only way to change many rgthree node settings, so we
 * provide our own (in both rendering modes, for consistency).
 *
 * Values are set with `node.setProperty` so the node's `onPropertyChanged` handlers still fire.
 */
export class RgthreePropertiesDialog extends RgthreeDialog {
  private readonly node: LGraphNode;
  private readonly fields: PropertyField[] = [];
  private readonly titleInput: HTMLTextAreaElement;

  constructor(node: LGraphNode) {
    const content = $el<HTMLDivElement>("div.rgthree-properties-dialog-content");
    super({
      class: "rgthree-properties-dialog",
      title: `<h2>Properties: ${escapeHtml(node.title || String(node.type || ""))}</h2>`,
      content,
      closeX: true,
      closeOnEsc: true,
      closeButtonLabel: "Cancel",
      buttons: [
        {
          label: "Save",
          className: "rgthree-button -blue",
          callback: () => {
            this.save();
            this.close();
          },
        },
      ],
    });
    this.node = node;

    const table = $el<HTMLTableElement>("table.rgthree-properties-table", {parent: content});

    // The title, which is multiline for nodes like Label.
    this.titleInput = $el<HTMLTextAreaElement>("textarea", {
      rows: Math.max(1, String(node.title || "").split("\n").length),
    });
    this.titleInput.value = node.title || "";
    this.addRow(table, "Title", this.titleInput);

    for (const [key, value] of Object.entries(node.properties || {})) {
      const field = this.createField(key, value);
      if (field) {
        this.fields.push(field);
        this.addRow(table, key, field.input);
      }
    }
  }

  private addRow(table: HTMLTableElement, label: string, input: HTMLElement) {
    const tr = $el("tr", {parent: table});
    $el("th", {parent: tr, text: label});
    $el("td", {parent: tr, child: input});
  }

  private createField(key: string, value: unknown): PropertyField | null {
    const def = getPropertyDefinition(this.node, key);
    let type = def?.type as PropertyField["type"] | undefined;
    if (!type) {
      if (typeof value === "boolean") type = "boolean";
      else if (typeof value === "number") type = "number";
      else if (typeof value === "string" || value == null) type = "string";
      // Non-primitive properties (like sizes) aren't meant to be edited by hand.
      else return null;
    }

    let input: PropertyField["input"];
    if (type === "combo") {
      const select = $el<HTMLSelectElement>("select");
      const values = [...(def?.values || [])];
      if (value != null && !values.includes(String(value))) {
        values.unshift(String(value));
      }
      for (const option of values) {
        $el("option", {parent: select, text: option, value: option});
      }
      select.value = String(value ?? "");
      input = select;
    } else if (type === "boolean") {
      input = $el<HTMLInputElement>("input", {type: "checkbox"});
      input.checked = !!value;
    } else if (type === "number") {
      input = $el<HTMLInputElement>("input", {type: "number", step: "any"});
      input.value = value == null ? "" : String(value);
    } else {
      input = $el<HTMLInputElement>("input", {type: "text"});
      input.value = value == null ? "" : String(value);
    }
    return {key, type, values: def?.values, input};
  }

  private getFieldValue(field: PropertyField) {
    const input = field.input as HTMLInputElement;
    if (field.type === "boolean") return input.checked;
    if (field.type === "number") {
      const num = Number(input.value);
      return input.value === "" || isNaN(num) ? this.node.properties[field.key] : num;
    }
    return input.value;
  }

  private save() {
    const node = this.node;
    if (this.titleInput.value !== node.title) {
      node.title = this.titleInput.value;
    }
    for (const field of this.fields) {
      const value = this.getFieldValue(field);
      if (value !== node.properties[field.key]) {
        node.setProperty(field.key, value as any);
      }
    }
    node.setDirtyCanvas(true, true);
    redrawVueNodeWidgets(node);
  }
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Shows the properties dialog for a node. */
export function showPropertiesDialog(node: LGraphNode) {
  return new RgthreePropertiesDialog(node).show();
}
