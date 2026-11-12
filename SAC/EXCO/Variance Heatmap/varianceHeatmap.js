/*!
 * Variance Heatmap — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Variance Heatmap — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Variance Heatmap — canonical renderer (v0.1)
 * Row dimension × column dimension grid, coloured by variance % (Actual vs Plan)
 * with RAG thresholds, or by a single measure value.
 *
 * input : { cells:[{row, col, actual, plan}], labels:{actual, plan, row, col} }
 * opts  : see vhtDefaults()
 * ========================================================================== */
function vhtDefaults(){
  return {
    title: "Variance Heatmap", subtitle: "Variance % vs plan",
    mode: "variancePct",             // variancePct | varianceAbs | value
    colorMode: "continuous",         // continuous | rag
    thresholdBad: -5, thresholdGood: 5,  // % — RAG cut-offs (and saturation point x2 for continuous)
    invertSign: false,
    showValues: true, showTotals: true,
    cellHeight: 30, labelWidth: 130,
    valueScale: "auto", decimals: 1, prefix: "", suffix: "",
    goodColor: "#1A9850", midColor: "#F7F7F2", badColor: "#D73027", amberColor: "#F4C542",
    emptyColor: "#EEF1F4", inkColor: "#33414A", mutedColor: "#8794A0",
    width: 900, height: 400
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var vht_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function vht_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function vht_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function vht_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function vht_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function vht_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function vht_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function vht_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function vht_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+vht_FONT+'" font-size="13" fill="#8794A0">'+vht_esc(text)+'</text></svg>';
}
function vht_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+vht_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+vht_esc(o.subtitle)+'</text>';
  return s;
}
function vht_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function vht_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return vht_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return vht_fmt(v,scale,2,prefix,"");});
}

function vht_rgb(h){ h=h.replace("#",""); return [0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16);}); }
function vht_mix(a,b,t){ var x=vht_rgb(a), y=vht_rgb(b); return "#"+x.map(function(v,i){var c=Math.round(v+(y[i]-v)*t).toString(16); return c.length<2?"0"+c:c;}).join(""); }
function vht_lum(h){ var c=vht_rgb(h); return (0.299*c[0]+0.587*c[1]+0.114*c[2])/255; }
function buildVarHeatSVG(input, opts){
  var o = Object.assign(vhtDefaults(), opts||{});
  var W = Math.max(320, +o.width||900);
  var cells = (input&&input.cells)||[];
  if(!cells.length) return vht_msg(W, Math.max(160,+o.height||400), "Bind row + column dimensions and Actual (+ Plan) measures.");
  var L = input.labels||{}, rows=[], cols=[], rIdx={}, cIdx={}, grid={};
  cells.forEach(function(c){
    if(!(c.row in rIdx)){ rIdx[c.row]=rows.length; rows.push(c.row); }
    if(!(c.col in cIdx)){ cIdx[c.col]=cols.length; cols.push(c.col); }
    var k=c.row+"\u0001"+c.col, g=grid[k]||(grid[k]={actual:0,plan:0,hasA:false,hasP:false});
    if(c.actual!=null){g.actual+=c.actual;g.hasA=true;} if(c.plan!=null){g.plan+=c.plan;g.hasP=true;}
  });
  var hasPlan = cells.some(function(c){return c.plan!=null;});
  var mode = hasPlan ? o.mode : "value";
  function metric(a,p,hasA,hasP){
    if(!hasA) return null;
    if(mode==="value") return a;
    if(!hasP) return null;
    return mode==="varianceAbs" ? a-p : vht_varPct(a,p);
  }
  function label(v){ if(v==null) return ""; return mode==="variancePct" ? vht_pct(v,o.decimals) : (mode==="varianceAbs"&&v>0?"+":"")+vht_fmt(v,o.valueScale,o.decimals,o.prefix,o.suffix); }
  // colour
  var vals=[]; Object.keys(grid).forEach(function(k){var g=grid[k], v=metric(g.actual,g.plan,g.hasA,g.hasP); if(v!=null) vals.push(v);});
  var absMax = Math.max.apply(null, vals.map(Math.abs).concat([1e-9]));
  var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
  function color(v){
    if(v==null) return o.emptyColor;
    if(mode==="value"){ var t = vmax>vmin ? (v-vmin)/(vmax-vmin) : .5; return vht_mix(o.midColor, "#0A6ED1", 0.08+0.82*t); }
    var signed = o.invertSign ? -v : v;
    var bad = mode==="variancePct" ? o.thresholdBad/100 : -absMax*0.25, good = mode==="variancePct" ? o.thresholdGood/100 : absMax*0.25;
    if(o.colorMode==="rag") return signed<=bad ? o.badColor : (signed>=good ? o.goodColor : o.amberColor);
    var sat = mode==="variancePct" ? Math.max(Math.abs(bad),Math.abs(good))*2 : absMax;
    var t = Math.max(-1, Math.min(1, signed/(sat||1)));
    return t>=0 ? vht_mix(o.midColor, o.goodColor, t) : vht_mix(o.midColor, o.badColor, -t);
  }
  var lw = +o.labelWidth||130, ch = Math.max(18,+o.cellHeight||30), top = vht_headerH(o)+34;
  var totW = o.showTotals ? 78 : 0, x0 = 16+lw, gw = W-16-x0-totW-(o.showTotals?6:0), cw = gw/cols.length;
  var gridBottom = top + ch*(rows.length + (o.showTotals?1:0)) + (o.showTotals?6:0), H = Math.max(+o.height||0, gridBottom + 40);
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+vht_FONT+'">';
  s += vht_header(o, W);
  var maxChars = Math.max(3, Math.floor(cw/6));
  cols.forEach(function(c,j){ s += '<text x="'+(x0+cw*j+cw/2).toFixed(1)+'" y="'+(top-8)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+vht_esc(vht_trunc(c,maxChars))+'</text>'; });
  if(o.showTotals) s += '<text x="'+(W-16-totW/2)+'" y="'+(top-8)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Total</text>';
  function cell(x,y,w,v,tip,bold){
    var f=color(v), tc = vht_lum(f)<0.55 ? "#FFFFFF" : o.inkColor, r='<rect x="'+(x+1).toFixed(1)+'" y="'+(y+1).toFixed(1)+'" width="'+Math.max(1,w-2).toFixed(1)+'" height="'+(ch-2)+'" rx="3" fill="'+f+'"><title>'+vht_esc(tip+": "+(v==null?"no data":label(v)))+'</title></rect>';
    if(o.showValues && v!=null && w>34) r += '<text x="'+(x+w/2).toFixed(1)+'" y="'+(y+ch/2+4).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="'+(bold?700:500)+'" fill="'+tc+'">'+vht_esc(label(v))+'</text>';
    return r;
  }
  var colTot = cols.map(function(){return {a:0,p:0,ha:false,hp:false};}), all={a:0,p:0,ha:false,hp:false};
  rows.forEach(function(rw,i){
    var y = top+ch*i, rt={a:0,p:0,ha:false,hp:false};
    s += '<text x="'+(x0-8)+'" y="'+(y+ch/2+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+vht_esc(vht_trunc(rw,Math.floor(lw/6.3)))+'</text>';
    cols.forEach(function(cl,j){
      var g = grid[rw+"\u0001"+cl];
      var v = g ? metric(g.actual,g.plan,g.hasA,g.hasP) : null;
      if(g){ [rt,colTot[j],all].forEach(function(t){ if(g.hasA){t.a+=g.actual;t.ha=true;} if(g.hasP){t.p+=g.plan;t.hp=true;} }); }
      s += cell(x0+cw*j, y, cw, v, rw+" / "+cl, false);
    });
    if(o.showTotals) s += cell(W-16-totW, y, totW, metric(rt.a,rt.p,rt.ha,rt.hp), rw+" total", true);
  });
  if(o.showTotals){ var ty = top+ch*rows.length+6;
    s += '<text x="'+(x0-8)+'" y="'+(ty+ch/2+4).toFixed(1)+'" text-anchor="end" font-size="11" font-weight="700" fill="'+o.inkColor+'">Total</text>';
    cols.forEach(function(cl,j){ var t=colTot[j]; s += cell(x0+cw*j, ty, cw, metric(t.a,t.p,t.ha,t.hp), cl+" total", true); });
    s += cell(W-16-totW, ty, totW, metric(all.a,all.p,all.ha,all.hp), "Grand total", true);
  }
  // legend
  var ly = gridBottom+24, lx = x0;
  var legend = mode==="value" ? [["Low",color(vmin)],["High",color(vmax)]]
    : (o.colorMode==="rag" ? [["Unfavourable ≤ "+o.thresholdBad+"%",o.badColor],["Within band",o.amberColor],["Favourable ≥ +"+o.thresholdGood+"%",o.goodColor]]
                           : [["Unfavourable",o.badColor],["On plan",o.midColor],["Favourable",o.goodColor]]);
  legend.forEach(function(l){ s += '<rect x="'+lx+'" y="'+(ly-9)+'" width="12" height="12" rx="2" fill="'+l[1]+'" stroke="#D5DCE3"/><text x="'+(lx+17)+'" y="'+(ly+1)+'" font-size="10" fill="'+o.mutedColor+'">'+vht_esc(l[0])+'</text>'; lx += 30+l[0].length*5.6; });
  if(o.invertSign && mode!=="value") s += '<text x="'+(W-16)+'" y="'+(ly+1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">cost measure: below plan = favourable</text>';
  return s+'</svg>';
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

  function buildInput(b) {
    var m = sacMeta(b); if (!m.dims.length || !m.meas.length) return null;
    var rk = m.dims[0].key, ck = m.dims[1] && m.dims[1].key, ka = m.meas[0].key, kp = m.meas[1] && m.meas[1].key;
    var cells = (b.data || []).filter(function (r) { return !sacIsTotal(r, m.dims); }).map(function (r) {
      return { row: sacLab(r, rk), col: ck ? sacLab(r, ck) : m.meas[0].label,
               actual: sacVal(r, ka), plan: kp ? sacVal(r, kp) : null };
    });
    return { cells: cells, labels: { actual: m.meas[0].label, plan: kp && m.meas[1].label } };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class VarianceHeatmap extends HTMLElement {
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
        this._root.innerHTML = vht_msg(opts.width || 400, opts.height || 200, "Bind row/column dimensions and an Actual (+ Plan) measure.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildVarHeatSVG(input, opts) : vht_msg(opts.width || 400, opts.height || 200, "Bind row/column dimensions and an Actual (+ Plan) measure.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-varianceheatmap", VarianceHeatmap);
})();
