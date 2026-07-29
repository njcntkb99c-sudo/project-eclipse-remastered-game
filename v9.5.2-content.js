(() => {
"use strict";
const {canvas,ctx,$,keys,clamp,overlap}=window.EclipseCore;
$("versionLabel").textContent="Reborn v9.5.2 · Story Archive";
const ui={menu:$("menu"),pause:$("pause"),difficulty:$("difficulty"),hpBar:$("hpBar"),hpText:$("hpText"),stBar:$("stBar"),stText:$("stText"),xpBar:$("xpBar"),levelText:$("levelText"),bossBar:$("bossBar"),bossPhase:$("bossPhase"),souls:$("souls"),deaths:$("deaths"),relics:$("relics"),combo:$("combo"),notice:$("notice"),continueGame:$("continueGame"),comboFlash:$("comboFlash")};
const progressHud=document.createElement("div");
progressHud.id="progressHud";
progressHud.innerHTML='<span></span><i></i><b></b>';
document.querySelector(".game-box").appendChild(progressHud);



const qaHud=document.createElement("div");
qaHud.id="qaHud";
qaHud.hidden=true;
qaHud.textContent="QA";
document.querySelector(".game-box").appendChild(qaHud);
let qaEnabled=false,qaFrames=0,qaTime=0,qaFps=0;
document.addEventListener("keydown",e=>{
  if(e.code==="F3"){
    qaEnabled=!qaEnabled;qaHud.hidden=!qaEnabled;
    notice(qaEnabled?"QA HUD: ON":"QA HUD: OFF");
  }
});

let WORLD=10560,GROUND=444,checkpoints=[120,2592,5376,7968];
let mode="menu",difficulty="normal",souls=0,deaths=0,checkpoint=0,cameraX=0,last=0,relicCount=0,level=1,xp=0,nextXp=65;
let assetsReady=false,victory=false,noticeTimer=0,shake=0,comboCount=0,comboTimer=0,rainTime=0,fogTime=0,hitStop=0,bossAwake=false,reducedMotion=false,highContrast=false,flasks=2;const damageTexts=[];
const images={},sources={sky:"v9-sky.png",far:"v9-far.png",mid:"v9-mid.png",near:"v9-near.png",fog:"v9-fog.png",kael:"v9-kael.png",enemy:"v9-enemy.png",boss:"v9-boss.png",tiles:"assets/tiles/cemetery_tiles_48_v92.png",props:"assets/props/cemetery_props_48_v92.png"};
const P={x:120,y:359,w:48,h:96,vx:0,vy:0,speed:290,jump:705,gravity:1900,onGround:false,baseHp:180,maxHp:180,hp:180,maxSt:120,st:120,facing:1,attack:0,attackCd:0,dodge:0,dodgeCd:0,block:0,inv:0,coyote:0,jumpBuffer:0,anim:0,skillCd:0,comboStep:0,comboWindow:0,baseDamage:40,land:0};

let platforms=[],mapProps=[];
const FALLBACK_MAP={
  worldWidth:10560,groundY:444,checkpoints:[120,2592,5376,7968],
  enemySpawns:[912,1680,2928,3840,4752,6144,7248,8736],bossSpawn:9600,
  props:[],platforms:[{"x":0,"y":444,"w":1200,"h":144,"topTile":0,"fillTile":8},{"x":1296,"y":444,"w":816,"h":144,"topTile":1,"fillTile":9},{"x":2208,"y":444,"w":1104,"h":144,"topTile":2,"fillTile":10},{"x":3408,"y":444,"w":768,"h":144,"topTile":4,"fillTile":11},{"x":4272,"y":444,"w":1296,"h":144,"topTile":5,"fillTile":12},{"x":5664,"y":444,"w":960,"h":144,"topTile":0,"fillTile":8},{"x":6720,"y":444,"w":1200,"h":144,"topTile":1,"fillTile":9},{"x":8016,"y":444,"w":2544,"h":144,"topTile":2,"fillTile":10},{"x":624,"y":336,"w":288,"h":48,"topTile":4,"fillTile":11},{"x":1488,"y":288,"w":288,"h":48,"topTile":5,"fillTile":12},{"x":1824,"y":240,"w":240,"h":48,"topTile":0,"fillTile":8},{"x":2736,"y":336,"w":336,"h":48,"topTile":1,"fillTile":9},{"x":3648,"y":288,"w":288,"h":48,"topTile":2,"fillTile":10},{"x":4512,"y":336,"w":336,"h":48,"topTile":4,"fillTile":11},{"x":4992,"y":240,"w":288,"h":48,"topTile":5,"fillTile":12},{"x":6000,"y":288,"w":336,"h":48,"topTile":0,"fillTile":8},{"x":7056,"y":336,"w":384,"h":48,"topTile":1,"fillTile":9},{"x":8448,"y":336,"w":288,"h":48,"topTile":2,"fillTile":10},{"x":9024,"y":288,"w":240,"h":48,"topTile":4,"fillTile":11}]
};
let MAP=FALLBACK_MAP;
function applyMap(data){
  MAP=data||FALLBACK_MAP;
  WORLD=MAP.worldWidth||FALLBACK_MAP.worldWidth;
  GROUND=MAP.groundY||FALLBACK_MAP.groundY;
  checkpoints=MAP.checkpoints||FALLBACK_MAP.checkpoints;
  platforms=(MAP.platforms||[]).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,topTile:p.topTile??0,fillTile:p.fillTile??16}));mapProps=(MAP.props||[]).map(p=>({...p}));
}
const enemies=[],particles=[],embers=[];

function loadAssets(done){
let pending=Object.keys(sources).length+1,finished=false;
const complete=()=>{pending--;if(pending<=0&&!finished){finished=true;assetsReady=true;done()}};
Object.entries(sources).forEach(([k,src])=>{let im=new Image();im.onload=()=>{images[k]=im;complete()};im.onerror=()=>{notice("ERRORE ASSET: "+src);complete()};im.src=src});
fetch("maps/cemetery_02.json").then(r=>{if(!r.ok)throw new Error("map");return r.json()}).then(data=>{applyMap(data);complete()}).catch(()=>{applyMap(FALLBACK_MAP);notice("MAPPA JSON NON TROVATA: uso fallback");complete()});
}
function enemy(x,type="soldier"){
let boss=type==="boss",variant=boss?"warden":(["soldier","stalker","brute"][Math.floor(x/700)%3]);
let hp=boss?(difficulty==="fractured"?1800:1250):(variant==="brute"?220:variant==="stalker"?105:135);
return{type:boss?"boss":variant,x,y:GROUND-(boss?160:variant==="brute"?112:96),w:boss?112:variant==="brute"?78:64,h:boss?160:variant==="brute"?112:96,vx:0,vy:0,maxHp:hp,hp,damage:boss?28:variant==="brute"?23:variant==="stalker"?12:15,phase:1,dir:-1,attackCd:0,telegraph:0,hurt:0,dead:false,onGround:false,anim:0,speedScale:variant==="stalker"?1.35:variant==="brute"?.72:1,reachScale:variant==="brute"?1.28:variant==="stalker"?.9:1}}
function reset(){bossAwake=false;flasks=2;enemies.length=0;(MAP.enemySpawns||FALLBACK_MAP.enemySpawns).forEach(x=>enemies.push(enemy(x)));enemies.push(enemy(MAP.bossSpawn||FALLBACK_MAP.bossSpawn,"boss"))}
function frag(){let loss=difficulty==="fractured"?Math.min(.7,deaths*.05):0;P.maxHp=Math.max(54,Math.round(P.baseHp*(1-loss)));P.hp=Math.min(P.hp||P.maxHp,P.maxHp)}
function save(){try{localStorage.setItem("eclipseV9",JSON.stringify({difficulty,souls,deaths,checkpoint,relicCount,level,xp,nextXp}));ui.continueGame.disabled=false;flashSaveIndicator()}catch{notice("SALVATAGGIO NON DISPONIBILE")}}
function load(){try{let d=JSON.parse(localStorage.getItem("eclipseV9")||"null");if(!d)return false;difficulty=d.difficulty||"normal";souls=d.souls||0;deaths=d.deaths||0;checkpoint=d.checkpoint||0;relicCount=d.relicCount||0;level=d.level||1;xp=d.xp||0;nextXp=d.nextXp||65;ui.difficulty.value=difficulty;frag();return true}catch{return false}}
function notice(t){ui.notice.textContent=t;ui.notice.classList.add("on");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.classList.remove("on"),2000)}
function burst(x,y,color,n=12){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*360,vy:(Math.random()-.85)*330,life:.45+Math.random()*.28,color,size:2+Math.random()*4})}
function solve(b,dt){b.onGround=false;b.x+=b.vx*dt;for(const p of platforms)if(overlap(b,p)){if(b.vx>0)b.x=p.x-b.w;else if(b.vx<0)b.x=p.x+p.w;b.vx=0}b.y+=b.vy*dt;for(const p of platforms)if(overlap(b,p)){if(b.vy>0){b.y=p.y-b.h;b.vy=0;b.onGround=true}else if(b.vy<0){b.y=p.y+p.h;b.vy=0}}}
function gainXp(a){xp+=a;while(xp>=nextXp){xp-=nextXp;level++;nextXp=Math.round(nextXp*1.3+18);P.baseDamage+=4;P.baseHp+=10;frag();notice("LIVELLO "+level)}}
function damage(n,x){if(P.inv>0||mode!=="play")return;if(P.block>0&&Math.sign(x-P.x)===P.facing){P.st=Math.max(0,P.st-18);P.inv=.22;burst(P.x+38,P.y+40,"#b8dcff",12);notice("PARATA");return}hitStop=.055;P.hp-=n;damageTexts.push({x:P.x+P.w/2,y:P.y-8,v:"-"+Math.round(n),t:.75,c:"#ff8b88"});P.inv=1;P.vx=(P.x<x?-1:1)*330;P.vy=-250;shake=9;burst(P.x+30,P.y+45,"#c33b53",18);if(P.hp<=0)die()}
function kill(e){sessionKills++;e.dead=true;souls+=e.type==="boss"?250:14;gainXp(e.type==="boss"?250:30);if(e.type==="boss"){victory=true;mode="victory";notice("IL CUSTODE DEL PATTO È CADUTO");save()}}
function attack(){if(P.attackCd>0||mode!=="play")return;if(P.comboWindow>0)P.comboStep=(P.comboStep%3)+1;else P.comboStep=1;P.comboWindow=.56;P.attack=.31;P.attackCd=.29;let reach=[0,80,92,110][P.comboStep],base=[0,46,55,72][P.comboStep],hit={x:P.facing>0?P.x+P.w:P.x-reach,y:P.y+17,w:reach,h:70};enemies.forEach(e=>{if(e.dead||!overlap(hit,e))return;let dmg=e.type==="boss"?Math.round((base+P.baseDamage-40)*.76):base+P.baseDamage-40;e.hp-=dmg;damageTexts.push({x:e.x+e.w/2,y:e.y-6,v:String(Math.round(dmg)),t:.7,c:"#d7efff"});e.hurt=.18;e.vx=P.facing*(195+P.comboStep*32);shake=P.comboStep===3?10:5;burst(e.x+e.w/2,e.y+e.h/2,P.comboStep===3?"#d7efff":"#72baff",15+P.comboStep*4);comboCount++;comboTimer=2;ui.comboFlash.querySelector("b").textContent=comboCount;ui.comboFlash.classList.add("on");hitStop=P.comboStep===3?.075:.035;if(e.hp<=0)kill(e)})}
function dodge(){if(P.dodgeCd>0||P.st<28||mode!=="play")return;P.dodge=.29;P.dodgeCd=.68;P.inv=.43;P.st-=28;P.vx=P.facing*710;for(let i=0;i<14;i++)embers.push({x:P.x+24,y:P.y+55,vx:-P.facing*(50+Math.random()*120),vy:(Math.random()-.5)*80,life:.35})}
function block(){if(mode==="play"&&P.st>0){P.block=.2;P.vx*=.55}}
function skill(){if(P.skillCd>0||P.st<45||mode!=="play")return;P.skillCd=4.5;P.st-=45;shake=14;burst(P.x+30,P.y+44,"#75c7ff",42);let wave={x:P.x-175,y:P.y-105,w:400,h:260};enemies.forEach(e=>{if(!e.dead&&overlap(wave,e)){e.hp-=e.type==="boss"?65:100;e.hurt=.26;if(e.hp<=0)kill(e)}});notice("IMPULSO D'ESSENZA")}
function die(){if(mode!=="play")return;deaths++;frag();mode="dead";notice(difficulty==="fractured"?"FRAMMENTAZIONE: VITA MASSIMA -5%":"KAEL È CADUTO");setTimeout(()=>{Object.assign(P,{x:checkpoints[checkpoint],y:359,vx:0,vy:0,hp:P.maxHp,st:P.maxSt,inv:1.5});comboCount=0;reset();mode="play";save()},850)}
function start(cont=false){if(!assetsReady){notice("ATTENDI IL CARICAMENTO");return}if(cont){if(!load())return}else{difficulty=ui.difficulty.value;souls=0;deaths=0;checkpoint=0;relicCount=0;level=1;xp=0;nextXp=65;Object.assign(P,{baseHp:180,maxHp:180,hp:180,maxSt:120,st:120,baseDamage:40})}victory=false;frag();Object.assign(P,{x:checkpoints[checkpoint],y:359,vx:0,vy:0,hp:P.maxHp,st:P.maxSt,inv:0,skillCd:0});reset();mode="play";ui.menu.classList.remove("visible");notice("CIMITERO DEL GIURAMENTO");save()}
function updateP(dt){let l=keys.has("ArrowLeft")||keys.has("KeyA"),r=keys.has("ArrowRight")||keys.has("KeyD"),m=(r?1:0)-(l?1:0);if(m)P.facing=m;if(P.dodge<=0&&P.block<=0)P.vx+=(m*P.speed-P.vx)*Math.min(1,dt*12);P.vy+=P.gravity*dt;P.coyote=P.onGround?.12:Math.max(0,P.coyote-dt);P.jumpBuffer=Math.max(0,P.jumpBuffer-dt);if(P.jumpBuffer>0&&P.coyote>0){P.vy=-P.jump;P.coyote=0;P.jumpBuffer=0}let was=P.onGround;solve(P,dt);if(!was&&P.onGround)P.land=.14;if(P.y>650)die();P.attack=Math.max(0,P.attack-dt);P.attackCd=Math.max(0,P.attackCd-dt);P.dodge=Math.max(0,P.dodge-dt);P.dodgeCd=Math.max(0,P.dodgeCd-dt);P.block=Math.max(0,P.block-dt);P.inv=Math.max(0,P.inv-dt);P.skillCd=Math.max(0,P.skillCd-dt);P.comboWindow=Math.max(0,P.comboWindow-dt);P.land=Math.max(0,P.land-dt);P.st=Math.min(P.maxSt,P.st+(P.block>0?8:30)*dt);P.anim+=dt;checkpoints.forEach((x,i)=>{if(i>checkpoint&&Math.abs(P.x-x)<80){checkpoint=i;flasks=2;P.hp=Math.min(P.maxHp,P.hp+Math.round(P.maxHp*.25));P.st=P.maxSt;burst(x+18,GROUND-62,"#75c7ff",28);notice("ALTARE DEL PATTO "+(i+1));save()}});const lookAhead=P.facing*(55+Math.min(95,Math.abs(P.vx)*.16));const landingOffset=P.land>0?10:0;const cameraTarget=P.x-canvas.width*.42+lookAhead;cameraX+=(cameraTarget-cameraX)*Math.min(1,dt*(P.dodge>0?8.2:5.4));cameraX=clamp(cameraX,0,WORLD-canvas.width);if(landingOffset>0)shake=Math.max(shake,landingOffset*.28);comboTimer=Math.max(0,comboTimer-dt);if(comboTimer<=0){comboCount=0;ui.comboFlash.classList.remove("on")}}
function updateE(dt){let activeL=cameraX-260,activeR=cameraX+canvas.width+260;enemies.forEach(e=>{if(e.dead)return;e.attackCd=Math.max(0,e.attackCd-dt);e.telegraph=Math.max(0,e.telegraph-dt);e.hurt=Math.max(0,e.hurt-dt);e.anim+=dt;if(e.x+e.w<activeL||e.x>activeR){e.vx*=.8;e.vy+=1750*dt;solve(e,dt);return}let dx=P.x-e.x,vertical=Math.abs((P.y+P.h/2)-(e.y+e.h/2)),same=vertical<65;if(e.type==="boss"){if(!bossAwake){e.vx=0;e.vy+=1750*dt;solve(e,dt);return}let q=e.hp/e.maxHp;e.phase=difficulty==="fractured"?(q>.66?1:q>.33?2:3):(q>.5?1:2);e.dir=Math.sign(dx)||-1;let speeds=[0,92,138,185];if(Math.abs(dx)>150)e.vx=e.dir*speeds[e.phase];else e.vx*=.75;let reach=[0,115,135,160][e.phase],box={x:e.dir>0?e.x+e.w-10:e.x-reach+10,y:e.y+35,w:reach,h:e.h-50};if(e.attackCd<=0&&same&&Math.abs(dx)<reach+55&&e.telegraph<=0){e.telegraph=e.phase===3?.34:.44;e.vx=0}if(e.telegraph>0&&e.telegraph<=dt+.02){e.attackCd=[0,1.7,1.25,.92][e.phase];if(overlap(box,P))damage(14+e.phase*5,e.x);burst(e.dir>0?e.x+e.w:e.x,e.y+e.h/2,"#a56bc5",16+e.phase*4)}}else{e.dir=Math.sign(dx)||e.dir;if(Math.abs(dx)<500&&same)e.vx=e.dir*80;else e.vx*=.82;let box={x:e.dir>0?e.x+e.w-6:e.x-50,y:e.y+22,w:56,h:60};if(e.attackCd<=0&&same&&Math.abs(dx)<74&&e.telegraph<=0){e.telegraph=.31;e.vx=0}if(e.telegraph>0&&e.telegraph<=dt+.02){e.attackCd=1.3;if(overlap(box,P))damage(12,e.x);burst(e.dir>0?e.x+e.w:e.x,e.y+45,"#d26a70",8)}}e.vy+=1750*dt;solve(e,dt)});for(let i=0;i<enemies.length;i++){let a=enemies[i];if(a.dead)continue;for(let j=i+1;j<enemies.length;j++){let b=enemies[j];if(b.dead)continue;if(overlap(a,b)){let push=(a.x+a.w/2)<(b.x+b.w/2)?-1:1;a.x+=push*1.5;b.x-=push*1.5}}}}

function updateBossAwakening(){
  const boss=enemies.find(e=>e.type==="boss"&&!e.dead);
  if(!boss||bossAwake)return;
  if(Math.abs(P.x-boss.x)<720){
    bossAwake=true;shake=12;hitStop=.12;
    notice("IL CUSTODE DEL PATTO SI RISVEGLIA");
    burst(boss.x+boss.w/2,boss.y+boss.h/2,"#b979da",48);
  }
}
function updateFX(dt){updateDamageTexts(dt);for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt}for(let i=embers.length-1;i>=0;i--){let e=embers[i];e.life-=dt;if(e.life<=0){embers.splice(i,1);continue}e.x+=e.vx*dt;e.y+=e.vy*dt}}

function drawCheckpointShrines(){
  checkpoints.forEach((x,i)=>{
    const active=i<=checkpoint;
    ctx.save();
    ctx.globalAlpha=active?.95:.45;
    ctx.fillStyle=active?"rgba(76,174,255,.18)":"rgba(142,126,103,.12)";
    ctx.beginPath();ctx.arc(x+18,GROUND-52,active?46:34,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=active?"#79c5ff":"#756b5e";
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+18,GROUND-10);ctx.lineTo(x+18,GROUND-64);ctx.stroke();
    ctx.beginPath();ctx.arc(x+18,GROUND-69,9,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  });
}
function drawP(){if(P.inv>0&&Math.floor(P.inv*12)%2===0)return;let f=0;if(Math.abs(P.vx)>25)f=2+(Math.floor(P.anim*8)%2);if(!P.onGround)f=P.vy<0?4:5;if(P.attack>0)f=[0,6,7,8][P.comboStep]||6;if(P.dodge>0)f=9;if(P.block>0)f=10;if(P.skillCd>4.1)f=11;if(P.land>0)f=13;ctx.save();ctx.translate(P.x+32,P.y);ctx.scale(P.facing,1);ctx.drawImage(images.kael,f*64,0,64,96,-32,0,64,96);ctx.restore()}
function drawE(e){if(e.telegraph>0){ctx.save();ctx.globalAlpha=.34+.24*Math.sin(performance.now()/45);ctx.fillStyle=e.type==="boss"?"#b979da":"#d45e73";ctx.fillRect(e.x-6,e.y-6,e.w+12,e.h+12);ctx.restore()}if(e.hurt>0)ctx.globalAlpha=.5;if(e.type==="boss")ctx.drawImage(images.boss,(e.phase-1)*112,0,112,160,e.x,e.y,112,160);else{let f=Math.floor(e.anim*6)%6;ctx.drawImage(images.enemy,f*64,0,64,96,e.x,e.y,64,96)}ctx.globalAlpha=1}
function drawRain(){ctx.strokeStyle="rgba(180,210,225,.20)";ctx.lineWidth=1;for(let i=0;i<100;i++){let x=(i*137+rainTime*360)%1030-40,y=(i*83+rainTime*620)%590-25;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+15);ctx.stroke()}}
function draw(){ctx.drawImage(images.sky,0,0);let a=(cameraX*.10)%960;ctx.drawImage(images.far,-a,0);ctx.drawImage(images.far,960-a,0);let b=(cameraX*.22)%960;ctx.drawImage(images.mid,-b,0);ctx.drawImage(images.mid,960-b,0);if(!reducedMotion&&weatherLevel>0){drawRain();if(weatherLevel===2)drawRain();}ctx.save();if(shake>0&&!reducedMotion){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.84;if(shake<.4)shake=0}ctx.translate(-cameraX,0);drawPropLayer("back");drawCheckpointShrines();platforms.forEach((p,i)=>{if(p.x+p.w<cameraX-96||p.x>cameraX+canvas.width+96)return;
const ts=48,cols=16;
for(let y=p.y;y<p.y+p.h;y+=ts){
 for(let x=p.x;x<p.x+p.w;x+=ts){
  const top=y===p.y,left=x===p.x,right=x+ts>=p.x+p.w,bottom=y+ts>=p.y+p.h;
  let id=top?(p.topTile??(i%16)):(p.fillTile??(16+i%16));
  if(top&&left) id=32+(i%4);
  else if(top&&right) id=36+(i%4);
  else if(!top&&left) id=40+(i%4);
  else if(!top&&right) id=44+(i%4);
  else if(bottom&&!top) id=48+(i%8);
  const sx=(id%cols)*ts,sy=Math.floor(id/cols)*ts;
  const dw=Math.min(ts,p.x+p.w-x),dh=Math.min(ts,p.y+p.h-y);
  ctx.drawImage(images.tiles,sx,sy,dw,dh,x,y,dw,dh);
 }
}
});
function drawPropLayer(depth){
 if(!images.props)return;
 const ts=48,cols=12;
 mapProps.filter(p=>(p.depth||"front")===depth).forEach(p=>{
   if(p.x+ts<cameraX-80||p.x>cameraX+canvas.width+80)return;
   const sx=(p.id%cols)*ts,sy=Math.floor(p.id/cols)*ts;
   ctx.save();
   if(p.flip){ctx.translate(p.x+ts,p.y);ctx.scale(-1,1);ctx.drawImage(images.props,sx,sy,ts,ts,0,0,ts,ts);}
   else ctx.drawImage(images.props,sx,sy,ts,ts,p.x,p.y,ts,ts);
   ctx.restore();
 });
}enemies.forEach(e=>{if(!e.dead)drawE(e)});drawP();drawPropLayer("front");
function drawWorldLights(){
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const lights=[
    {x:420,y:330,r:110,a:.16,c:"255,145,76"},
    {x:1650,y:285,r:90,a:.13,c:"255,145,76"},
    {x:3980,y:250,r:130,a:.15,c:"255,145,76"},
    {x:6200,y:285,r:115,a:.14,c:"255,145,76"},
    {x:9050,y:300,r:140,a:.16,c:"255,145,76"}
  ];
  lights.forEach(l=>{
    const g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r);
    g.addColorStop(0,`rgba(${l.c},${l.a})`);
    g.addColorStop(1,`rgba(${l.c},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(l.x,l.y,l.r,0,Math.PI*2);ctx.fill();
  });
  const eg=ctx.createRadialGradient(P.x+P.w/2,P.y+P.h/2,0,P.x+P.w/2,P.y+P.h/2,120);
  eg.addColorStop(0,"rgba(80,175,255,.12)");
  eg.addColorStop(1,"rgba(80,175,255,0)");
  ctx.fillStyle=eg;ctx.beginPath();ctx.arc(P.x+P.w/2,P.y+P.h/2,120,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
drawWorldLights();drawLoreFragments();drawEliteAuras();drawDamageTexts();
particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)});embers.forEach(e=>{ctx.globalAlpha=Math.max(0,e.life*3);ctx.fillStyle="#76bfff";ctx.fillRect(e.x,e.y,4,4)});ctx.globalAlpha=1;ctx.restore();ctx.drawImage(images.near,0,0);let fogx=(fogTime*18)%960;ctx.globalAlpha=.55;ctx.drawImage(images.fog,-fogx,0);ctx.drawImage(images.fog,960-fogx,0);ctx.globalAlpha=1;if(victory){ctx.fillStyle="rgba(2,4,8,.84)";ctx.fillRect(0,0,960,540);ctx.textAlign="center";ctx.fillStyle="#f2e7dc";ctx.font="bold 46px Georgia";ctx.fillText("IL PATTO È STATO SPEZZATO",480,218);ctx.font="18px system-ui";ctx.fillStyle="#bfb3bc";ctx.fillText("Livello "+level+" · Anime "+souls,480,264)}}
function hud(){checkComboMilestones();updateHuntHud();const pct=Math.max(0,Math.min(100,(P.x/WORLD)*100));progressHud.querySelector("i").style.width=pct+"%";progressHud.querySelector("b").style.left=pct+"%";progressHud.querySelector("span").textContent=Math.round(pct)+"%";ui.hpBar.style.width=P.hp/P.maxHp*100+"%";ui.hpText.textContent=Math.ceil(P.hp)+"/"+P.maxHp;ui.stBar.style.width=P.st/P.maxSt*100+"%";ui.stText.textContent=Math.ceil(P.st)+"/"+P.maxSt;ui.xpBar.style.width=xp/nextXp*100+"%";ui.levelText.textContent="Lv. "+level;ui.souls.textContent=souls;ui.deaths.textContent=deaths;ui.relics.textContent=relicCount;ui.combo.textContent=comboCount;let e=enemies.find(e=>e.type==="boss"&&!e.dead&&Math.abs(P.x-e.x)<1000);if(e){ui.bossBar.style.width=e.hp/e.maxHp*100+"%";ui.bossPhase.textContent="Custode · Fase "+e.phase+"/"+(difficulty==="fractured"?3:2)}else{ui.bossBar.style.width="0%";ui.bossPhase.textContent="—"}}
function loop(t){let dt=Math.min(.028,(t-last)/1000||0);last=t;qaFrames++;qaTime+=dt;if(qaTime>=.5){qaFps=Math.round(qaFrames/qaTime);qaFrames=0;qaTime=0;}if(qaEnabled){qaHud.textContent=`FPS ${qaFps} | X ${Math.round(P.x)} | EN ${enemies.filter(e=>!e.dead).length} | FX ${particles.length+embers.length} | CP ${checkpoint+1}`;}rainTime+=dt;fogTime+=dt;if(!assetsReady){ctx.fillStyle="#06080c";ctx.fillRect(0,0,960,540);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="24px Georgia";ctx.fillText("Caricamento Project Eclipse Reborn...",480,270);requestAnimationFrame(loop);return}if(mode==="play"){updateP(dt);updateE(dt);updateFX(dt);hud()}draw();requestAnimationFrame(loop)}
function press(k){keys.add(k);if(k==="Space")P.jumpBuffer=.12;if(k==="KeyJ")attack();if(k==="KeyK")dodge();if(k==="KeyL")block();if(k==="KeyQ")skill();if(k==="KeyP"){if(mode==="play"){mode="pause";ui.pause.classList.add("visible")}else if(mode==="pause"){mode="play";ui.pause.classList.remove("visible")}}}
addEventListener("keydown",e=>{if(["Space","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();press(e.code)});addEventListener("keyup",e=>keys.delete(e.code));
document.querySelectorAll(".mobile button").forEach(b=>{let k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(k)});b.addEventListener("pointerup",()=>keys.delete(k));b.addEventListener("pointercancel",()=>keys.delete(k))});
$("newGame").onclick=()=>start(false);$("continueGame").onclick=()=>start(true);$("resume").onclick=()=>{mode="play";ui.pause.classList.remove("visible")};$("quit").onclick=()=>{save();mode="menu";ui.pause.classList.remove("visible");ui.menu.classList.add("visible")};
ui.continueGame.disabled=!localStorage.getItem("eclipseV9");applyMap(FALLBACK_MAP);reset();frag();hud();loadAssets(()=>{reset();notice("V9.2: ROVINE E VEGETAZIONE CARICATE")});requestAnimationFrame(loop);

function applyAccessibility(){
  document.body.classList.toggle("reduced-motion",reducedMotion);
  document.body.classList.toggle("high-contrast",highContrast);
}
document.addEventListener("keydown",e=>{
  if(e.code==="F6"){
    reducedMotion=!reducedMotion;
    try{localStorage.setItem("eclipseReducedMotion",reducedMotion?"1":"0")}catch{}
    applyAccessibility();notice(reducedMotion?"MOVIMENTO RIDOTTO: ON":"MOVIMENTO RIDOTTO: OFF");
  }
  if(e.code==="F7"){
    highContrast=!highContrast;
    try{localStorage.setItem("eclipseHighContrast",highContrast?"1":"0")}catch{}
    applyAccessibility();notice(highContrast?"CONTRASTO ALTO: ON":"CONTRASTO ALTO: OFF");
  }
});
try{
  reducedMotion=localStorage.getItem("eclipseReducedMotion")==="1";
  highContrast=localStorage.getItem("eclipseHighContrast")==="1";
}catch{}
applyAccessibility();

document.addEventListener("visibilitychange",()=>{if(document.hidden&&mode==="play"){mode="pause";ui.pause.classList.add("visible")}});

const controlsGuide=document.createElement("div");
controlsGuide.id="controlsGuide";
controlsGuide.hidden=true;
controlsGuide.innerHTML='<div><h2>COMANDI</h2><p>A/D o frecce — Movimento</p><p>Spazio — Salto</p><p>J — Attacco · K — Schivata · L — Parata</p><p>U — Essenza · ESC — Pausa</p><p>F1 — Chiudi guida</p></div>';
document.querySelector(".game-box").appendChild(controlsGuide);
document.addEventListener("keydown",e=>{
 if(e.code==="F1"){e.preventDefault();controlsGuide.hidden=!controlsGuide.hidden;}
});

let photoMode=false;
document.addEventListener("keydown",e=>{
 if(e.code==="F2"){
   photoMode=!photoMode;
   document.body.classList.toggle("photo-mode",photoMode);
   notice(photoMode?"MODALITÀ FOTO: ON":"MODALITÀ FOTO: OFF");
 }
});

let compactHud=false;
document.addEventListener("keydown",e=>{
 if(e.code==="F8"){
   compactHud=!compactHud;document.body.classList.toggle("compact-hud",compactHud);
   try{localStorage.setItem("eclipseCompactHud",compactHud?"1":"0")}catch{}
   notice(compactHud?"HUD COMPATTO":"HUD NORMALE");
 }
});
try{compactHud=localStorage.getItem("eclipseCompactHud")==="1"}catch{}
document.body.classList.toggle("compact-hud",compactHud);

document.addEventListener("keydown",e=>{
 if(e.code==="KeyH"&&mode==="play"){
   if(flasks<=0){notice("FIASCHE ESAURITE");return}
   if(P.hp>=P.maxHp){notice("SALUTE GIÀ COMPLETA");return}
   flasks--;P.hp=Math.min(P.maxHp,P.hp+Math.round(P.maxHp*.38));
   burst(P.x+P.w/2,P.y+P.h/2,"#70cfa0",24);notice("FIASCA CURATIVA · "+flasks);
 }
});

const areaNames=[
 {x:0,n:"CIMITERO DEL GIURAMENTO"},
 {x:2600,n:"VIA DEI PENITENTI"},
 {x:5200,n:"ROVINE SOMMERSE"},
 {x:7800,n:"SAGRATO DEL CUSTODE"}
];
let currentArea=-1;
function updateAreaTitle(){
 let next=0;for(let i=0;i<areaNames.length;i++)if(P.x>=areaNames[i].x)next=i;
 if(next!==currentArea){currentArea=next;notice(areaNames[next].n);}
}

function updateDamageTexts(dt){damageTexts.forEach(d=>{d.t-=dt;d.y-=26*dt});for(let i=damageTexts.length-1;i>=0;i--)if(damageTexts[i].t<=0)damageTexts.splice(i,1)}
function drawDamageTexts(){ctx.save();ctx.font="bold 16px monospace";ctx.textAlign="center";damageTexts.forEach(d=>{ctx.globalAlpha=Math.min(1,d.t*2);ctx.fillStyle=d.c;ctx.fillText(d.v,d.x,d.y)});ctx.restore()}

function drawEliteAuras(){
 ctx.save();ctx.globalCompositeOperation="screen";
 enemies.forEach(e=>{
  if(e.dead||e.type==="soldier"||e.type==="boss")return;
  const c=e.type==="brute"?"rgba(210,92,66,.15)":"rgba(90,148,235,.13)";
  const g=ctx.createRadialGradient(e.x+e.w/2,e.y+e.h/2,0,e.x+e.w/2,e.y+e.h/2,70);
  g.addColorStop(0,c);g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.x+e.w/2,e.y+e.h/2,70,0,Math.PI*2);ctx.fill();
 });ctx.restore();
}

const difficultyBadge=document.createElement("div");
difficultyBadge.id="difficultyBadge";
document.querySelector(".game-box").appendChild(difficultyBadge);
function updateDifficultyBadge(){difficultyBadge.textContent=String(difficulty||"normal").toUpperCase()}
updateDifficultyBadge();

const sessionHud=document.createElement("div");sessionHud.id="sessionHud";document.querySelector(".game-box").appendChild(sessionHud);
let sessionSeconds=0,sessionKills=0;
function updateSessionTimer(dt){if(mode==="play")sessionSeconds+=dt;const m=Math.floor(sessionSeconds/60),s=Math.floor(sessionSeconds%60);sessionHud.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}

const loreFragments=[
 {x:930,t:"Il re giurò di proteggere il regno. Il patto chiese il suo cuore."},
 {x:3100,t:"Le campane tacquero quando l'Essenza Blu attraversò le tombe."},
 {x:5870,t:"Il Custode non difende il cimitero: difende la verità."},
 {x:8460,t:"Kael ricorda una voce, ma non il volto che apparteneva a quella voce."}
];
const readLore=new Set();
document.addEventListener("keydown",e=>{
 if(e.code!=="KeyE"||mode!=="play")return;
 loreFragments.forEach((l,i)=>{if(!readLore.has(i)&&Math.abs(P.x-l.x)<90){readLore.add(i);notice(l.t);souls+=25;save();}});
});
function drawLoreFragments(){
 ctx.save();loreFragments.forEach((l,i)=>{if(readLore.has(i))return;ctx.fillStyle="rgba(86,176,255,.75)";ctx.beginPath();ctx.arc(l.x,GROUND-38,5+Math.sin(performance.now()/250+i)*2,0,Math.PI*2);ctx.fill()});ctx.restore();
}

const huntHud=document.createElement("div");huntHud.id="huntHud";document.querySelector(".game-box").appendChild(huntHud);
function updateHuntHud(){huntHud.textContent="☠ "+sessionKills}

let lastComboMilestone=0;
function checkComboMilestones(){
 const step=comboCount>=20?20:comboCount>=10?10:comboCount>=5?5:0;
 if(step>lastComboMilestone){lastComboMilestone=step;souls+=step*2;notice("CATENA "+step+" · BONUS ANIME");burst(P.x,P.y,"#75c7ff",step)}
 if(comboCount===0)lastComboMilestone=0;
}

let weatherLevel=2;
document.addEventListener("keydown",e=>{
 if(e.code==="F9"){
  weatherLevel=(weatherLevel+1)%3;
  notice(["PIOGGIA: OFF","PIOGGIA: LEGGERA","PIOGGIA: INTENSA"][weatherLevel]);
 }
});

let gradeMode=0;
document.addEventListener("keydown",e=>{
 if(e.code==="F10"){
  gradeMode=(gradeMode+1)%3;
  document.body.dataset.grade=String(gradeMode);
  notice(["COLORE: NATURALE","COLORE: FREDDO","COLORE: CINEMATICO"][gradeMode]);
 }
});

const settingsPanel=document.createElement("div");
settingsPanel.id="settingsPanel";settingsPanel.hidden=true;
settingsPanel.innerHTML='<div><h2>IMPOSTAZIONI RAPIDE</h2><p>F6 Movimento ridotto</p><p>F7 Contrasto alto</p><p>F8 HUD compatto</p><p>F9 Intensità pioggia</p><p>F10 Profilo colore</p><p>F4 Chiudi</p></div>';
document.querySelector(".game-box").appendChild(settingsPanel);
document.addEventListener("keydown",e=>{if(e.code==="F4"){e.preventDefault();settingsPanel.hidden=!settingsPanel.hidden}});

let lowQuality=false,qualitySample=0;
function updateAutoQuality(dt){
 qualitySample+=dt;
 if(qualitySample<3)return;qualitySample=0;
 if(qaFps>0&&qaFps<42&&!lowQuality){lowQuality=true;document.body.classList.add("low-quality");notice("QUALITÀ AUTOMATICA: PRESTAZIONI")}
 else if(qaFps>55&&lowQuality){lowQuality=false;document.body.classList.remove("low-quality");notice("QUALITÀ AUTOMATICA: COMPLETA")}
}

const saveIndicator=document.createElement("div");saveIndicator.id="saveIndicator";saveIndicator.textContent="SALVATAGGIO PRONTO";document.querySelector(".game-box").appendChild(saveIndicator);
function flashSaveIndicator(){saveIndicator.classList.add("on");setTimeout(()=>saveIndicator.classList.remove("on"),900)}

window.ProjectEclipseDiagnostics=()=>{
 const report={version:"v9.4.9",mode,difficulty,playerX:Math.round(P.x),hp:P.hp,maxHp:P.maxHp,enemies:enemies.filter(e=>!e.dead).length,checkpoint,sessionKills,flasks,lowQuality};
 console.table(report);notice("DIAGNOSTICA IN CONSOLE");return report;
};
document.addEventListener("keydown",e=>{if(e.code==="F5"){e.preventDefault();window.ProjectEclipseDiagnostics()}});

const rcBadge=document.createElement("div");rcBadge.id="rcBadge";rcBadge.textContent="V9.5 RC";document.querySelector(".game-box").appendChild(rcBadge);
window.addEventListener("error",ev=>{console.error("[Project Eclipse RC]",ev.error||ev.message)});
window.addEventListener("unhandledrejection",ev=>{console.error("[Project Eclipse RC Promise]",ev.reason)});

const worldMapPanel=document.createElement("div");
worldMapPanel.id="worldMapPanel";worldMapPanel.hidden=true;
worldMapPanel.innerHTML='<div class="map-card"><h2>MAPPA DEL REGNO</h2><div class="map-track"><i id="mapProgress"></i><b id="mapPlayer"></b><span class="m1">Cimitero</span><span class="m2">Rovine</span><span class="m3">Sagrato</span><span class="m4">Custode</span></div><p>M — chiudi la mappa</p></div>';
document.querySelector(".game-box").appendChild(worldMapPanel);
const mapProgress=document.getElementById("mapProgress"),mapPlayer=document.getElementById("mapPlayer");
function refreshWorldMap(){
 const pct=Math.max(0,Math.min(100,(P.x/WORLD)*100));
 mapProgress.style.width=pct+"%";mapPlayer.style.left=pct+"%";
}
document.addEventListener("keydown",e=>{
 if(e.code==="KeyM"){
  worldMapPanel.hidden=!worldMapPanel.hidden;
  if(!worldMapPanel.hidden)refreshWorldMap();
 }
});

const storyState={shards:[],entries:[
 {id:"prologue",title:"Il Patto Spezzato",text:"Kael raggiunge il cimitero seguendo il richiamo dell'Essenza Blu.",unlocked:true},
 {id:"warden",title:"Il Custode del Patto",text:"Una scheggia conserva la memoria di colui che sorvegliò il giuramento.",unlocked:false}
]};
const storyPanel=document.createElement("div");storyPanel.id="storyPanel";storyPanel.hidden=true;
storyPanel.innerHTML='<div class="story-card"><h2>STORIA</h2><div id="storyEntries"></div><p>O — chiudi</p></div>';
document.querySelector(".game-box").appendChild(storyPanel);
function renderStory(){
 const root=document.getElementById("storyEntries");root.innerHTML="";
 storyState.entries.forEach(e=>{
  const article=document.createElement("article");article.className=e.unlocked?"open":"locked";
  article.innerHTML=`<h3>${e.unlocked?e.title:"????????"}</h3><p>${e.unlocked?e.text:"Recupera la scheggia legata a questa memoria."}</p>`;
  root.appendChild(article);
 });
}
document.addEventListener("keydown",e=>{
 if(e.code==="KeyO"){storyPanel.hidden=!storyPanel.hidden;if(!storyPanel.hidden)renderStory();}
});
})();
