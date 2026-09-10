import {it,expect} from 'vitest';
import {RealtimeRecognizer} from './realtime';
import {GestureDetector} from './gestures';
import type {Face,Point} from './gestures';
import {memes} from './catalog';
const face:Face={mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:0};
function hand(x=.9,y=.4,extended=[true,true,true,true]):Point[]{const p:Point[]=Array.from({length:21},()=>({x,y}));p[0]={x,y:y+.12};for(let f=0;f<4;f++){const b=5+4*f,fx=x+(f-1)*.03;p[b]={x:fx,y};p[b+1]={x:fx,y:y-.04};p[b+2]={x:fx,y:y-.07};p[b+3]={x:fx,y:extended[f]?y-.1:y+.02};}p[2]={x:x-.05,y:y+.07};p[3]={x:x-.07,y:y+.02};p[4]={x:x-.09,y:y-.03};return p;}
function calibrated(){const r=new RealtimeRecognizer();for(let time=100;time<=1700;time+=200)r.update({time,face,hands:[]},memes);return r;}
it('calibrates before reactions, never fires on neutral',()=>{const r=new RealtimeRecognizer();expect(r.update({time:100,face,hands:[hand()]},memes).fired).toBeNull();for(let time=300;time<2000;time+=200)expect(r.update({time,face,hands:[]},memes).fired).toBeNull();expect(r.update({time:2100,face,hands:[]},memes).calibrated).toBe(true);});
it('rotates shared gestures only after release and fresh hold',()=>{const r=calibrated(),allowed=memes.filter(m=>m.gesture==='palm');expect(allowed.length).toBeGreaterThan(1);r.update({time:2000,face,hands:[hand()]},allowed);expect(r.update({time:2300,face,hands:[hand()]},allowed).fired?.id).toBe(allowed[0].id);expect(r.update({time:5000,face,hands:[hand()]},allowed).fired).toBeNull();r.update({time:5100,face,hands:[]},allowed);r.update({time:5500,face,hands:[]},allowed);r.update({time:5600,face,hands:[hand()]},allowed);expect(r.update({time:5900,face,hands:[hand()]},allowed).fired?.id).toBe(allowed[1].id);});
it('disabled memes cannot fire and recalibration clears readiness',()=>{const r=calibrated();r.update({time:2000,face,hands:[hand()]},[]);expect(r.update({time:2400,face,hands:[hand()]},[]).fired).toBeNull();r.recalibrate();expect(r.update({time:2500,face,hands:[]},memes).calibrated).toBe(false);});
it.each([['middle',[false,true,false,false]],['rock',[true,false,false,true]],['three',[true,true,true,false]]] as const)('distinguishes %s from a palm', (gesture,fingers)=>{const c=new GestureDetector().detect({time:100,face,hands:[hand(.9,.4,[...fingers])]});expect(c[0].gesture).toBe(gesture);expect(c.some(c=>c.gesture==='palm')).toBe(false);});
it('detects temple and rejects an ordinary raised index far from head',()=>{expect(new GestureDetector().detect({time:100,face,hands:[hand(.7,.45,[true,false,false,false])]})[0].gesture).toBe('temple');expect(new GestureDetector().detect({time:100,face,hands:[hand(.95,.45,[true,false,false,false])]}).some(c=>c.gesture==='temple')).toBe(false);});
it('wave needs a reversal, stays long enough for temporal hold',()=>{const d=new GestureDetector();for(let i=0;i<5;i++)expect(d.detect({time:100+i*100,face,hands:[hand(.65+i*.05,.4)]}).some(c=>c.gesture==='wave')).toBe(false);expect(d.detect({time:600,face,hands:[hand(.7,.4)]})[0].gesture).toBe('wave');expect(d.detect({time:880,face,hands:[hand(.7,.4)]})[0].gesture).toBe('wave');});

import {poseFixtures} from './pose-fixtures';
it('recognises real-model finger-gun and stacked-hand observations',()=>{expect(new GestureDetector().detect(poseFixtures[0])[0].gesture).toBe('fingerGuns');expect(new GestureDetector().detect(poseFixtures[1])[0].gesture).toBe('chinRest');});
it('glasses requires current frontal face and a finger tightly at the bridge',()=>{
 const h=hand(.53,.45,[true,false,false,false]);
 expect(new GestureDetector().detect({time:100,face,hands:[h]}).some(c=>c.gesture==='glasses')).toBe(true);
 for(const yaw of [-.28,.28])expect(new GestureDetector().detect({time:100,face:{...face,yaw},hands:[h]}).some(c=>c.gesture==='glasses')).toBe(false);
 expect(new GestureDetector().detect({time:100,face,hands:[hand(.6,.45,[true,false,false,false])]}).some(c=>c.gesture==='glasses')).toBe(false);
 const d=new GestureDetector();d.detect({time:100,face,hands:[]});expect(d.detect({time:200,face:null,hands:[h]}).some(c=>c.gesture==='glasses')).toBe(false);
});
it('completed wave fires even with long pose hold, but a still palm never fires squirrel',()=>{
 for(const hold of [250,800]){
  const r=calibrated(),allowed=memes.filter(m=>m.id==='squirrel-goodbye');
  for(let time=2000;time<3000;time+=100)expect(r.update({time,face,hands:[hand(.85,.4)]},allowed,hold).fired).toBeNull();
  r.reset();const fired=[.65,.70,.75,.80,.85,.70].map((x,i)=>r.update({time:4000+i*100,face,hands:[hand(x,.4)]},allowed,hold).fired).filter(Boolean);
  expect(fired.map(m=>m!.id)).toEqual(['squirrel-goodbye']);
  expect(r.update({time:4600,face,hands:[hand(.7,.4)]},allowed,hold).fired).toBeNull();
 }
});
it('completed wave can supersede the raised palm that precedes it in a mixed set',()=>{
 const r=calibrated(),allowed=memes.filter(m=>m.id==='squirrel-goodbye'||m.gesture==='palm');
 r.update({time:2000,face,hands:[hand(.9,.4)]},allowed);
 expect(r.update({time:2300,face,hands:[hand(.9,.4)]},allowed).fired?.gesture).toBe('palm');
 const fired=[.9,.95,1,1.05,1.1,.95].map((x,i)=>r.update({time:2400+i*100,face,hands:[hand(x,.4)]},allowed).fired).filter(Boolean);
 expect(fired.some(m=>m?.id==='squirrel-goodbye')).toBe(true);
});
it('a briefly bent pinky does not erase an otherwise complete wave',()=>{
 const d=new GestureDetector();const result=[.65,.7,.75,.8,.85,.7].flatMap((x,i)=>d.detect({time:100+i*100,face,hands:[hand(x,.4,[true,true,true,i!==3])]}));
 expect(result.some(c=>c.gesture==='wave')).toBe(true);
});
