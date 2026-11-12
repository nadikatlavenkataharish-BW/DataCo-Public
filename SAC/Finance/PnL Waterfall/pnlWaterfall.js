/*!
 * P&L Waterfall — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* P&L Waterfall — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * P&L Waterfall — canonical renderer (v0.1)
 * Income-statement lines in order, with automatic sub-total bars (Gross profit,
 * EBITDA, EBIT, Net profit …) and % of revenue labels.
 *
 * input : { lines:[{label, value}] }   // value as stored in the model
 * opts  : see pnlDefaults()
 * ========================================================================== */
function pnlDefaults(){
  return {
    title: "Income Statement", subtitle: "Revenue to net profit",
    costSign: "positive",            // positive: costs stored as positive numbers (subtracted) | negative: costs already negative (added)
    revenueLines: "",                // extra lines that ADD when costSign = positive (comma list); the first line always adds
    totalLines: "Gross profit,EBITDA,EBIT,Profit before tax,Net profit",   // members that are sub-totals → drawn from the running total
    insertTotals: "",                // add sub-totals not in the data: "Gross profit@Cost of sales,EBITDA@Other operating expenses"
    finalLabel: "Net profit",        // closing bar label if the last line is not a total
    showPctOfRevenue: true,
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    revenueColor: "#5B738B", totalColor: "#33414A", positiveColor: "#1A9850", negativeColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 1000, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var pnl_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function pnl_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function pnl_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function pnl_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function pnl_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function pnl_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function pnl_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function pnl_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function pnl_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+pnl_FONT+'" font-size="13" fill="#8794A0">'+pnl_esc(text)+'</text></svg>';
}
function pnl_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+pnl_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+pnl_esc(o.subtitle)+'</text>';
  return s;
}
function pnl_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function pnl_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return pnl_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return pnl_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function pnl_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function pnl_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function pnl_money(v, o, dec){ return pnl_fmt(v, o.valueScale, dec==null?o.decimals:dec, pnl_cur(o), ""); }

function pnl_list(s){ return String(s||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean); }
function buildPnlSVG(input, opts){
  var o = Object.assign(pnlDefaults(), opts||{});
  var W = Math.max(420, +o.width||1000), H = Math.max(260, +o.height||440);
  var lines = ((input&&input.lines)||[]).filter(function(l){return l.label!=="";});
  if(lines.length<2) return pnl_msg(W,H,"Bind a P&L line dimension (in statement order) and an Amount measure.");
  var totals=pnl_list(o.totalLines), adds=pnl_list(o.revenueLines), ins={};
  String(o.insertTotals||"").split(",").forEach(function(p){ var kv=p.split("@"); if(kv.length===2) ins[kv[1].trim().toLowerCase()]=kv[0].trim(); });
  var bars=[], run=0, revenue=null;
  lines.forEach(function(l,i){
    var key=String(l.label).toLowerCase(), v=l.value||0;
    if(totals.indexOf(key)>=0){ bars.push({label:l.label, kind:"total", v:run}); return; }
    var signed = o.costSign==="negative" ? v : ((i===0 || adds.indexOf(key)>=0) ? v : -v);
    if(i===0){ bars.push({label:l.label, kind:"revenue", v:signed}); revenue=signed; run=signed; }
    else { bars.push({label:l.label, kind:"step", y0:run, y1:run+signed, v:signed}); run+=signed; }
    if(ins[key]) bars.push({label:ins[key], kind:"total", v:run});
  });
  if(bars[bars.length-1].kind!=="total") bars.push({label:o.finalLabel||"Result", kind:"total", v:run});
  var vals=[0]; bars.forEach(function(b){ if(b.kind==="step"){vals.push(b.y0,b.y1);} else vals.push(b.v); });
  var ny=pnl_nice(Math.min.apply(null,vals), Math.max.apply(null,vals)*1.05, 5);
  var rotate0=((W-86)/bars.length)<84, top=pnl_headerH(o)+20, bot=rotate0?78:52, left=70, right=16, ph=H-top-bot, pw=W-left-right;
  var Y=function(v){return top+ph*(ny.hi-v)/(ny.hi-ny.lo);};
  var slot=pw/bars.length, bw=Math.min(58,slot*0.64), cur=pnl_cur(o);
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+pnl_FONT+'">';
  s+=pnl_header(o,W);
  ny.ticks.forEach(function(v){ var y=Y(v);
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+(v===0?o.mutedColor:o.gridColor)+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+pnl_esc(pnl_fmt(v,o.valueScale,ny.dec>0?1:0,cur,""))+'</text>'; });
  var rot = slot<84;
  bars.forEach(function(b,i){
    var x=left+slot*i+(slot-bw)/2, ya, yb, col;
    if(b.kind==="step"){ ya=Y(Math.max(b.y0,b.y1)); yb=Y(Math.min(b.y0,b.y1)); col=b.v>=0?o.positiveColor:o.negativeColor; }
    else { ya=Y(Math.max(0,b.v)); yb=Y(Math.min(0,b.v)); col=b.kind==="revenue"?o.revenueColor:(b.v<0?o.negativeColor:o.totalColor); }
    s+='<rect x="'+x.toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb-ya).toFixed(1)+'" rx="2" fill="'+col+'"><title>'+pnl_esc(b.label+": "+pnl_money(b.v,o)+(revenue?" ("+(b.v/revenue*100).toFixed(1)+"% of revenue)":""))+'</title></rect>';
    if(i<bars.length-1){ var end = b.kind==="step"?b.y1:b.v, cy=Y(end);
      s+='<line x1="'+(x+bw).toFixed(1)+'" x2="'+(x+slot).toFixed(1)+'" y1="'+cy.toFixed(1)+'" y2="'+cy.toFixed(1)+'" stroke="'+o.mutedColor+'" stroke-dasharray="2 2"/>'; }
    var txt=(b.kind==="step"&&b.v>0?"+":"")+pnl_money(b.v,o);
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-(o.showPctOfRevenue&&b.kind!=="step"&&revenue?17:5)).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.inkColor+'">'+pnl_esc(txt)+'</text>';
    if(o.showPctOfRevenue && b.kind!=="step" && revenue) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-5).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="'+o.mutedColor+'">'+(b.v/revenue*100).toFixed(1)+'%</text>';
    var lab=pnl_esc(pnl_trunc(b.label, rot?18:Math.max(8,Math.floor(slot/6.2)))), fw=b.kind==="step"?400:700;
    s+= rot ? '<text transform="translate('+(x+bw/2).toFixed(1)+','+(H-bot+12)+') rotate(-30)" text-anchor="end" font-size="10" font-weight="'+fw+'" fill="'+o.inkColor+'">'+lab+'</text>'
            : '<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-bot+16)+'" text-anchor="middle" font-size="10" font-weight="'+fw+'" fill="'+o.inkColor+'">'+lab+'</text>';
  });
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
    var kd = m.dims[0].key, kv = m.meas[0].key, map = {}, lines = [];
    (b.data || []).forEach(function (r) {
      var lab = sacLab(r, kd), l = map[lab];
      if (!l) { l = map[lab] = { label: lab, value: 0 }; lines.push(l); }
      l.value += sacVal(r, kv) || 0;
    });
    return { lines: lines };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class PnlWaterfall extends HTMLElement {
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
        this._root.innerHTML = pnl_msg(opts.width || 400, opts.height || 200, "Bind a P&L line dimension (in statement order) and an Amount measure.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildPnlSVG(input, opts) : pnl_msg(opts.width || 400, opts.height || 200, "Bind a P&L line dimension (in statement order) and an Amount measure.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-pnlwaterfall", PnlWaterfall);
})();
