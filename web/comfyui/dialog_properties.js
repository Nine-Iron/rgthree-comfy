import { RgthreeDialog } from "../../rgthree/common/dialog.js";
import { createElement as $el } from "../../rgthree/common/utils_dom.js";
import { redrawVueNodeWidgets } from "./utils_vue_nodes.js";
function getPropertyDefinition(node, key) {
    let ctor = node.constructor;
    while (ctor && ctor !== Object) {
        if (Object.prototype.hasOwnProperty.call(ctor, `@${key}`)) {
            return ctor[`@${key}`];
        }
        ctor = Object.getPrototypeOf(ctor);
    }
    return null;
}
export class RgthreePropertiesDialog extends RgthreeDialog {
    constructor(node) {
        const content = $el("div.rgthree-properties-dialog-content");
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
        this.fields = [];
        this.node = node;
        const table = $el("table.rgthree-properties-table", { parent: content });
        this.titleInput = $el("textarea", {
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
    addRow(table, label, input) {
        const tr = $el("tr", { parent: table });
        $el("th", { parent: tr, text: label });
        $el("td", { parent: tr, child: input });
    }
    createField(key, value) {
        const def = getPropertyDefinition(this.node, key);
        let type = def === null || def === void 0 ? void 0 : def.type;
        if (!type) {
            if (typeof value === "boolean")
                type = "boolean";
            else if (typeof value === "number")
                type = "number";
            else if (typeof value === "string" || value == null)
                type = "string";
            else
                return null;
        }
        let input;
        if (type === "combo") {
            const select = $el("select");
            const values = [...((def === null || def === void 0 ? void 0 : def.values) || [])];
            if (value != null && !values.includes(String(value))) {
                values.unshift(String(value));
            }
            for (const option of values) {
                $el("option", { parent: select, text: option, value: option });
            }
            select.value = String(value !== null && value !== void 0 ? value : "");
            input = select;
        }
        else if (type === "boolean") {
            input = $el("input", { type: "checkbox" });
            input.checked = !!value;
        }
        else if (type === "number") {
            input = $el("input", { type: "number", step: "any" });
            input.value = value == null ? "" : String(value);
        }
        else {
            input = $el("input", { type: "text" });
            input.value = value == null ? "" : String(value);
        }
        return { key, type, values: def === null || def === void 0 ? void 0 : def.values, input };
    }
    getFieldValue(field) {
        const input = field.input;
        if (field.type === "boolean")
            return input.checked;
        if (field.type === "number") {
            const num = Number(input.value);
            return input.value === "" || isNaN(num) ? this.node.properties[field.key] : num;
        }
        return input.value;
    }
    save() {
        const node = this.node;
        if (this.titleInput.value !== node.title) {
            node.title = this.titleInput.value;
        }
        for (const field of this.fields) {
            const value = this.getFieldValue(field);
            if (value !== node.properties[field.key]) {
                node.setProperty(field.key, value);
            }
        }
        node.setDirtyCanvas(true, true);
        redrawVueNodeWidgets(node);
    }
}
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
export function showPropertiesDialog(node) {
    return new RgthreePropertiesDialog(node).show();
}
