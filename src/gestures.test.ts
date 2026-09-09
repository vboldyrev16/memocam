import { describe,it,expect } from 'vitest';
import { GestureDetector,GestureGate } from './gestures';
import type { Face,Point } from './gestures';
import { memes } from './catalog';
const face:Face={mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:0};
const palm=[{gesture:'palm' as const,confidence:.9}];
const classic=memes.filter(m=>m.pack==='classic');
function hand(x:number,y:number,open=true):Point[]{
 const p:Array<Point>=Array.from({length:21},()=>({x,y}));p[0]={x,y:y+.12};
 for(let f=0;f<4;f++){const b=5+4*f,fx=x+(f-1)*.03;p[b]={x:fx,y};p[b+1]={x:fx,y:y-.04};p[b+2]={x:fx,y:y-.07};p[b+3]={x:fx,y:open?y-.1:y+.02};}
 p[2]={x:x-.05,y:y+.07};p[3]={x:x-.07,y:y+.02};p[4]={x:x-.09,y:y-.03};return p;
}
describe('gesture timing and scope',()=>{
 it('holds by elapsed time, not number of frames',()=>{const g=new GestureGate();expect(g.update(palm,classic,0).fired).toBeNull();expect(g.update(palm,classic,449).fired).toBeNull();expect(g.update(palm,classic,450).fired).toBe('calm');});
 it('does not continuously retrigger a held gesture after cooldown',()=>{const g=new GestureGate();g.update(palm,classic,0);g.update(palm,classic,450);expect(g.update(palm,classic,5000).fired).toBeNull();});
 it('requires neutral release then cooldown and a fresh hold',()=>{const g=new GestureGate();g.update(palm,classic,0);g.update(palm,classic,450);g.update([],classic,600);g.update([],classic,950);expect(g.update(palm,classic,1000).fired).toBeNull();g.update(palm,classic,3000);expect(g.update(palm,classic,3450).fired).toBe('calm');});
 it('ignores gestures outside the chosen target',()=>{const g=new GestureGate();expect(g.update(palm,memes.filter(m=>m.id==='paws'),5000).matched).toBeNull();});
 it('resets partial hold after missing observations',()=>{const g=new GestureGate();g.update(palm,classic,0);g.update([],classic,400);expect(g.update(palm,classic,450).progress).toBe(0);});
 it('reset removes old pack timing',()=>{const g=new GestureGate();g.update(palm,classic,0);g.reset();expect(g.update(palm,classic,500).progress).toBe(0);});
});
describe('geometry and negative examples',()=>{
 it('never recognises a hand without a face reference',()=>expect(new GestureDetector().detect({time:1000,hands:[hand(.9,.4)],face:null})).toEqual([]));
 it('recognises a raised palm beside the face',()=>expect(new GestureDetector().detect({time:1,hands:[hand(.9,.4)],face}).map(c=>c.gesture)).toContain('palm'));
 it('separates hands above head from hands beside head',()=>{const d=new GestureDetector();expect(d.detect({time:1,hands:[hand(.15,.1),hand(.85,.1)],face}).map(c=>c.gesture)).toContain('handsUp');expect(d.detect({time:2,hands:[hand(.15,.4),hand(.85,.4)],face}).map(c=>c.gesture)).not.toContain('handsUp');});
 it('expires cached face after brief occlusion',()=>{const d=new GestureDetector();d.detect({time:1000,hands:[],face});expect(d.detect({time:1700,hands:[hand(.9,.4)],face:null})).toEqual([]);});
 it('neutral face and invalid hand do not trigger',()=>expect(new GestureDetector().detect({time:1,hands:[[]],face})).toEqual([]));
 it('laugh needs both smile and jaw opening',()=>{const d=new GestureDetector();expect(d.detect({time:1,hands:[],face:{...face,jaw:.5}})).toEqual([]);expect(d.detect({time:2,hands:[],face:{...face,jaw:.5,smile:.5}})[0].gesture).toBe('laugh');});
});
describe('required Tinkov folder reaction',()=>{
 it('requires a visible open mouth and hand beside cheek',()=>{const d=new GestureDetector(),hands=[hand(.67,.5)];expect(d.detect({time:1,hands,face}).map(c=>c.gesture)).not.toContain('peek');expect(d.detect({time:2,hands,face:{...face,jaw:.3}})[0].gesture).toBe('peek');});
 it('does not claim a tongue reaction using cached face alone',()=>{const d=new GestureDetector();d.detect({time:1,hands:[],face:{...face,jaw:.3}});expect(d.detect({time:2,hands:[hand(.67,.5)],face:null}).map(c=>c.gesture)).not.toContain('peek');});
 it('maps the pose to the required meme inside its personal pack',()=>{const g=new GestureGate(),pack=memes.filter(m=>m.person==='tinkov');expect(pack).toHaveLength(8);g.update([{gesture:'peek',confidence:1}],pack,0);expect(g.update([{gesture:'peek',confidence:1}],pack,500).fired).toBe('tinkov-tongue');});
});
