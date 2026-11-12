/*!
 * Weeks of Cover — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Weeks of Cover — canonical renderer (v0.1)
 * Stock health per category / store: weeks of cover (stock ÷ weekly sales)
 * against a target band, with stock value, out-of-stock % and aged stock %.
 *
 * input : { rows:[{label, stock, weeklySales, stockValue, oos, aged}] }
 * opts  : see wocDefaults()
 * ========================================================================== */
function wocDefaults(){
  return {
    title: "Weeks of Cover", subtitle: "Stock health against target cover",
    minWeeks: 4, maxWeeks: 8, capWeeks: 20,
    sortBy: "risk",                   // risk | cover | name | value
    oosTarget: 3, agedTarget: 10,     // % thresholds for red flags
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    lowColor: "#D73027", okColor: "#1A9850", highColor: "#E9730C", bandColor: "#D8EFDF",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 960, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var woc_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function woc_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function woc_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function woc_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function woc_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function woc_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function woc_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function woc_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function woc_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+woc_FONT+'" font-size="13" fill="#8794A0">'+woc_esc(text)+'</text></svg>';
}
function woc_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+woc_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+woc_esc(o.subtitle)+'</text>';
  return s;
}
function woc_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function woc_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return woc_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return woc_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function woc_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function woc_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function woc_money(v, o, dec){ return woc_fmt(v, o.valueScale, dec==null?o.decimals:dec, woc_cur(o), ""); }

function buildWeeksCoverSVG(input, opts){
  var o = Object.assign(wocDefaults(), opts||{});
  var W = Math.max(420, +o.width||960);
  var rows=((input&&input.rows)||[]).filter(function(r){return r.stock!=null;});
  if(!rows.length) return woc_msg(W, Math.max(220,+o.height||440), "Bind a Category/Store dimension plus Stock and Weekly sales measures.");
  rows.forEach(function(r){ r.woc = r.weeklySales>0 ? r.stock/r.weeklySales : (r.stock>0?Infinity:0);
    r.status = r.woc<o.minWeeks ? "low" : (r.woc>o.maxWeeks ? "high" : "ok");
    r.risk = r.status==="low" ? 1000-(r.woc) : (r.status==="high" ? 500+Math.min(r.woc,1e3) : 0); });
  if(o.sortBy==="cover") rows.sort(function(a,b){return a.woc-b.woc;});
  else if(o.sortBy==="name") rows.sort(function(a,b){return a.label<b.label?-1:1;});
  else if(o.sortBy==="value") rows.sort(function(a,b){return (b.stockValue||0)-(a.stockValue||0);});
  else rows.sort(function(a,b){return b.risk-a.risk;});
  var hasV=rows.some(function(r){return r.stockValue!=null;}), hasO=rows.some(function(r){return r.oos!=null;}), hasA=rows.some(function(r){return r.aged!=null;});
  var colW=74, extra=(hasV?colW+20:0)+(hasO?colW:0)+(hasA?colW:0), lw=150, rh=26, top=woc_headerH(o)+36;
  var H=Math.max(+o.height||0, top+rh*rows.length+30), x0=16+lw, x1=W-16-extra-12, pw=x1-x0, cap=+o.capWeeks||20;
  var X=function(v){return x0+pw*Math.min(v,cap)/cap;}, cur=woc_cur(o);
  function fracCol(f){ var v=rows.map(function(r){return r[f];}).filter(function(x){return x!=null;}); return v.length && Math.max.apply(null,v.map(Math.abs))<=1.0; }
  var oosFrac=fracCol("oos"), agedFrac=fracCol("aged");
  function pct(v,frac){ if(v==null) return null; return frac?v*100:v; }
  var col={low:o.lowColor,ok:o.okColor,high:o.highColor};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+woc_FONT+'">';
  s+=woc_header(o,W);
  s+='<rect x="'+X(o.minWeeks).toFixed(1)+'" y="'+(top-4)+'" width="'+(X(o.maxWeeks)-X(o.minWeeks)).toFixed(1)+'" height="'+(rh*rows.length+8)+'" fill="'+o.bandColor+'" fill-opacity="0.6"/>';
  s+='<text x="'+((X(o.minWeeks)+X(o.maxWeeks))/2).toFixed(1)+'" y="'+(top-10)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.okColor+'">target '+o.minWeeks+'–'+o.maxWeeks+' wks</text>';
  var steps=woc_nice(0,cap,5).ticks.filter(function(v){return v<=cap;});
  steps.forEach(function(v){ var x=X(v); s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+top+'" y2="'+(top+rh*rows.length)+'" stroke="'+o.gridColor+'"/><text x="'+x.toFixed(1)+'" y="'+(top+rh*rows.length+14)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+v+(v===cap?"+":"")+'</text>'; });
  var cx=x1+12;
  [[hasV,"Stock value",colW+20],[hasO,"OOS %",colW],[hasA,"Aged %",colW]].forEach(function(c){ if(!c[0]) return; s+='<text x="'+(cx+c[2]-4)+'" y="'+(top-10)+'" text-anchor="end" font-size="10" font-weight="700" fill="'+o.mutedColor+'">'+c[1]+'</text>'; cx+=c[2]; });
  rows.forEach(function(r,i){ var y=top+rh*i, c=col[r.status], wv=isFinite(r.woc)?r.woc:cap;
    s+='<text x="'+(x0-8)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+woc_esc(woc_trunc(r.label,Math.floor(lw/6.3)))+'</text>';
    s+='<rect x="'+x0+'" y="'+(y+6)+'" width="'+Math.max(1,X(wv)-x0).toFixed(1)+'" height="'+(rh-12)+'" rx="2" fill="'+c+'"><title>'+woc_esc(r.label+": "+(isFinite(r.woc)?r.woc.toFixed(1):"∞")+" weeks ("+woc_fmt(r.stock,o.valueScale,1,"","")+" stock ÷ "+woc_fmt(r.weeklySales,o.valueScale,1,"","")+"/wk)")+'</title></rect>';
    s+='<text x="'+(X(wv)+5).toFixed(1)+'" y="'+(y+rh/2+4)+'" font-size="10.5" font-weight="700" fill="'+c+'">'+(isFinite(r.woc)?r.woc.toFixed(1):"no sales")+(wv>cap?"+":"")+'</text>';
    var cx2=x1+12;
    if(hasV){ s+='<text x="'+(cx2+colW+16)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+woc_esc(r.stockValue==null?"–":woc_money(r.stockValue,o))+'</text>'; cx2+=colW+20; }
    if(hasO){ var p=pct(r.oos,oosFrac); s+='<text x="'+(cx2+colW-4)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" font-weight="'+(p>o.oosTarget?700:400)+'" fill="'+(p>o.oosTarget?o.lowColor:o.inkColor)+'">'+(p==null?"–":p.toFixed(1)+"%")+'</text>'; cx2+=colW; }
    if(hasA){ var a=pct(r.aged,agedFrac); s+='<text x="'+(cx2+colW-4)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" font-weight="'+(a>o.agedTarget?700:400)+'" fill="'+(a>o.agedTarget?o.highColor:o.inkColor)+'">'+(a==null?"–":a.toFixed(1)+"%")+'</text>'; }
  });
  var low=rows.filter(function(r){return r.status==="low";}).length, high=rows.filter(function(r){return r.status==="high";}).length;
  s+='<text x="16" y="'+(woc_headerH(o)+14)+'" font-size="11" fill="'+o.mutedColor+'"><tspan fill="'+o.lowColor+'" font-weight="700">'+low+' under-covered</tspan> · <tspan fill="'+o.highColor+'" font-weight="700">'+high+' over-stocked</tspan> · '+(rows.length-low-high)+' in band</text>';
  return s+'</svg>';
}
