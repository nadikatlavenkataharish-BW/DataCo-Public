/*!
 * Mine-to-Mill Sankey — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Mine-to-Mill Sankey — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Mine-to-Mill Sankey — canonical renderer (v0.1)
 * Material flow from sources (pits / stopes) through stockpiles, crusher, mill
 * to concentrate & tailings. Link width = tonnes; optional grade colouring; the
 * gap between a node's inflow and outflow is drawn as a loss stub.
 *
 * input : { links:[{source, target, value, grade}], labels:{value, grade} }
 * opts  : see snkDefaults()
 * ========================================================================== */
function snkDefaults(){
  return {
    title: "Mine-to-Mill Flow", subtitle: "Tonnes by stage",
    colorBy: "source",               // source | grade
    nodeWidth: 14, nodePadding: 18,
    showValues: true, showLosses: true,
    valueScale: "auto", decimals: 1, prefix: "", suffix: " t",
    gradeUnit: "% Cu", gradeDecimals: 2,
    palette: "#0A6ED1,#E9730C,#5B738B,#1A9850,#925ACE,#C87B00,#0F828F,#D04343",
    gradeLow: "#D73027", gradeMid: "#FEE08B", gradeHigh: "#1A9850",
    nodeColor: "#33414A", lossColor: "#C4CDD5",
    inkColor: "#33414A", mutedColor: "#8794A0",
    width: 960, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var snk_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function snk_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function snk_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function snk_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function snk_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function snk_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function snk_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function snk_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function snk_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+snk_FONT+'" font-size="13" fill="#8794A0">'+snk_esc(text)+'</text></svg>';
}
function snk_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+snk_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+snk_esc(o.subtitle)+'</text>';
  return s;
}
function snk_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function snk_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return snk_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return snk_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function snk_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function snk_rgb(h){ h=h.replace("#",""); return [0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16);}); }
function snk_mix(a,b,t){ var x=snk_rgb(a), y=snk_rgb(b); return "#"+x.map(function(v,i){var c=Math.round(v+(y[i]-v)*t).toString(16); return c.length<2?"0"+c:c;}).join(""); }
function buildSankeySVG(input, opts){
  var o = Object.assign(snkDefaults(), opts||{});
  var W = Math.max(360, +o.width||960), H = Math.max(220, +o.height||440);
  var links = ((input&&input.links)||[]).filter(function(l){return l.source!==""&&l.target!==""&&l.value>0&&l.source!==l.target;});
  if(!links.length) return snk_msg(W,H,"Bind Source and Target dimensions plus a Tonnes measure.");
  var L = input.labels||{}, nodes={}, order=[];
  function node(n){ if(!nodes[n]){ nodes[n]={name:n,inV:0,outV:0,ins:[],outs:[],col:0,gIn:0,gW:0}; order.push(n);} return nodes[n]; }
  links.forEach(function(l){ var s=node(l.source), t=node(l.target); s.outV+=l.value; t.inV+=l.value; s.outs.push(l); t.ins.push(l);
    if(l.grade!=null){ t.gIn+=l.grade*l.value; t.gW+=l.value; } });
  // columns = longest path from a source (guarded against cycles)
  for(var it=0; it<order.length; it++){ var changed=false;
    links.forEach(function(l){ var c=nodes[l.source].col+1; if(c>nodes[l.target].col && c<order.length){ nodes[l.target].col=c; changed=true; } });
    if(!changed) break; }
  // pull pure sinks to the far right only when they are terminal products
  var maxCol=0; order.forEach(function(n){ maxCol=Math.max(maxCol,nodes[n].col); });
  var cols=[]; for(var c=0;c<=maxCol;c++) cols.push([]);
  order.forEach(function(n){ cols[nodes[n].col].push(nodes[n]); });
  var top=snk_headerH(o)+12, bot=16, left=16, right=16, nw=+o.nodeWidth||14, pad=+o.nodePadding||18;
  var ph=H-top-bot;
  function nv(n){ return Math.max(n.inV, n.outV); }
  var k = Infinity;
  cols.forEach(function(col){ var sum=col.reduce(function(s,n){return s+nv(n);},0); if(sum>0) k=Math.min(k,(ph-pad*(col.length-1))/sum); });
  if(!isFinite(k)||k<=0) k=1;
  var span = W-left-right-nw;
  cols.forEach(function(col,ci){
    var tot=col.reduce(function(s,n){return s+nv(n)*k;},0)+pad*(col.length-1), y=top+(ph-tot)/2;
    col.forEach(function(n){ n.x = left + (maxCol? span*ci/maxCol : span/2); n.y=y; n.h=Math.max(2,nv(n)*k); y+=n.h+pad; });
  });
  // link offsets, ordered to minimise crossings
  order.forEach(function(nm){ var n=nodes[nm];
    n.outs.sort(function(a,b){return nodes[a.target].y-nodes[b.target].y;});
    n.ins.sort(function(a,b){return nodes[a.source].y-nodes[b.source].y;});
    var oy=n.y; n.outs.forEach(function(l){ l.sy=oy; oy+=l.value*k; });
    var iy=n.y; n.ins.forEach(function(l){ l.ty=iy; iy+=l.value*k; }); });
  var pal=String(o.palette).split(",").map(function(s){return s.trim();}).filter(Boolean), srcIdx={}, si=0;
  var grades=links.filter(function(l){return l.grade!=null;}).map(function(l){return l.grade;});
  var gmin=Math.min.apply(null,grades), gmax=Math.max.apply(null,grades), byGrade = o.colorBy==="grade" && grades.length;
  function gcol(g){ if(g==null) return o.lossColor; var t=gmax>gmin?(g-gmin)/(gmax-gmin):.5; return t<.5?snk_mix(o.gradeLow,o.gradeMid,t*2):snk_mix(o.gradeMid,o.gradeHigh,(t-.5)*2); }
  function scol(l){ var root=l.source; if(!(root in srcIdx)) srcIdx[root]=si++; return pal[srcIdx[root]%pal.length]; }
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+snk_FONT+'">';
  s+=snk_header(o,W);
  links.forEach(function(l){
    var a=nodes[l.source], b=nodes[l.target], x0=a.x+nw, x1=b.x, w=l.value*k, xm=(x0+x1)/2;
    var d='M'+x0+' '+l.sy+'C'+xm+' '+l.sy+' '+xm+' '+l.ty+' '+x1+' '+l.ty+'L'+x1+' '+(l.ty+w)+'C'+xm+' '+(l.ty+w)+' '+xm+' '+(l.sy+w)+' '+x0+' '+(l.sy+w)+'Z';
    var tip=l.source+' → '+l.target+': '+snk_fmt(l.value,o.valueScale,o.decimals,o.prefix,o.suffix)+(l.grade!=null?' @ '+l.grade.toFixed(o.gradeDecimals)+' '+o.gradeUnit:'');
    s+='<path d="'+d+'" fill="'+(byGrade?gcol(l.grade):scol(l))+'" fill-opacity="0.5"><title>'+snk_esc(tip)+'</title></path>';
  });
  order.forEach(function(nm){ var n=nodes[nm];
    s+='<rect x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" width="'+nw+'" height="'+n.h.toFixed(1)+'" fill="'+o.nodeColor+'" rx="2"/>';
    var loss = n.ins.length && n.outs.length ? n.inV-n.outV : 0;
    if(o.showLosses && loss>0){ var ly=n.y+n.outV*k, lh=loss*k, lx=n.x+nw;
      s+='<path d="M'+lx+' '+ly+'L'+(lx+26)+' '+(ly+lh*0.3)+'L'+(lx+26)+' '+(ly+lh*0.3+Math.max(2,lh*0.4))+'L'+lx+' '+(ly+lh)+'Z" fill="'+o.lossColor+'"><title>'+snk_esc(nm+' — not passed on (loss / stockpile build): '+snk_fmt(loss,o.valueScale,o.decimals,o.prefix,o.suffix))+'</title></path>';
      }
    var last = n.col===maxCol, tx = last ? n.x-6 : n.x+nw+6, anchor = last?"end":"start", cy=n.y+n.h/2;
    var g = n.gW ? n.gIn/n.gW : null;
    s+='<text x="'+tx.toFixed(1)+'" y="'+(cy-(o.showValues?2:-4)).toFixed(1)+'" text-anchor="'+anchor+'" font-size="11.5" font-weight="700" fill="'+o.inkColor+'">'+snk_esc(nm)+'</text>';
    if(o.showValues) s+='<text x="'+tx.toFixed(1)+'" y="'+(cy+12).toFixed(1)+'" text-anchor="'+anchor+'" font-size="10" fill="'+o.mutedColor+'">'+snk_esc(snk_fmt(nv(n),o.valueScale,o.decimals,o.prefix,o.suffix)+(g!=null?' · '+g.toFixed(o.gradeDecimals)+' '+o.gradeUnit:''))+'</text>';
  });
  if(byGrade){ var lx=W-right-170, ly=top-4;
    s+='<defs><linearGradient id="snkg"><stop offset="0" stop-color="'+o.gradeLow+'"/><stop offset=".5" stop-color="'+o.gradeMid+'"/><stop offset="1" stop-color="'+o.gradeHigh+'"/></linearGradient></defs>';
    s+='<rect x="'+lx+'" y="'+(ly-14)+'" width="90" height="8" fill="url(#snkg)" rx="2"/><text x="'+(lx+96)+'" y="'+(ly-7)+'" font-size="10" fill="'+o.mutedColor+'">'+snk_esc((L.grade||"Grade")+' '+gmin.toFixed(o.gradeDecimals)+'–'+gmax.toFixed(o.gradeDecimals))+'</text>'; }
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
    var m = sacMeta(b); if (m.dims.length < 2 || !m.meas.length) return null;
    var ks = m.dims[0].key, kt = m.dims[1].key, kv = m.meas[0].key, kg = m.meas[1] && m.meas[1].key, map = {}, links = [];
    (b.data || []).forEach(function (r) {
      if (sacIsTotal(r, m.dims)) return;
      var s = sacLab(r, ks), t = sacLab(r, kt), v = sacVal(r, kv), g = kg ? sacVal(r, kg) : null, key = s + "\u0001" + t, l = map[key];
      if (!l) { l = map[key] = { source: s, target: t, value: 0, gw: 0, gv: 0 }; links.push(l); }
      l.value += v || 0; if (g != null && v) { l.gw += v; l.gv += g * v; }
    });
    links.forEach(function (l) { l.grade = l.gw ? l.gv / l.gw : null; });
    return { links: links, labels: { value: m.meas[0].label, grade: m.meas[1] && m.meas[1].label } };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class MineToMillSankey extends HTMLElement {
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
        this._root.innerHTML = snk_msg(opts.width || 400, opts.height || 200, "Bind Source and Target dimensions plus a Tonnes measure.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildSankeySVG(input, opts) : snk_msg(opts.width || 400, opts.height || 200, "Bind Source and Target dimensions plus a Tonnes measure.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-minetomillsankey", MineToMillSankey);
})();
