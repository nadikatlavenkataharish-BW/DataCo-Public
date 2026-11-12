/*!
 * Store Performance Quadrant — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Store Performance Quadrant — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Store Performance Quadrant — canonical renderer (v0.1)
 * Bubble scatter of stores on two KPIs (e.g. sales per m² vs gross margin %),
 * split into four quadrants by medians (or fixed targets), bubble = revenue.
 *
 * input : { points:[{label, x, y, size, group}], labels:{x, y, size} }
 * opts  : see sqdDefaults()
 * ========================================================================== */
function sqdDefaults(){
  return {
    title: "Store Performance", subtitle: "Sales density vs margin, bubble = revenue",
    splitMode: "median",              // median | target
    xTarget: 0, yTarget: 0,
    quadrantLabels: "Stars,Grow sales,Fix margin,Review",   // top-right, top-left, bottom-right, bottom-left
    xFormat: "currency", yFormat: "pct",                    // currency | pct | number
    labelMode: "outliers",            // all | outliers | none
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    qColors: "#1A9850,#0A6ED1,#E9730C,#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 900, height: 480
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var sqd_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function sqd_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function sqd_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function sqd_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function sqd_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function sqd_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function sqd_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function sqd_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function sqd_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+sqd_FONT+'" font-size="13" fill="#8794A0">'+sqd_esc(text)+'</text></svg>';
}
function sqd_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+sqd_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+sqd_esc(o.subtitle)+'</text>';
  return s;
}
function sqd_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function sqd_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return sqd_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return sqd_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function sqd_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function sqd_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function sqd_money(v, o, dec){ return sqd_fmt(v, o.valueScale, dec==null?o.decimals:dec, sqd_cur(o), ""); }

function sqd_med(a){ var s=a.slice().sort(function(x,y){return x-y;}), n=s.length, m=Math.floor(n/2); return n%2?s[m]:(s[m-1]+s[m])/2; }
function buildQuadrantSVG(input, opts){
  var o = Object.assign(sqdDefaults(), opts||{});
  var W = Math.max(420, +o.width||900), H = Math.max(280, +o.height||480);
  var pts=((input&&input.points)||[]).filter(function(p){return p.x!=null&&p.y!=null;});
  if(pts.length<2) return sqd_msg(W,H,"Bind a Store dimension plus X KPI, Y KPI and (optional) Size measures.");
  var L=input.labels||{}, cur=sqd_cur(o);
  var yPct = o.yFormat==="pct" && Math.max.apply(null,pts.map(function(p){return Math.abs(p.y);}))<=1.5;
  var xPct = o.xFormat==="pct" && Math.max.apply(null,pts.map(function(p){return Math.abs(p.x);}))<=1.5;
  function f(v,fmt,isFrac){ if(fmt==="pct") return (isFrac?v*100:v).toFixed(1)+"%"; if(fmt==="currency") return sqd_fmt(v,o.valueScale,o.decimals,cur,""); return sqd_fmt(v,o.valueScale,o.decimals,"",""); }
  var xs=pts.map(function(p){return p.x;}), ys=pts.map(function(p){return p.y;});
  var xm = o.splitMode==="target" ? +o.xTarget : sqd_med(xs), ym = o.splitMode==="target" ? +o.yTarget : sqd_med(ys);
  var nx=sqd_nice(Math.min.apply(null,xs.concat([xm])), Math.max.apply(null,xs.concat([xm])), 5), nyy=sqd_nice(Math.min.apply(null,ys.concat([ym])), Math.max.apply(null,ys.concat([ym])), 5);
  var top=sqd_headerH(o)+14, bot=46, left=64, right=20, pw=W-left-right, ph=H-top-bot;
  var X=function(v){return left+pw*(v-nx.lo)/(nx.hi-nx.lo);}, Y=function(v){return top+ph*(nyy.hi-v)/(nyy.hi-nyy.lo);};
  var smax=Math.max.apply(null,pts.map(function(p){return p.size||0;}))||1, R=function(sz){return sz? 4+16*Math.sqrt(sz/smax) : 6;};
  var qc=String(o.qColors).split(",").map(function(x){return x.trim();}), ql=String(o.quadrantLabels).split(",").map(function(x){return x.trim();});
  function quad(p){ var r=p.x>=xm, u=p.y>=ym; return u&&r?0:(u?1:(r?2:3)); }
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+sqd_FONT+'">';
  s+=sqd_header(o,W);
  var mx=X(xm), my=Y(ym);
  [[mx,top,left+pw-mx,my-top,0],[left,top,mx-left,my-top,1],[mx,my,left+pw-mx,top+ph-my,2],[left,my,mx-left,top+ph-my,3]].forEach(function(q){
    s+='<rect x="'+q[0].toFixed(1)+'" y="'+q[1].toFixed(1)+'" width="'+Math.max(0,q[2]).toFixed(1)+'" height="'+Math.max(0,q[3]).toFixed(1)+'" fill="'+qc[q[4]]+'" fill-opacity="0.05"/>'; });
  nx.ticks.forEach(function(v){ var x=X(v); s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+top+'" y2="'+(top+ph)+'" stroke="'+o.gridColor+'"/><text x="'+x.toFixed(1)+'" y="'+(top+ph+15)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+sqd_esc(f(v,o.xFormat,xPct))+'</text>'; });
  nyy.ticks.forEach(function(v){ var y=Y(v); s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/><text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+sqd_esc(f(v,o.yFormat,yPct))+'</text>'; });
  s+='<line x1="'+mx.toFixed(1)+'" x2="'+mx.toFixed(1)+'" y1="'+top+'" y2="'+(top+ph)+'" stroke="'+o.mutedColor+'" stroke-dasharray="5 4"/>';
  s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+my.toFixed(1)+'" y2="'+my.toFixed(1)+'" stroke="'+o.mutedColor+'" stroke-dasharray="5 4"/>';
  [[left+pw-6,top+14,"end",0],[left+6,top+14,"start",1],[left+pw-6,top+ph-8,"end",2],[left+6,top+ph-8,"start",3]].forEach(function(q){
    var n=pts.filter(function(p){return quad(p)===q[3];}).length;
    s+='<text x="'+q[0]+'" y="'+q[1]+'" text-anchor="'+q[2]+'" font-size="11.5" font-weight="700" fill="'+qc[q[3]]+'">'+sqd_esc((ql[q[3]]||"")+" ("+n+")")+'</text>'; });
  s+='<text x="'+(left+pw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">'+sqd_esc(L.x||"X")+(o.splitMode==="median"?" · dashed = median":" · dashed = target")+'</text>';
  s+='<text transform="translate(14,'+(top+ph/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">'+sqd_esc(L.y||"Y")+'</text>';
  var sorted=pts.slice().sort(function(a,b){return (b.size||0)-(a.size||0);});
  var dx=xs.map(function(v){return Math.abs(v-xm);}), dy=ys.map(function(v){return Math.abs(v-ym);}), tx=sqd_med(dx)*2.2, ty=sqd_med(dy)*2.2;
  sorted.forEach(function(p){ var c=qc[quad(p)], r=R(p.size);
    s+='<circle cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+c+'" fill-opacity="0.55" stroke="'+c+'"><title>'+sqd_esc(p.label+": "+f(p.x,o.xFormat,xPct)+" · "+f(p.y,o.yFormat,yPct)+(p.size?" · "+(L.size||"size")+" "+sqd_money(p.size,o):""))+'</title></circle>'; });
  pts.forEach(function(p){ var show = o.labelMode==="all" || (o.labelMode==="outliers" && (Math.abs(p.x-xm)>tx || Math.abs(p.y-ym)>ty));
    if(show) s+='<text x="'+(X(p.x)+R(p.size)+3).toFixed(1)+'" y="'+(Y(p.y)+3).toFixed(1)+'" font-size="10" fill="'+o.inkColor+'">'+sqd_esc(sqd_trunc(p.label,18))+'</text>'; });
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
    var m = sacMeta(b); if (!m.dims.length || m.meas.length < 2) return null;
    var kd = m.dims[0].key, kg = m.dims[1] && m.dims[1].key, k = m.meas.map(function (x) { return x.key; });
    var pts = (b.data || []).filter(function (r) { return !sacIsTotal(r, m.dims); }).map(function (r) {
      return { label: sacLab(r, kd), group: kg ? sacLab(r, kg) : null, x: sacVal(r, k[0]), y: sacVal(r, k[1]), size: k[2] ? sacVal(r, k[2]) : null };
    });
    return { points: pts, labels: { x: m.meas[0].label, y: m.meas[1].label, size: m.meas[2] && m.meas[2].label } };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class StoreQuadrant extends HTMLElement {
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
        this._root.innerHTML = sqd_msg(opts.width || 400, opts.height || 200, "Bind a Store dimension plus X KPI, Y KPI and (optional) Size measures.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildQuadrantSVG(input, opts) : sqd_msg(opts.width || 400, opts.height || 200, "Bind a Store dimension plus X KPI, Y KPI and (optional) Size measures.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-storequadrant", StoreQuadrant);
})();
