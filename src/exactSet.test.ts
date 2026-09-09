import {it,expect} from 'vitest';
import {GestureDetector} from './gestures';
import type {Face,Point} from './gestures';
import {memes} from './catalog';
import {recognitionRoutes} from './expressions';
const face:Face={mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:0,scores:{}};
function palm(x:number,y:number):Point[]{const p=Array.from({length:21},()=>({x,y}));p[0]={x,y:y+.12};for(let f=0;f<4;f++){const b=5+4*f,fx=x+(f-1)*.03;p[b]={x:fx,y};p[b+1]={x:fx,y:y-.04};p[b+2]={x:fx,y:y-.07};p[b+3]={x:fx,y:y-.1};}p[2]={x:x-.05,y:y+.07};p[3]={x:x-.07,y:y+.02};p[4]={x:x-.09,y:y-.03};return p;}
it('Okak has no hand route',()=>expect(recognitionRoutes(memes.find(m=>m.id==='okak')!).map(m=>m.gesture)).toEqual(['surprise']));
it('two raised hands cannot fall through to facial surprise',()=>{const f={...face,jaw:.6,scores:{browInnerUp:.6,eyeWideLeft:.5,eyeWideRight:.5}};expect(new GestureDetector().detect({time:1,face:f,hands:[palm(.15,.1),palm(.85,.1)]}).some(c=>c.gesture==='surprise')).toBe(false);});
it('Tinkov accepts an open mouth and one imperfectly extended finger at the cheek',()=>{const h=palm(.67,.5);h[20]={x:.73,y:.54};expect(new GestureDetector().detect({time:1,face:{...face,jaw:.3},hands:[h]}).some(c=>c.gesture==='peek')).toBe(true);});
it('a raised hand away from the cheek is not the folder gesture',()=>{expect(new GestureDetector().detect({time:1,face,hands:[palm(1,.4)]}).some(c=>c.gesture==='peek')).toBe(false);});
import {selectedRoutes,toggleRoute,routeKey,guideMarkdown} from './memeGuide';
import {RealtimeRecognizer} from './realtime';
it('selecting a face route does not enable the same meme hand route',()=>{const r=selectedRoutes(memes,{},['tinkov-wow:smile']);expect(r.map(routeKey)).toEqual(['tinkov-wow:smile']);expect(selectedRoutes(memes,{},[])).toEqual([]);});
it('same-action selection replaces the earlier meme while preserving unrelated pairs',()=>{const m=memes.find(m=>m.id==='calm')!;expect(toggleRoute(['dud:palm','okak:surprise'],m,true)).toEqual(['okak:surprise','calm:palm']);});
it('unselected facial reaction cannot fire even if its meme is enabled',()=>{const d=new RealtimeRecognizer();for(let t=0;t<=1600;t+=200)d.update({time:t,face,hands:[]},memes);const f={...face,smile:.8};for(const time of [2000,2700,3500])expect(d.update({time,face:f,hands:[]},memes,250,false,{},450,['tinkov-wow:thumbs']).fired).toBeNull();});
it('guide contains all 48 numbered entries',()=>{const doc=guideMarkdown(memes);expect(doc.split('\n').filter(s=>/^\| \d+ \|/.test(s))).toHaveLength(48);});
