/*!
 * B-BBEE Skills Development — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * B-BBEE Skills Development Scorecard — canonical renderer (v0.1)
 * Generic Codes (Code 300): learning-programme spend on black people and black
 * people with disabilities (% of leviable amount), black learners and black
 * unemployed learners (% of headcount), absorption bonus, 40% sub-minimum.
 *
 * input : { v:{leviable, spendBlack, spendDisabled, learners, unemployed, employees, absorbed} }
 * opts  : see bsdDefaults()
 * ========================================================================== */
function bsdDefaults(){
  return {
    title: "B-BBEE Skills Development", subtitle: "Generic Codes — Code 300",
    pts1: 8, tgt1: 6,       // spend on black people, % of leviable amount
    pts2: 4, tgt2: 0.3,     // spend on black people with disabilities, % of leviable amount
    pts3: 4, tgt3: 2.5,     // black people in learnerships / apprenticeships / internships, % of employees
    pts4: 4, tgt4: 2.5,     // black unemployed people in learning programmes, % of employees
    bonusPts: 5, bonusTgt: 100,   // absorption of black learners at end of programme, %
    subMinimum: 40,               // % of element points (priority element)
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    barColor: "#0A6ED1", bonusColor: "#925ACE", goodColor: "#1A9850", badColor: "#D73027", trackColor: "#EEF1F4",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 980, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var bsd_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function bsd_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function bsd_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function bsd_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function bsd_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function bsd_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function bsd_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function bsd_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function bsd_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+bsd_FONT+'" font-size="13" fill="#8794A0">'+bsd_esc(text)+'</text></svg>';
}
function bsd_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+bsd_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+bsd_esc(o.subtitle)+'</text>';
  return s;
}
function bsd_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function bsd_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return bsd_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return bsd_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function bsd_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function bsd_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function bsd_money(v, o, dec){ return bsd_fmt(v, o.valueScale, dec==null?o.decimals:dec, bsd_cur(o), ""); }
/* South African EE / B-BBEE classification helpers */
function bsd_race(label, foreignLabels){
  var s=String(label==null?"":label).toLowerCase().trim();
  var fl=String(foreignLabels||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
  for(var i=0;i<fl.length;i++) if(s===fl[i] || (fl[i].length>3 && s.indexOf(fl[i])>=0)) return "FN";
  if(/^a\b|african|black african/.test(s)) return "A";
  if(/^c\b|coloured|colored/.test(s)) return "C";
  if(/^i\b|indian|asian/.test(s)) return "I";
  if(/^w\b|white/.test(s)) return "W";
  return null;
}
function bsd_gender(label){ var s=String(label==null?"":label).toLowerCase().trim(); if(/^f|^w(oman|omen)/.test(s)) return "F"; if(/^m|^man|^men/.test(s)) return "M"; return null; }
function bsd_matchLevel(label, list){ var s=String(label).toLowerCase(); for(var i=0;i<list.length;i++){ var t=list[i].toLowerCase(); if(s===t||s.indexOf(t)>=0||t.indexOf(s)>=0) return i; } return -1; }

function bsdCompute(v, o){
  var L=v.leviable, E=v.employees;
  var ind=[
    {name:"Learning programme spend on black people", basis:"of leviable amount", num:v.spendBlack, den:L, w:+o.pts1, t:+o.tgt1, money:true},
    {name:"Spend on black people with disabilities", basis:"of leviable amount", num:v.spendDisabled, den:L, w:+o.pts2, t:+o.tgt2, money:true},
    {name:"Black learnerships, apprenticeships, internships", basis:"of total employees", num:v.learners, den:E, w:+o.pts3, t:+o.tgt3},
    {name:"Black unemployed people in learning programmes", basis:"of total employees", num:v.unemployed, den:E, w:+o.pts4, t:+o.tgt4}];
  var core=0, max=0;
  ind.forEach(function(i){ i.pct = (i.num!=null&&i.den)? i.num/i.den*100 : null; i.pts = i.pct==null?null:Math.min(1,i.pct/i.t)*i.w; max+=i.w; if(i.pts!=null) core+=i.pts; });
  var b={name:"Bonus: black learners absorbed", basis:"absorbed at end of programme", pct:v.absorbed==null?null:(Math.abs(v.absorbed)<=1.5?v.absorbed*100:v.absorbed), w:+o.bonusPts, t:+o.bonusTgt, bonus:true};
  b.pts = b.pct==null?null:Math.min(1,b.pct/b.t)*b.w;
  var subMinPts=max*o.subMinimum/100;
  return {ind:ind, bonus:b, core:core, max:max, total:core+(b.pts||0), subMinPts:subMinPts, subMinMet:core>=subMinPts-1e-9};
}
function buildBsdSVG(input, opts){
  var o = Object.assign(bsdDefaults(), opts||{});
  var W = Math.max(560, +o.width||980), H = Math.max(320, +o.height||440);
  var v=(input&&input.v)||null;
  if(!v || !v.leviable) return bsd_msg(W,H,"Bind measures in order: Leviable amount, Spend on black people, Spend on black disabled, Black learners, Black unemployed learners, Total employees, Absorption % (optional).");
  var R=bsdCompute(v,o), cur=bsd_cur(o);
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+bsd_FONT+'">';
  s+=bsd_header(o,W);
  var ty=bsd_headerH(o)+4, tw=(W-32-30)/4;
  var tiles=[["Points (excl. bonus)",R.core.toFixed(2)+" / "+R.max,o.inkColor],["Bonus points",R.bonus.pts==null?"–":R.bonus.pts.toFixed(2)+" / "+R.bonus.w,o.bonusColor],
             ["Sub-minimum ("+o.subMinimum+"% = "+R.subMinPts.toFixed(1)+" pts)",R.subMinMet?"Met":"Not met — level discounted",R.subMinMet?o.goodColor:o.badColor],["Leviable amount",bsd_money(v.leviable,o),o.inkColor]];
  tiles.forEach(function(t,i){ var x=16+i*(tw+10);
    s+='<rect x="'+x.toFixed(1)+'" y="'+ty+'" width="'+tw.toFixed(1)+'" height="58" rx="8" fill="'+(i===2?(R.subMinMet?"#EEF8F1":"#FDEEEE"):"#F7F9FB")+'" stroke="#E3E8ED"/>';
    s+='<text x="'+(x+12).toFixed(1)+'" y="'+(ty+18)+'" font-size="10.5" fill="'+o.mutedColor+'">'+bsd_esc(t[0])+'</text><text x="'+(x+12).toFixed(1)+'" y="'+(ty+43)+'" font-size="'+(i===2&&!R.subMinMet?13:18)+'" font-weight="700" fill="'+t[2]+'">'+bsd_esc(t[1])+'</text>'; });
  var top=ty+84, rh=Math.min(56,(H-top-24)/5), lw=Math.min(330,W*0.34), x0=16+lw, pw=W-16-120-x0;
  var all=R.ind.concat([R.bonus]);
  all.forEach(function(it,i){ var y=top+rh*i, col=it.bonus?o.bonusColor:o.barColor, mx=it.t*1.25;
    s+='<text x="16" y="'+(y+16)+'" font-size="11.5" font-weight="700" fill="'+o.inkColor+'">'+bsd_esc(it.name)+'</text>';
    var det = it.pct==null ? "no data" : it.pct.toFixed(it.t<1?2:1)+"% "+it.basis+(it.money&&it.num!=null?" · "+bsd_money(it.num,o):(it.num!=null&&!it.bonus?" · "+bsd_fmt(it.num,"none",0)+" people":""));
    s+='<text x="16" y="'+(y+32)+'" font-size="10.5" fill="'+o.mutedColor+'">'+bsd_esc(det)+'</text>';
    s+='<rect x="'+x0+'" y="'+(y+8)+'" width="'+pw.toFixed(1)+'" height="16" rx="3" fill="'+o.trackColor+'"/>';
    if(it.pct!=null) s+='<rect x="'+x0+'" y="'+(y+8)+'" width="'+Math.max(1,pw*Math.min(1,it.pct/mx)).toFixed(1)+'" height="16" rx="3" fill="'+col+'"><title>'+bsd_esc(it.name+": "+it.pct.toFixed(2)+"% vs target "+it.t+"%")+'</title></rect>';
    var tx=x0+pw*(it.t/mx); s+='<rect x="'+(tx-1).toFixed(1)+'" y="'+(y+4)+'" width="2.5" height="24" fill="'+o.inkColor+'"/><text x="'+tx.toFixed(1)+'" y="'+(y+40)+'" text-anchor="middle" font-size="9.5" fill="'+o.inkColor+'">target '+it.t+'%</text>';
    s+='<text x="'+(W-16)+'" y="'+(y+21)+'" text-anchor="end" font-size="13" font-weight="700" fill="'+(it.pts==null?o.mutedColor:(it.pts>=it.w-1e-9?o.goodColor:o.inkColor))+'">'+(it.pts==null?"n/a":it.pts.toFixed(2))+' <tspan font-size="10.5" font-weight="400" fill="'+o.mutedColor+'">/ '+it.w+(it.bonus?" bonus":"")+'</tspan></text>';
  });
  s+='<text x="16" y="'+(H-10)+'" font-size="9.5" fill="'+o.mutedColor+'">Points = min(actual ÷ target, 1) × weighting. Skills Development is a priority element: below the sub-minimum the overall B-BBEE level drops by one. Black = African, Coloured, Indian SA citizens.</text>';
  return s+'</svg>';
}
