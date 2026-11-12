/*!
 * Calendar Heatmap — SAC custom widget (styling)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Driver Tree — styling (Builder) panel (v0.1)
 * ========================================================================== */

(function () {
  "use strict";

  var FIELDS = {
      "title": {
          "label": "Title",
          "kind": "text"
      },
      "subtitle": {
          "label": "Subtitle",
          "kind": "text"
      },
      "nodeFormats": {
          "label": "Node formats (Name:pct|ratio|number,…)",
          "kind": "text"
      },
      "lowerIsBetter": {
          "label": "Lower-is-better nodes (comma list)",
          "kind": "text"
      },
      "tolerance": {
          "label": "Green within (%)",
          "kind": "number",
          "step": "any"
      },
      "warnTolerance": {
          "label": "Amber within (%)",
          "kind": "number",
          "step": "any"
      },
      "nodeWidth": {
          "label": "Node width (px)",
          "kind": "number",
          "step": "1"
      },
      "nodeHeight": {
          "label": "Node height (px)",
          "kind": "number",
          "step": "1"
      },
      "currency": {
          "label": "Currency",
          "kind": "select",
          "options": [
              "ZAR",
              "USD",
              "custom"
          ]
      },
      "currencySymbol": {
          "label": "Custom symbol",
          "kind": "text"
      },
      "valueScale": {
          "label": "Number scale",
          "kind": "select",
          "options": [
              "auto",
              "none",
              "K",
              "M",
              "B"
          ]
      },
      "decimals": {
          "label": "Decimals",
          "kind": "number",
          "step": "1"
      },
      "goodColor": {
          "label": "On/above plan",
          "kind": "color"
      },
      "amberColor": {
          "label": "Warning",
          "kind": "color"
      },
      "badColor": {
          "label": "Below plan",
          "kind": "color"
      },
      "lineColor": {
          "label": "Connectors",
          "kind": "color"
      }
  };

  var GROUPS = [["Labels", ["title", "subtitle"]], ["Logic", ["nodeFormats", "lowerIsBetter", "tolerance", "warnTolerance"]], ["Layout", ["nodeWidth", "nodeHeight"]], ["Currency & numbers", ["currency", "currencySymbol", "valueScale", "decimals"]], ["Colours", ["goodColor", "amberColor", "badColor", "lineColor"]]];

  function fieldMarkup(id) {
    var f = FIELDS[id], lab = '<label for="' + id + '">' + f.label + '</label>';
    if (f.kind === "select") {
      var opts = f.options.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join("");
      return '<div class="row">' + lab + '<select id="' + id + '">' + opts + '</select></div>';
    }
    if (f.kind === "check") return '<div class="row">' + lab + '<input id="' + id + '" type="checkbox" /></div>';
    var type = f.kind === "color" ? "color" : (f.kind === "number" ? "number" : "text");
    var step = f.step ? ' step="' + f.step + '"' : "";
    return '<div class="row">' + lab + '<input id="' + id + '" type="' + type + '"' + step + ' /></div>';
  }

  var body = GROUPS.map(function (g) {
    return '<h4>' + g[0] + '</h4>' + g[1].map(fieldMarkup).join("");
  }).join("");

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; font-size:13px; color:#33414A; }' +
    '  .grp { padding:6px 2px; }' +
    '  .row { display:flex; align-items:center; justify-content:space-between; margin:6px 0; gap:8px; }' +
    '  .row label { color:#556; }' +
    '  .row input[type=text], .row input[type=number], .row select { width:130px; }' +
    '  .row input[type=color] { width:44px; height:24px; padding:0; border:1px solid #C4CDD5; }' +
    '  h4 { margin:10px 0 2px; font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:#8794A0; }' +
    '</style>' +
    '<div class="grp">' + body + '</div>';

  class DriverTreeStyling extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
      var self = this;
      Object.keys(FIELDS).forEach(function (id) {
        var el = self._shadowRoot.getElementById(id);
        var evt = FIELDS[id].kind === "text" ? "input" : "change";
        el.addEventListener(evt, function () { self._emit(id); });
      });
    }

    _read(id) {
      var f = FIELDS[id], el = this._shadowRoot.getElementById(id);
      if (f.kind === "check") return el.checked;
      if (f.kind === "number") return el.value === "" ? undefined : Number(el.value);
      return el.value;
    }

    _emit(id) {
      var properties = {};
      properties[id] = this._read(id);
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: properties } }));
    }

    onCustomWidgetBeforeUpdate(changedProps) {
      this._props = Object.assign({}, this._props, changedProps);
      var self = this;
      Object.keys(FIELDS).forEach(function (id) {
        if (!(id in changedProps)) return;
        var el = self._shadowRoot.getElementById(id);
        if (FIELDS[id].kind === "check") el.checked = !!changedProps[id];
        else el.value = changedProps[id] == null ? "" : changedProps[id];
      });
    }
  }

  customElements.define("com-dataco-sac-drivertree-styling", DriverTreeStyling);
})();
