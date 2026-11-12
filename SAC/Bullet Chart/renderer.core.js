/* =============================================================================
 * Bullet Chart — canonical renderer (v0.1)
 * One row per member: qualitative bands (% of target), Actual bar, Target tick,
 * optional Forecast marker, and an attainment % column.
 *
 * input : { items:[{label, actual, target, forecast}], labels:{actual,target,forecast} }
 * opts  : see bulDefaults()
 * ========================================================================== */
function bulDefaults(){
  return {
    title: "Attainment vs Target", subtitle: "Actual, target and forecast by member",
    bandLow: 80, bandHigh: 100,       // % of target: poor < bandLow <= ok < bandHigh <= good
    invertSign: false,                // cost measure: under target is good
    sortBy: "none",                   // none | attainment | actual
    scaleMode: "shared",              // shared | perRow
    rowHeight: 34, labelWidth: 140,
    valueScale: "auto", decimals: 1, prefix: "", suffix: "",
    barColor: "#33414A", targetColor: "#0A6ED1", forecastColor: "#E9730C",
    bandPoor: "#F6D5D3", bandOk: "#FBEFC9", bandGood: "#D8EFDF",
    goodColor: "#1A9850", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 760, height: 360
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var bul_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function bul_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function bul_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function bul_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function bul_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function bul_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function bul_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function bul_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function bul_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+bul_FONT+'" font-size="13" fill="#8794A0">'+bul_esc(text)+'</text></svg>';
}
function bul_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+bul_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+bul_esc(o.subtitle)+'</text>';
  return s;
}
function bul_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function bul_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return bul_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return bul_fmt(v,scale,2,prefix,"");});
}

function buildBulletSVG(input, opts){
  var o = Object.assign(bulDefaults(), opts||{});
  var W = Math.max(320, +o.width||760);
  var items = ((input&&input.items)||[]).filter(function(r){return r.actual!=null||r.target!=null;});
  if(!items.length) return bul_msg(W, Math.max(160,+o.height||360), "Bind a dimension plus Actual and Target measures.");
  var L = input.labels||{};
  items.forEach(function(r){ r.att = (r.target ? r.actual/r.target : null); });
  if(o.sortBy==="attainment") items.sort(function(a,b){return (o.invertSign?1:-1)*((a.att||0)-(b.att||0));});
  if(o.sortBy==="actual") items.sort(function(a,b){return (b.actual||0)-(a.actual||0);});
  var rh = Math.max(20, +o.rowHeight||34), top = bul_headerH(o)+30, lw = +o.labelWidth||140, rightCol = 70;
  var H = Math.max(+o.height||0, top + rh*items.length + 28);
  var x0 = 16+lw, x1 = W-16-rightCol, pw = x1-x0;
  function maxOf(r){ return Math.max(r.actual||0, r.target||0, r.forecast||0, (r.target||0)*Math.max(1.2, o.bandHigh/100*1.1)); }
  var gmax = Math.max.apply(null, items.map(maxOf)) || 1;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+bul_FONT+'">';
  s += bul_header(o, W);
  // legend
  var lx = 16, ly = top-14;
  function leg(sw, label){ var r = sw+'<text x="'+(lx+16)+'" y="'+(ly+4)+'" font-size="10" fill="'+o.mutedColor+'">'+bul_esc(label)+'</text>'; lx += 26+label.length*5.6; return r; }
  s += leg('<rect x="'+lx+'" y="'+(ly-3)+'" width="12" height="7" fill="'+o.barColor+'"/>', L.actual||"Actual");
  s += leg('<rect x="'+(lx+5)+'" y="'+(ly-6)+'" width="2.5" height="13" fill="'+o.targetColor+'"/>', L.target||"Target");
  if(items.some(function(r){return r.forecast!=null;})) s += leg('<circle cx="'+(lx+6)+'" cy="'+ly+'" r="4" fill="none" stroke="'+o.forecastColor+'" stroke-width="2"/>', L.forecast||"Forecast");
  s += '<text x="'+(W-16)+'" y="'+(ly+4)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">% of '+bul_esc(L.target||"Target")+'</text>';
  items.forEach(function(r,i){
    var y = top + rh*i, mx = o.scaleMode==="perRow" ? (maxOf(r)||1) : gmax, X=function(v){return x0+pw*Math.max(0,v)/mx;};
    var bh = rh*0.62, by = y+(rh-bh)/2, t = r.target||0;
    var bLo = t*o.bandLow/100, bHi = t*o.bandHigh/100;
    var c1 = o.invertSign ? o.bandGood : o.bandPoor, c3 = o.invertSign ? o.bandPoor : o.bandGood;
    s += '<rect x="'+x0+'" y="'+by.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+c3+'"/>';
    if(t>0){ s += '<rect x="'+x0+'" y="'+by.toFixed(1)+'" width="'+(X(bHi)-x0).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+o.bandOk+'"/>';
             s += '<rect x="'+x0+'" y="'+by.toFixed(1)+'" width="'+(X(bLo)-x0).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+c1+'"/>'; }
    var ah = bh*0.38;
    if(r.actual!=null) s += '<rect x="'+x0+'" y="'+(by+(bh-ah)/2).toFixed(1)+'" width="'+(X(r.actual)-x0).toFixed(1)+'" height="'+ah.toFixed(1)+'" fill="'+o.barColor+'"><title>'+bul_esc(r.label)+' — '+bul_esc(L.actual||"Actual")+': '+bul_fmt(r.actual,o.valueScale,o.decimals,o.prefix,o.suffix)+'</title></rect>';
    if(r.target!=null) s += '<rect x="'+(X(r.target)-1.5).toFixed(1)+'" y="'+(by-2).toFixed(1)+'" width="3" height="'+(bh+4).toFixed(1)+'" fill="'+o.targetColor+'"><title>'+bul_esc(L.target||"Target")+': '+bul_fmt(r.target,o.valueScale,o.decimals,o.prefix,o.suffix)+'</title></rect>';
    if(r.forecast!=null) s += '<circle cx="'+X(r.forecast).toFixed(1)+'" cy="'+(y+rh/2).toFixed(1)+'" r="4.5" fill="#fff" stroke="'+o.forecastColor+'" stroke-width="2"><title>'+bul_esc(L.forecast||"Forecast")+': '+bul_fmt(r.forecast,o.valueScale,o.decimals,o.prefix,o.suffix)+'</title></circle>';
    s += '<text x="'+(x0-8)+'" y="'+(y+rh/2+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+bul_esc(bul_trunc(r.label, Math.floor(lw/6.3)))+'</text>';
    var good = r.att==null ? null : (o.invertSign ? r.att<=1 : r.att>=o.bandHigh/100);
    var col = r.att==null ? o.mutedColor : (good ? o.goodColor : (o.invertSign ? o.badColor : (r.att>=o.bandLow/100 ? "#B07D00" : o.badColor)));
    s += '<text x="'+(W-16)+'" y="'+(y+rh/2+4).toFixed(1)+'" text-anchor="end" font-size="12" font-weight="700" fill="'+col+'">'+(r.att==null?"–":(r.att*100).toFixed(0)+"%")+'</text>';
  });
  if(o.scaleMode!=="perRow"){ var ay = top+rh*items.length+4, gl=bul_ticks([0,1,2,3,4].map(function(g){return gmax*g/4;}),o.valueScale,o.prefix);
    for(var g=0; g<=4; g++){ var gv=gmax*g/4, gx=x0+pw*g/4;
      s += '<line x1="'+gx.toFixed(1)+'" x2="'+gx.toFixed(1)+'" y1="'+ay+'" y2="'+(ay+4)+'" stroke="'+o.mutedColor+'"/>';
      s += '<text x="'+gx.toFixed(1)+'" y="'+(ay+16)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+gl[g]+'</text>'; } }
  return s+'</svg>';
}
