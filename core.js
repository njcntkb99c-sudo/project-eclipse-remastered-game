(() => {
"use strict";
window.EclipseCore={
 canvas:document.getElementById("gameCanvas"),
 ctx:document.getElementById("gameCanvas").getContext("2d"),
 $:id=>document.getElementById(id),
 keys:new Set(),
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 overlap:(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
};
EclipseCore.ctx.imageSmoothingEnabled=false;
})();