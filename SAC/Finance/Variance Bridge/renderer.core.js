/*!
 * Variance Bridge — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Variance Bridge (waterfall) — canonical renderer (v0.1)
 * Plan total -> one floating step per driver (Actual − Plan) -> Actual total.
 *
 * input : { items:[{label, plan, actual}], labels:{plan, actual} }
 * opts  : see brgDefaults()
 * ========================================================================== */
function brgDefaults(){
  return {
    title: "Variance Bridge", subtitle: "Plan to Actual by driver",
    topN: 8, sortBy: "abs",          // abs | none
    invertSign: false,
    valueScale: "auto", decimals: 1, prefix: "", suffix: "",
    showValues: true, showConnectors: true,
    totalColor: "#5B738B", goodColor: "#1A9850", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 900, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var brg_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function brg_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function brg_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function brg_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function brg_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function brg_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function brg_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function brg_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function brg_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+brg_FONT+'" font-size="13" fill="#8794A0">'+brg_esc(text)+'</text></svg>';
}
function brg_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+brg_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+brg_esc(o.subtitle)+'</text>';
  return s;
}
function brg_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function brg_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return brg_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return brg_fmt(v,scale,2,prefix,"");});
}

function buildBridgeSVG(input, opts){
  var o = Object.assign(brgDefaults(), opts||{});
  var W = Math.max(320, +o.width||900), H = Math.max(220, +o.height||420);
  var items = ((input&&input.items)||[]).filter(function(r){return r.plan!=null||r.actual!=null;});
  if(!items.length) return brg_msg(W,H,"Bind a driver dimension plus Plan and Actual measures.");
  var L = input.labels||{};
  items = items.map(function(r){ var p=r.plan||0, a=r.actual||0; return {label:r.label, plan:p, actual:a, delta:a-p}; });
  var totPlan = items.reduce(function(s,r){return s+r.plan;},0), totAct = items.reduce(function(s,r){return s+r.actual;},0);
  if(o.sortBy==="abs") items.sort(function(a,b){return Math.abs(b.delta)-Math.abs(a.delta);});
  var n = Math.max(1, +o.topN||8);
  if(items.length > n){
    var rest = items.slice(n), other = rest.reduce(function(s,r){return s+r.delta;},0);
    items = items.slice(0,n); items.push({label:"Other ("+rest.length+")", delta:other});
  }
  var bars = [{label:L.plan||"Plan", kind:"total", y0:0, y1:totPlan, v:totPlan}], run = totPlan;
  items.forEach(function(r){ bars.push({label:r.label, kind:"step", y0:run, y1:run+r.delta, v:r.delta}); run += r.delta; });
  bars.push({label:L.actual||"Actual", kind:"total", y0:0, y1:totAct, v:totAct});

  var top = brg_headerH(o)+14, bot = 56, left = 64, right = 16;
  var lo = 0, hi = 0; bars.forEach(function(b){ lo=Math.min(lo,b.y0,b.y1); hi=Math.max(hi,b.y0,b.y1); });
  // zoom the axis so steps are readable: start near the smallest total when everything is positive
  var minTot = Math.min(totPlan, totAct), steps = bars.filter(function(b){return b.kind==="step";});
  var stepLo = Math.min.apply(null, steps.map(function(b){return Math.min(b.y0,b.y1);}).concat([minTot]));
  if(lo>=0 && stepLo > 0) lo = Math.max(0, stepLo - (hi-stepLo)*0.35);
  if(hi===lo) hi = lo+1;
  var pad=(hi-lo)*0.08; hi+=pad; if(lo<0) lo-=pad;
  var ph = H-top-bot, Y=function(v){return top+ph*(hi-v)/(hi-lo);};
  var slot = (W-left-right)/bars.length, bw = Math.min(64, slot*0.62);
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+brg_FONT+'">';
  s += brg_header(o, W);
  var gvs=[0,1,2,3,4].map(function(g){return lo+(hi-lo)*g/4;}), gl=brg_ticks(gvs,o.valueScale,o.prefix);
  for(var g=0; g<=4; g++){ var gv = gvs[g], gy=Y(gv);
    s += '<line x1="'+left+'" x2="'+(W-right)+'" y1="'+gy.toFixed(1)+'" y2="'+gy.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s += '<text x="'+(left-6)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+gl[g]+'</text>'; }
  if(lo>0) s += '<text x="'+(left-6)+'" y="'+(H-bot+24)+'" text-anchor="end" font-size="9" fill="'+o.mutedColor+'">axis ≠ 0</text>';
  var rot = slot < 70;
  bars.forEach(function(b,i){
    var x = left+slot*i+(slot-bw)/2, ya=Y(Math.max(b.y0,b.y1)), yb=Y(Math.min(b.y0,b.y1));
    if(b.kind==="total"){ ya=Y(b.y1); yb=Y(Math.max(lo,0)); }
    var col = b.kind==="total" ? o.totalColor : (brg_good(b.v,o.invertSign)?o.goodColor:o.badColor);
    s += '<rect x="'+x.toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb-ya).toFixed(1)+'" fill="'+col+'" rx="2"><title>'+brg_esc(b.label)+': '+brg_fmt(b.v,o.valueScale,o.decimals,o.prefix,o.suffix)+'</title></rect>';
    if(o.showConnectors && i<bars.length-1){ var end = b.kind==="total"?b.y1:b.y1, cy=Y(end);
      s += '<line x1="'+(x+bw).toFixed(1)+'" x2="'+(x+slot).toFixed(1)+'" y1="'+cy.toFixed(1)+'" y2="'+cy.toFixed(1)+'" stroke="'+o.mutedColor+'" stroke-dasharray="2 2"/>'; }
    if(o.showValues){ var txt = (b.kind==="step"&&b.v>0?"+":"")+brg_fmt(b.v,o.valueScale,o.decimals,o.prefix,o.suffix);
      s += '<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-5).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="600" fill="'+o.inkColor+'">'+brg_esc(txt)+'</text>'; }
    var lx = x+bw/2, ly = H-bot+16, lab = brg_esc(brg_trunc(b.label, rot?16:Math.max(6,Math.floor(slot/6.5))));
    s += rot ? '<text transform="translate('+lx.toFixed(1)+','+(ly-4)+') rotate(-35)" text-anchor="end" font-size="10" fill="'+o.inkColor+'">'+lab+'</text>'
             : '<text x="'+lx.toFixed(1)+'" y="'+ly+'" text-anchor="middle" font-size="10" font-weight="'+(b.kind==="total"?700:400)+'" fill="'+o.inkColor+'">'+lab+'</text>';
  });
  return s+'</svg>';
}
