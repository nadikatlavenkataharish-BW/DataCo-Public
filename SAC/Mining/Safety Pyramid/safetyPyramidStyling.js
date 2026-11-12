/*!
 * Safety Pyramid — SAC custom widget (styling)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Safety Pyramid — styling (Builder) panel (v0.1)
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
      "rateBase": {
          "label": "Rate base (hours)",
          "kind": "number",
          "step": "1"
      },
      "ltiLevels": {
          "label": "LTIFR levels (e.g. 1-2)",
          "kind": "text"
      },
      "trifrLevels": {
          "label": "TRIFR levels (e.g. 1-3)",
          "kind": "text"
      },
      "ltifrTarget": {
          "label": "LTIFR target",
          "kind": "number",
          "step": "any"
      },
      "trifrTarget": {
          "label": "TRIFR target",
          "kind": "number",
          "step": "any"
      },
      "showRatio": {
          "label": "Ratio line",
          "kind": "check"
      },
      "showRates": {
          "label": "Rate tiles",
          "kind": "check"
      },
      "levelColors": {
          "label": "Level colours (hex list)",
          "kind": "text"
      }
  };

  var GROUPS = [["Labels", ["title", "subtitle"]], ["Rates", ["rateBase", "ltiLevels", "trifrLevels", "ltifrTarget", "trifrTarget"]], ["Display", ["showRatio", "showRates", "levelColors"]]];

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

  class SafetyPyramidStyling extends HTMLElement {
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

  customElements.define("com-dataco-sac-safetypyramid-styling", SafetyPyramidStyling);
})();
