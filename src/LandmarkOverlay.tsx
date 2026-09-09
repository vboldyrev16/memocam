import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {Observation,Point} from './gestures';
import {projectPoint,handEdges} from './landmarks';
export type LatestObservation={value:Observation|null;at:number};
export function LandmarkOverlay({latest,enabled}:{latest:RefObject<LatestObservation>;enabled:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;let frame=0;
 const draw=()=>{frame=requestAnimationFrame(draw);const width=c.clientWidth,height=c.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(c.width!==Math.round(width*dpr)||c.height!==Math.round(height*dpr)){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 const o=latest.current.value;if(!enabled||!o||performance.now()-latest.current.at>400){c.dataset.points='0';return;}
 if(o.snapshot){const iw=o.snapshot.width,ih=o.snapshot.height;if(iw&&ih){const scale=Math.min(width/iw,height/ih);ctx.fillStyle='#080808';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width,0);ctx.scale(-1,1);ctx.drawImage(o.snapshot,(width-iw*scale)/2,(height-ih*scale)/2,iw*scale,ih*scale);ctx.restore();c.dataset.frame=String(o.time);}}
 const aspect=o.aspect??4/3,project=(p:Point)=>projectPoint(p,aspect,width,height);
 const dot=(p:Point,r:number)=>{const q=project(p);ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();};
 ctx.fillStyle='#61eaff';for(const p of o.facePoints??[])dot(p,1.35);
 for(const hand of o.hands){ctx.strokeStyle='#a8ff74';ctx.lineWidth=2;for(const [a,b] of handEdges){if(!hand[a]||!hand[b])continue;const p=project(hand[a]),q=project(hand[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}ctx.fillStyle='#fbffb0';for(const p of hand)dot(p,3);}
 c.dataset.points=String((o.facePoints?.length??0)+o.hands.reduce((n,h)=>n+h.length,0));
 };draw();return()=>cancelAnimationFrame(frame);},[enabled,latest]);
 return <canvas ref={canvas} className="landmark-overlay" aria-label="Точки лица и скелет пальцев в реальном времени"/>;
}
