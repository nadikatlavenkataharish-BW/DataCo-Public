/*!
 * Price-Volume-Mix Bridge — renderer
 * Copyright (c) 2026 The Data Co (Pty) Ltd. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. Licensed for use only under a written agreement with The Data Co (Pty) Ltd.
 * Unauthorised copying, modification or distribution is prohibited. See LICENSE.
 */
/* =============================================================================
 * Price-Volume-Mix Bridge — canonical renderer (v0.1)
 * Prior-period revenue → Volume → Mix → Price → New / discontinued → current
 * revenue, decomposed per product, plus the top product drivers.
 *
 *  Pp_i = Rp_i/Up_i, Pc_i = Rc_i/Uc_i (continuing products only)
 *  Volume = (ΣUc − ΣUp) × (ΣRp/ΣUp)
 *  Mix    = Σ Uc_i·Pp_i − ΣUc × (ΣRp/ΣUp)
 *  Price  = Σ Uc_i·(Pc_i − Pp_i)
 *  New/discontinued = Rc of new products − Rp of discontinued products
 *
 * input : { items:[{label, up, rp, uc, rc}] }
 * opts  : see pvmDefaults()
 * ========================================================================== */
function pvmDefaults(){
  return {
    title: "Price-Volume-Mix", subtitle: "Revenue bridge, prior period to current",
    priorLabel: "Prior period", currentLabel: "Current period",
    showDrivers: true, topDrivers: 6,
    currency: "ZAR", currencySymbol: "",
    valueScale: "auto", decimals: 1,
    totalColor: "#5B738B", positiveColor: "#1A9850", negativeColor: "#D73027",
    inkColor: "#33414A", mutedColor: "#8794A0", gridColor: "#E3E8ED",
    width: 1000, height: 420
  };
}
/* ----- shared helpers (prefixed per widget at build time) ----------------- */
var pvm_FONT = "'72','72full',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function pvm_esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function pvm_num(v){ v=Number(v); return isFinite(v)?v:null; }
/* scale: auto | none | K | M | B ; decimals: integer */
function pvm_fmt(v, scale, decimals, prefix, suffix){
  if(v==null||!isFinite(v)) return "–";
  var d = decimals==null ? 1 : +decimals, a=Math.abs(v), div=1, u="";
  if(scale==="auto"||scale==null){ if(a>=1e9){div=1e9;u="B";} else if(a>=1e6){div=1e6;u="M";} else if(a>=1e3){div=1e3;u="K";} else d=Math.min(d,2); }
  else if(scale==="K"){div=1e3;u="K";} else if(scale==="M"){div=1e6;u="M";} else if(scale==="B"){div=1e9;u="B";}
  var x=v/div, s=Math.abs(x).toFixed(d), p=s.split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return (x<0?"-":"")+(prefix||"")+p.join(".")+u+(suffix||"");
}
function pvm_pct(v, decimals){ if(v==null||!isFinite(v)) return "–"; var d=decimals==null?1:+decimals; return (v>0?"+":"")+(v*100).toFixed(d)+"%"; }
/* variance % against a base, safe for zero / negative base */
function pvm_varPct(actual, base){ if(actual==null||base==null||base===0) return null; return (actual-base)/Math.abs(base); }
/* favourable? invertSign=true for cost-type measures (lower is better) */
function pvm_good(delta, invertSign){ return invertSign ? delta<=0 : delta>=0; }
function pvm_trunc(s, n){ s=String(s==null?"":s); return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; }
function pvm_msg(w,h,text){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+w+' '+h+'"><text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-family="'+pvm_FONT+'" font-size="13" fill="#8794A0">'+pvm_esc(text)+'</text></svg>';
}
function pvm_header(o, w){
  var s="";
  if(o.title) s+='<text x="16" y="24" font-size="15" font-weight="700" fill="'+o.inkColor+'">'+pvm_esc(o.title)+'</text>';
  if(o.subtitle) s+='<text x="16" y="42" font-size="12" fill="'+o.mutedColor+'">'+pvm_esc(o.subtitle)+'</text>';
  return s;
}
function pvm_headerH(o){ return o.title||o.subtitle ? (o.subtitle?54:36) : 8; }
/* axis tick labels: smallest decimal count (0-2) that keeps ticks distinct */
function pvm_ticks(vals, scale, prefix){
  for(var d=0; d<=2; d++){ var t=vals.map(function(v){return pvm_fmt(v,scale,d,prefix,"");});
    if(t.filter(function(x,i){return t.indexOf(x)===i;}).length===t.length) return t; }
  return vals.map(function(v){return pvm_fmt(v,scale,2,prefix,"");});
}
/* "nice" axis: round step (1/2/2.5/5 × 10^k) covering [lo, hi] with ~n intervals */
function pvm_nice(lo, hi, n){
  n = n || 5; if(!(hi > lo)) hi = lo + 1;
  var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for(var v = a; v <= b + step * 1e-9; v += step) t.push(Math.round(v / step) * step);
  var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9)); if(step * Math.pow(10, dec) % 1) dec++;
  return { lo: a, hi: b, step: step, ticks: t, dec: dec };
}
/* currency symbol: currency = ZAR | USD | custom (uses currencySymbol) */
function pvm_cur(o){ if(!o) return ""; if(o.currency==="ZAR") return "R"; if(o.currency==="USD") return "$"; return o.currencySymbol==null?"":String(o.currencySymbol); }
function pvm_money(v, o, dec){ return pvm_fmt(v, o.valueScale, dec==null?o.decimals:dec, pvm_cur(o), ""); }

function pvmCompute(items){
  var cont=items.filter(function(i){return i.up>0&&i.uc>0;});
  var Up=0,Rp=0,Uc=0,Rc=0,newR=0,discR=0; items.forEach(function(i){ Rp+=i.rp||0; Rc+=i.rc||0; });
  items.forEach(function(i){ if(!(i.up>0)&&i.uc>0) newR+=i.rc||0; if(i.up>0&&!(i.uc>0)) discR+=i.rp||0; });
  cont.forEach(function(i){ Up+=i.up; Uc+=i.uc; });
  var RpC=cont.reduce(function(s,i){return s+i.rp;},0), avgP=Up?RpC/Up:0;
  var vol=(Uc-Up)*avgP, mixBase=0, price=0, per=[];
  cont.forEach(function(i){ var pp=i.rp/i.up, pc=i.rc/i.uc, pr=i.uc*(pc-pp), mx=i.uc*pp-i.uc*avgP - (i.up*pp - i.up*avgP);
    mixBase+=i.uc*pp; price+=pr; per.push({label:i.label, price:pr, total:(i.rc-i.rp)}); });
  var mix=mixBase-Uc*avgP;
  items.forEach(function(i){ if(!(i.up>0)&&i.uc>0) per.push({label:i.label+" (new)", price:0, total:i.rc}); if(i.up>0&&!(i.uc>0)) per.push({label:i.label+" (disc.)", price:0, total:-i.rp}); });
  return {Rp:Rp, Rc:Rc, vol:vol, mix:mix, price:price, newDisc:newR-discR, per:per};
}
function buildPvmSVG(input, opts){
  var o = Object.assign(pvmDefaults(), opts||{});
  var W = Math.max(420, +o.width||1000), H = Math.max(260, +o.height||420);
  var items=((input&&input.items)||[]).filter(function(i){return (i.rp||i.rc);});
  if(!items.length) return pvm_msg(W,H,"Bind a Product dimension plus Units PY, Revenue PY, Units CY, Revenue CY.");
  var R=pvmCompute(items), cur=pvm_cur(o);
  var bars=[{label:o.priorLabel,kind:"total",v:R.Rp}], run=R.Rp;
  [["Volume",R.vol],["Mix",R.mix],["Price",R.price],["New / discontinued",R.newDisc]].forEach(function(e){ if(e[0].indexOf("New")===0 && Math.abs(e[1])<1e-9) return;
    bars.push({label:e[0],kind:"step",y0:run,y1:run+e[1],v:e[1]}); run+=e[1]; });
  bars.push({label:o.currentLabel,kind:"total",v:R.Rc});
  var side = o.showDrivers ? Math.min(300, W*0.33) : 0;
  var vals=[]; bars.forEach(function(b){ if(b.kind==="step") vals.push(b.y0,b.y1); else vals.push(b.v); });
  var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals), pad=(hi-lo)*0.6||hi*0.1;
  var ny=pvm_nice(Math.max(0,lo-pad), hi+(hi-lo)*0.15, 5);
  var top=pvm_headerH(o)+20, bot=40, left=70, right=16+side, ph=H-top-bot, pw=W-left-right;
  var Y=function(v){return top+ph*(ny.hi-v)/(ny.hi-ny.lo);}, slot=pw/bars.length, bw=Math.min(64,slot*0.6);
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'" font-family="'+pvm_FONT+'">';
  s+=pvm_header(o,W);
  ny.ticks.forEach(function(v){ var y=Y(v);
    s+='<line x1="'+left+'" x2="'+(left+pw)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+o.gridColor+'"/>';
    s+='<text x="'+(left-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+o.mutedColor+'">'+pvm_esc(pvm_fmt(v,o.valueScale,1,cur,""))+'</text>'; });
  if(ny.lo>0) s+='<text x="'+(left-6)+'" y="'+(top+ph+20)+'" text-anchor="end" font-size="9" fill="'+o.mutedColor+'">axis ≠ 0</text>';
  bars.forEach(function(b,i){
    var x=left+slot*i+(slot-bw)/2, ya, yb, col;
    if(b.kind==="step"){ ya=Y(Math.max(b.y0,b.y1)); yb=Y(Math.min(b.y0,b.y1)); col=b.v>=0?o.positiveColor:o.negativeColor; }
    else { ya=Y(b.v); yb=Y(ny.lo); col=o.totalColor; }
    s+='<rect x="'+x.toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb-ya).toFixed(1)+'" rx="2" fill="'+col+'"><title>'+pvm_esc(b.label+": "+pvm_money(b.v,o))+'</title></rect>';
    if(i<bars.length-1){ var cy=Y(b.kind==="step"?b.y1:b.v); s+='<line x1="'+(x+bw).toFixed(1)+'" x2="'+(x+slot).toFixed(1)+'" y1="'+cy.toFixed(1)+'" y2="'+cy.toFixed(1)+'" stroke="'+o.mutedColor+'" stroke-dasharray="2 2"/>'; }
    var pct = b.kind==="step" && R.Rp ? " ("+(b.v>=0?"+":"")+(b.v/R.Rp*100).toFixed(1)+"%)" : "";
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-5).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+o.inkColor+'">'+pvm_esc((b.kind==="step"&&b.v>0?"+":"")+pvm_money(b.v,o))+'</text>';
    if(pct) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(ya-17).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="'+o.mutedColor+'">'+pct.trim()+'</text>';
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-bot+16)+'" text-anchor="middle" font-size="10.5" font-weight="'+(b.kind==="step"?400:700)+'" fill="'+o.inkColor+'">'+pvm_esc(pvm_trunc(b.label,Math.max(8,Math.floor(slot/6))))+'</text>';
  });
  if(o.showDrivers){
    var sx=W-side+4, sy=top, per=R.per.slice().sort(function(a,b){return Math.abs(b.total)-Math.abs(a.total);}).slice(0,Math.max(1,+o.topDrivers||6));
    var mx=Math.max.apply(null,per.map(function(p){return Math.abs(p.total);}))||1, rowH=Math.min(30,(ph-24)/per.length), mid=sx+side*0.5, half=side*0.24;
    s+='<text x="'+sx+'" y="'+(sy-6)+'" font-size="11.5" font-weight="700" fill="'+o.inkColor+'">Top product drivers</text>';
    per.forEach(function(p,i){ var y=sy+8+i*rowH, w=half*Math.abs(p.total)/mx, col=p.total>=0?o.positiveColor:o.negativeColor;
      s+='<text x="'+(mid-6)+'" y="'+(y+rowH/2+4).toFixed(1)+'" text-anchor="end" font-size="10.5" fill="'+o.inkColor+'">'+pvm_esc(pvm_trunc(p.label,Math.floor((mid-sx)/6)))+'</text>';
      s+='<rect x="'+mid+'" y="'+(y+4).toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(rowH-8).toFixed(1)+'" rx="2" fill="'+col+'"><title>'+pvm_esc(p.label+": Δ "+pvm_money(p.total,o)+" (price effect "+pvm_money(p.price,o)+")")+'</title></rect>';
      s+='<text x="'+(mid+w+4).toFixed(1)+'" y="'+(y+rowH/2+4).toFixed(1)+'" font-size="10" fill="'+col+'">'+pvm_esc((p.total>=0?"+":"")+pvm_money(p.total,o))+'</text>'; });
  }
  return s+'</svg>';
}
