import {expressionChecks} from './expressions';
import {selectedRoutes} from './memeGuide';
import { GestureDetector,GestureGate,peekChecks,classifyHand } from './gestures';
import type { Observation } from './gestures';
import type { Meme,GestureId } from './catalog';
import type {ExpressionAssignments} from './preferences';

// A gesture shared by several memes rotates its variants on separate attempts.
// It does not pretend to identify a person from the user's appearance.
export class RealtimeRecognizer {
 private detector=new GestureDetector();
 private gate=new GestureGate(1100);
 private variants=new Map<GestureId,number>();
 private baseline={start:null as number|null,count:0,jaw:0,smile:0,scores:{} as Record<string,number>,ready:false};
 reset(){this.detector.reset();this.gate.reset();}
 recalibrate(){this.reset();this.baseline={start:null,count:0,jaw:0,smile:0,scores:{},ready:false};}
 update(input:Observation,enabled:Meme[],hold=250,rotate=true,assignments:ExpressionAssignments={},faceHold=450,exactPairs:string[]|null=null){
  const b=this.baseline;
  if(input.face&&!b.ready){b.start??=input.time;b.count++;b.jaw+=input.face.jaw;b.smile+=input.face.smile;for(const [key,value] of Object.entries(input.face.scores??{}))b.scores[key]=(b.scores[key]??0)+value;if(input.time-b.start>=1200&&b.count>=8){b.jaw/=b.count;b.smile/=b.count;for(const key in b.scores)b.scores[key]/=b.count;b.ready=true;}}
  const o=b.ready&&input.face?{...input,face:{...input.face,scores:input.face.scores?Object.fromEntries(Object.entries(input.face.scores).map(([key,value])=>[key,key==='eyeBlinkLeft'||key==='eyeBlinkRight'?value:Math.max(0,(value-(b.scores[key]??0))/(key==='eyeSquintLeft'||key==='eyeSquintRight'?Math.max(.15,1-(b.scores[key]??0)):1))])):undefined,jaw:Math.max(0,input.face.jaw-b.jaw),smile:Math.max(0,input.face.smile-b.smile)}}:input;
  const candidates=b.ready?this.detector.detect(o):[];
  const byGesture=new Map<GestureId,Meme[]>();
  for(const m of selectedRoutes(enabled,assignments,exactPairs)){const group=byGesture.get(m.gesture)??[];group.push(m);byGesture.set(m.gesture,group);}
  const representatives=[...byGesture].map(([g,items])=>items[(rotate?(this.variants.get(g)??0):0)%items.length]);
  const update=this.gate.update(candidates,representatives,input.time,hold,faceHold);
  const selected=candidates.map(c=>representatives.find(m=>m.gesture===c.gesture)).find(Boolean);
  const fired=update.fired?selected??null:null;
  if(fired&&rotate)this.variants.set(fired.gesture,(this.variants.get(fired.gesture)??0)+1);
  return {expressionChecks:expressionChecks(o.face),peek:peekChecks(o.face,o.hands.filter(h=>h.length===21).map(classifyHand)),candidates,fired,calibrated:b.ready,gesture:candidates.find(c=>byGesture.has(c.gesture))?.gesture??null,progress:update.progress};
 }
}
