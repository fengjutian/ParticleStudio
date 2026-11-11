import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import './style.css';
import './rotation-guide.css';

type Shape = 'tower' | 'warehouse' | 'loft';
type Office = { code:string; name:string; title:string; coords:string; time:string; utc:string; address:string; description:string; phone:string; shape:Shape };
const offices:Office[]=[
{code:'STO',name:'Stockholm',title:'FORMER PRINT WORKS, 1911',coords:'59.3293° N / 18.0686° E',time:'08:25:11',utc:'UTC+1',address:'Hornsgatan 64<br>118 21 Stockholm<br>Sweden',description:'The founding office on Södermalm: architecture, survey and reality capture, computational design and the archive team.',phone:'+46 8 410 237 00',shape:'tower'},
{code:'LIS',name:'Lisbon',title:'RIVERSIDE WAREHOUSE, 1928',coords:'38.7223° N / 9.1393° W',time:'07:25:11',utc:'UTC±0',address:'Rua da Junqueira 112<br>1300–344 Lisboa<br>Portugal',description:'By the river in Alcântara: structural engineering, building physics, architecture and the monitoring desk.',phone:'+351 213 640 180',shape:'warehouse'},
{code:'NYC',name:'New York',title:'CAST-IRON LOFT, 1888',coords:'40.7222° N / 73.9967° W',time:'02:25:11',utc:'UTC−5',address:'210 Lafayette Street<br>New York, NY 10012<br>United States',description:'In a cast-iron loft in NoHo since 2024: architecture, survey and the monitoring desk for North America.',phone:'+1 212 555 0148',shape:'loft'}];

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header class="site-header"><button class="menu" aria-label="Open menu"><i></i><i></i><i></i></button><a class="wordmark" href="#">PARTICLE / STUDIO</a><nav><a href="#model">MODEL<sup>01</sup></a><a href="#offices">OFFICES<sup>03</sup></a><a href="#data">DATA<sup>08</sup></a></nav><div class="header-meta"><span class="signal"></span><span>LIVE MODEL</span><span class="desktop-only">STO&nbsp; <b id="clock">08:25:11</b></span></div><button id="motion" class="motion" aria-label="Pause particle motion" aria-pressed="false"><span></span><span></span></button></header><main id="model"><aside class="ruler" aria-hidden="true">${[1,2,3,4,5].map(n=>`<span style="top:${(n-1)*25}%">0${n}</span>`).join('')}</aside><section class="hero"><div class="eyebrow">FIG. 01 / STUDIO / THREE OFFICES</div><h1>Three offices,<br><em>one point cloud.</em></h1><p>Architectural presence reconstructed as particles.<br>Every point holds a position in space.</p></section><section class="office-grid" id="offices">${offices.map((o,i)=>`<article class="office"><div class="scan-card"><div class="scan-label">${o.code} / ${o.title}</div><div class="scan-status"><i></i>${i===1?'ACTIVE SCAN':'POINT CLOUD'}</div><div class="canvas-wrap" id="scene-${i}"></div><div class="focus-frame"><span></span><span></span><span></span><span></span></div><div class="crosshair"></div><div class="coords">${o.coords}</div><div class="point-count" id="points-${i}">000 000 PTS</div></div><div class="office-info"><div class="time-block"><small>${o.name}</small><strong>${o.time}</strong><span>${o.utc}</span></div><div class="address"><small>ADDRESS</small><p>${o.address}</p><small>PHONE</small><p>${o.phone}</p></div><p class="description">${o.description}</p></div></article>`).join('')}</section><section class="model-note" id="data"><span>FIG. 02 / REALITY CAPTURE</span><p>Built from measured surfaces, noise and light — a living drawing rather than a finished object.</p><b>SCROLL / EXPLORE</b></section></main><footer><span>PARTICLE STUDIO / ARCHITECTURE STUDY</span><span>WEBGL / THREE.JS</span><span>2026</span></footer>`;

document.querySelectorAll('.scan-card').forEach(card=>card.insertAdjacentHTML('beforeend','<div class="rotation-guide" aria-hidden="true"><i></i><span>360° AUTO ROTATE</span></div>'));

const views:Array<{renderer:THREE.WebGLRenderer;camera:THREE.PerspectiveCamera;scene:THREE.Scene;cloud:THREE.Group;wrap:HTMLElement;baseY:number}>=[];
function rng(seed:number){let v=seed>>>0;return()=>((v=(v*1664525+1013904223)>>>0)/4294967296)}
function dot(out:number[],x:number,y:number,z:number,random:()=>number,jitter=.018){out.push(x+(random()-.5)*jitter,y+(random()-.5)*jitter,z+(random()-.5)*jitter)}
function facade(out:number[],w:number,h:number,z:number,cols:number,rows:number,count:number,random:()=>number){
  for(let i=0;i<count;i++){const x=(random()-.5)*w,y=(random()-.5)*h;const cx=((x/w+.5)*cols)%1,cy=((y/h+.5)*rows)%1;const frame=cx<.115||cx>.885||cy<.13||cy>.88;const scanGap=Math.sin(x*4.7+y*7.1)>-.78&&random()>.08;if(scanGap&&(frame||random()<.035))dot(out,x,y,z,random,.012)}
  for(let c=0;c<=cols;c++){const x=-w/2+c*w/cols;for(let i=0;i<180;i++)if(random()>.06)dot(out,x,-h/2+random()*h,z+.025,random,.009)}
  for(let r=0;r<=rows;r++){const y=-h/2+r*h/rows;for(let i=0;i<240;i++)if(random()>.05)dot(out,-w/2+random()*w,y,z+.025,random,.009)}
}
function sideWall(out:number[],x:number,h:number,d:number,rows:number,count:number,random:()=>number){for(let i=0;i<count;i++){const y=(random()-.5)*h,z=(random()-.5)*d;const cy=((y/h+.5)*rows)%1;if(cy<.13||cy>.87||random()<.12)dot(out,x,y,z,random)}}
function beam(out:number[],a:THREE.Vector3,b:THREE.Vector3,count:number,random:()=>number,spread=.035){for(let i=0;i<count;i++){const t=random();dot(out,THREE.MathUtils.lerp(a.x,b.x,t),THREE.MathUtils.lerp(a.y,b.y,t),THREE.MathUtils.lerp(a.z,b.z,t),random,spread)}}
function building(shape:Shape,seed:number){
  const random=rng(seed),data:number[]=[];
  const face=(ox:number,oz:number,ux:number,uz:number,width:number,height:number,cols:number,rows:number,count:number)=>{
    for(let i=0;i<count;i++){const across=random()*width,y=random()*height,cx=(across/(width/cols))%1,cy=(y/(height/rows))%1;const inWindow=cx>.19&&cx<.81&&cy>.25&&cy<.79;if(!inWindow||random()<.025)dot(data,ox+ux*across,y-height/2,oz+uz*across,random,.018)}
    for(let c=0;c<=cols;c++)beam(data,new THREE.Vector3(ox+ux*c*width/cols,-height/2,oz+uz*c*width/cols),new THREE.Vector3(ox+ux*c*width/cols,height/2,oz+uz*c*width/cols),105,random,.012);
    for(let r=0;r<=rows;r++)beam(data,new THREE.Vector3(ox,-height/2+r*height/rows,oz),new THREE.Vector3(ox+ux*width,-height/2+r*height/rows,oz+uz*width),150,random,.012);
  };
  if(shape==='warehouse'){
    const w=24,h=6,d=10;face(-w/2,d/2,1,0,w,h,6,2,10500);face(w/2,-d/2,-1,0,w,h,6,2,3000);face(-w/2,-d/2,0,1,d,h,3,2,2300);face(w/2,d/2,0,-1,d,h,3,2,2300);
    for(let i=0;i<5200;i++){const x=(random()-.5)*w,z=(random()-.5)*d,y=h/2+2.5*(1-Math.abs(z)/(d/2));dot(data,x,y,z,random,.025)}
    for(let bay=0;bay<6;bay++){const x=-w/2+(bay+.5)*w/6;for(let i=0;i<210;i++){const a=random()*Math.PI;dot(data,x+Math.cos(a)*1.25,-h/2+1.65+Math.sin(a)*1.7,d/2+.08,random,.014)}}
    beam(data,new THREE.Vector3(-w/2-.3,-h/2,d/2+.12),new THREE.Vector3(w/2+.3,-h/2,d/2+.12),850,random,.014);
  }else{
    const w=20,h=15,d=16;face(-w/2,d/2,1,0,w,h,5,5,7200);face(w/2,-d/2,-1,0,w,h,5,5,2600);face(-w/2,-d/2,0,1,d,h,4,5,3100);face(w/2,d/2,0,-1,d,h,4,5,3100);
    face(-5,3.5,1,0,10,h,4,5,3200);face(5,-3.5,-1,0,10,h,4,5,1500);face(-5,-3.5,0,1,7,h,3,5,1200);face(5,3.5,0,-1,7,h,3,5,1200);
    for(let i=0;i<4200;i++){const x=(random()-.5)*w,z=(random()-.5)*d,edge=Math.min(Math.abs(z-3.5),Math.abs(z+3.5));if(edge<2.3||Math.abs(x)>5)dot(data,x,h/2+3.2*(1-Math.min(1,edge/2.3)),z,random,.025)}
    for(const [x,z] of [[-6,-5.75],[3,5.75],[7.5,-1.5]])for(let i=0;i<420;i++)dot(data,x+(random()-.5)*.7,h/2+2.5+random()*2.2,z+(random()-.5)*.7,random,.018);
    beam(data,new THREE.Vector3(-w/2,h/2+3.2,5.75),new THREE.Vector3(w/2,h/2+3.2,5.75),650,random,.014);beam(data,new THREE.Vector3(-w/2,h/2+3.2,-5.75),new THREE.Vector3(w/2,h/2+3.2,-5.75),650,random,.014);
  }
  const groundY=shape==='warehouse'?-3:-7.5;for(let i=0;i<1800;i++){const r=12+random()*14,a=random()*Math.PI*2;dot(data,Math.cos(a)*r,groundY+random()*.35,Math.sin(a)*r,random,.04)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
  const shade=new Float32Array(data.length);for(let i=0;i<data.length/3;i++){const v=.48+random()*.42;shade[i*3]=v;shade[i*3+1]=v*.98;shade[i*3+2]=v*.92}geo.setAttribute('color',new THREE.BufferAttribute(shade,3));
  const material=new THREE.PointsMaterial({size:1.25,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.82,depthWrite:false,alphaTest:.04});
  return{points:new THREE.Points(geo,material),count:data.length/3}
}
function ground(scene:THREE.Scene,y:number){const group=new THREE.Group(),mat=new THREE.LineBasicMaterial({color:0x3a3833,transparent:true,opacity:.42});for(let r=5;r<=25;r+=5){const curve=new THREE.EllipseCurve(0,0,r,r*.45,0,Math.PI*2);group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(curve.getPoints(96).map(p=>new THREE.Vector3(p.x,0,p.y))),mat))}for(let i=0;i<16;i++){const a=i/16*Math.PI*2;group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*27,0,Math.sin(a)*27)]),mat))}group.position.y=y;scene.add(group)}
const modelFiles=['/models/b_large.glb','/models/b_medium.glb','/models/b_small.glb'];
const loader=new GLTFLoader();
async function loadBuildingCloud(url:string,targetCount=68000){
  const gltf=await loader.loadAsync(url);gltf.scene.updateMatrixWorld(true);
  const meshes:THREE.Mesh[]=[];gltf.scene.traverse(obj=>{if((obj as THREE.Mesh).isMesh){const mesh=obj as THREE.Mesh;if(mesh.geometry.getAttribute('position'))meshes.push(mesh)}});
  const weights=meshes.map(mesh=>mesh.geometry.getAttribute('position').count),totalWeight=weights.reduce((a,b)=>a+b,0),raw:number[]=[];
  const point=new THREE.Vector3();
  meshes.forEach((mesh,index)=>{const sampler=new MeshSurfaceSampler(mesh).build(),count=Math.max(80,Math.round(targetCount*weights[index]/totalWeight));for(let n=0;n<count;n++){sampler.sample(point);point.applyMatrix4(mesh.matrixWorld);raw.push(point.x,point.y,point.z)}});
  const source=new THREE.BufferAttribute(new Float32Array(raw),3),box=new THREE.Box3().setFromBufferAttribute(source),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),scale=18/Math.max(size.x,size.y,size.z);
  for(let i=0;i<source.count;i++){source.setXYZ(i,(source.getX(i)-center.x)*scale,(source.getY(i)-box.min.y)*scale-7.5,(source.getZ(i)-center.z)*scale)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',source);
  const colors=new Float32Array(source.count*3),random=rng(700+source.count);for(let i=0;i<source.count;i++){const v=.42+random()*.48;colors[i*3]=v;colors[i*3+1]=v*.98;colors[i*3+2]=v*.92}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  // Let the nearest particles occlude particles behind them. Without depth writes,
  // the front and back faces accumulate into an overexposed white block whenever
  // the building is viewed head-on.
  const material=new THREE.PointsMaterial({
    size:1,
    sizeAttenuation:false,
    vertexColors:true,
    transparent:true,
    opacity:.76,
    depthTest:true,
    depthWrite:true,
    alphaTest:.08
  });
  return new THREE.Points(geometry,material);
}
const viewAngles=[.88,.88,.88];
const viewScales=[1,1,1];
offices.forEach((o,i)=>{const wrap=document.querySelector<HTMLElement>(`#scene-${i}`)!,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,140);camera.position.set(24,13,31);camera.lookAt(0,0,0);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));wrap.appendChild(renderer.domElement);const cloud=new THREE.Group();cloud.scale.setScalar(viewScales[i]);scene.add(cloud);ground(scene,-7.5);document.querySelector(`#points-${i}`)!.textContent='LOADING MODEL';loadBuildingCloud(modelFiles[i]).then(points=>{cloud.add(points);document.querySelector(`#points-${i}`)!.textContent=`${points.geometry.getAttribute('position').count.toLocaleString('en-US').replaceAll(',',' ')} PTS`}).catch(()=>{document.querySelector(`#points-${i}`)!.textContent='MODEL LOAD ERROR'});views.push({renderer,camera,scene,cloud,wrap,baseY:viewAngles[i]})});
let px=0,py=0,paused=false;addEventListener('pointermove',e=>{px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5});const motion=document.querySelector<HTMLButtonElement>('#motion')!;motion.addEventListener('click',()=>{paused=!paused;motion.setAttribute('aria-pressed',String(paused));motion.classList.toggle('paused',paused)});const start=performance.now();let lastFrame=start,spin=0;function frame(now:number){requestAnimationFrame(frame);const t=(now-start)/1000,delta=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(!paused)spin=(spin+delta*.16)%(Math.PI*2);views.forEach((v,i)=>{const r=v.wrap.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));if(v.renderer.domElement.clientWidth!==w||v.renderer.domElement.clientHeight!==h){v.renderer.setSize(w,h,false);v.camera.aspect=w/h;v.camera.updateProjectionMatrix()}if(!paused){v.cloud.rotation.y=v.baseY+spin+px*.12;v.cloud.rotation.x=py*.045;v.cloud.position.y=Math.sin(t*.55+i*1.7)*.08}v.renderer.render(v.scene,v.camera)})}requestAnimationFrame(frame);const clock=document.querySelector('#clock')!;setInterval(()=>clock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()),1000);if(matchMedia('(prefers-reduced-motion: reduce)').matches){paused=true;motion.classList.add('paused')}
