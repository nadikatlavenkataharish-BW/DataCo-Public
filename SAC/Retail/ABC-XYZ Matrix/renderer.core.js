/*!
 * ABC/XYZ Matrix — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * ABC / XYZ Matrix — canonical renderer (v0.1)
 * Classifies SKUs by revenue contribution (A/B/C, cumulative share) and demand
 * variability (X/Y/Z, coefficient of variation across periods) into a 3×3 grid
 * with SKU counts, revenue share and a suggested policy per cell.
 *
 * input : { skus:[{label, revenue, cv}] }   // cv computed from periods by the adapter
 * opts  : see abcDefaults()
 * ========================================================================== */
function abcDefaults(){
  return {
    title: "ABC / XYZ Matrix", subtitle: "Revenue contribution × demand variability",
    aCut: 80, bCut: 95,               // cumulative revenue % boundaries
    xCut: 0.5, yCut: 1.0,             // coefficient-of-variation boundaries
    showActions: true, showTopSkus: true,
    actions: "Auto-replenish,Safety stock,Make to order,Auto-replenish,Review buffer,Order on demand,Automate / bulk,Periodic review,Delist candidate",
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    hiColor: "#0A6ED1", loColor: "#EEF4FB",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 900, height: 480
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var abc_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function abc_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function abc_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function abc_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function abc_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function abc_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function abc_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function abc_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function abc_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+abc_FONT+'" font-size="13" fill="#8794A0">'+abc_esc(text)+'</text></svg>';
}
function abc_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+abc_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+abc_esc(o.subtitle)+'</text>';
  return s;
}
function abc_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function abc_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return abc_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return abc_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function abc_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function abc_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function abc_money(v, o, dec){ return abc_fmt(v, o.valueScale, dec==null?o.decimals:dec, abc_cur(o), ""); }

function abc_mix(a,b,t){ function rgb(h){h=h.replace("#","");return [0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16);});} var x=rgb(a),y=rgb(b); return "#"+x.map(function(v,i){var c=Math.round(v+(y[i]-v)*t).toString(16);return c.length<2?"0"+c:c;}).join(""); }
function abcClassify(skus, o){
  var tot=skus.reduce(function(s,k){return s+Math.max(0,k.revenue||0);},0), cum=0;
  skus.slice().sort(function(a,b){return (b.revenue||0)-(a.revenue||0);}).forEach(function(k){ cum+=Math.max(0,k.revenue||0); var p=tot?cum/tot*100:100;
    k.abc = p<=o.aCut || (p-(k.revenue/tot*100))<o.aCut ? "A" : (p<=o.bCut || (p-(k.revenue/tot*100))<o.bCut ? "B" : "C");
    k.xyz = k.cv==null ? "Z" : (k.cv<=o.xCut ? "X" : (k.cv<=o.yCut ? "Y" : "Z")); });
  return tot;
}
function buildAbcXyzSVG(input, opts){
  var o = Object.assign(abcDefaults(), opts||{});
  var W = Math.max(420, +o.width||900), H = Math.max(300, +o.height||480);
  var skus=((input&&input.skus)||[]).filter(function(k){return k.revenue!=null;});
  if(!skus.length) return abc_msg(W,H,"Bind SKU and Period dimensions plus a Revenue measure.");
  var tot=abcClassify(skus,o), cur=abc_cur(o), A="ABC", X="XYZ", acts=String(o.actions).split(",");
  var cell={}; skus.forEach(function(k){ var key=k.abc+k.xyz, c=cell[key]||(cell[key]={n:0,rev:0,list:[]}); c.n++; c.rev+=k.revenue||0; c.list.push(k); });
  var maxShare=Math.max.apply(null,Object.keys(cell).map(function(k){return cell[k].rev/tot;}))||1;
  var top=abc_headerH(o)+34, left=110, side=o.showTopSkus?200:0, gw=W-left-16-side, gh=H-top-40, cw=gw/3, ch=gh/3;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+abc_FONT+'">';
  s+=abc_header(o,W);
  var xl=["X · stable (CV ≤ "+o.xCut+")","Y · variable (≤ "+o.yCut+")","Z · erratic (> "+o.yCut+")"], al=["A · top "+o.aCut+"%","B · next "+(o.bCut-o.aCut)+"%","C · last "+(100-o.bCut)+"%"];
  xl.forEach(function(t,j){ s+='<text x="'+(left+cw*j+cw/2).toFixed(1)+'" y="'+(top-10)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+o.mutedColor+'">'+abc_esc(t)+'</text>'; });
  al.forEach(function(t,i){ s+='<text x="'+(left-10)+'" y="'+(top+ch*i+ch/2+4).toFixed(1)+'" text-anchor="end" font-size="11" font-weight="700" fill="'+o.mutedColor+'">'+abc_esc(t)+'</text>'; });
  for(var i=0;i<3;i++) for(var j=0;j<3;j++){
    var c=cell[A[i]+X[j]]||{n:0,rev:0}, share=tot?c.rev/tot:0, t=Math.sqrt(share/maxShare), fill=abc_mix(o.loColor,o.hiColor,0.08+0.8*t), dark=t>0.55;
    var x=left+cw*j, y=top+ch*i, tc=dark?"#FFFFFF":o.inkColor, mc=dark?"#E6EEF8":o.mutedColor;
    s+='<rect x="'+(x+3).toFixed(1)+'" y="'+(y+3).toFixed(1)+'" width="'+(cw-6).toFixed(1)+'" height="'+(ch-6).toFixed(1)+'" rx="8" fill="'+fill+'"><title>'+abc_esc(A[i]+X[j]+": "+c.n+" SKUs, "+abc_money(c.rev,o)+" ("+(share*100).toFixed(1)+"% of revenue)")+'</title></rect>';
    s+='<text x="'+(x+14).toFixed(1)+'" y="'+(y+24).toFixed(1)+'" font-size="14" font-weight="700" fill="'+tc+'">'+A[i]+X[j]+'</text>';
    s+='<text x="'+(x+cw-14).toFixed(1)+'" y="'+(y+24).toFixed(1)+'" text-anchor="end" font-size="11" fill="'+mc+'">'+c.n+' SKUs</text>';
    s+='<text x="'+(x+14).toFixed(1)+'" y="'+(y+ch/2+10).toFixed(1)+'" font-size="20" font-weight="700" fill="'+tc+'">'+(share*100).toFixed(1)+'%</text>';
    s+='<text x="'+(x+14).toFixed(1)+'" y="'+(y+ch/2+26).toFixed(1)+'" font-size="10.5" fill="'+mc+'">'+abc_esc(abc_money(c.rev,o))+' revenue</text>';
    if(o.showActions && acts[i*3+j]) s+='<text x="'+(x+14).toFixed(1)+'" y="'+(y+ch-14).toFixed(1)+'" font-size="10.5" font-style="italic" fill="'+mc+'">→ '+abc_esc(acts[i*3+j].trim())+'</text>';
  }
  if(o.showTopSkus){ var sx=W-side+8, sy=top;
    var az=skus.filter(function(k){return k.abc==="A"&&k.xyz==="Z";}).sort(function(a,b){return b.revenue-a.revenue;}).slice(0,8);
    s+='<text x="'+sx+'" y="'+(sy+4)+'" font-size="11.5" font-weight="700" fill="'+o.inkColor+'">AZ watch-list</text><text x="'+sx+'" y="'+(sy+19)+'" font-size="10" fill="'+o.mutedColor+'">High value, erratic demand</text>';
    if(!az.length) s+='<text x="'+sx+'" y="'+(sy+44)+'" font-size="10.5" fill="'+o.mutedColor+'">None</text>';
    az.forEach(function(k,i){ var y=sy+44+i*22;
      s+='<text x="'+sx+'" y="'+y+'" font-size="10.5" fill="'+o.inkColor+'">'+abc_esc(abc_trunc(k.label,20))+'</text><text x="'+(W-16)+'" y="'+y+'" text-anchor="end" font-size="10.5" font-weight="600" fill="'+o.inkColor+'">'+abc_esc(abc_money(k.revenue,o))+'</text>'; });
  }
  s+='<text x="'+left+'" y="'+(H-12)+'" font-size="10" fill="'+o.mutedColor+'">'+skus.length+' SKUs · '+abc_esc(abc_money(tot,o))+' revenue · darker = larger revenue share</text>';
  return s+'</svg>';
}
