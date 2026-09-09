import {describe,it,expect} from 'vitest';
import {HeadGestures} from './headGestures';
import {coreIds,callIds} from './legends';
import {memes} from './catalog';
import type {Face,Observation} from './gestures';
const face:Face={mouth:{x:.65,y:.5},brow:{x:.65,y:.35},center:{x:.65,y:.4},top:.2,width:.25,jaw:0,smile:0,yaw:0,pitch:0};
const obs=(time:number,f:Partial<Face>={}):Observation=>({time,aspect:4/3,hands:[],face:{...face,...f}});
describe('deliberate head motions',()=>{
 it('requires an excursion and return for a nod',()=>{const d=new HeadGestures();const pitch=[0,.1,.23,.12,0];const results=pitch.map((p,i)=>d.detect(obs(i*120,{pitch:p})));expect(results.slice(0,4).flat()).toEqual([]);expect(results[4][0].gesture).toBe('nod');});
 it('does not mistake a stationary face or vertical translation for a nod',()=>{const d=new HeadGestures();for(let i=0;i<20;i++)expect(d.detect(obs(i*100,{center:{x:.65,y:.4+i*.01}}))).toEqual([]);});
 it('requires a pleading expression for shaking no',()=>{for(const pleading of [false,true]){const d=new HeadGestures();const results=[0,.25,-.25,.15,0].flatMap((yaw,i)=>d.detect(obs(i*120,{yaw,scores:{browInnerUp:pleading?.4:0}})));expect(results.some(c=>c.gesture==='headNo')).toBe(pleading);}});
 it('requires a recent edge visit and open hand for a greeting',()=>{const d=new HeadGestures();expect(d.detect({...obs(0),hands:[[]]},true)).toEqual([]);d.detect(obs(100,{center:{x:.2,y:.4}}));expect(d.detect({...obs(500),hands:[[]]},true)[0].gesture).toBe('peekHello');expect(d.detect(obs(1100))).toEqual([]);});
 it('clears motion history when tracking is lost',()=>{const d=new HeadGestures();[0,.1,.25,.15].forEach((pitch,i)=>d.detect(obs(i*120,{pitch})));d.detect({time:400,hands:[],face:null});expect(d.detect(obs(500))).toEqual([]);});
});
describe('curated editions',()=>{
 it('keeps all 48 assets and resolves each of the 16 default reactions',()=>{expect(memes).toHaveLength(48);expect(new Set(coreIds).size).toBe(16);for(const id of coreIds)expect(memes.some(m=>m.id===id)).toBe(true);expect(callIds).toHaveLength(14);});
});
