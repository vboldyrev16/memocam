import {HeadGestures} from './headGestures';
import {detectExpressions,isExpression} from './expressions';
import type { GestureId, Meme } from './catalog';

export type Point = { x: number; y: number; z?: number };
export type Face = { mouth: Point; brow: Point; center: Point; top: number; width: number; jaw: number; smile: number; yaw?:number;pitch?:number;scores?:Record<string,number> };
export type Observation = { time: number; hands: Point[][]; face: Face | null; facePoints?:Point[]; aspect?:number; snapshot?:ImageBitmap };
export type Candidate = { gesture: GestureId; confidence: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
function angle(a: Point,b: Point,c: Point) {
  const u={x:a.x-b.x,y:a.y-b.y},v={x:c.x-b.x,y:c.y-b.y};
  return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y)||1))))*180/Math.PI;
}
export function classifyHand(points: Point[]) {
  const scale=distance(points[0],points[9]);
  const extended=[8,12,16,20].map(tip=>angle(points[tip-3],points[tip-2],points[tip])>145 && distance(points[tip],points[0])>distance(points[tip-2],points[0])*1.07);
  const thumb=distance(points[4],points[9])>scale*0.95 && angle(points[2],points[3],points[4])>140;
  return {p:points,center:points[9],scale,extended,thumb,open:extended.every(Boolean),curled:extended.every(x=>!x),pointing:extended[0]&&!extended[1]&&!extended[2]&&!extended[3],victory:extended[0]&&extended[1]&&!extended[2]&&!extended[3],ok:distance(points[4],points[8])<scale*.4&&extended.slice(1).every(Boolean)};
}
export function peekChecks(face:Face|null,hands:ReturnType<typeof classifyHand>[]){
 const h=hands.length===1?hands[0]:null,fw=Math.max(face?.width??0,.03);
 return {face:!!face,hand:!!h,mouth:!!face&&face.jaw>.12,fingers:!!h&&h.extended.filter(Boolean).length>=3,cheek:!!h&&!!face&&h.center.y>face.brow.y&&h.center.y<face.mouth.y+fw*.35&&Math.abs(h.center.x-face.mouth.x)>fw*.25&&Math.abs(h.center.x-face.mouth.x)<fw*.95&&distance(h.center,face.mouth)/fw<1.1};
}

export class GestureDetector {
  private head=new HeadGestures();
  private face: Face|null=null;
  private faceTime=0;
  private trail:{time:number;p:Point}[]=[];
  private waveUntil=0;
  private waveTrail:{time:number;p:Point}[]=[];
  reset(){this.head.reset();this.face=null;this.faceTime=0;this.trail=[];this.waveTrail=[];this.waveUntil=0;}
  detect(o:Observation):Candidate[] {
    if(o.face){this.face=o.face;this.faceTime=o.time;}
    const face=o.face??(o.time-this.faceTime<650?this.face:null);
    const hands=o.hands.filter(p=>p.length===21).map(classifyHand);
    const c:Candidate[]=this.head.detect(o,hands.some(h=>h.open));
    const add=(gesture:GestureId,confidence=.9)=>c.push({gesture,confidence});
    if(!face){this.trail=[];this.waveTrail=[];return c;}
    const fw=Math.max(face.width,.03);
    if(hands.length===2){
      const [a,b]=hands;const gap=distance(a.center,b.center)/fw;
      if(hands.every(h=>(h.victory||(h.pointing&&h.thumb))&&distance(h.p[8],face.center)<fw*1.2)&&gap>1)add('fingerGuns',1.03);
      if(gap<1.4&&hands.every(h=>distance(h.center,face.mouth)<fw*.8&&h.center.y>face.mouth.y))add('chinRest',1.01);
      if(hands.every(h=>h.curled&&h.center.y<face.mouth.y&&h.center.y>face.top-fw*.5)&&gap>1.4)add('flex',.995);
      if(hands.every(h=>!h.curled&&h.center.y>face.mouth.y)&&distance(a.p[8],b.p[8])<fw*.35&&distance(a.p[12],b.p[12])<fw*.4)add('steeple',.995);
      if(hands.every(h=>!h.extended[2]&&!h.extended[3])&&distance(a.p[8],b.p[8])<fw*.5&&distance(a.p[4],b.p[4])<fw*.5&&gap>.5&&gap<1.6&&hands.every(h=>h.center.y>face.mouth.y))add('heart',1);
      if(a.pointing&&b.pointing&&hands.every(h=>h.p[8].y<face.brow.y))add('ears',.98);
      if(hands.every(h=>h.open&&h.center.y<face.top)){if(o.face&&face.jaw>.22)add('shockHands',1.08);else add('handsUp',.98);}
      if(hands.every(h=>h.curled&&h.thumb))add('thumbs',.99);
      if(hands.every(h=>h.center.y>face.mouth.y)&&gap<.95)add('wait',.94);
      if(hands.every(h=>!h.open&&h.center.y>face.mouth.y&&h.center.y<face.mouth.y+fw*1.6)&&gap>=.95)add('paws',.92);
      if(o.face&&face.jaw>.38&&gap>1.5&&hands.every(h=>h.center.y>face.top))add('fish',.97);
      if(hands.every(h=>h.open&&h.center.y>face.top&&h.center.y<face.mouth.y)&&gap>1)add('hood',.93);
      if(hands.every(h=>h.open&&h.center.y>face.mouth.y)&&gap>1.6)add('shrug',.88);
    }
    if(hands.length===1){
      const h=hands[0];
      // Stacked hands often produce only one landmark set. Accept the visible
      // hand below the chin, fingers directed sideways/down, not an upright palm.
      if(h.open&&h.center.y>face.mouth.y+fw*.15&&distance(h.center,face.mouth)<fw*.65&&[8,12,16,20].every(i=>h.p[i].y>face.mouth.y))add('chinRest',1.01);
      if(!h.extended[0]&&h.extended[1]&&!h.extended[2]&&!h.extended[3])add('middle',1.02);
      if(h.extended[0]&&h.extended[3]&&!h.extended[1]&&!h.extended[2])add('rock',1);
      if(h.extended[0]&&h.extended[1]&&h.extended[2]&&!h.extended[3])add('three',1);
      if(!h.extended[1]&&!h.extended[2]&&!h.extended[3]&&distance(h.p[4],h.p[8])<h.scale*.35)add('pinch',1);
      if(h.pointing&&Math.abs(h.p[8].x-face.brow.x)>fw*.4&&Math.abs(h.p[8].x-face.brow.x)<fw*.95&&Math.abs(h.p[8].y-face.brow.y)<fw*.45)add('temple',1);
      if(h.pointing&&distance(h.p[8],face.mouth)<fw*.3)add('shush',1);
      if(h.curled&&distance(h.center,face.mouth)<fw*.6)add('chin',.99);
      if(h.open){
        this.waveTrail.push({time:o.time,p:h.center});this.waveTrail=this.waveTrail.filter(p=>o.time-p.time<850);
        const first=this.waveTrail[0];
        if(this.waveTrail.length>=5){const xs=this.waveTrail.map(p=>p.p.x),span=Math.max(...xs)-Math.min(...xs);const middle=this.waveTrail[Math.floor(this.waveTrail.length/2)];if(span>fw*.65&&(middle.p.x-first.p.x)*(h.center.x-middle.p.x)<0&&o.time-first.time>220)this.waveUntil=o.time+350;}
        if(o.time<this.waveUntil)add('wave',1.01);
      }else this.waveTrail=[];
      if(Object.values(peekChecks(o.face,hands)).every(Boolean))add('peek',1);
      if(h.ok)add('ok',.99);
      if(h.victory)add('victory',.98);
      if(h.open&&distance(h.center,face.brow)/fw<.65)add('facepalm',.98);
      if(h.open&&h.center.y>face.brow.y&&distance(h.center,face.mouth)/fw<.95)add('cheek',.9);
      if(h.pointing&&distance(h.p[8],face.brow)/fw<.4)add('glasses',.98);
      if(h.open&&distance(h.center,face.center)/fw>1.0)add('palm',.9);
      if(h.pointing&&distance(h.p[8],face.center)/fw>.8){
        add('point',.87);
        this.trail.push({time:o.time,p:h.p[8]});
        this.trail=this.trail.filter(p=>o.time-p.time<550);
        if(this.trail.length>=3){
          const start=this.trail[0],dx=Math.abs(h.p[8].x-start.p.x),dy=Math.abs(h.p[8].y-start.p.y);
          if(dx>fw*.9&&dx>dy*1.4&&o.time-start.time>120)add('swipe',.99);
        }
      }else this.trail=[];
    }else {this.trail=[];this.waveTrail=[];this.waveUntil=0;}
    if(o.face&&hands.length===0&&face.jaw>(face.scores && 'jawOpen' in face.scores ? 0.22 : 0.38)&&face.smile>(face.scores && 'jawOpen' in face.scores ? 0.45 : 0.35))add('laugh',.9);
    if(o.face&&hands.length===0)c.push(...detectExpressions(o.face));
    return c.sort((a,b)=>b.confidence-a.confidence);
  }
}

export class GestureGate {
  constructor(private cooldownMs=2400){}
  private candidate:string|null=null;
  private since=0;
  private fired=false;
  private neutralSince:number|null=null;
  private lastFire=-Infinity;
  reset(){this.candidate=null;this.since=0;this.fired=false;this.neutralSince=null;this.lastFire=-Infinity;}
  update(candidates:Candidate[],allowed:Meme[],now:number,holdMs=450,faceHoldMs=450) {
    const best=candidates.map(c=>({c,m:allowed.find(m=>m.gesture===c.gesture)})).find(x=>x.m);
    if(!best?.m){
      this.candidate=null;
      this.neutralSince??=now;
      if(now-this.neutralSince>=300)this.fired=false;
      return {progress:0,matched:null as string|null,fired:null as string|null};
    }
    this.neutralSince=null;
    if(this.fired || now-this.lastFire<this.cooldownMs)return {progress:0,matched:best.m.id,fired:null};
    if(this.candidate!==best.m.id){this.candidate=best.m.id;this.since=now;}
    const threshold=best.m.gesture==='swipe'?90:isExpression(best.m.gesture)?Math.max(faceHoldMs,holdMs):holdMs;
    const progress=Math.min(1,(now-this.since)/threshold);
    if(progress>=1){this.fired=true;this.lastFire=now;return {progress:1,matched:best.m.id,fired:best.m.id};}
    return {progress,matched:best.m.id,fired:null};
  }
}
