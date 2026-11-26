import { app } from "../../scripts/app.js";
import { RgthreeBaseVirtualNode } from "./base_node.js";
import { NodeTypesString } from "./constants.js";
import { rgthree } from "./rgthree.js";
import { RgthreeBaseWidget } from "./utils_widgets.js";
import { isVueNodesMode } from "./utils_vue_nodes.js";
let measureCtx = null;
class LabelVueWidget extends RgthreeBaseWidget {
    constructor() {
        super("rgthree_label");
        this.type = "custom";
        this.options = { serialize: false };
        this.serialize = false;
        this.value = "";
        this.labelNode = null;
    }
    draw(ctx, node, width, posY) {
        if (!isVueNodesMode())
            return;
        node.drawLabel(ctx, 0, posY);
    }
    computeSize(width) {
        if (!isVueNodesMode() || !this.labelNode)
            return [0, 0];
        measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
        return measureCtx ? this.labelNode.measureLabel(measureCtx) : [0, 0];
    }
}
export class Label extends RgthreeBaseVirtualNode {
    constructor(title = Label.title) {
        super(title);
        this.comfyClass = NodeTypesString.LABEL;
        this.resizable = false;
        this.properties["fontSize"] = 12;
        this.properties["fontFamily"] = "Arial";
        this.properties["fontColor"] = "#ffffff";
        this.properties["textAlign"] = "left";
        this.properties["backgroundColor"] = "transparent";
        this.properties["padding"] = 0;
        this.properties["borderRadius"] = 0;
        this.properties["angle"] = 0;
        this.color = "#fff0";
        this.bgcolor = "#fff0";
        const vueWidget = new LabelVueWidget();
        vueWidget.labelNode = this;
        this.addCustomWidget(vueWidget);
        this.onConstructed();
    }
    draw(ctx) {
        this.flags = this.flags || {};
        this.flags.allow_interaction = !this.flags.pinned;
        this.color = "#fff0";
        this.bgcolor = "#fff0";
        const [width, height] = this.measureLabel(ctx);
        this.size[0] = width;
        this.size[1] = height;
        this.drawLabel(ctx, 0, 0);
    }
    setLabelFont(ctx) {
        var _a;
        ctx.font = `${Math.max(this.getPropNumber("fontSize", 0), 1)}px ${(_a = this.properties["fontFamily"]) !== null && _a !== void 0 ? _a : "Arial"}`;
    }
    getLabelLines() {
        var _a;
        const processedTitle = ((_a = this.title) !== null && _a !== void 0 ? _a : "").replace(/\\n/g, "\n").replace(/\n*$/, "");
        return processedTitle.split("\n");
    }
    measureLabel(ctx) {
        ctx.save();
        this.setLabelFont(ctx);
        const padding = Number(this.properties["padding"]) || 0;
        const lines = this.getLabelLines();
        const maxWidth = Math.max(...lines.map((s) => ctx.measureText(s).width));
        ctx.restore();
        return [
            maxWidth + padding * 2,
            this.getPropNumber("fontSize", 1) * lines.length + padding * 2,
        ];
    }
    drawLabel(ctx, x, y) {
        var _a;
        const [width, height] = this.measureLabel(ctx);
        ctx.save();
        ctx.translate(x, y);
        const fontColor = this.getPropString("fontColor", "#ffffff");
        const backgroundColor = this.getPropString("backgroundColor", "");
        this.setLabelFont(ctx);
        const padding = Number(this.properties["padding"]) || 0;
        const lines = this.getLabelLines();
        const angleDeg = parseInt(String((_a = this.properties["angle"]) !== null && _a !== void 0 ? _a : 0)) || 0;
        if (angleDeg) {
            const cx = width / 2;
            const cy = height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((angleDeg * Math.PI) / 180);
            ctx.translate(-cx, -cy);
        }
        if (backgroundColor) {
            ctx.beginPath();
            const borderRadius = Number(this.properties["borderRadius"]) || 0;
            ctx.roundRect(0, 0, width, height, [borderRadius]);
            ctx.fillStyle = backgroundColor;
            ctx.fill();
        }
        ctx.textAlign = "left";
        let textX = padding;
        if (this.properties["textAlign"] === "center") {
            ctx.textAlign = "center";
            textX = width / 2;
        }
        else if (this.properties["textAlign"] === "right") {
            ctx.textAlign = "right";
            textX = width - padding;
        }
        ctx.textBaseline = "top";
        ctx.fillStyle = fontColor;
        let currentY = padding;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i] || " ", textX, currentY);
            currentY += this.getPropNumber("fontSize", 1);
        }
        ctx.restore();
    }
    onDblClick(event, pos, canvas) {
        LGraphCanvas.active_canvas.showShowNodePanel(this);
    }
    onShowCustomPanelInfo(panel) {
        var _a, _b;
        (_a = panel.querySelector('div.property[data-property="Mode"]')) === null || _a === void 0 ? void 0 : _a.remove();
        (_b = panel.querySelector('div.property[data-property="Color"]')) === null || _b === void 0 ? void 0 : _b.remove();
    }
    inResizeCorner(x, y) {
        var _a;
        return (_a = this.resizable) !== null && _a !== void 0 ? _a : true;
    }
    getHelp() {
        return `
      <p>
        The rgthree-comfy ${this.type.replace("(rgthree)", "")} node allows you to add a floating
        label to your workflow.
      </p>
      <p>
        The text shown is the "Title" of the node and you can adjust the the font size, font family,
        font color, text alignment as well as a background color, padding, and background border
        radius from the node's properties. You can double-click the node to open the properties
        panel (or, with ComfyUI's Nodes 2.0, choose "⚙️ Properties" from the right-click menu).
      <p>
      <ul>
        <li>
          <p>
            <strong>Pro tip #1:</strong> You can add multiline text from the properties panel
            <i>(because ComfyUI let's you shift + enter there, only)</i>, or the "Title" field of
            the "⚙️ Properties" dialog in Nodes 2.0.
          </p>
        </li>
        <li>
          <p>
            <strong>Pro tip #2:</strong> You can use ComfyUI's native "pin" option in the
            right-click menu to make the label stick to the workflow and clicks to "go through".
            You can right-click at any time to unpin.
          </p>
        </li>
        <li>
          <p>
            <strong>Pro tip #3:</strong> Color values are hexidecimal strings, like "#FFFFFF" for
            white, or "#660000" for dark red. You can supply a 7th & 8th value (or 5th if using
            shorthand) to create a transluscent color. For instance, "#FFFFFF88" is semi-transparent
            white.
          </p>
        </li>
      </ul>`;
    }
}
Label.type = NodeTypesString.LABEL;
Label.title = NodeTypesString.LABEL;
Label.title_mode = LiteGraph.NO_TITLE;
Label.collapsable = false;
Label["@fontSize"] = { type: "number" };
Label["@fontFamily"] = { type: "string" };
Label["@fontColor"] = { type: "string" };
Label["@textAlign"] = { type: "combo", values: ["left", "center", "right"] };
Label["@backgroundColor"] = { type: "string" };
Label["@padding"] = { type: "number" };
Label["@borderRadius"] = { type: "number" };
Label["@angle"] = { type: "number" };
const oldDrawNode = LGraphCanvas.prototype.drawNode;
LGraphCanvas.prototype.drawNode = function (node, ctx) {
    if (node.constructor === Label.prototype.constructor) {
        node.bgcolor = "transparent";
        node.color = "transparent";
        const v = oldDrawNode.apply(this, arguments);
        node.draw(ctx);
        return v;
    }
    const v = oldDrawNode.apply(this, arguments);
    return v;
};
const oldGetNodeOnPos = LGraph.prototype.getNodeOnPos;
LGraph.prototype.getNodeOnPos = function (x, y, nodes_list) {
    var _a, _b;
    if (nodes_list &&
        rgthree.processingMouseDown &&
        ((_a = rgthree.lastCanvasMouseEvent) === null || _a === void 0 ? void 0 : _a.type.includes("down")) &&
        ((_b = rgthree.lastCanvasMouseEvent) === null || _b === void 0 ? void 0 : _b.which) === 1) {
        let isDoubleClick = LiteGraph.getTime() - LGraphCanvas.active_canvas.last_mouseclick < 300;
        if (!isDoubleClick) {
            nodes_list = [...nodes_list].filter((n) => { var _a; return !(n instanceof Label) || !((_a = n.flags) === null || _a === void 0 ? void 0 : _a.pinned); });
        }
    }
    return oldGetNodeOnPos.apply(this, [x, y, nodes_list]);
};
app.registerExtension({
    name: "rgthree.Label",
    registerCustomNodes() {
        Label.setUp();
    },
});
