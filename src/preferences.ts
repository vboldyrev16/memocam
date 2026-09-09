import {migrateRouteKey} from './routeMigration';
import type {GestureId} from './catalog';
import {memes} from './catalog';
import {expressionBindings,recognitionRoutes} from './expressions';
export type ExpressionAssignments=Partial<Record<GestureId,string|null>>;
export type FavoriteSet={assignments:ExpressionAssignments;exactPairs:string[]};
export type Preferences={assignments:ExpressionAssignments;favorite?:FavoriteSet;enabled?:string[];exactPairs?:string[];hold?:number;faceHold?:number;side?:'left'|'right';points?:boolean;rotate?:boolean};
export function favoriteFrom(value:FavoriteSet):FavoriteSet{
 const assignments:ExpressionAssignments={};for(const b of expressionBindings){const id=value.assignments?.[b.gesture];if(id===null||memes.some(m=>m.id===id))assignments[b.gesture]=id;}
 const valid=new Set(memes.flatMap(m=>recognitionRoutes(m,assignments)).map(m=>`${m.id}:${m.gesture}`));
 return {assignments,exactPairs:[...new Map((Array.isArray(value.exactPairs)?value.exactPairs:[]).map(migrateRouteKey).filter(k=>valid.has(k)).map(k=>[k.split(':')[1],k])).values()]};
}
export const preferenceKey='memocam.preferences.v1';
export function readPreferences():Preferences{try{return parsePreferences(localStorage.getItem(preferenceKey)??'{}');}catch{return{assignments:{}};}}
export function parsePreferences(text:string):Preferences{
 try{const value=JSON.parse(text);if(!value||typeof value!=='object')return{assignments:{}};
 const assignments:ExpressionAssignments={};for(const b of expressionBindings){const id=value.assignments?.[b.gesture];if(id===null||memes.some(m=>m.id===id))assignments[b.gesture]=id;}
 const valid=new Set(memes.flatMap(m=>recognitionRoutes(m,assignments)).map(m=>`${m.id}:${m.gesture}`));
 const pairs=Array.isArray(value.exactPairs)?[...new Map(value.exactPairs.map((k:unknown)=>typeof k==='string'?migrateRouteKey(k):k).filter((k:unknown)=>typeof k==='string'&&valid.has(k)).map((k:string)=>[k.split(':')[1],k])).values()] as string[]:undefined;
 const favorite=value.favorite&&typeof value.favorite==='object'?favoriteFrom(value.favorite):pairs?favoriteFrom({assignments,exactPairs:pairs}):undefined;
 return{assignments,...(favorite?{favorite}:{}),...(pairs?{exactPairs:pairs}:{}),...(Number.isFinite(value.faceHold)&&value.faceHold>=450&&value.faceHold<=800?{faceHold:value.faceHold}:{}),...(Array.isArray(value.enabled)?{enabled:[...new Set<string>(value.enabled.filter((id:unknown)=>memes.some(m=>m.id===id)))]}:{}),...(Number.isFinite(value.hold)&&value.hold>=150&&value.hold<=800?{hold:value.hold}:{}),...(value.side==='left'||value.side==='right'?{side:value.side}:{}),...(typeof value.points==='boolean'?{points:value.points}:{}),...(typeof value.rotate==='boolean'?{rotate:value.rotate}:{})};
 }catch{return{assignments:{}};}
}
export function savePreferences(value:Preferences){try{localStorage.setItem(preferenceKey,JSON.stringify({...value,...(value.exactPairs?{exactPairs:value.exactPairs.map(migrateRouteKey)}:{}),...(value.favorite?{favorite:favoriteFrom(value.favorite)}:{})}));return true;}catch{return false;}}
