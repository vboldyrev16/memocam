import {it,expect} from 'vitest';
import {detectExpressions,recognitionRoutes} from './expressions';
import {RealtimeRecognizer} from './realtime';
import {GestureDetector} from './gestures';
import type {Face} from './gestures';
import {memes} from './catalog';
import {projectPoint} from './landmarks';
const face:Face={mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:0,scores:{}};
it('does not interpret brow asymmetry in a strong head turn as skepticism',()=>{
 const scores={browOuterUpLeft:.23,browOuterUpRight:.04};
 for(const yaw of [-.27,.27])expect(detectExpressions({...face,yaw,scores}).some(c=>c.gesture==='skeptic')).toBe(false);
 expect(detectExpressions({...face,yaw:.08,scores}).some(c=>c.gesture==='skeptic')).toBe(true);
 expect(detectExpressions({...face,yaw:.27,smile:.7}).some(c=>c.gesture==='smile')).toBe(true);
});
it('squint measures the remaining range above naturally narrowed resting eyes',()=>{
 const r=new RealtimeRecognizer(),rest={...face,scores:{eyeSquintLeft:.5,eyeSquintRight:.48}};
 for(let t=0;t<=1600;t+=200)r.update({time:t,face:rest,hands:[]},memes);
 const squint={...face,scores:{eyeSquintLeft:.62,eyeSquintRight:.61,eyeBlinkLeft:.35,eyeBlinkRight:.31}};
 r.update({time:2000,face:squint,hands:[]},memes,250,false,{},450,['know:squint']);
 expect(r.update({time:2500,face:squint,hands:[]},memes,250,false,{},450,['know:squint']).fired?.id).toBe('know');
});
it('know uses sustained two-eye squint instead of the chin pose',()=>{
 expect(recognitionRoutes(memes.find(m=>m.id==='know')!).map(m=>m.gesture)).toEqual(['squint']);
 const f={...face,scores:{eyeSquintLeft:.3,eyeSquintRight:.25,eyeBlinkLeft:.1,eyeBlinkRight:.1}};
 const r=new RealtimeRecognizer();for(let t=0;t<=1600;t+=200)r.update({time:t,face,hands:[]},memes);
 expect(r.update({time:2000,face:f,hands:[]},memes,250,false,{},450,['know:chin']).fired).toBeNull();
 expect(r.update({time:2100,face:f,hands:[]},memes,250,false,{},450,['know:chin']).fired).toBeNull();
 expect(r.update({time:2500,face:f,hands:[]},memes,250,false,{},450,['know:chin']).fired?.id).toBe('know');
 for(const scores of [{eyeSquintLeft:.3,eyeSquintRight:.02},{eyeSquintLeft:.3,eyeSquintRight:.3,eyeBlinkLeft:.9,eyeBlinkRight:.9}] as Record<string,number>[])expect(detectExpressions({...face,scores}).some(c=>c.gesture==='squint')).toBe(false);
});
it('accepts modest surprise without demanding strong eye and brow scores together',()=>{
 for(const scores of [{browInnerUp:.17,eyeWideLeft:.02,eyeWideRight:.02},{browInnerUp:.04,eyeWideLeft:.18,eyeWideRight:.18}])expect(detectExpressions({...face,jaw:.25,scores}).some(c=>c.gesture==='surprise')).toBe(true);
});
it('accepts a modest single eyebrow lift on either side but rejects symmetric brows and tiny noise',()=>{
 for(const [left,right] of [[.19,.06],[.06,.19]])expect(detectExpressions({...face,scores:{browOuterUpLeft:left,browOuterUpRight:right}}).some(c=>c.gesture==='skeptic')).toBe(true);
 for(const [left,right] of [[.3,.3],[.07,.01]])expect(detectExpressions({...face,scores:{browOuterUpLeft:left,browOuterUpRight:right}}).some(c=>c.gesture==='skeptic')).toBe(false);
});
it.each([
 ['smile',{...face,smile:.6}],
 ['surprise',{...face,jaw:.4,scores:{browInnerUp:.6,eyeWideLeft:.5,eyeWideRight:.5}}],
 ['frown',{...face,scores:{browDownLeft:.6,browDownRight:.6}}],
 ['wink',{...face,scores:{eyeBlinkLeft:.9,eyeBlinkRight:.05}}],
 ['kiss',{...face,scores:{mouthPucker:.8}}],
 ['disgust',{...face,scores:{noseSneerLeft:.6,noseSneerRight:.6,mouthUpperUpLeft:.4,mouthUpperUpRight:.4}}],
 ['sad',{...face,scores:{mouthFrownLeft:.6,mouthFrownRight:.6,browInnerUp:.5}}],
] as const)('detects %s without hands',(gesture,f)=>expect(detectExpressions(f)[0]?.gesture).toBe(gesture));
it('neutral, normal blinking and speech alone do not imply an expression',()=>{for(const f of [face,{...face,scores:{eyeBlinkLeft:.9,eyeBlinkRight:.9}},{...face,jaw:.6}])expect(detectExpressions(f)).toEqual([]);});
it('does not reuse expressions from a lost face',()=>{const d=new GestureDetector();d.detect({time:100,face:{...face,smile:.7},hands:[]});expect(d.detect({time:150,face:null,hands:[]})).toEqual([]);});
it('face-only route fires after a hold and survives the same gesture id used by a hand route',()=>{const r=new RealtimeRecognizer();for(let t=0;t<=1600;t+=200)r.update({time:t,face,hands:[]},memes);const happy={...face,smile:.7};expect(r.update({time:2000,face:happy,hands:[]},memes).fired).toBeNull();expect(r.update({time:2300,face:happy,hands:[]},memes).fired).toBeNull();const result=r.update({time:2500,face:happy,hands:[]},memes);expect(result.fired?.id).toBe('tinkov-wow');expect(result.fired?.gesture).toBe('smile');expect(r.update({time:7000,face:happy,hands:[]},memes).fired).toBeNull();});
it('calibration subtracts the resting expression, disabled targets remain disabled',()=>{const r=new RealtimeRecognizer(),rest={...face,smile:.5};for(let t=100;t<3000;t+=200)expect(r.update({time:t,face:rest,hands:[]},memes).fired).toBeNull();const f={...face,smile:1};r.update({time:3500,face:f,hands:[]},[]);expect(r.update({time:4200,face:f,hands:[]},[]).fired).toBeNull();});
it('quick wink is rejected',()=>{const r=new RealtimeRecognizer();for(let t=0;t<=1600;t+=200)r.update({time:t,face,hands:[]},memes);const wink={...face,scores:{eyeBlinkLeft:.9,eyeBlinkRight:0}};r.update({time:2000,face:wink,hands:[]},memes);expect(r.update({time:2100,face:wink,hands:[]},memes).fired).toBeNull();expect(r.update({time:2250,face,hands:[]},memes).fired).toBeNull();});
it('keeps existing hand routes and does not duplicate laugh',()=>{expect(recognitionRoutes(memes.find(m=>m.id==='tinkov-wow')!).map(m=>m.gesture)).toEqual(['thumbs','smile']);expect(recognitionRoutes(memes.find(m=>m.id==='cook')!)).toHaveLength(1);});
it('mirrors landmarks in contain bounds across desktop and portrait sizes',()=>{expect(projectPoint({x:0,y:0},4/3,1280,720)).toEqual({x:1120,y:0});expect(projectPoint({x:4/3,y:1},4/3,1280,720)).toEqual({x:160,y:720});const p=projectPoint({x:2/3,y:.5},4/3,390,844);expect(p.x).toBeCloseTo(195);expect(p.y).toBeCloseTo(422);});
it('rejects apparent squint during head turns on either side',()=>{
 for(const yaw of [-.28,.28])expect(detectExpressions({...face,yaw,scores:{eyeSquintLeft:.4,eyeSquintRight:.4,eyeBlinkLeft:.4,eyeBlinkRight:.4}}).some(c=>c.gesture==='squint')).toBe(false);
});
it('calibration must not subtract away closed eyes',()=>{
 const r=new RealtimeRecognizer();for(let time=0;time<=1600;time+=200)r.update({time,face:{...face,scores:{eyeBlinkLeft:.3,eyeBlinkRight:.3}},hands:[]},memes);
 const blink={...face,scores:{eyeSquintLeft:.4,eyeSquintRight:.4,eyeBlinkLeft:.85,eyeBlinkRight:.85}};
 for(let time=2000;time<=2800;time+=100)expect(r.update({time,face:blink,hands:[]},memes,250,false,{},450,['know:squint']).fired).toBeNull();
});
