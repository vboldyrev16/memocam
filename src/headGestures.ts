import type {Observation,Candidate} from './gestures';
export class HeadGestures{
 private trail:{time:number;yaw:number;pitch:number}[]=[];
 private edgeAt=-Infinity;
 private latch:{gesture:Candidate['gesture'];until:number}|null=null;
 reset(){this.trail=[];this.edgeAt=-Infinity;this.latch=null;}
 detect(o:Observation,openHand=false):Candidate[]{
  const f=o.face;if(!f){this.reset();return[];}
  const c:Candidate[]=[];
  if(f.center.x/(o.aspect??4/3)<.28||f.center.x/(o.aspect??4/3)>.72)this.edgeAt=o.time;
  const cx=f.center.x/(o.aspect??4/3);
  if(cx>.36&&cx<.64&&o.time-this.edgeAt<1800&&o.hands.length===1&&openHand){this.latch={gesture:'peekHello',until:o.time+500};this.edgeAt=-Infinity;}
  if(f.yaw!==undefined&&f.pitch!==undefined&&o.hands.length===0){
   this.trail.push({time:o.time,yaw:f.yaw,pitch:f.pitch});this.trail=this.trail.filter(p=>o.time-p.time<1500);
   if(this.trail.length>=5){const first=this.trail[0],elapsed=o.time-first.time;const pitches=this.trail.map(p=>p.pitch),yaws=this.trail.map(p=>p.yaw);const peak=Math.max(...pitches),dip=Math.min(...pitches);
    if(elapsed>300&&Math.max(peak-first.pitch,first.pitch-dip)>.16&&Math.abs(f.pitch-first.pitch)<.07&&Math.max(...yaws)-Math.min(...yaws)<.22&&f.smile<.3&&f.jaw<.2){this.latch={gesture:'nod',until:o.time+500};this.trail=[];}
    const left=Math.min(...yaws),right=Math.max(...yaws);const s=f.scores??{};
    const pleading=(s.browInnerUp??0)>.15||((s.mouthFrownLeft??0)+(s.mouthFrownRight??0))/2>.2;
    if(elapsed>350&&right-left>.38&&Math.abs(f.yaw-first.yaw)<.12&&pleading){this.latch={gesture:'headNo',until:o.time+500};this.trail=[];}
   }
  }else this.trail=[];
  if(this.latch&&o.time<this.latch.until)c.push({gesture:this.latch.gesture,confidence:1.07});
  return c;
 }
}
