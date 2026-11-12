/*!
 * Driver Tree — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Driver Tree — canonical renderer (v0.1)
 * KPI tree (e.g. ROCE → margin × asset turnover → …) laid out left-to-right.
 * Each node shows Actual, Plan and variance with RAG colouring.
 *
 * input : { nodes:[{id, parent, actual, plan}] }   // parent "" for the root
 * opts  : see drvDefaults()
 * ========================================================================== */
function drvDefaults(){
  return {
    title: "Value Driver Tree", subtitle: "Actual vs plan by driver",
    nodeFormats: "",                  // "ROCE:pct,EBIT margin:pct,Asset turnover:ratio,Headcount:number" ; default = currency
    lowerIsBetter: "",                // comma list of node names where below plan is favourable (costs)
    tolerance: 2, warnTolerance: 5,   // % variance bands for green / amber
    nodeWidth: 170, nodeHeight: 62,
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    goodColor: "#1A9850", amberColor: "#E0A100", badColor: "#D73027", lineColor: "#C4CDD5",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 1100, height: 520
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var drv_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function drv_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function drv_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function drv_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function drv_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function drv_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function drv_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function drv_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function drv_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+drv_FONT+'" font-size="13" fill="#8794A0">'+drv_esc(text)+'</text></svg>';
}
function drv_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+drv_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+drv_esc(o.subtitle)+'</text>';
  return s;
}
function drv_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function drv_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return drv_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return drv_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function drv_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function drv_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function drv_money(v, o, dec){ return drv_fmt(v, o.valueScale, dec==null?o.decimals:dec, drv_cur(o), ""); }

function drv_map(s){ var m={}; String(s||"").split(",").forEach(function(p){ var kv=p.split(":"); if(kv.length===2) m[kv[0].trim().toLowerCase()]=kv[1].trim().toLowerCase(); }); return m; }
function buildDriverTreeSVG(input, opts){
  var o = Object.assign(drvDefaults(), opts||{});
  var W = Math.max(420, +o.width||1100);
  var nodes=((input&&input.nodes)||[]).filter(function(n){return n.id;});
  if(!nodes.length) return drv_msg(W, Math.max(220,+o.height||520), "Bind Node and Parent dimensions plus Actual and Plan measures.");
  var byId={}, roots=[]; nodes.forEach(function(n){ n.children=[]; byId[n.id]=n; });
  nodes.forEach(function(n){ if(n.parent && byId[n.parent] && n.parent!==n.id) byId[n.parent].children.push(n); else roots.push(n); });
  var fm=drv_map(o.nodeFormats), lib=String(o.lowerIsBetter||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
  function fmt(n,v){ if(v==null) return "–"; var f=fm[String(n.id).toLowerCase()]||"currency";
    if(f==="pct") return (Math.abs(v)<=2?v*100:v).toFixed(1)+"%"; if(f==="ratio") return v.toFixed(2)+"×"; if(f==="number") return drv_fmt(v,o.valueScale,o.decimals,"",""); return drv_money(v,o); }
  var depth=0, leafY=0, nw=+o.nodeWidth||170, nh=+o.nodeHeight||62, vgap=14;
  function layout(n,d,seen){ if(seen[n.id]) return; seen[n.id]=1; n.d=d; depth=Math.max(depth,d);
    if(!n.children.length){ n.y=leafY; leafY+=nh+vgap; return; }
    n.children.forEach(function(c){ layout(c,d+1,seen); }); var ys=n.children.filter(function(c){return c.y!=null;}).map(function(c){return c.y;});
    n.y = ys.length ? (Math.min.apply(null,ys)+Math.max.apply(null,ys))/2 : (leafY+=nh+vgap)-nh-vgap; }
  var seen={}; roots.forEach(function(r){ layout(r,0,seen); leafY+=vgap; });
  var top=drv_headerH(o)+14, H=Math.max(+o.height||0, top+leafY+10);
  var colGap = depth? Math.max(30,(W-32-nw*(depth+1))/depth) : 0, sc=1;
  if(colGap<30){ sc=(W-32)/((nw+30)*depth+nw); colGap=30; }
  var X=function(d){return 16+d*(nw+colGap)*sc;}, w=nw*sc;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+drv_FONT+'">';
  s+=drv_header(o,W);
  nodes.forEach(function(n){ if(n.y==null) return; n.children.forEach(function(c){ if(c.y==null) return;
    var x1=X(n.d)+w, y1=top+n.y+nh/2, x2=X(c.d), y2=top+c.y+nh/2, xm=(x1+x2)/2;
    s+='<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+'C'+xm.toFixed(1)+' '+y1.toFixed(1)+' '+xm.toFixed(1)+' '+y2.toFixed(1)+' '+x2.toFixed(1)+' '+y2.toFixed(1)+'" fill="none" stroke="'+o.lineColor+'" stroke-width="1.5"/>'; }); });
  nodes.forEach(function(n){ if(n.y==null) return;
    var x=X(n.d), y=top+n.y, vp=(n.actual!=null&&n.plan)?(n.actual-n.plan)/Math.abs(n.plan):null;
    var sign = lib.indexOf(String(n.id).toLowerCase())>=0 ? -1 : 1, sv=vp==null?null:vp*sign*100;
    var col = sv==null ? o.mutedColor : (sv>=-o.tolerance ? o.goodColor : (sv>=-o.warnTolerance ? o.amberColor : o.badColor));
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+nh+'" rx="8" fill="#FFFFFF" stroke="#D5DCE3"/>';
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="5" height="'+nh+'" rx="2" fill="'+col+'"/>';
    s+='<text x="'+(x+13).toFixed(1)+'" y="'+(y+17).toFixed(1)+'" font-size="11" font-weight="700" fill="'+o.inkColor+'">'+drv_esc(drv_trunc(n.id,Math.floor((w-20)/6.4)))+'</text>';
    s+='<text x="'+(x+13).toFixed(1)+'" y="'+(y+38).toFixed(1)+'" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+drv_esc(fmt(n,n.actual))+'</text>';
    s+='<text x="'+(x+13).toFixed(1)+'" y="'+(y+54).toFixed(1)+'" font-size="10" fill="'+o.mutedColor+'">Plan '+drv_esc(fmt(n,n.plan))+'</text>';
    if(vp!=null) s+='<text x="'+(x+w-8).toFixed(1)+'" y="'+(y+38).toFixed(1)+'" text-anchor="end" font-size="11.5" font-weight="700" fill="'+col+'">'+(vp>=0?"▲ +":"▼ ")+(vp*100).toFixed(1)+'%</text>';
  });
  return s+'</svg>';
}
