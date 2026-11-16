/*!
 * EE Workforce Profile (EEA2) — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * EE Workforce Profile (EEA2) — canonical renderer (v0.1)
 * South African Employment Equity workforce table: occupational level ×
 * (Male A C I W | Female A C I W | Foreign nationals M F) with totals, and
 * designated-male %, designated-female % and disability % against targets.
 *
 * input : { rows:[{level, race, gender, nationality, count, disabled}] }
 * opts  : see eepDefaults()
 * ========================================================================== */
function eepDefaults(){
  return {
    title: "Employment Equity Workforce Profile", subtitle: "EEA2 — total number of employees by occupational level",
    levelOrder: "Top management,Senior management,Professionally qualified,Skilled technical,Semi-skilled,Unskilled",
    foreignLabels: "Foreign national,Foreign nationals,Foreign,Non-SA,Non South African",
    targets: "",                      // sectoral / EE-plan targets per level, % designated male / female: "Top management:15/25,Senior management:18/30"
    disabilityTarget: 3,              // % persons with disabilities (all employees)
    showPercentRow: true, showRatios: true, shadeCells: true,
    shadeColor: "#0A6ED1", goodColor: "#1A9850", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED", headBg: "#F2F4F7",
    width: 1100, height: 360
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var eep_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function eep_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function eep_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function eep_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function eep_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function eep_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function eep_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function eep_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function eep_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+eep_FONT+'" font-size="13" fill="#8794A0">'+eep_esc(text)+'</text></svg>';
}
function eep_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+eep_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+eep_esc(o.subtitle)+'</text>';
  return s;
}
function eep_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function eep_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return eep_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return eep_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function eep_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function eep_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function eep_money(v, o, dec){ return eep_fmt(v, o.valueScale, dec==null?o.decimals:dec, eep_cur(o), ""); }
/* South African EE / B-BBEE classification helpers */
function eep_race(label, foreignLabels){
  var s=String(label==null?"":label).toLowerCase().trim();
  var fl=String(foreignLabels||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
  for(var i=0;i<fl.length;i++) if(s===fl[i] || (fl[i].length>3 && s.indexOf(fl[i])>=0)) return "FN";
  if(/^a\b|african|black african/.test(s)) return "A";
  if(/^c\b|coloured|colored/.test(s)) return "C";
  if(/^i\b|indian|asian/.test(s)) return "I";
  if(/^w\b|white/.test(s)) return "W";
  return null;
}
function eep_gender(label){ var s=String(label==null?"":label).toLowerCase().trim(); if(/^f|^w(oman|omen)/.test(s)) return "F"; if(/^m|^man|^men/.test(s)) return "M"; return null; }
function eep_matchLevel(label, list){ var s=String(label).toLowerCase(); for(var i=0;i<list.length;i++){ var t=list[i].toLowerCase(); if(s===t||s.indexOf(t)>=0||t.indexOf(s)>=0) return i; } return -1; }

function eepTargets(s){ var m={}; String(s||"").split(",").forEach(function(p){ var kv=p.split(":"); if(kv.length===2){ var mf=kv[1].split("/"); m[kv[0].trim().toLowerCase()]={m:+mf[0], f:mf.length>1?+mf[1]:null}; } }); return m; }
function eepAggregate(rows, o){
  var order=String(o.levelOrder).split(",").map(function(x){return x.trim();}).filter(Boolean), lv=[], idx={}, unk=0;
  var COLS=["MA","MC","MI","MW","FA","FC","FI","FW","FNM","FNF"];
  rows.forEach(function(r){
    var g=eep_gender(r.gender), race=eep_race(r.race, o.foreignLabels);
    if(r.nationality!=null && eep_race(r.nationality, o.foreignLabels)==="FN") race="FN";
    if(!g || !race){ unk+=r.count||0; return; }
    var key=String(r.level), L=idx[key];
    if(!L){ var oi=eep_matchLevel(key,order); L=idx[key]={label:key, ord:oi<0?100+lv.length:oi, c:{}, dis:0, total:0}; COLS.forEach(function(k){L.c[k]=0;}); lv.push(L); }
    var col = race==="FN" ? (g==="M"?"FNM":"FNF") : g+race;
    L.c[col]+=r.count||0; L.total+=r.count||0; L.dis+=r.disabled||0;
  });
  lv.sort(function(a,b){return a.ord-b.ord;});
  var T={label:"Total", c:{}, dis:0, total:0}; COLS.forEach(function(k){ T.c[k]=lv.reduce(function(s,L){return s+L.c[k];},0); });
  T.total=lv.reduce(function(s,L){return s+L.total;},0); T.dis=lv.reduce(function(s,L){return s+L.dis;},0);
  function ratios(L){ var t=L.total||0; L.dm = t? (L.c.MA+L.c.MC+L.c.MI)/t*100 : null; L.df = t? (L.c.FA+L.c.FC+L.c.FI+L.c.FW)/t*100 : null; L.pwd = t? L.dis/t*100 : null; }
  lv.forEach(ratios); ratios(T);
  return {levels:lv, total:T, cols:COLS, unclassified:unk};
}
function buildEepSVG(input, opts){
  var o = Object.assign(eepDefaults(), opts||{});
  var W = Math.max(640, +o.width||1100);
  var rows=(input&&input.rows)||[];
  if(!rows.length) return eep_msg(W, Math.max(220,+o.height||420), "Bind Occupational level, Race, Gender (and optional Nationality) plus Headcount.");
  var A=eepAggregate(rows,o), tg=eepTargets(o.targets), hasDis=rows.some(function(r){return r.disabled!=null;});
  var COLS=A.cols, heads=["A","C","I","W","A","C","I","W","M","F"];
  var lw=Math.min(250, Math.max(170, W*0.2)), ratioCols = o.showRatios ? (hasDis?3:2) : 0;
  var rw=86, totW=62, cw=Math.max(40,(W-32-lw-totW-ratioCols*rw)/COLS.length);
  var top=eep_headerH(o)+46, rh=32, nRows=A.levels.length+1+(o.showPercentRow?1:0);
  var H=top+rh*nRows+34;
  var x0=16+lw, xt=x0+cw*COLS.length, xr=xt+totW;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+eep_FONT+'">';
  s+=eep_header(o,W);
  // group headers
  var gy=top-40, groups=[["Male",0,4],["Female",4,8],["Foreign nationals",8,10]];
  groups.forEach(function(g){ var a=x0+cw*g[1], b=x0+cw*g[2];
    s+='<rect x="'+a.toFixed(1)+'" y="'+gy+'" width="'+(b-a-2).toFixed(1)+'" height="18" rx="3" fill="'+o.headBg+'"/><text x="'+((a+b)/2).toFixed(1)+'" y="'+(gy+13)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+o.inkColor+'">'+g[0]+'</text>'; });
  heads.forEach(function(h,j){ s+='<text x="'+(x0+cw*j+cw/2).toFixed(1)+'" y="'+(top-8)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+o.mutedColor+'">'+h+'</text>'; });
  s+='<text x="'+(xt+totW/2)+'" y="'+(top-8)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+o.mutedColor+'">Total</text>';
  s+='<text x="16" y="'+(top-8)+'" font-size="10.5" font-weight="700" fill="'+o.mutedColor+'">Occupational level</text>';
  var rhead=[["Desig. M","dm"],["Desig. F","df"]]; if(hasDis) rhead.push(["PWD","pwd"]);
  if(o.showRatios) rhead.forEach(function(h,k){ s+='<text x="'+(xr+rw*k+rw-6)+'" y="'+(top-8)+'" text-anchor="end" font-size="10" font-weight="700" fill="'+o.mutedColor+'">'+h[0]+' %</text>'; });
  function row(L, y, bold){
    s+='<line x1="16" x2="'+(W-16)+'" y1="'+(y+rh).toFixed(1)+'" y2="'+(y+rh).toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    var per=Math.floor(lw/5.9), words=String(L.label).split(" "), l1="", l2="";
    words.forEach(function(w){ if(!l2 && (l1+" "+w).trim().length<=per) l1=(l1+" "+w).trim(); else l2=(l2+" "+w).trim(); });
    if(l2) s+='<text x="16" y="'+(y+rh/2-2)+'" font-size="10.5" font-weight="'+(bold?700:400)+'" fill="'+o.inkColor+'"><title>'+eep_esc(L.label)+'</title>'+eep_esc(l1)+'<tspan x="16" dy="12">'+eep_esc(eep_trunc(l2,per))+'</tspan></text>';
    else s+='<text x="16" y="'+(y+rh/2+4)+'" font-size="11" font-weight="'+(bold?700:400)+'" fill="'+o.inkColor+'">'+eep_esc(l1)+'</text>';
    COLS.forEach(function(k,j){ var v=L.c[k], x=x0+cw*j, share=L.total?v/L.total:0;
      if(o.shadeCells && v>0) s+='<rect x="'+(x+2).toFixed(1)+'" y="'+(y+3)+'" width="'+(cw-4).toFixed(1)+'" height="'+(rh-6)+'" rx="3" fill="'+o.shadeColor+'" fill-opacity="'+(0.06+0.5*Math.min(1,share*2)).toFixed(2)+'"><title>'+eep_esc(L.label+" · "+heads[j]+" "+(j<4?"male":j<8?"female":"foreign")+": "+v+" ("+(share*100).toFixed(1)+"%)")+'</title></rect>';
      s+='<text x="'+(x+cw/2).toFixed(1)+'" y="'+(y+rh/2+4)+'" text-anchor="middle" font-size="11" font-weight="'+(bold?700:400)+'" fill="'+o.inkColor+'">'+eep_fmt(v,"none",0)+'</text>'; });
    s+='<text x="'+(xt+totW/2)+'" y="'+(y+rh/2+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+o.inkColor+'">'+eep_fmt(L.total,"none",0)+'</text>';
    if(o.showRatios){ var t=tg[String(L.label).toLowerCase()]; if(!t){ for(var key in tg){ if(String(L.label).toLowerCase().indexOf(key)>=0){ t=tg[key]; break; } } }
      rhead.forEach(function(h,k){ var v=L[h[1]], tv = h[1]==="pwd" ? +o.disabilityTarget : (t ? (h[1]==="dm"?t.m:t.f) : null);
        var col = (v==null||tv==null||!isFinite(tv)) ? o.inkColor : (v>=tv ? o.goodColor : o.badColor);
        s+='<text x="'+(xr+rw*k+rw-6)+'" y="'+(y+rh/2+(tv!=null&&isFinite(tv)?0:4))+'" text-anchor="end" font-size="11.5" font-weight="700" fill="'+col+'">'+(v==null?"–":v.toFixed(1)+"%")+'</text>';
        if(tv!=null && isFinite(tv)) s+='<text x="'+(xr+rw*k+rw-6)+'" y="'+(y+rh/2+11)+'" text-anchor="end" font-size="9" fill="'+o.mutedColor+'">target '+tv+'%</text>'; }); }
  }
  A.levels.forEach(function(L,i){ row(L, top+rh*i, false); });
  var ty=top+rh*A.levels.length;
  s+='<rect x="16" y="'+ty+'" width="'+(W-32)+'" height="'+rh+'" fill="'+o.headBg+'" fill-opacity="0.6"/>';
  row(A.total, ty, true);
  if(o.showPercentRow){ var py=ty+rh;
    s+='<text x="16" y="'+(py+rh/2+4)+'" font-size="10.5" font-style="italic" fill="'+o.mutedColor+'">% of total workforce</text>';
    COLS.forEach(function(k,j){ s+='<text x="'+(x0+cw*j+cw/2).toFixed(1)+'" y="'+(py+rh/2+4)+'" text-anchor="middle" font-size="10.5" fill="'+o.mutedColor+'">'+(A.total.total?(A.total.c[k]/A.total.total*100).toFixed(1):"0.0")+'%</text>'; }); }
  var foot=H-12;
  s+='<text x="16" y="'+foot+'" font-size="9.5" fill="'+o.mutedColor+'">A = African · C = Coloured · I = Indian · W = White · Designated male = A+C+I males · Designated female = all SA females · PWD = persons with disabilities'+(A.unclassified?' · '+A.unclassified+' employees unclassified (race/gender not mapped)':'')+'</text>';
  return s+'</svg>';
}
