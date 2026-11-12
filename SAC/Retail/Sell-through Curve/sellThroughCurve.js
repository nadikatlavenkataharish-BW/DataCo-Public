/*!
 * Sell-through Curve — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Sell-through Curve — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Sell-through Curve — canonical renderer (v0.1)
 * Cumulative sell-through % (units sold ÷ units bought) by week since launch,
 * one line per season / collection, against a planned curve.
 *
 * input : { series:[{name, bought, weeks:[{week, sold, plan}]}] }
 * opts  : see stcDefaults()
 * ========================================================================== */
function stcDefaults(){
  return {
    title: "Sell-through", subtitle: "Cumulative sell-through % by week since launch",
    planCurve: "",                    // optional comma list of planned cumulative ST % by week (used if no Plan measure)
    targetST: 70, targetWeek: 0,      // end-of-life target marker (0 = last week)
    showEndLabels: true,
    palette: "#0A6ED1,#E9730C,#1A9850,#925ACE,#C87B00,#0F828F,#D04343,#5B738B",
    planColor: "#33414A",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 900, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var stc_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function stc_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function stc_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function stc_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function stc_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function stc_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function stc_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function stc_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function stc_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+stc_FONT+'" font-size="13" fill="#8794A0">'+stc_esc(text)+'</text></svg>';
}
function stc_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+stc_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+stc_esc(o.subtitle)+'</text>';
  return s;
}
function stc_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function stc_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return stc_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return stc_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function stc_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function stc_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function stc_money(v, o, dec){ return stc_fmt(v, o.valueScale, dec==null?o.decimals:dec, stc_cur(o), ""); }

function buildSellThroughSVG(input, opts){
  var o = Object.assign(stcDefaults(), opts||{});
  var W = Math.max(420, +o.width||900), H = Math.max(260, +o.height||440);
  var ser=((input&&input.series)||[]).filter(function(s){return s.weeks&&s.weeks.length;});
  if(!ser.length) return stc_msg(W,H,"Bind Season and Week dimensions plus Units sold and Units bought measures.");
  var maxWk=0;
  ser.forEach(function(s){ s.weeks.sort(function(a,b){return a.week-b.week;}); var c=0;
    s.pts=s.weeks.map(function(w){ c+=w.sold||0; maxWk=Math.max(maxWk,w.week); return {week:w.week, st:s.bought?c/s.bought*100:null, plan:w.plan}; }); });
  var plan=null, pc=String(o.planCurve||"").split(",").map(Number).filter(function(v){return isFinite(v)&&v>0;});
  var mp=ser[0].pts.filter(function(p){return p.plan!=null;});
  if(mp.length) plan=mp.map(function(p){return {week:p.week, st:Math.abs(p.plan)<=1.5?p.plan*100:p.plan};});
  else if(pc.length) plan=pc.map(function(v,i){return {week:i+1, st:v};});
  if(plan) maxWk=Math.max(maxWk, plan[plan.length-1].week);
  var right=o.showEndLabels?130:20, top=stc_headerH(o)+14, bot=40, left=48, pw=W-left-right, ph=H-top-bot;
  var nx=stc_nice(0,maxWk,8), X=function(v){return left+pw*v/nx.hi;}, Y=function(v){return top+ph*(1-Math.min(v,100)/100);};
  var pal=String(o.palette).split(",").map(function(x){return x.trim();});
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+stc_FONT+'">';
  s+=stc_header(o,W);
  [0,20,40,60,80,100].forEach(function(v){ var y=Y(v); s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/><text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+v+'%</text>'; });
  nx.ticks.forEach(function(v){ s+='<text x="'+X(v).toFixed(1)+'" y="'+(top+ph+15)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+v+'</text>'; });
  s+='<text x="'+(left+pw/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">Weeks since launch</text>';
  if(+o.targetST>0){ var tw=+o.targetWeek||maxWk, tx=X(tw), ty=Y(+o.targetST);
    s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+ty.toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="'+o.planColor+'" stroke-opacity="0.25"/>';
    s+='<path d="M'+tx.toFixed(1)+' '+(ty-6).toFixed(1)+'L'+(tx+6).toFixed(1)+' '+ty.toFixed(1)+'L'+tx.toFixed(1)+' '+(ty+6).toFixed(1)+'L'+(tx-6).toFixed(1)+' '+ty.toFixed(1)+'Z" fill="'+o.planColor+'"><title>Target '+o.targetST+'% by week '+tw+'</title></path>'; }
  var ends=[];
  if(plan){ s+='<path d="'+plan.map(function(p,i){return (i?"L":"M")+X(p.week).toFixed(1)+" "+Y(p.st).toFixed(1);}).join("")+'" fill="none" stroke="'+o.planColor+'" stroke-width="2" stroke-dasharray="6 4"/>';
    ends.push({y:Y(plan[plan.length-1].st), x:X(plan[plan.length-1].week), t:"Plan "+plan[plan.length-1].st.toFixed(0)+"%", c:o.planColor}); }
  ser.forEach(function(sr,i){ var c=pal[i%pal.length], p=sr.pts.filter(function(q){return q.st!=null;}); if(!p.length) return;
    s+='<path d="'+p.map(function(q,k){return (k?"L":"M")+X(q.week).toFixed(1)+" "+Y(q.st).toFixed(1);}).join("")+'" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-linejoin="round"/>';
    p.forEach(function(q){ s+='<circle cx="'+X(q.week).toFixed(1)+'" cy="'+Y(q.st).toFixed(1)+'" r="2.2" fill="'+c+'"><title>'+stc_esc(sr.name+" · wk "+q.week+": "+q.st.toFixed(1)+"%")+'</title></circle>'; });
    var last=p[p.length-1]; ends.push({y:Y(last.st), x:X(last.week), t:sr.name+" "+last.st.toFixed(0)+"%", c:c}); });
  if(o.showEndLabels){ ends.sort(function(a,b){return a.y-b.y;}); for(var k=1;k<ends.length;k++) if(ends[k].y-ends[k-1].y<13) ends[k].y=ends[k-1].y+13;
    ends.forEach(function(e){ s+='<text x="'+(left+pw+8)+'" y="'+(e.y+4).toFixed(1)+'" font-size="10.5" font-weight="700" fill="'+e.c+'">'+stc_esc(stc_trunc(e.t,20))+'</text>'; }); }
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
    var m = sacMeta(b); if (m.dims.length < 2 || m.meas.length < 2) return null;
    var ks = m.dims[0].key, kw = m.dims[1].key, k = m.meas.map(function (x) { return x.key; }), map = {}, series = [];
    (b.data || []).forEach(function (r) {
      if (sacIsTotal(r, m.dims)) return;
      var name = sacLab(r, ks), wm = String(sacLab(r, kw)).match(/\d+/); if (!wm) return;
      var s = map[name]; if (!s) { s = map[name] = { name: name, bought: 0, wk: {}, weeks: [] }; series.push(s); }
      var w = +wm[0], e = s.wk[w]; if (!e) { e = s.wk[w] = { week: w, sold: 0, plan: null }; s.weeks.push(e); }
      e.sold += sacVal(r, k[0]) || 0; s.bought = Math.max(s.bought, sacVal(r, k[1]) || 0);
      if (k[2] && sacVal(r, k[2]) != null) e.plan = sacVal(r, k[2]);
    });
    return { series: series };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class SellThroughCurve extends HTMLElement {
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
        this._root.innerHTML = stc_msg(opts.width || 400, opts.height || 200, "Bind Season and Week dimensions plus Units sold and Units bought measures.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildSellThroughSVG(input, opts) : stc_msg(opts.width || 400, opts.height || 200, "Bind Season and Week dimensions plus Units sold and Units bought measures.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-sellthroughcurve", SellThroughCurve);
})();
