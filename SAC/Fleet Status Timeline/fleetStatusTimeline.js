/*!
 * Fleet Status Timeline — SAC custom widget (main)
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* Fleet Status Timeline — SAC custom widget (main component). Self-contained; no external libraries. */
(function () {
  "use strict";

/* =============================================================================
 * Fleet Status Timeline — canonical renderer (v0.1)
 * One lane per equipment unit (truck, shovel, drill…), coloured segments per
 * status over the shift/day, and a time-in-operating % column.
 *
 * input : { events:[{equip, status, start:Date, end:Date, group}] }
 * opts  : see fltDefaults()
 * ========================================================================== */
function fltDefaults(){
  return {
    title: "Fleet Status", subtitle: "Equipment state across the period",
    statusColors: "Operating:#1A9850,Standby:#E0A100,Delay:#E9730C,Down:#D73027,Maintenance:#0A6ED1",
    palette: "#925ACE,#0F828F,#5B738B,#C87B00,#D04343",
    operatingStatus: "Operating",
    sortBy: "name",                   // name | utilisation | group
    rowHeight: 22, labelWidth: 120,
    showSummary: true, showLegend: true,
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 1000, height: 440
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var flt_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function flt_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function flt_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function flt_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function flt_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function flt_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function flt_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function flt_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function flt_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+flt_FONT+'" font-size="13" fill="#8794A0">'+flt_esc(text)+'</text></svg>';
}
function flt_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+flt_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+flt_esc(o.subtitle)+'</text>';
  return s;
}
function flt_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function flt_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return flt_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return flt_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function flt_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}

function flt_parseDT(v){
  if(v instanceof Date) return isNaN(v.getTime())?null:v;
  if(v==null||v==="") return null;
  var s=String(v).trim(), m;
  if((m=s.match(/^(\d{4})-?(\d{2})-?(\d{2})[T\s]?(\d{2})?:?(\d{2})?:?(\d{2})?/)))
    return new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)));
  var t=Date.parse(s); return isNaN(t)?null:new Date(t);
}
function flt_hm(d){ var h=d.getUTCHours(), m=d.getUTCMinutes(); return (h<10?"0":"")+h+":"+(m<10?"0":"")+m; }
function buildFleetSVG(input, opts){
  var o = Object.assign(fltDefaults(), opts||{});
  var W = Math.max(420, +o.width||1000);
  var ev = ((input&&input.events)||[]).filter(function(e){return e.equip&&e.start&&e.end&&e.end>e.start;});
  if(!ev.length) return flt_msg(W, Math.max(200,+o.height||440), "Assign the Equipment, Status, Start and End feeds.");
  var cmap={}; String(o.statusColors).split(",").forEach(function(p){ var kv=p.split(":"); if(kv.length===2) cmap[kv[0].trim().toLowerCase()]=kv[1].trim(); });
  var pal=String(o.palette).split(",").map(function(x){return x.trim();}), pi=0, statuses=[];
  function col(st){ var k=String(st).toLowerCase(); if(!cmap[k]) cmap[k]=pal[pi++%pal.length]; return cmap[k]; }
  ev.forEach(function(e){ if(statuses.indexOf(e.status)<0) statuses.push(e.status); });
  var t0=Math.min.apply(null,ev.map(function(e){return e.start.getTime();})), t1=Math.max.apply(null,ev.map(function(e){return e.end.getTime();}));
  var units={}, list=[];
  ev.forEach(function(e){ var u=units[e.equip]; if(!u){ u=units[e.equip]={name:e.equip, group:e.group||"", ev:[], op:0, tot:0}; list.push(u); }
    u.ev.push(e); var d=e.end-e.start; u.tot+=d; if(String(e.status).toLowerCase()===String(o.operatingStatus).toLowerCase()) u.op+=d; });
  list.forEach(function(u){ u.util = (t1>t0) ? u.op/(t1-t0) : 0; });
  if(o.sortBy==="utilisation") list.sort(function(a,b){return b.util-a.util;});
  else if(o.sortBy==="group") list.sort(function(a,b){return a.group<b.group?-1:a.group>b.group?1:(a.name<b.name?-1:1);});
  else list.sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
  var rh=Math.max(14,+o.rowHeight||22), lw=+o.labelWidth||120, sumW=o.showSummary?70:0;
  var legH = o.showLegend ? 22 : 0, top=flt_headerH(o)+legH+26, x0=16+lw, x1=W-16-sumW, pw=x1-x0;
  var H=Math.max(+o.height||0, top+rh*list.length+20);
  var X=function(t){return x0+pw*(t-t0)/(t1-t0);};
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+flt_FONT+'">';
  s+=flt_header(o,W);
  if(o.showLegend){ var lx=16, ly=flt_headerH(o)+10;
    statuses.forEach(function(st){ s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="12" height="10" rx="2" fill="'+col(st)+'"/><text x="'+(lx+17)+'" y="'+ly+'" font-size="10.5" fill="'+o.inkColor+'">'+flt_esc(st)+'</text>'; lx+=30+String(st).length*6; }); }
  // time axis
  var span=t1-t0, steps=[9e5,18e5,36e5,72e5,108e5,216e5,432e5,864e5], step=steps[steps.length-1];
  for(var i=0;i<steps.length;i++){ if(span/steps[i]<=10){ step=steps[i]; break; } }
  var first=Math.ceil(t0/step)*step;
  for(var t=first; t<=t1; t+=step){ var x=X(t), d=new Date(t), midnight=d.getUTCHours()===0&&d.getUTCMinutes()===0;
    s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(top-4)+'" y2="'+(top+rh*list.length)+'" stroke="'+(midnight?o.mutedColor:o.gridColor)+'"/>';
    var anc = x>x1-18 ? "end" : (x<x0+18 ? "start" : "middle");
    s+='<text x="'+x.toFixed(1)+'" y="'+(top-8)+'" text-anchor="'+anc+'" font-size="10" fill="'+o.mutedColor+'">'+(midnight&&span>864e5/2? d.getUTCDate()+"/"+(d.getUTCMonth()+1) : flt_hm(d))+'</text>'; }
  if(o.showSummary) s+='<text x="'+(W-16)+'" y="'+(top-20)+'" text-anchor="end" font-size="10" font-weight="700" fill="'+o.mutedColor+'">% '+flt_esc(o.operatingStatus)+'</text>';
  var lastGroup=null;
  list.forEach(function(u,ri){
    var y=top+rh*ri;
    if(ri%2===0) s+='<rect x="'+x0+'" y="'+y+'" width="'+pw+'" height="'+rh+'" fill="#F7F9FB"/>';
    if(o.sortBy==="group" && u.group!==lastGroup && ri>0) s+='<line x1="16" x2="'+(W-16)+'" y1="'+y+'" y2="'+y+'" stroke="'+o.mutedColor+'"/>';
    lastGroup=u.group;
    s+='<text x="'+(x0-8)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" fill="'+o.inkColor+'">'+flt_esc(flt_trunc(u.name,Math.floor(lw/6.3)))+'</text>';
    u.ev.forEach(function(e){ var a=X(e.start.getTime()), b=X(e.end.getTime());
      s+='<rect x="'+a.toFixed(1)+'" y="'+(y+3)+'" width="'+Math.max(0.8,b-a).toFixed(1)+'" height="'+(rh-6)+'" fill="'+col(e.status)+'"><title>'+flt_esc(u.name+" · "+e.status+" · "+flt_hm(e.start)+"–"+flt_hm(e.end)+" ("+((e.end-e.start)/36e5).toFixed(1)+" h)")+'</title></rect>'; });
    if(o.showSummary){ var pc=u.util*100;
      s+='<text x="'+(W-16)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11.5" font-weight="700" fill="'+(pc>=75?col(o.operatingStatus):o.inkColor)+'">'+pc.toFixed(0)+'%</text>'; }
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

  function feedKey(md, id) { var f = md && md.feeds && md.feeds[id]; return (f && f.values && f.values.length) ? f.values[0] : null; }
  function buildInput(b) {
    var md = b.metadata || {}, ke = feedKey(md, "equipment"), ks = feedKey(md, "status"), k0 = feedKey(md, "startTime"), k1 = feedKey(md, "endTime"), kg = feedKey(md, "groupDim");
    if (!ke || !ks || !k0 || !k1) return null;
    var ev = (b.data || []).map(function (r) {
      function raw(k) { var c = r[k]; return c ? (c.id != null ? c.id : c.label) : null; }
      return { equip: sacLab(r, ke), status: sacLab(r, ks), start: flt_parseDT(raw(k0)) || flt_parseDT(sacLab(r, k0)),
               end: flt_parseDT(raw(k1)) || flt_parseDT(sacLab(r, k1)), group: kg ? sacLab(r, kg) : "" };
    });
    return { events: ev };
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    '  :host { display:block; width:100%; height:100%; font-family:\'72\',-apple-system,\'Segoe UI\',Roboto,sans-serif; }' +
    '  #root { width:100%; height:100%; overflow:auto; }' +
    '  #root svg { display:block; }' +
    '</style><div id="root"></div>';

  class FleetStatusTimeline extends HTMLElement {
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
        this._root.innerHTML = flt_msg(opts.width || 400, opts.height || 200, "Assign the Equipment, Status, Start and End feeds.");
        return;
      }
      var input = buildInput(binding, this._props);
      this._root.innerHTML = input ? buildFleetSVG(input, opts) : flt_msg(opts.width || 400, opts.height || 200, "Assign the Equipment, Status, Start and End feeds.");
      this.dispatchEvent(new Event("onResultChanged"));
    }
  }

  customElements.define("com-dataco-sac-fleetstatustimeline", FleetStatusTimeline);
})();
