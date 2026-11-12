/*!
 * Metal Balance & Reconciliation — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Metal Balance & Reconciliation (F-factors) — canonical renderer (v0.1)
 * Stages in order (e.g. Reserve model → Grade control → Mill feed → Product).
 * Top: tonnes / grade / metal per stage. Bottom: F-factor matrix — each stage
 * ÷ previous stage, plus overall (last ÷ first) — coloured against tolerance.
 *
 * input : { stages:[{label, tonnes, grade, metal}], labels }
 * opts  : see mblDefaults()
 * ========================================================================== */
function mblDefaults(){
  return {
    title: "Metal Balance & Reconciliation", subtitle: "F-factors by stage",
    gradeUnit: "% Cu", gradeDecimals: 2,
    metalFactor: 0.01, metalUnit: "t Cu",
    tolerance: 5, warnTolerance: 10,      // % deviation from 1.00
    showOverall: true,
    valueScale: "auto", decimals: 1, prefix: "", suffix: " t",
    barColor: "#5B738B", goodColor: "#1A9850", amberColor: "#E0A100", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 900, height: 460
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var mbl_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function mbl_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function mbl_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function mbl_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function mbl_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function mbl_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function mbl_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function mbl_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function mbl_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+mbl_FONT+'" font-size="13" fill="#8794A0">'+mbl_esc(text)+'</text></svg>';
}
function mbl_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+mbl_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+mbl_esc(o.subtitle)+'</text>';
  return s;
}
function mbl_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function mbl_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return mbl_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return mbl_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function mbl_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function buildMetalBalanceSVG(input, opts){
  var o = Object.assign(mblDefaults(), opts||{});
  var W = Math.max(420, +o.width||900), H = Math.max(300, +o.height||460);
  var st = ((input&&input.stages)||[]).filter(function(s){return s.tonnes!=null;});
  if(st.length<2) return mbl_msg(W,H,"Bind a Stage dimension (in order) plus Tonnes and Grade measures.");
  st = st.map(function(s){ var m = s.metal!=null ? s.metal : (s.grade!=null ? s.tonnes*s.grade*o.metalFactor : null);
    var g = s.grade!=null ? s.grade : (m!=null&&s.tonnes ? m/(s.tonnes*o.metalFactor) : null); return {label:s.label, t:s.tonnes, g:g, m:m}; });
  var top=mbl_headerH(o)+10, left=16, right=16, n=st.length, colW=(W-left-right-110)/n, x0=left+110;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+mbl_FONT+'">';
  s+=mbl_header(o,W);
  // ---- stage table with bars
  var rows=[["Tonnes","t",function(v){return mbl_fmt(v,o.valueScale,o.decimals,o.prefix,o.suffix);}],
            ["Grade","g",function(v){return v==null?"–":v.toFixed(o.gradeDecimals)+" "+o.gradeUnit;}],
            ["Metal","m",function(v){return mbl_fmt(v,o.valueScale,o.decimals,"","")+" "+o.metalUnit;}]];
  st.forEach(function(x,i){ s+='<text x="'+(x0+colW*i+colW/2).toFixed(1)+'" y="'+(top+12)+'" text-anchor="middle" font-size="11.5" font-weight="700" fill="'+o.inkColor+'">'+mbl_esc(mbl_trunc(x.label,Math.floor(colW/6.5)))+'</text>'; });
  var ry=top+24, rh=30;
  rows.forEach(function(r,ri){
    var y=ry+ri*rh, mx=Math.max.apply(null,st.map(function(x){return x[r[1]]||0;}))||1;
    s+='<text x="'+left+'" y="'+(y+18)+'" font-size="11" font-weight="600" fill="'+o.mutedColor+'">'+r[0]+'</text>';
    st.forEach(function(x,i){ var cx=x0+colW*i+8, bw=(colW-16)*Math.max(0,(x[r[1]]||0))/mx;
      s+='<rect x="'+cx.toFixed(1)+'" y="'+(y+4)+'" width="'+(colW-16).toFixed(1)+'" height="20" rx="3" fill="#F2F4F7"/>';
      s+='<rect x="'+cx.toFixed(1)+'" y="'+(y+4)+'" width="'+bw.toFixed(1)+'" height="20" rx="3" fill="'+o.barColor+'" fill-opacity="0.25"/>';
      s+='<text x="'+(cx+6).toFixed(1)+'" y="'+(y+18)+'" font-size="11" fill="'+o.inkColor+'">'+mbl_esc(r[2](x[r[1]]))+'</text>'; });
  });
  // ---- F-factor matrix
  var fs=[]; for(var i=1;i<n;i++) fs.push({name:"F"+i, desc:st[i].label+" ÷ "+st[i-1].label, a:st[i], b:st[i-1]});
  if(o.showOverall && n>2) fs.push({name:"F"+n, desc:"Overall: "+st[n-1].label+" ÷ "+st[0].label, a:st[n-1], b:st[0], overall:true});
  var fy=ry+rows.length*rh+34, fw=(W-left-right-110)/fs.length, fx0=x0, frh=Math.min(44,(H-fy-44)/3);
  s+='<text x="'+left+'" y="'+(fy-8)+'" font-size="12" font-weight="700" fill="'+o.inkColor+'">Reconciliation factors</text>';
  fs.forEach(function(f,j){ var cx=fx0+fw*j+fw/2;
    s+='<text x="'+cx.toFixed(1)+'" y="'+(fy+8)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+o.inkColor+'">'+f.name+'</text>';
    s+='<text x="'+cx.toFixed(1)+'" y="'+(fy+21)+'" text-anchor="middle" font-size="9.5" fill="'+o.mutedColor+'">'+mbl_esc(mbl_trunc(f.desc,Math.floor(fw/5.2)))+'</text>'; });
  var tol=o.tolerance/100, warn=o.warnTolerance/100, maxDev=warn*1.6;
  fs.forEach(function(f){ ["t","g","m"].forEach(function(k){ if(f.a[k]!=null&&f.b[k]) maxDev=Math.max(maxDev,Math.abs(f.a[k]/f.b[k]-1)*1.1); }); });
  rows.forEach(function(r,ri){
    var y=fy+30+ri*frh;
    s+='<text x="'+left+'" y="'+(y+frh/2+4).toFixed(1)+'" font-size="11" font-weight="600" fill="'+o.mutedColor+'">'+r[0]+'</text>';
    fs.forEach(function(f,j){
      var cx0=fx0+fw*j+10, cw=fw-20, mid=cx0+cw/2, a=f.a[r[1]], b=f.b[r[1]], v=(a!=null&&b)?a/b:null;
      var Xd=function(d){return mid+(cw/2)*d/maxDev;};
      s+='<rect x="'+Xd(-tol).toFixed(1)+'" y="'+(y+4)+'" width="'+(Xd(tol)-Xd(-tol)).toFixed(1)+'" height="'+(frh-12).toFixed(1)+'" fill="'+o.goodColor+'" fill-opacity="0.10"/>';
      s+='<line x1="'+mid.toFixed(1)+'" x2="'+mid.toFixed(1)+'" y1="'+(y+2)+'" y2="'+(y+frh-6).toFixed(1)+'" stroke="'+o.mutedColor+'"/>';
      if(v!=null){ var dev=v-1, col=Math.abs(dev)<=tol?o.goodColor:(Math.abs(dev)<=warn?o.amberColor:o.badColor), xe=Xd(Math.max(-maxDev,Math.min(maxDev,dev)));
        s+='<rect x="'+Math.min(mid,xe).toFixed(1)+'" y="'+(y+8)+'" width="'+Math.max(1.5,Math.abs(xe-mid)).toFixed(1)+'" height="'+(frh-20).toFixed(1)+'" rx="2" fill="'+col+'"><title>'+mbl_esc(f.name+" "+r[0]+": "+v.toFixed(3)+" ("+f.desc+")")+'</title></rect>';
        var inside = Math.abs(xe-mid) > 44, tx = inside ? (dev>=0 ? xe-5 : xe+5) : (dev>=0 ? xe+4 : xe-4);
        s+='<text x="'+tx.toFixed(1)+'" y="'+(y+frh/2+1).toFixed(1)+'" text-anchor="'+((dev>=0)!==inside?"start":"end")+'" font-size="11.5" font-weight="700" fill="'+(inside?'#FFFFFF':col)+'">'+v.toFixed(2)+'</text>'; }
      else s+='<text x="'+mid.toFixed(1)+'" y="'+(y+frh/2+1).toFixed(1)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">–</text>';
    });
  });
  var ly=H-12;
  [["Within ±"+o.tolerance+"%",o.goodColor],["±"+o.tolerance+"–"+o.warnTolerance+"%",o.amberColor],["Outside ±"+o.warnTolerance+"%",o.badColor]].forEach(function(l,i){
    var lx=left+i*150; s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="12" height="10" rx="2" fill="'+l[1]+'"/><text x="'+(lx+17)+'" y="'+ly+'" font-size="10" fill="'+o.mutedColor+'">'+mbl_esc(l[0])+'</text>'; });
  s+='<text x="'+(W-right)+'" y="'+ly+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">1.00 = stages agree · bar = deviation</text>';
  return s+'</svg>';
}
