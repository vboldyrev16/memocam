import type {Meme,GestureId} from './catalog';
import type {Face,Candidate} from './gestures';
import type {ExpressionAssignments} from './preferences';
export const expressionBindings:{gesture:GestureId;ids:string[];label:string;hint:string}[]=[
 {gesture:'squint',ids:['know'],label:'Прищур',hint:'Смотри примерно прямо и прищурь оба глаза, не закрывая их полностью'},
 {gesture:'skeptic',ids:['tinkov-ok'],label:'Скепсис',hint:'Приподними одну бровь, вторую оставь спокойной'},
 {gesture:'smile',ids:['tinkov-wow'],label:'Улыбка',hint:'Широко улыбнись, рот почти закрыт'},
 {gesture:'surprise',ids:['okak'],label:'Удивление',hint:'Открой рот и приподними брови или раскрой глаза'},
 {gesture:'frown',ids:[],label:'Нахмуренные брови',hint:'Сведи брови к переносице, не улыбайся'},
 {gesture:'wink',ids:[],label:'Подмигивание',hint:'Закрой один глаз, второй оставь открытым на полсекунды'},
 {gesture:'kiss',ids:[],label:'Губы поцелуем',hint:'Вытяни сомкнутые губы трубочкой'},
 {gesture:'disgust',ids:[],label:'Сморщенный нос',hint:'Сморщи нос и приподними верхнюю губу'},
 {gesture:'sad',ids:['nenado'],label:'Грустная гримаса',hint:'Опусти уголки губ, подними внутренние края бровей'},
 {gesture:'laugh',ids:['cook'],label:'Смех',hint:'Широко улыбнись и открой рот'},
];
export const expressionFor=(m:Meme,assignments:ExpressionAssignments={})=>expressionBindings.filter(b=>Object.hasOwn(assignments,b.gesture)?assignments[b.gesture]===m.id:b.ids.includes(m.id));
export const recognitionRoutes=(m:Meme,assignments:ExpressionAssignments={}):Meme[]=>{
 const routes=isExpression(m.gesture)?[]:[m];
 for(const b of expressionBindings){const ids=Object.hasOwn(assignments,b.gesture)?[assignments[b.gesture]]:b.ids;if(ids.includes(m.id))routes.push({...m,gesture:b.gesture});}
 return routes;
};
export const isExpression=(g:GestureId)=>expressionBindings.some(b=>b.gesture===g);
export function expressionChecks(face:Face|null){
 const s=face?.scores??{},score=(key:string)=>s[key]??0;
 const brow=Math.max(score('browInnerUp'),(score('browOuterUpLeft')+score('browOuterUpRight'))/2);
 const eyes=(score('eyeWideLeft')+score('eyeWideRight'))/2;
 return {squint:{perspective:!!face&&Number.isFinite(face.yaw??0)&&Math.abs(face.yaw??0)<.2,eyes:!!face&&Math.min(score('eyeSquintLeft'),score('eyeSquintRight'))>.16,notClosed:!!face&&Math.max(score('eyeBlinkLeft'),score('eyeBlinkRight'))<.65,notSmile:!!face&&face.smile<.3},squintValues:{left:score('eyeSquintLeft'),right:score('eyeSquintRight')},surprise:{mouth:!!face&&face.jaw>.16,eyesOrBrows:!!face&&(brow>.12||eyes>.12),notLaugh:!!face&&face.smile<.4},skeptic:{perspective:!!face&&Number.isFinite(face.yaw??0)&&Math.abs(face.yaw??0)<.2,brow:!!face&&Math.max(score('browOuterUpLeft'),score('browOuterUpRight'))>.12&&Math.abs(score('browOuterUpLeft')-score('browOuterUpRight'))>.09,relaxedMouth:!!face&&face.smile<.3&&face.jaw<.22}};
}
export function detectExpressions(face:Face):Candidate[]{
 const s=face.scores;if(!s)return[];
 const score=(key:string)=>s[key]??0,avg=(a:string,b:string)=>(score(a)+score(b))/2;
 const result:Candidate[]=[];const add=(gesture:GestureId)=>result.push({gesture,confidence:.8});
 const checks=expressionChecks(face);
 if(Object.values(checks.squint).every(Boolean))add('squint');
 if(Object.values(checks.skeptic).every(Boolean))add('skeptic');
 if(Math.max(score('eyeBlinkLeft'),score('eyeBlinkRight'))>.65&&Math.min(score('eyeBlinkLeft'),score('eyeBlinkRight'))<.25)add('wink');
 if(avg('noseSneerLeft','noseSneerRight')>.35&&avg('mouthUpperUpLeft','mouthUpperUpRight')>.2)add('disgust');
 if(score('mouthPucker')>.45&&face.jaw<.25)add('kiss');
 if(Object.values(checks.surprise).every(Boolean))add('surprise');
 if(avg('mouthFrownLeft','mouthFrownRight')>.3&&score('browInnerUp')>.2&&face.smile<.15)add('sad');
 if(avg('browDownLeft','browDownRight')>.35&&face.smile<.2)add('frown');
 if(face.smile>.4&&face.jaw<.3)add('smile');
 return result;
}
