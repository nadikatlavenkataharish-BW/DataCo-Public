/* =============================================================================
 * Recovery vs Head Grade — canonical renderer (v0.1)
 * Scatter of plant recovery against feed (head) grade per day/shift, with a
 * fitted curve (log or linear), target band and fit statistics.
 *
 * input : { points:[{label, grade, recovery, group}], labels:{grade, recovery} }
 * opts  : see rhsDefaults()
 * ========================================================================== */
function rhsDefaults(){
  return {
    title: "Recovery vs Head Grade", subtitle: "Plant recovery by feed grade",
    fitType: "log",                   // log | linear | none
    targetRecovery: 88, targetBand: 2,  // % ; band = target ± band
    recoveryScale: "auto",            // auto | percent | fraction
    colorBy: "band",                  // band | group
    gradeUnit: "% Cu", gradeDecimals: 2,
    pointColor: "#0A6ED1", belowColor: "#D73027", aboveColor: "#1A9850",
    palette: "#0A6ED1,#E9730C,#1A9850,#925ACE,#C87B00,#0F828F,#D04343,#5B738B",
    fitColor: "#33414A", bandColor: "#D8EFDF",
    showStats: true, pointSize: 4,
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 820, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var rhs_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function rhs_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function rhs_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function rhs_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function rhs_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function rhs_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function rhs_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function rhs_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function rhs_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+rhs_FONT+'" font-size="13" fill="#8794A0">'+rhs_esc(text)+'</text></svg>';
}
function rhs_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+rhs_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+rhs_esc(o.subtitle)+'</text>';
  return s;
}
function rhs_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function rhs_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return rhs_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return rhs_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function rhs_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function rhsFit(pts, type){
  var xs=[], ys=[]; pts.forEach(function(p){ var x = type==="log" ? (p.grade>0?Math.log(p.grade):null) : p.grade; if(x!=null){xs.push(x); ys.push(p.recovery);} });
  var n=xs.length; if(n<3) return null;
  var mx=xs.reduce(function(a,b){return a+b;},0)/n, my=ys.reduce(function(a,b){return a+b;},0)/n, sxy=0, sxx=0, syy=0;
  for(var i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)*(xs[i]-mx); syy+=(ys[i]-my)*(ys[i]-my); }
  if(!sxx) return null;
  var b=sxy/sxx, a=my-b*mx, r2 = syy ? (sxy*sxy)/(sxx*syy) : 1;
  return {a:a, b:b, r2:r2, f:function(g){ return type==="log" ? a+b*Math.log(g) : a+b*g; }};
}
function buildRecoverySVG(input, opts){
  var o = Object.assign(rhsDefaults(), opts||{});
  var W = Math.max(360, +o.width||820), H = Math.max(240, +o.height||440);
  var pts = ((input&&input.points)||[]).filter(function(p){return p.grade!=null&&p.recovery!=null;});
  if(pts.length<2) return rhs_msg(W,H,"Bind a point dimension (day/shift) plus Head grade and Recovery measures.");
  var L=input.labels||{};
  var maxR=Math.max.apply(null,pts.map(function(p){return p.recovery;}));
  var toPct = o.recoveryScale==="fraction" || (o.recoveryScale==="auto" && maxR<=1.5);
  pts = pts.map(function(p){ return {label:p.label, grade:p.grade, recovery:toPct?p.recovery*100:p.recovery, group:p.group}; });
  var tgt=+o.targetRecovery, band=+o.targetBand;
  var gs=pts.map(function(p){return p.grade;}), rs=pts.map(function(p){return p.recovery;});
  var gx0=Math.min.apply(null,gs), gx1=Math.max.apply(null,gs), gp=(gx1-gx0)*0.08||0.05; gx0=Math.max(0,gx0-gp); gx1+=gp;
  var ry0=Math.min.apply(null,rs.concat([tgt-band])), ry1=Math.max.apply(null,rs.concat([tgt+band])), rp=(ry1-ry0)*0.1||1;
  var nyA=rhs_nice(ry0-rp/2, Math.min(100,ry1+rp/2), 5); ry0=nyA.lo; ry1=nyA.hi; var nxA=rhs_nice(gx0,gx1,6); gx0=nxA.lo; gx1=nxA.hi;
  var top=rhs_headerH(o)+18, bot=46, left=56, right=o.showStats?190:20, pw=W-left-right, ph=H-top-bot;
  var X=function(v){return left+pw*(v-gx0)/(gx1-gx0);}, Y=function(v){return top+ph*(ry1-v)/(ry1-ry0);};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+rhs_FONT+'">';
  s+=rhs_header(o,W);
  nyA.ticks.forEach(function(rv){ var y=Y(rv);
    s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+rv.toFixed(nyA.dec)+'%</text>'; });
  nxA.ticks.forEach(function(gv){ s+='<text x="'+X(gv).toFixed(1)+'" y="'+(top+ph+16)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+gv.toFixed(nxA.dec)+'</text>'; });
  s+='<text x="'+(left+pw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">'+rhs_esc((L.grade||"Head grade")+" ("+o.gradeUnit+")")+'</text>';
  s+='<text transform="translate(14,'+(top+ph/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">'+rhs_esc(L.recovery||"Recovery")+' (%)</text>';
  if(isFinite(tgt)){ var by0=Y(Math.min(ry1,tgt+band)), by1=Y(Math.max(ry0,tgt-band));
    s+='<rect x="'+left+'" y="'+by0.toFixed(1)+'" width="'+pw+'" height="'+Math.max(1,by1-by0).toFixed(1)+'" fill="'+o.bandColor+'" fill-opacity="0.7"/>';
    s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+Y(tgt).toFixed(1)+'" y2="'+Y(tgt).toFixed(1)+'" stroke="'+o.aboveColor+'" stroke-dasharray="5 3"/>';
    s+='<text x="'+(left+pw-4)+'" y="'+(Y(tgt)-4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.aboveColor+'">Target '+tgt+'% ± '+band+'</text>'; }
  var pal=String(o.palette).split(",").map(function(x){return x.trim();}), grp={}, gi=0, hasGroup=pts.some(function(p){return p.group;});
  var useGroup = o.colorBy==="group" && hasGroup;
  pts.forEach(function(p){
    var c;
    if(useGroup){ if(!(p.group in grp)) grp[p.group]=pal[gi++%pal.length]; c=grp[p.group]; }
    else c = p.recovery < tgt-band ? o.belowColor : (p.recovery > tgt+band ? o.aboveColor : o.pointColor);
    s+='<circle cx="'+X(p.grade).toFixed(1)+'" cy="'+Y(p.recovery).toFixed(1)+'" r="'+o.pointSize+'" fill="'+c+'" fill-opacity="0.75" stroke="#fff" stroke-width="0.8"><title>'+rhs_esc((p.label?p.label+": ":"")+p.grade.toFixed(o.gradeDecimals)+" "+o.gradeUnit+" → "+p.recovery.toFixed(1)+"%"+(p.group?" ("+p.group+")":""))+'</title></circle>';
  });
  var fit = o.fitType==="none" ? null : rhsFit(pts, o.fitType);
  if(fit){ var d="", steps=40;
    for(var k=0;k<=steps;k++){ var g=gx0+(gx1-gx0)*k/steps; if(o.fitType==="log"&&g<=0) continue; var r=fit.f(g); if(r<ry0||r>ry1) continue; d+=(d?"L":"M")+X(g).toFixed(1)+" "+Y(r).toFixed(1); }
    if(d) s+='<path d="'+d+'" fill="none" stroke="'+o.fitColor+'" stroke-width="2"/>'; }
  if(o.showStats){
    var sx=W-right+16, sy=top+4, mean=rs.reduce(function(a,b){return a+b;},0)/rs.length;
    var below=pts.filter(function(p){return p.recovery<tgt-band;}).length;
    var lines=[["Points",String(pts.length)],["Mean recovery",mean.toFixed(1)+"%"],["Below band",below+" ("+Math.round(below/pts.length*100)+"%)"]];
    if(fit){ lines.push(["Fit R²",fit.r2.toFixed(2)]);
      lines.push(["Model", o.fitType==="log" ? "R = "+fit.a.toFixed(1)+(fit.b>=0?" + ":" − ")+Math.abs(fit.b).toFixed(2)+"·ln(g)" : "R = "+fit.a.toFixed(1)+(fit.b>=0?" + ":" − ")+Math.abs(fit.b).toFixed(2)+"·g"]); }
    s+='<rect x="'+(sx-8)+'" y="'+(sy-6)+'" width="'+(right-16)+'" height="'+(lines.length*34+8)+'" rx="8" fill="#F7F9FB" stroke="#E3E8ED"/>';
    lines.forEach(function(l,i){ s+='<text x="'+sx+'" y="'+(sy+12+i*34)+'" font-size="10" fill="'+o.mutedColor+'">'+rhs_esc(l[0])+'</text><text x="'+sx+'" y="'+(sy+27+i*34)+'" font-size="'+(l[0]==="Model"?11:14)+'" font-weight="700" fill="'+o.inkColor+'">'+rhs_esc(l[1])+'</text>'; });
    if(useGroup){ var ly=sy+lines.length*34+24; Object.keys(grp).forEach(function(g,i){ s+='<circle cx="'+(sx+4)+'" cy="'+(ly+i*16)+'" r="4" fill="'+grp[g]+'"/><text x="'+(sx+14)+'" y="'+(ly+i*16+4)+'" font-size="10" fill="'+o.inkColor+'">'+rhs_esc(rhs_trunc(g,22))+'</text>'; }); }
  }
  return s+'</svg>';
}
