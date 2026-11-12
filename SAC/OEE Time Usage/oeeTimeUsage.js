/* OEE Time-Usage Waterfall — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * OEE / Time-Usage Waterfall — canonical renderer (v0.1)
 * Calendar hours stepped down by time-usage losses (scheduled down, unscheduled
 * down, standby, operating delays, performance loss) to direct operating hours,
 * with Availability, Utilisation, Efficiency and OEE tiles.
 *
 * input : { total, totalLabel, losses:[{label, value}] }
 * opts  : see oeeDefaults()
 * ========================================================================== */
function oeeDefaults(){
  return {
    title: "Time Usage & OEE", subtitle: "Calendar hours to direct operating hours",
    lossTypes: "SD,UD,SB,OD",         // category of each loss measure, in order: SD scheduled down, UD unscheduled down, SB standby, OD operating delay, PL performance loss
    availTarget: 85, utilTarget: 85, effTarget: 90, oeeTarget: 65,   // %
    showSubtotals: true, showKpis: true,
    valueScale: "none", decimals: 0, prefix: "", suffix: " h",
    totalColor: "#5B738B", sdColor: "#8794A0", udColor: "#D73027", sbColor: "#E0A100", odColor: "#E9730C", plColor: "#925ACE",
    goodColor: "#1A9850", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 960, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var oee_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function oee_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function oee_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function oee_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function oee_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function oee_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function oee_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function oee_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function oee_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+oee_FONT+'" font-size="13" fill="#8794A0">'+oee_esc(text)+'</text></svg>';
}
function oee_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+oee_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+oee_esc(o.subtitle)+'</text>';
  return s;
}
function oee_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function oee_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return oee_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return oee_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function oee_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function oeeKpis(total, losses){
  var c={SD:0,UD:0,SB:0,OD:0,PL:0}; losses.forEach(function(l){ c[l.type]=(c[l.type]||0)+(l.value||0); });
  var avail=total-c.SD-c.UD, oper=avail-c.SB, direct=oper-c.OD-c.PL;
  return { cat:c, avail:avail, oper:oper, direct:direct,
    A: total? avail/total : null, U: avail? oper/avail : null, E: oper? direct/oper : null, OEE: total? direct/total : null };
}
function buildOeeSVG(input, opts){
  var o = Object.assign(oeeDefaults(), opts||{});
  var W = Math.max(420, +o.width||960), H = Math.max(260, +o.height||420);
  if(!input || !input.total) return oee_msg(W,H,"Bind Calendar hours, then loss-hour measures in order (see lossTypes).");
  var types=String(o.lossTypes).split(",").map(function(t){return t.trim().toUpperCase();});
  var order={SD:0,UD:1,SB:2,OD:3,PL:4};
  var losses=(input.losses||[]).map(function(l,i){ var t=types[i]; if(!(t in order)) t="OD"; return {label:l.label, value:l.value||0, type:t}; });
  losses.sort(function(a,b){return order[a.type]-order[b.type];});
  var K=oeeKpis(input.total, losses), colors={SD:o.sdColor,UD:o.udColor,SB:o.sbColor,OD:o.odColor,PL:o.plColor};
  var bars=[{label:input.totalLabel||"Calendar", kind:"total", v:input.total}], run=input.total;
  function sub(label){ bars.push({label:label, kind:"sub", v:run}); }
  var seenAvail=false, seenOper=false;
  losses.forEach(function(l){
    if(o.showSubtotals && !seenAvail && order[l.type]>=2 && (K.cat.SD||K.cat.UD)){ sub("Available"); seenAvail=true; }
    if(o.showSubtotals && !seenOper && order[l.type]>=3 && K.cat.SB){ sub("Operating"); seenOper=true; }
    bars.push({label:l.label, kind:"loss", type:l.type, y0:run, y1:run-l.value, v:l.value}); run-=l.value; });
  bars.push({label:"Direct operating", kind:"total", v:run});
  var kpiH = o.showKpis ? 70 : 0;
  var top=oee_headerH(o)+kpiH+18, bot=46, left=56, right=16, ph=H-top-bot, pw=W-left-right;
  var ny=oee_nice(0,input.total*1.04,4), hi=ny.hi, Y=function(v){return top+ph*(1-v/hi);};
  var slot=pw/bars.length, bw=Math.min(60,slot*0.62);
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+oee_FONT+'">';
  s+=oee_header(o,W);
  if(o.showKpis){
    var tiles=[["Availability",K.A,o.availTarget],["Utilisation",K.U,o.utilTarget],["Efficiency",K.E,o.effTarget],["OEE",K.OEE,o.oeeTarget]];
    var tw=Math.min(190,(W-32-30)/4), ty=oee_headerH(o)+4;
    tiles.forEach(function(t,i){ var x=16+i*(tw+10), ok=t[1]!=null&&t[1]*100>=t[2], col=t[1]==null?o.mutedColor:(ok?o.goodColor:o.badColor);
      s+='<rect x="'+x+'" y="'+ty+'" width="'+tw+'" height="'+(kpiH-8)+'" rx="8" fill="#F7F9FB" stroke="#E3E8ED"/>';
      s+='<text x="'+(x+12)+'" y="'+(ty+18)+'" font-size="11" fill="'+o.mutedColor+'">'+t[0]+(i===3?' (A×U×E)':'')+'</text>';
      s+='<text x="'+(x+12)+'" y="'+(ty+46)+'" font-size="22" font-weight="700" fill="'+col+'">'+(t[1]==null?"–":(t[1]*100).toFixed(1)+"%")+'</text>';
      s+='<text x="'+(x+tw-10)+'" y="'+(ty+46)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">target '+t[2]+'%</text>'; });
  }
  var gl=oee_ticks(ny.ticks,o.valueScale,o.prefix);
  for(var g=0;g<ny.ticks.length;g++){ var gy=Y(ny.ticks[g]);
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+gy.toFixed(1)+'" y2="'+gy.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+gl[g]+'</text>'; }
  bars.forEach(function(b,i){
    var x=left+slot*i+(slot-bw)/2, ya, yb, col;
    if(b.kind==="loss"){ ya=Y(b.y0); yb=Y(b.y1); col=colors[b.type]; }
    else { ya=Y(b.v); yb=Y(0); col = b.kind==="sub" ? "#A9B6C2" : o.totalColor; }
    if(b.kind==="total" && i===bars.length-1) col=o.goodColor;
    s+='<rect x="'+x.toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb-ya).toFixed(1)+'" rx="2" fill="'+col+'"><title>'+oee_esc(b.label+": "+oee_fmt(b.v,o.valueScale,o.decimals,o.prefix,o.suffix)+" ("+(b.v/input.total*100).toFixed(1)+"% of calendar)")+'</title></rect>';
    if(i<bars.length-1){ var ny = b.kind==="loss" ? Y(b.y1) : Y(b.v);
      s+='<line x1="'+(x+bw).toFixed(1)+'" x2="'+(x+slot).toFixed(1)+'" y1="'+ny.toFixed(1)+'" y2="'+ny.toFixed(1)+'" stroke="'+o.mutedColor+'" stroke-dasharray="2 2"/>'; }
    var txt=(b.kind==="loss"?"−":"")+oee_fmt(b.v,o.valueScale,o.decimals,o.prefix,o.suffix);
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-5).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="600" fill="'+o.inkColor+'">'+oee_esc(txt)+'</text>';
    var lab=oee_esc(oee_trunc(b.label, Math.max(8,Math.floor(slot/6.2))));
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-bot+16)+'" text-anchor="middle" font-size="10" font-weight="'+(b.kind==="loss"?400:700)+'" fill="'+o.inkColor+'">'+lab+'</text>';
    if(b.kind==="loss") s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-bot+29)+'" text-anchor="middle" font-size="9" fill="'+colors[b.type]+'">'+b.type+'</text>';
  });
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
    var m = sacMeta(b); if (m.meas.length < 2) return null;
    var tot = 0, losses = m.meas.slice(1).map(function (x) { return { label: x.label, value: 0 }; });
    (b.data || []).forEach(function (r) {
      if (sacIsTotal(r, m.dims)) return;
      tot += sacVal(r, m.meas[0].key) || 0;
      losses.forEach(function (l, i) { l.value += sacVal(r, m.meas[i + 1].key) || 0; });
    });
    return { total: tot, totalLabel: m.meas[0].label, losses: losses };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class OeeTimeUsage extends HTMLElement {
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
        this._root.innerHTML = oee_msg(opts.width || 400, opts.height || 200, "Bind Calendar hours, then loss-hour measures in order.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildOeeSVG(input, opts) : oee_msg(opts.width || 400, opts.height || 200, "Bind Calendar hours, then loss-hour measures in order.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-oeetimeusage", OeeTimeUsage);
})();
