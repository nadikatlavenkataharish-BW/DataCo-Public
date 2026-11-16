/*!
 * B-BBEE Management Control — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * B-BBEE Management Control Scorecard — canonical renderer (v0.1)
 * Generic Codes (Code 200) Management Control from HR data: black and black
 * female representation per management level vs compliance targets, points
 * per indicator (pro-rata, capped at weighting) and total out of 19.
 *
 * input : { rows:[{level, race, gender, nationality, count, disabled}] }
 * opts  : see bmcDefaults()
 * ========================================================================== */
function bmcDefaults(){
  return {
    title: "B-BBEE Management Control", subtitle: "Generic Codes — Code 200 (from HR data)",
    // Level:blackPoints:blackTarget%:blackFemalePoints:blackFemaleTarget%
    indicators: "Board:2:50:1:25,Executive directors:2:50:1:25,Other executive management:2:60:1:30,Senior management:2:60:1:30,Middle management:2:75:1:38,Junior management:1:88:1:44",
    disabledPoints: 2, disabledTarget: 2,     // black employees with disabilities, % of all employees
    foreignLabels: "Foreign national,Foreign nationals,Foreign,Non-SA,Non South African",
    showNotAvailable: true,
    barColor: "#0A6ED1", femaleColor: "#925ACE", goodColor: "#1A9850", badColor: "#D73027", trackColor: "#EEF1F4",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 980, height: 520
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var bmc_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function bmc_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function bmc_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function bmc_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function bmc_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function bmc_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function bmc_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function bmc_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function bmc_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+bmc_FONT+'" font-size="13" fill="#8794A0">'+bmc_esc(text)+'</text></svg>';
}
function bmc_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+bmc_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+bmc_esc(o.subtitle)+'</text>';
  return s;
}
function bmc_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function bmc_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return bmc_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return bmc_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function bmc_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function bmc_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function bmc_money(v, o, dec){ return bmc_fmt(v, o.valueScale, dec==null?o.decimals:dec, bmc_cur(o), ""); }
/* South African EE / B-BBEE classification helpers */
function bmc_race(label, foreignLabels){
  var s=String(label==null?"":label).toLowerCase().trim();
  var fl=String(foreignLabels||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
  for(var i=0;i<fl.length;i++) if(s===fl[i] || (fl[i].length>3 && s.indexOf(fl[i])>=0)) return "FN";
  if(/^a\b|african|black african/.test(s)) return "A";
  if(/^c\b|coloured|colored/.test(s)) return "C";
  if(/^i\b|indian|asian/.test(s)) return "I";
  if(/^w\b|white/.test(s)) return "W";
  return null;
}
function bmc_gender(label){ var s=String(label==null?"":label).toLowerCase().trim(); if(/^f|^w(oman|omen)/.test(s)) return "F"; if(/^m|^man|^men/.test(s)) return "M"; return null; }
function bmc_matchLevel(label, list){ var s=String(label).toLowerCase(); for(var i=0;i<list.length;i++){ var t=list[i].toLowerCase(); if(s===t||s.indexOf(t)>=0||t.indexOf(s)>=0) return i; } return -1; }

function bmcSpecs(s){ return String(s||"").split(",").map(function(p){ var a=p.split(":"); return a.length>=5 ? {name:a[0].trim(), bp:+a[1], bt:+a[2], fp:+a[3], ft:+a[4]} : null; }).filter(Boolean); }
function bmcCompute(rows, o){
  var specs=bmcSpecs(o.indicators), names=specs.map(function(x){return x.name;}), lv=specs.map(function(){return {total:0,black:0,bf:0,seen:false};});
  var emp=0, blackDis=0, hasDis=false;
  rows.forEach(function(r){ var n=r.count||0, race=bmc_race(r.race,o.foreignLabels);
    if(r.nationality!=null && bmc_race(r.nationality,o.foreignLabels)==="FN") race="FN";
    var black = race==="A"||race==="C"||race==="I", fem = bmc_gender(r.gender)==="F";
    emp+=n; if(r.disabled!=null){ hasDis=true; if(black) blackDis+=r.disabled; }
    var i=bmc_matchLevel(r.level,names); if(i<0) return;
    var L=lv[i]; L.seen=true; L.total+=n; if(black){ L.black+=n; if(fem) L.bf+=n; } });
  var items=[], got=0, avail=0, max=0;
  specs.forEach(function(sp,i){ var L=lv[i];
    [["Black",sp.bp,sp.bt,"black"],["Black female",sp.fp,sp.ft,"bf"]].forEach(function(d){
      max+=d[1]; var pct = L.seen&&L.total ? L[d[3]]/L.total*100 : null, pts = pct==null?null:Math.min(1,pct/d[2])*d[1];
      if(pts!=null){ got+=pts; avail+=d[1]; }
      items.push({level:sp.name, kind:d[0], weight:d[1], target:d[2], pct:pct, pts:pts, n:L.seen?L[d[3]]:null, total:L.total}); }); });
  var dpct = hasDis&&emp ? blackDis/emp*100 : null, dpts = dpct==null?null:Math.min(1,dpct/o.disabledTarget)*o.disabledPoints;
  max+= +o.disabledPoints; if(dpts!=null){ got+=dpts; avail+= +o.disabledPoints; }
  items.push({level:"Employees with disabilities", kind:"Black", weight:+o.disabledPoints, target:+o.disabledTarget, pct:dpct, pts:dpts, n:hasDis?blackDis:null, total:emp});
  return {items:items, got:got, avail:avail, max:max, employees:emp};
}
function buildBmcSVG(input, opts){
  var o = Object.assign(bmcDefaults(), opts||{});
  var W = Math.max(560, +o.width||980);
  var rows=(input&&input.rows)||[];
  if(!rows.length) return bmc_msg(W, Math.max(240,+o.height||520), "Bind Management level, Race, Gender plus Headcount (and optional Disabled headcount).");
  var R=bmcCompute(rows,o), items=R.items.filter(function(it){return o.showNotAvailable || it.pct!=null;});
  var top=bmc_headerH(o)+86, rh=26, lw=Math.min(260,W*0.27), H=Math.max(+o.height||0, top+rh*items.length+40);
  var x0=16+lw+110, ptsW=110, pw=W-16-ptsW-x0-60;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+bmc_FONT+'">';
  s+=bmc_header(o,W);
  // score tiles
  var ty=bmc_headerH(o)+4, tiles=[["Points scored",R.got.toFixed(2)+" / "+R.max,o.inkColor],["Of points with data",R.avail?(R.got/R.avail*100).toFixed(1)+"%":"–",R.avail&&R.got/R.avail>=0.8?o.goodColor:o.badColor],["Employees in scope",bmc_fmt(R.employees,"none",0),o.inkColor]];
  var tw=(W-32-20)/3;
  tiles.forEach(function(t,i){ var x=16+i*(tw+10);
    s+='<rect x="'+x.toFixed(1)+'" y="'+ty+'" width="'+tw.toFixed(1)+'" height="58" rx="8" fill="#F7F9FB" stroke="#E3E8ED"/>';
    s+='<text x="'+(x+12).toFixed(1)+'" y="'+(ty+18)+'" font-size="11" fill="'+o.mutedColor+'">'+t[0]+'</text><text x="'+(x+12).toFixed(1)+'" y="'+(ty+44)+'" font-size="20" font-weight="700" fill="'+t[2]+'">'+bmc_esc(t[1])+'</text>'; });
  s+='<text x="'+(16+lw)+'" y="'+(top-8)+'" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Actual</text>';
  s+='<text x="'+x0+'" y="'+(top-8)+'" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Actual vs compliance target</text>';
  s+='<text x="'+(W-16)+'" y="'+(top-8)+'" text-anchor="end" font-size="10" font-weight="700" fill="'+o.mutedColor+'">Points</text>';
  var lastLevel=null;
  items.forEach(function(it,i){ var y=top+rh*i, first=it.level!==lastLevel; lastLevel=it.level;
    if(first && i>0) s+='<line x1="16" x2="'+(W-16)+'" y1="'+y+'" y2="'+y+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="16" y="'+(y+rh/2+4)+'" font-size="11" font-weight="'+(first?700:400)+'" fill="'+(first?o.inkColor:o.mutedColor)+'">'+(first?bmc_esc(it.level)+' · ':'')+it.kind+'</text>';
    var col = it.kind==="Black female" ? o.femaleColor : o.barColor, mx=Math.max(100, it.target*1.25);
    s+='<rect x="'+x0+'" y="'+(y+7)+'" width="'+pw+'" height="'+(rh-14)+'" rx="3" fill="'+o.trackColor+'"/>';
    var tx=x0+pw*Math.min(1,it.target/mx);
    if(it.pct!=null){ var w=pw*Math.min(1,it.pct/mx), ok=it.pct>=it.target;
      s+='<rect x="'+x0+'" y="'+(y+7)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(rh-14)+'" rx="3" fill="'+col+'"><title>'+bmc_esc(it.level+" — "+it.kind+": "+it.n+" of "+it.total+" ("+it.pct.toFixed(1)+"%), target "+it.target+"%")+'</title></rect>';
      s+='<text x="'+(16+lw)+'" y="'+(y+rh/2+4)+'" font-size="11.5" font-weight="700" fill="'+(ok?o.goodColor:o.badColor)+'">'+it.pct.toFixed(1)+'%</text>'; }
    else s+='<text x="'+(16+lw)+'" y="'+(y+rh/2+4)+'" font-size="10.5" fill="'+o.mutedColor+'">no data</text>';
    s+='<rect x="'+(tx-1).toFixed(1)+'" y="'+(y+3)+'" width="2.5" height="'+(rh-6)+'" fill="'+o.inkColor+'"/><text x="'+(tx+4).toFixed(1)+'" y="'+(y+rh/2+4)+'" font-size="9.5" fill="'+o.inkColor+'">'+it.target+'%</text>';
    s+='<text x="'+(W-16)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11.5" font-weight="700" fill="'+(it.pts==null?o.mutedColor:(it.pts>=it.weight-1e-9?o.goodColor:o.inkColor))+'">'+(it.pts==null?"n/a":it.pts.toFixed(2))+' <tspan font-weight="400" fill="'+o.mutedColor+'">/ '+it.weight+'</tspan></text>';
  });
  s+='<text x="16" y="'+(H-12)+'" font-size="9.5" fill="'+o.mutedColor+'">Black = African, Coloured and Indian South African citizens. Points = min(actual ÷ target, 1) × weighting. Levels without data (typically Board / executive directors from the company register) score n/a.</text>';
  return s+'</svg>';
}
