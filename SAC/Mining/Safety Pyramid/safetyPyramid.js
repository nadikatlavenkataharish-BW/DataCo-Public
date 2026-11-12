/*!
 * Safety Pyramid — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Safety Pyramid — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Safety Pyramid — canonical renderer (v0.1)
 * Incident counts by severity (top = most severe) drawn as a safety triangle,
 * with LTIFR / TRIFR frequency rates when exposure hours are bound.
 *
 * input : { levels:[{label, value}], hours }
 * opts  : see sftDefaults()
 * ========================================================================== */
function sftDefaults(){
  return {
    title: "Safety Performance", subtitle: "Incidents by severity",
    rateBase: 1000000,                // per million hours (use 200000 for OSHA-style rates)
    ltiLevels: "1-2",                 // levels counted in LTIFR (1 = top)
    trifrLevels: "1-3",               // levels counted in TRIFR
    ltifrTarget: 1.0, trifrTarget: 5.0,
    showRatio: true, showRates: true,
    levelColors: "#7F1D1D,#B91C1C,#E9730C,#E0A100,#8FB3D9,#C9D7E6",
    goodColor: "#1A9850", badColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 820, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var sft_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function sft_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function sft_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function sft_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function sft_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function sft_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function sft_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function sft_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function sft_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+sft_FONT+'" font-size="13" fill="#8794A0">'+sft_esc(text)+'</text></svg>';
}
function sft_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+sft_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+sft_esc(o.subtitle)+'</text>';
  return s;
}
function sft_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function sft_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return sft_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return sft_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function sft_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function sft_range(r, n){ var m=String(r).match(/(\d+)\s*-\s*(\d+)/); var a=m?+m[1]:1, b=m?+m[2]:n; return [Math.max(1,a), Math.min(n,b)]; }
function sft_lum(h){ h=h.replace("#",""); var r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16); return (0.299*r+0.587*g+0.114*b)/255; }
function buildSafetySVG(input, opts){
  var o = Object.assign(sftDefaults(), opts||{});
  var W = Math.max(400, +o.width||820), H = Math.max(260, +o.height||420);
  var lv = ((input&&input.levels)||[]).filter(function(l){return l.value!=null;});
  if(!lv.length) return sft_msg(W,H,"Bind incident-count measures from most to least severe (optionally Hours worked last).");
  var n=lv.length, hours=input.hours, cols=String(o.levelColors).split(",").map(function(x){return x.trim();});
  var showRates = o.showRates && hours>0, panelW = showRates ? 230 : 0;
  var top=sft_headerH(o)+12, bot=16, ph=H-top-bot, pyW=Math.min(W-32-panelW-20, ph*1.6), cx=16+(W-32-panelW)/2, apex=top, base=top+ph;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+sft_FONT+'">';
  s+=sft_header(o,W);
  var stripH=ph/n, gap=3;
  function halfW(y){ return (pyW/2)*(y-apex)/ph; }
  lv.forEach(function(l,i){
    var y0=apex+stripH*i+(i?gap/2:0), y1=apex+stripH*(i+1)-(i<n-1?gap/2:0), w0=halfW(y0), w1=halfW(y1), c=cols[i%cols.length];
    s+='<path d="M'+(cx-w0).toFixed(1)+' '+y0.toFixed(1)+'L'+(cx+w0).toFixed(1)+' '+y0.toFixed(1)+'L'+(cx+w1).toFixed(1)+' '+y1.toFixed(1)+'L'+(cx-w1).toFixed(1)+' '+y1.toFixed(1)+'Z" fill="'+c+'"><title>'+sft_esc(l.label+": "+l.value)+'</title></path>';
    var tc = sft_lum(c)<0.55 ? "#FFFFFF" : o.inkColor, my=(y0+y1)/2, room=w0+w1;
    if(room>90){ s+='<text x="'+cx.toFixed(1)+'" y="'+(my-1).toFixed(1)+'" text-anchor="middle" font-size="'+Math.min(20,stripH*0.38).toFixed(0)+'" font-weight="700" fill="'+tc+'">'+sft_fmt(l.value,"none",0)+'</text>';
      s+='<text x="'+cx.toFixed(1)+'" y="'+(my+Math.min(15,stripH*0.3)).toFixed(1)+'" text-anchor="middle" font-size="10.5" fill="'+tc+'">'+sft_esc(sft_trunc(l.label,Math.floor(room/6)))+'</text>'; }
    else { s+='<text x="'+(cx+w1+10).toFixed(1)+'" y="'+(my+4).toFixed(1)+'" font-size="11" font-weight="700" fill="'+o.inkColor+'">'+sft_fmt(l.value,"none",0)+' <tspan font-weight="400" fill="'+o.mutedColor+'">'+sft_esc(l.label)+'</tspan></text>'; }
  });
  var px=W-16-panelW+10, py=top+4;
  if(showRates){
    function sum(r){ var a=sft_range(r,n), t=0; for(var k=a[0];k<=a[1];k++) t+=lv[k-1].value||0; return t; }
    var lti=sum(o.ltiLevels)*o.rateBase/hours, tri=sum(o.trifrLevels)*o.rateBase/hours, base_=o.rateBase>=1e6?(o.rateBase/1e6)+"M":sft_fmt(o.rateBase,"none",0);
    var kp=[["LTIFR",lti,o.ltifrTarget,"levels "+o.ltiLevels],["TRIFR",tri,o.trifrTarget,"levels "+o.trifrLevels]];
    kp.forEach(function(k,i){ var y=py+i*78, ok=k[1]<=k[2];
      s+='<rect x="'+(px-10)+'" y="'+y+'" width="'+(panelW-6)+'" height="70" rx="8" fill="#F7F9FB" stroke="#E3E8ED"/>';
      s+='<text x="'+px+'" y="'+(y+18)+'" font-size="11" fill="'+o.mutedColor+'">'+k[0]+' per '+base_+' h · '+sft_esc(k[3])+'</text>';
      s+='<text x="'+px+'" y="'+(y+48)+'" font-size="24" font-weight="700" fill="'+(ok?o.goodColor:o.badColor)+'">'+k[1].toFixed(2)+'</text>';
      s+='<text x="'+(px+panelW-26)+'" y="'+(y+48)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">target ≤ '+k[2]+'</text>'; });
    s+='<text x="'+px+'" y="'+(py+176)+'" font-size="11" fill="'+o.mutedColor+'">Exposure hours</text><text x="'+px+'" y="'+(py+194)+'" font-size="14" font-weight="700" fill="'+o.inkColor+'">'+sft_fmt(hours,"auto",2)+'</text>';
  }
  if(o.showRatio){ var t=lv[0].value>0?lv[0].value:null, rat=lv.map(function(l){return t?Math.round(l.value/t):l.value;}).join(" : ");
    s+='<text x="'+(showRates?px:W-16)+'" y="'+(showRates?py+226:top+12)+'" text-anchor="'+(showRates?"start":"end")+'" font-size="11" fill="'+o.mutedColor+'">'+(t?'Ratio ':'Counts ')+sft_esc(rat)+'</text>'; }
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
    var m = sacMeta(b); if (!m.meas.length) return null;
    var hrsIdx = -1; m.meas.forEach(function (x, i) { if (/hour|hrs|exposure/i.test(x.label)) hrsIdx = i; });
    var sums = m.meas.map(function () { return 0; });
    (b.data || []).forEach(function (r) { if (sacIsTotal(r, m.dims)) return; m.meas.forEach(function (x, i) { sums[i] += sacVal(r, x.key) || 0; }); });
    var levels = []; m.meas.forEach(function (x, i) { if (i !== hrsIdx) levels.push({ label: x.label, value: sums[i] }); });
    return { levels: levels, hours: hrsIdx >= 0 ? sums[hrsIdx] : null };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class SafetyPyramid extends HTMLElement {
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
        this._root.innerHTML = sft_msg(opts.width || 400, opts.height || 200, "Bind incident-count measures, most severe first.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildSafetySVG(input, opts) : sft_msg(opts.width || 400, opts.height || 200, "Bind incident-count measures, most severe first.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-safetypyramid", SafetyPyramid);
})();
