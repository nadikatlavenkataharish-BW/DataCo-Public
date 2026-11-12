/* Grade-Tonnage Curve — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Grade–Tonnage Curve — canonical renderer (v0.1)
 * From grade bins (block-model grade classes): tonnes above cut-off (left axis)
 * and average grade above cut-off (right axis), with a cut-off read-out.
 *
 * input : { bins:[{grade, tonnes}], labels:{tonnes, grade} }
 * opts  : see gtcDefaults()
 * ========================================================================== */
function gtcDefaults(){
  return {
    title: "Grade–Tonnage Curve", subtitle: "Tonnes and average grade above cut-off",
    cutoff: 0.3,                      // highlighted cut-off grade
    gradeUnit: "% Cu", gradeDecimals: 2,
    metalFactor: 0.01, metalUnit: "t Cu",  // metal = tonnes × grade × factor (0.01 for %, 1/31.1035 for g/t → oz)
    showMetal: true, showArea: true,
    valueScale: "auto", decimals: 1, prefix: "", suffix: " t",
    tonnesColor: "#0A6ED1", gradeColor: "#E9730C", cutoffColor: "#33414A",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 860, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var gtc_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function gtc_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function gtc_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function gtc_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function gtc_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function gtc_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function gtc_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function gtc_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function gtc_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+gtc_FONT+'" font-size="13" fill="#8794A0">'+gtc_esc(text)+'</text></svg>';
}
function gtc_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+gtc_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+gtc_esc(o.subtitle)+'</text>';
  return s;
}
function gtc_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function gtc_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return gtc_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return gtc_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function gtc_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function gtcAbove(bins, c){ var t=0, tg=0; bins.forEach(function(b){ if(b.grade>=c){ t+=b.tonnes; tg+=b.tonnes*b.grade; } }); return {t:t, g:t?tg/t:null}; }
function buildGradeTonnageSVG(input, opts){
  var o = Object.assign(gtcDefaults(), opts||{});
  var W = Math.max(360, +o.width||860), H = Math.max(240, +o.height||420);
  var bins = ((input&&input.bins)||[]).filter(function(b){return b.grade!=null&&isFinite(b.grade)&&b.tonnes>0;});
  if(bins.length<2) return gtc_msg(W,H,"Bind a grade-bin dimension (or a Grade measure) and a Tonnes measure.");
  var L=input.labels||{};
  bins.sort(function(a,b){return a.grade-b.grade;});
  var cuts=[]; bins.forEach(function(b){ if(!cuts.length||cuts[cuts.length-1]!==b.grade) cuts.push(b.grade); });
  var pts=cuts.map(function(c){ var a=gtcAbove(bins,c); return {c:c,t:a.t,g:a.g}; });
  var top=gtc_headerH(o)+22, bot=44, left=70, right=64, pw=W-left-right, ph=H-top-bot;
  var nx=gtc_nice(0,cuts[cuts.length-1],6), xmin=0, xmax=nx.hi, nt=gtc_nice(0,pts[0].t,4), tmax=nt.hi;
  var ng=gtc_nice(0,Math.max.apply(null,pts.map(function(p){return p.g;})),4), gmax=ng.hi;
  var X=function(v){return left+pw*(v-xmin)/(xmax-xmin);}, YT=function(v){return top+ph*(1-v/tmax);}, YG=function(v){return top+ph*(1-v/gmax);};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+gtc_FONT+'">';
  s+=gtc_header(o,W);
  var NT=nt.ticks.length-1, tl=gtc_ticks(nt.ticks,o.valueScale,o.prefix);
  for(var i=0;i<=NT;i++){ var y=top+ph*(1-i/NT);
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.tonnesColor+'">'+tl[i]+'</text>';
    s+='<text x="'+(W-right+6)+'" y="'+(y+4).toFixed(1)+'" font-size="10" fill="'+o.gradeColor+'">'+(gmax*i/NT).toFixed(Math.max(ng.dec,1))+'</text>'; }
  nx.ticks.forEach(function(xv){ var x=X(xv);
    s+='<text x="'+x.toFixed(1)+'" y="'+(top+ph+16)+'" text-anchor="middle" font-size="10" fill="'+o.mutedColor+'">'+xv.toFixed(nx.dec)+'</text>'; });
  s+='<text x="'+(left+pw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="'+o.mutedColor+'">Cut-off grade ('+gtc_esc(o.gradeUnit)+')</text>';
  s+='<text x="'+left+'" y="'+(top-8)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.tonnesColor+'">'+gtc_esc(L.tonnes||"Tonnes")+'</text>';
  s+='<text x="'+(W-right)+'" y="'+(top-8)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.gradeColor+'">Avg grade</text>';
  // tonnes above cut-off is a step function; draw as steps
  var dT='M'+X(0)+' '+YT(pts[0].t);
  pts.forEach(function(p,i){ dT+='L'+X(p.c).toFixed(1)+' '+YT(p.t).toFixed(1); var nx=i<pts.length-1?pts[i+1].c:xmax; dT+='L'+X(nx).toFixed(1)+' '+YT(p.t).toFixed(1); });
  if(o.showArea) s+='<path d="'+dT+'L'+X(xmax)+' '+YT(0)+'L'+X(0)+' '+YT(0)+'Z" fill="'+o.tonnesColor+'" fill-opacity="0.10"/>';
  s+='<path d="'+dT+'" fill="none" stroke="'+o.tonnesColor+'" stroke-width="2.2"/>';
  var dG=pts.map(function(p,i){return (i?'L':'M')+X(p.c).toFixed(1)+' '+YG(p.g).toFixed(1);}).join('');
  s+='<path d="'+dG+'" fill="none" stroke="'+o.gradeColor+'" stroke-width="2.2"/>';
  pts.forEach(function(p){ s+='<circle cx="'+X(p.c).toFixed(1)+'" cy="'+YG(p.g).toFixed(1)+'" r="2.5" fill="'+o.gradeColor+'"><title>Cut-off '+p.c.toFixed(o.gradeDecimals)+': '+gtc_fmt(p.t,o.valueScale,o.decimals,o.prefix,o.suffix)+' @ '+p.g.toFixed(o.gradeDecimals)+' '+gtc_esc(o.gradeUnit)+'</title></circle>'; });
  var c=+o.cutoff;
  if(isFinite(c) && c>=xmin && c<=xmax){
    var a=gtcAbove(bins,c), cx=X(c);
    s+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+top+'" y2="'+(top+ph)+'" stroke="'+o.cutoffColor+'" stroke-dasharray="4 3"/>';
    var lines=["Cut-off "+c.toFixed(o.gradeDecimals)+" "+o.gradeUnit, gtc_fmt(a.t,o.valueScale,o.decimals,o.prefix,o.suffix)+" above",
      "@ "+(a.g!=null?a.g.toFixed(o.gradeDecimals):"–")+" "+o.gradeUnit];
    if(o.showMetal && a.g!=null) lines.push(gtc_fmt(a.t*a.g*o.metalFactor,o.valueScale,o.decimals,"","")+" "+o.metalUnit);
    var bw=150, bh=14+lines.length*15, bx = cx+8+bw > W-right ? cx-8-bw : cx+8, by=top+6;
    s+='<rect x="'+bx.toFixed(1)+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="6" fill="#FFFFFF" stroke="#D5DCE3"/>';
    lines.forEach(function(t,i){ s+='<text x="'+(bx+10).toFixed(1)+'" y="'+(by+18+i*15)+'" font-size="11" font-weight="'+(i?500:700)+'" fill="'+o.inkColor+'">'+gtc_esc(t)+'</text>'; });
  }
  return s+'</svg>';
}

  /* ----- SAC data-binding helpers ----------------------------------------- */
  function sacMeta(binding) {
    var md = binding.metadata || {}, feeds = md.feeds || {};
    var dMap = md.dimensions || {}, mMap = md.mainStructureMembers || {};
    var dKeys = (feeds.dimensions && feeds.dimensions.values) || Object.keys(dMap);
    var mKeys = (feeds.measures && feeds.measures.values) || Object.keys(mMap);
    return {
      dims: dKeys.filter(function (k) { return dMap[k]; }).map(function (k) { return { key: k, label: dMap[k].description || dMap[k].id || k }; }),
      meas: mKeys.filter(function (k) { return mMap[k]; }).map(function (k) { return { key: k, label: mMap[k].label || mMap[k].id || k }; })
    };
  }
  function sacVal(row, key) { var c = row[key]; if (!c) return null; var v = Number(c.raw); return isFinite(v) ? v : null; }
  function sacLab(row, key) { var c = row[key]; if (!c) return ""; return c.label || c.description || c.id || ""; }
  /* skip hierarchy result/total nodes so they are not double-counted */
  function sacIsTotal(row, dims) {
    for (var i = 0; i < dims.length; i++) { var c = row[dims[i].key]; if (c && c.isTotal) return true; }
    return false;
  }

  function buildInput(b) {
    var m = sacMeta(b); if (!m.dims.length || !m.meas.length) return null;
    var kd = m.dims[0].key, kt = m.meas[0].key, kg = m.meas[1] && m.meas[1].key, bins = [];
    (b.data || []).forEach(function (r) {
      if (sacIsTotal(r, m.dims)) return;
      var g = kg ? sacVal(r, kg) : null;
      if (g == null) { var mm = String(sacLab(r, kd)).replace(",", ".").match(/-?\d+(\.\d+)?/); g = mm ? Number(mm[0]) : null; }
      bins.push({ grade: g, tonnes: sacVal(r, kt) });
    });
    return { bins: bins, labels: { tonnes: m.meas[0].label, grade: m.meas[1] && m.meas[1].label } };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class GradeTonnageCurve extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById("root");
      this._props = {};
    }

    onCustomWidgetBeforeUpdate(changedProps) { this._props = Object.assign({}, this._props, changedProps); }
    onCustomWidgetAfterUpdate() { this.render(); }
    onCustomWidgetResize() { this.render(); }
    onCustomWidgetDestroy() { this._root.innerHTML = ""; }

    render() {
      if (!document.contains(this)) { setTimeout(this.render.bind(this), 0); return; }
      var opts = Object.assign({}, this._props, {
        width: this.clientWidth || this._props.width, height: this.clientHeight || this._props.height });
      var binding = this.dataBinding;
      if (!binding || binding.state !== "success") {
        this._root.innerHTML = gtc_msg(opts.width || 400, opts.height || 200, "Bind a grade-bin dimension and a Tonnes measure.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildGradeTonnageSVG(input, opts) : gtc_msg(opts.width || 400, opts.height || 200, "Bind a grade-bin dimension and a Tonnes measure.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-gradetonnagecurve", GradeTonnageCurve);
})();
