/*!
 * Variance KPI Tile — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Variance KPI Tile — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Variance KPI Tile — canonical renderer (v0.1)
 * Pure function, no DOM / no libraries. Shared by the SAC widget and preview.
 *
 * input : { actual, plan, py, labels:{actual,plan,py},
 *           series:[{label, actual, plan}] }      // series optional (sparkline)
 * opts  : see kpiDefaults()
 * ========================================================================== */
function kpiDefaults(){
  return {
    title: "", subtitle: "",
    valueScale: "auto", decimals: 1, prefix: "", suffix: "",
    aggregation: "sum",            // sum | last  (how to collapse rows when a period dimension is bound)
    invertSign: false,             // true for cost measures (below plan = good)
    showPlan: true, showPY: true, showSparkline: true,
    goodColor: "#1A9850", badColor: "#D73027",
    lineColor: "#0A6ED1", planLineColor: "#8794A0",
    inkColor: "#33414A", mutedColor: "#8794A0", bgColor: "#FFFFFF",
    width: 320, height: 180
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var kpi_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function kpi_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function kpi_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function kpi_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function kpi_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function kpi_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function kpi_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function kpi_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function kpi_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+kpi_FONT+'" font-size="13" fill="#8794A0">'+kpi_esc(text)+'</text></svg>';
}
function kpi_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+kpi_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+kpi_esc(o.subtitle)+'</text>';
  return s;
}
function kpi_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function kpi_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return kpi_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return kpi_fmt(v,scale,2,prefix,"");});
}

function kpiChip(x, y, label, actual, base, o){
  var d = (actual!=null && base!=null) ? actual-base : null;
  var p = kpi_varPct(actual, base);
  var good = d==null ? null : kpi_good(d, o.invertSign);
  var col = good==null ? o.mutedColor : (good ? o.goodColor : o.badColor);
  var arrow = d==null ? "" : (d>=0 ? "▲" : "▼");
  return '<text x="'+x+'" y="'+y+'" font-size="11" fill="'+o.mutedColor+'">'+kpi_esc(label)+'</text>'+
    '<text x="'+x+'" y="'+(y+18)+'" font-size="13" font-weight="700" fill="'+col+'">'+arrow+' '+kpi_pct(p,1)+'</text>'+
    '<text x="'+x+'" y="'+(y+34)+'" font-size="11" fill="'+col+'">'+(d==null?"":(d>=0?"+":""))+kpi_fmt(d,o.valueScale,o.decimals,o.prefix,o.suffix)+'</text>';
}
function buildKpiSVG(input, opts){
  var o = Object.assign(kpiDefaults(), opts||{});
  var W = Math.max(200, +o.width||320), H = Math.max(120, +o.height||180);
  if(!input || input.actual==null) return kpi_msg(W,H,"Bind Actual (and optionally Plan, Prior Year).");
  var L = input.labels||{};
  var title = o.title || L.actual || "Actual";
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+kpi_FONT+'" preserveAspectRatio="xMidYMid meet">';
  s += '<rect x="0.5" y="0.5" width="'+(W-1)+'" height="'+(H-1)+'" rx="10" fill="'+o.bgColor+'" stroke="#E3E8ED"/>';
  s += '<text x="16" y="26" font-size="13" font-weight="600" fill="'+o.mutedColor+'">'+kpi_esc(kpi_trunc(title,40))+'</text>';
  if(o.subtitle) s += '<text x="'+(W-16)+'" y="26" text-anchor="end" font-size="11" fill="'+o.mutedColor+'">'+kpi_esc(o.subtitle)+'</text>';
  var big = Math.min(40, Math.max(22, H*0.2));
  s += '<text x="16" y="'+(34+big)+'" font-size="'+big+'" font-weight="700" fill="'+o.inkColor+'">'+kpi_fmt(input.actual,o.valueScale,o.decimals,o.prefix,o.suffix)+'</text>';
  var chipY = 34+big+20, cx = 16;
  if(o.showPlan && input.plan!=null){ s += kpiChip(cx, chipY, "vs "+(L.plan||"Plan"), input.actual, input.plan, o); cx += 110; }
  if(o.showPY && input.py!=null){ s += kpiChip(cx, chipY, "vs "+(L.py||"Prior Year"), input.actual, input.py, o); cx += 110; }
  var ser = (input.series||[]).filter(function(r){return r.actual!=null;});
  if(o.showSparkline && ser.length>1){
    var sx0 = Math.max(cx+8, W*0.55), sx1 = W-16, sy0 = chipY-4, sy1 = Math.min(H-14, chipY+36);
    if(sx1-sx0 > 50){
      var vals=[]; ser.forEach(function(r){vals.push(r.actual); if(r.plan!=null) vals.push(r.plan);});
      var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals); if(mx===mn){mx+=1;mn-=1;}
      var X=function(i){return sx0+(sx1-sx0)*i/(ser.length-1);}, Y=function(v){return sy1-(sy1-sy0)*(v-mn)/(mx-mn);};
      var pa=ser.map(function(r,i){return (i?"L":"M")+X(i).toFixed(1)+" "+Y(r.actual).toFixed(1);}).join("");
      var hasPlan = ser.every(function(r){return r.plan!=null;});
      if(hasPlan){ var pp=ser.map(function(r,i){return (i?"L":"M")+X(i).toFixed(1)+" "+Y(r.plan).toFixed(1);}).join("");
        s += '<path d="'+pp+'" fill="none" stroke="'+o.planLineColor+'" stroke-width="1.5" stroke-dasharray="4 3"/>'; }
      s += '<path d="'+pa+'" fill="none" stroke="'+o.lineColor+'" stroke-width="2" stroke-linejoin="round"/>';
      var li=ser.length-1; s += '<circle cx="'+X(li).toFixed(1)+'" cy="'+Y(ser[li].actual).toFixed(1)+'" r="3" fill="'+o.lineColor+'"/>';
      s += '<text x="'+sx0+'" y="'+(sy1+12)+'" font-size="9" fill="'+o.mutedColor+'">'+kpi_esc(kpi_trunc(ser[0].label,12))+'</text>';
      s += '<text x="'+sx1+'" y="'+(sy1+12)+'" text-anchor="end" font-size="9" fill="'+o.mutedColor+'">'+kpi_esc(kpi_trunc(ser[li].label,12))+'</text>';
    }
  }
  return s + '</svg>';
}
/* collapse rows -> tile input (used by the SAC adapter and the preview) */
function kpiCollapse(rows, labels, aggregation){
  function agg(f){ var v=rows.map(function(r){return r[f];}).filter(function(x){return x!=null;});
    if(!v.length) return null; return aggregation==="last" ? v[v.length-1] : v.reduce(function(a,b){return a+b;},0); }
  return { actual: agg("actual"), plan: agg("plan"), py: agg("py"), labels: labels||{}, series: rows };
}

  /* ----- SAC data-binding helpers ----------------------------------------- */
  function sacMeta(binding) {
    var md = binding.metadata || {}, feeds = md.feeds || {};
    var dMap = md.dimensions || {}, mMap = md.mainStructureMembers || {};
    var dKeys = (feeds.dimensions && feeds.dimensions.values) || Object.keys(dMap);
    var mKeys = (feeds.measures && feeds.measures.values) || Object.keys(mMap);
    return {
      dims: dKeys.filter(function (k) { return dMap[k]; }).map(function (k) { return { key: k, label: dMap[k].description || dMap[k].id || k }; }),
      meas: mKeys.filter(function (k) { return mMap[k]; }).map(function (k) { return { key: k, label: mMap[k].label || mMap[k].id || k }; })
    };
  }
  function sacVal(row, key) { var c = row[key]; if (!c) return null; var v = Number(c.raw); return isFinite(v) ? v : null; }
  function sacLab(row, key) { var c = row[key]; if (!c) return ""; return c.label || c.description || c.id || ""; }
  /* skip hierarchy result/total nodes so they are not double-counted */
  function sacIsTotal(row, dims) {
    for (var i = 0; i < dims.length; i++) { var c = row[dims[i].key]; if (c && c.isTotal) return true; }
    return false;
  }

  function buildInput(b, props) {
    var m = sacMeta(b); if (!m.meas.length) return null;
    var k = m.meas.map(function (x) { return x.key; });
    var labels = { actual: m.meas[0].label, plan: m.meas[1] && m.meas[1].label, py: m.meas[2] && m.meas[2].label };
    var rows = (b.data || []).filter(function (r) { return !sacIsTotal(r, m.dims); }).map(function (r) {
      return { label: m.dims.map(function (d) { return sacLab(r, d.key); }).join(" / "),
               actual: sacVal(r, k[0]), plan: k[1] ? sacVal(r, k[1]) : null, py: k[2] ? sacVal(r, k[2]) : null };
    });
    return kpiCollapse(rows, labels, props.aggregation);
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class VarianceKpiTile extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById("root");
      this._props = {};
    }

    onCustomWidgetBeforeUpdate(changedProps) { this._props = Object.assign({}, this._props, changedProps); }
    onCustomWidgetAfterUpdate() { this.render(); }
    onCustomWidgetResize() { this.render(); }
    onCustomWidgetDestroy() { this._root.innerHTML = ""; }

    render() {
      if (!document.contains(this)) { setTimeout(this.render.bind(this), 0); return; }
      var opts = Object.assign({}, this._props, {
        width: this.clientWidth || this._props.width, height: this.clientHeight || this._props.height });
      var binding = this.dataBinding;
      if (!binding || binding.state !== "success") {
        this._root.innerHTML = kpi_msg(opts.width || 400, opts.height || 200, "Bind at least an Actual measure.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildKpiSVG(input, opts) : kpi_msg(opts.width || 400, opts.height || 200, "Bind at least an Actual measure.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-variancekpitile", VarianceKpiTile);
})();
