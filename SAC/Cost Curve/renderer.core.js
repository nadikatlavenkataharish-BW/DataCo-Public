/*!
 * Cost Curve — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Cost Curve — canonical renderer (v0.1)
 * Operations sorted by unit cost; bar width = production, height = cost, x =
 * cumulative production. Highlights own assets, quartile markers, price line.
 *
 * input : { items:[{label, production, cost, group}], labels:{production, cost} }
 * opts  : see ccvDefaults()
 * ========================================================================== */
function ccvDefaults(){
  return {
    title: "Cost Curve", subtitle: "C1 cash cost vs cumulative production",
    highlight: "",                    // comma-separated operation names to highlight
    highlightGroup: "",               // or: highlight every operation whose group (owner) matches
    price: 0, priceLabel: "Price",
    showQuartiles: true, showLabels: "highlight",   // highlight | all | none
    costPrefix: "US$", costSuffix: "/lb", costDecimals: 2,
    valueScale: "auto", decimals: 0, prefix: "", suffix: " kt",
    baseColor: "#C4CDD5", highlightColor: "#0A6ED1", priceColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 960, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var ccv_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function ccv_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function ccv_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function ccv_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function ccv_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function ccv_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function ccv_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function ccv_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function ccv_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+ccv_FONT+'" font-size="13" fill="#8794A0">'+ccv_esc(text)+'</text></svg>';
}
function ccv_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+ccv_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+ccv_esc(o.subtitle)+'</text>';
  return s;
}
function ccv_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function ccv_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return ccv_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return ccv_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function ccv_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function buildCostCurveSVG(input, opts){
  var o = Object.assign(ccvDefaults(), opts||{});
  var W = Math.max(420, +o.width||960), H = Math.max(240, +o.height||420);
  var items = ((input&&input.items)||[]).filter(function(i){return i.production>0&&i.cost!=null;});
  if(!items.length) return ccv_msg(W,H,"Bind an Operation dimension plus Production and Unit cost measures.");
  var L=input.labels||{};
  items.sort(function(a,b){return a.cost-b.cost;});
  var hl=String(o.highlight).split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean), hg=String(o.highlightGroup).trim().toLowerCase();
  function isHl(i){ return hl.indexOf(String(i.label).toLowerCase())>=0 || (hg && String(i.group||"").toLowerCase()===hg); }
  var total=items.reduce(function(s,i){return s+i.production;},0), cum=0;
  items.forEach(function(i){ i.x0=cum; cum+=i.production; i.x1=cum; i.hl=isHl(i); });
  var ny=ccv_nice(0,Math.max.apply(null,items.map(function(i){return i.cost;}).concat([+o.price||0]))*1.08,5), cmax=ny.hi;
  var top=ccv_headerH(o)+28, bot=46, left=60, right=16, pw=W-left-right, ph=H-top-bot;
  var X=function(v){return left+pw*v/total;}, Y=function(v){return top+ph*(1-v/cmax);};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+ccv_FONT+'">';
  s+=ccv_header(o,W);
  ny.ticks.forEach(function(v){ var y=Y(v);
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+ccv_esc(o.costPrefix)+v.toFixed(Math.min(ny.dec,o.costDecimals))+'</text>'; });
  var nx=ccv_nice(0,total,5), xt=nx.ticks.filter(function(v){return v<=total*1.001;}), xl=ccv_ticks(xt,o.valueScale,o.prefix);
  for(var q=0;q<xt.length;q++) s+='<text x="'+X(xt[q]).toFixed(1)+'" y="'+(top+ph+16)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+xl[q]+'</text>';
  s+='<text x="'+(left+pw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">'+ccv_esc("Cumulative "+(L.production||"production")+(o.suffix?" ("+o.suffix.trim()+")":""))+'</text>';
  if(o.showQuartiles){ for(var k=1;k<=4;k++){ var qx=X(total*k/4);
      if(k<4) s+='<line x1="'+qx.toFixed(1)+'" x2="'+qx.toFixed(1)+'" y1="'+(top-14)+'" y2="'+(top+ph)+'" stroke="'+o.mutedColor+'" stroke-dasharray="3 3"/>';
      s+='<text x="'+X(total*(k-0.5)/4).toFixed(1)+'" y="'+(top-6)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Q'+k+'</text>'; } }
  items.forEach(function(i){ var a=X(i.x0), b=X(i.x1), y=Y(i.cost);
    s+='<rect x="'+a.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0.8,b-a-0.8).toFixed(1)+'" height="'+(Y(0)-y).toFixed(1)+'" fill="'+(i.hl?o.highlightColor:o.baseColor)+'"><title>'+ccv_esc(i.label+(i.group?" ("+i.group+")":"")+": "+o.costPrefix+i.cost.toFixed(o.costDecimals)+o.costSuffix+", "+ccv_fmt(i.production,o.valueScale,o.decimals,o.prefix,o.suffix)+", "+(i.x1/total*100).toFixed(0)+"th percentile")+'</title></rect>'; });
  items.forEach(function(i){ if(o.showLabels==="none" || (o.showLabels==="highlight" && !i.hl)) return;
    var cx=(X(i.x0)+X(i.x1))/2, y=Y(i.cost);
    s+='<text transform="translate('+cx.toFixed(1)+','+(y-5).toFixed(1)+') rotate(-45)" font-size="10" font-weight="'+(i.hl?700:400)+'" fill="'+(i.hl?o.highlightColor:o.inkColor)+'">'+ccv_esc(ccv_trunc(i.label,24))+(i.hl?" "+ccv_esc(o.costPrefix+i.cost.toFixed(o.costDecimals)):"")+'</text>'; });
  if(+o.price>0){ var py=Y(+o.price);
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+py.toFixed(1)+'" y2="'+py.toFixed(1)+'" stroke="'+o.priceColor+'" stroke-width="1.5" stroke-dasharray="6 3"/>';
    s+='<text x="'+(W-right-4)+'" y="'+(py-5).toFixed(1)+'" text-anchor="end" font-size="10.5" font-weight="700" fill="'+o.priceColor+'">'+ccv_esc(o.priceLabel+" "+o.costPrefix+(+o.price).toFixed(o.costDecimals)+o.costSuffix)+'</text>'; }
  return s+'</svg>';
}
