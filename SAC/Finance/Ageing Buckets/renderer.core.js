/*!
 * Ageing Buckets (AR/AP) — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Ageing Buckets (AR / AP) — canonical renderer (v0.1)
 * Stacked horizontal bars per customer / vendor across ageing buckets
 * (Current, 1-30, 31-60, 61-90, 90+ …), Top-N + Other, with summary tiles.
 *
 * input : { buckets:[label…], rows:[{label, values:[…]}] }
 * opts  : see ageDefaults()
 * ========================================================================== */
function ageDefaults(){
  return {
    title: "Debtors Ageing", subtitle: "Outstanding balance by days overdue",
    topN: 10, sortBy: "overdue",      // overdue | total | name
    currentBuckets: 1,                // how many leading buckets count as not overdue
    showTiles: true, showPct: true,
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    bucketColors: "#1A9850,#A6D96A,#FEE08B,#FDAE61,#F46D43,#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 960, height: 460
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var age_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function age_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function age_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function age_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function age_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function age_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function age_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function age_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function age_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+age_FONT+'" font-size="13" fill="#8794A0">'+age_esc(text)+'</text></svg>';
}
function age_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+age_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+age_esc(o.subtitle)+'</text>';
  return s;
}
function age_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function age_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return age_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return age_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function age_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function age_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function age_money(v, o, dec){ return age_fmt(v, o.valueScale, dec==null?o.decimals:dec, age_cur(o), ""); }

function buildAgeingSVG(input, opts){
  var o = Object.assign(ageDefaults(), opts||{});
  var W = Math.max(420, +o.width||960);
  var B=(input&&input.buckets)||[], rows=((input&&input.rows)||[]).filter(function(r){return r.values.some(function(v){return v;});});
  if(!rows.length||!B.length) return age_msg(W, Math.max(220,+o.height||460), "Bind a Customer/Vendor dimension and bucket measures (Current → oldest).");
  var cb=Math.max(0,Math.min(B.length,+o.currentBuckets||0)), cur=age_cur(o);
  rows.forEach(function(r){ r.total=r.values.reduce(function(a,b){return a+(b||0);},0); r.over=r.values.slice(cb).reduce(function(a,b){return a+(b||0);},0); });
  var grand=B.map(function(_,k){return rows.reduce(function(s,r){return s+(r.values[k]||0);},0);}), gt=grand.reduce(function(a,b){return a+b;},0);
  if(o.sortBy==="total") rows.sort(function(a,b){return b.total-a.total;});
  else if(o.sortBy==="name") rows.sort(function(a,b){return a.label<b.label?-1:1;});
  else rows.sort(function(a,b){return b.over-a.over;});
  var n=Math.max(1,+o.topN||10);
  if(rows.length>n){ var rest=rows.slice(n), other={label:"Other ("+rest.length+")", values:B.map(function(_,k){return rest.reduce(function(s,r){return s+(r.values[k]||0);},0);})};
    other.total=other.values.reduce(function(a,b){return a+b;},0); other.over=other.values.slice(cb).reduce(function(a,b){return a+b;},0); rows=rows.slice(0,n).concat([other]); }
  var cols=String(o.bucketColors).split(",").map(function(x){return x.trim();});
  function bcol(k){ if(B.length<=cols.length){ var idx=Math.round(k*(cols.length-1)/Math.max(1,B.length-1)); return cols[idx]; } return cols[k%cols.length]; }
  var tilesH=o.showTiles?66:0, legH=22, top=age_headerH(o)+tilesH+legH+10, rh=26, lw=160, rcol=150;
  var H=Math.max(+o.height||0, top+rh*rows.length+30), x0=16+lw, x1=W-16-rcol, pw=x1-x0;
  var mx=Math.max.apply(null,rows.map(function(r){return r.total;}))||1, nx=age_nice(0,mx,4);
  var X=function(v){return x0+pw*v/nx.hi;};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+age_FONT+'">';
  s+=age_header(o,W);
  if(o.showTiles){ var over=gt-grand.slice(0,cb).reduce(function(a,b){return a+b;},0), last=grand[grand.length-1];
    var tiles=[["Total outstanding",age_money(gt,o),o.inkColor],["Overdue",age_money(over,o)+"  ("+(gt?(over/gt*100).toFixed(1):"0")+"%)",over/gt>0.3?bcol(B.length-1):o.inkColor],
               [B[B.length-1]+" days",age_money(last,o)+"  ("+(gt?(last/gt*100).toFixed(1):"0")+"%)",bcol(B.length-1)]];
    var tw=(W-32-20)/3, ty=age_headerH(o)+2;
    tiles.forEach(function(t,i){ var x=16+i*(tw+10);
      s+='<rect x="'+x+'" y="'+ty+'" width="'+tw.toFixed(1)+'" height="'+(tilesH-10)+'" rx="8" fill="#F7F9FB" stroke="#E3E8ED"/>';
      s+='<text x="'+(x+12)+'" y="'+(ty+18)+'" font-size="11" fill="'+o.mutedColor+'">'+age_esc(t[0])+'</text><text x="'+(x+12)+'" y="'+(ty+43)+'" font-size="18" font-weight="700" fill="'+t[2]+'">'+age_esc(t[1])+'</text>'; }); }
  var lx=x0, ly=top-legH+4;
  B.forEach(function(b,k){ s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="12" height="10" rx="2" fill="'+bcol(k)+'"/><text x="'+(lx+16)+'" y="'+ly+'" font-size="10.5" fill="'+o.inkColor+'">'+age_esc(b)+'</text>'; lx+=26+String(b).length*6.2; });
  s+='<text x="'+(W-16)+'" y="'+ly+'" text-anchor="end" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Total · % overdue</text>';
  nx.ticks.forEach(function(v){ var x=X(v); s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+top+'" y2="'+(top+rh*rows.length)+'" stroke="'+o.gridColor+'"/><text x="'+x.toFixed(1)+'" y="'+(top+rh*rows.length+14)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+age_esc(age_fmt(v,o.valueScale,nx.dec>0?1:0,cur,""))+'</text>'; });
  rows.forEach(function(r,i){ var y=top+rh*i, xx=x0;
    s+='<text x="'+(x0-8)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+age_esc(age_trunc(r.label,Math.floor(lw/6.3)))+'</text>';
    r.values.forEach(function(v,k){ if(!v) return; var w=X(v)-x0;
      s+='<rect x="'+xx.toFixed(1)+'" y="'+(y+4)+'" width="'+Math.max(0.5,w).toFixed(1)+'" height="'+(rh-8)+'" fill="'+bcol(k)+'"><title>'+age_esc(r.label+" · "+B[k]+": "+age_money(v,o))+'</title></rect>'; xx+=w; });
    var pc=r.total?r.over/r.total*100:0;
    s+='<text x="'+(W-16-56)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" font-weight="600" fill="'+o.inkColor+'">'+age_esc(age_money(r.total,o))+'</text>';
    if(o.showPct) s+='<text x="'+(W-16)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" font-weight="700" fill="'+(pc>50?bcol(B.length-1):pc>25?bcol(Math.floor(B.length/2)):o.mutedColor)+'">'+pc.toFixed(0)+'%</text>'; });
  return s+'</svg>';
}
