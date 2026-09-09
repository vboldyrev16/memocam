import {it,expect,vi,afterEach} from 'vitest';
import {recognitionRoutes} from './expressions';
import {memes} from './catalog';
import {RealtimeRecognizer} from './realtime';
import {readPreferences,savePreferences} from './preferences';
import type {Face} from './gestures';
const face:Face={mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:0,scores:{}};
afterEach(()=>vi.unstubAllGlobals());
it('moves only the selected know chin route to squint, including its saved snapshot',()=>{
 const exactPairs=['know:chin','okak:surprise'];vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({assignments:{},exactPairs,favorite:{assignments:{},exactPairs}})});
 expect(readPreferences().exactPairs).toEqual(['know:squint','okak:surprise']);expect(readPreferences().favorite?.exactPairs).toEqual(['know:squint','okak:surprise']);
});
it('migrates the current exact selection into an independent favorite without adding memes',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({assignments:{surprise:'fish'},enabled:['fish','tinkov-ok'],exactPairs:['fish:surprise','tinkov-ok:skeptic']})});
 expect(readPreferences().favorite).toEqual({assignments:{surprise:'fish'},exactPairs:['fish:surprise','tinkov-ok:skeptic']});
});
it('keeps an existing favorite while a different temporary set is active, including an empty favorite',()=>{
 for(const exactPairs of [[],['okak:surprise']]){vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({assignments:{},exactPairs:['tinkov-tongue:peek'],favorite:{assignments:{},exactPairs}})});expect(readPreferences().favorite?.exactPairs).toEqual(exactPairs);}
});
it('reassigns expression without removing a hand pose, and disabling primary laugh works',()=>{const all=memes.flatMap(m=>recognitionRoutes(m,{smile:'nichosi',laugh:null}));expect(all.filter(m=>m.gesture==='smile').map(m=>m.id)).toEqual(['nichosi']);expect(all.some(m=>m.id==='tinkov-wow'&&m.gesture==='thumbs')).toBe(true);expect(all.some(m=>m.gesture==='laugh')).toBe(false);});
it('recognition fires chosen meme and respects the longer facial hold',()=>{const r=new RealtimeRecognizer();for(let t=0;t<=1600;t+=200)r.update({time:t,face,hands:[]},memes);const config={smile:'nichosi'};r.update({time:2000,face:{...face,smile:.7},hands:[]},memes,250,false,config,800);expect(r.update({time:2600,face:{...face,smile:.7},hands:[]},memes,250,false,config,800).fired).toBeNull();expect(r.update({time:2800,face:{...face,smile:.7},hands:[]},memes,250,false,config,800).fired?.id).toBe('nichosi');});
it('filters stale and malformed saved settings',()=>{vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({assignments:{smile:'missing',wink:'nichosi',laugh:null,invalid:'fish'},enabled:['fish','fish','missing',2],hold:NaN,faceHold:9999,points:'yes',side:'up'})});expect(readPreferences()).toEqual({assignments:{wink:'nichosi',laugh:null},enabled:['fish']});});
it('survives inaccessible storage and malformed JSON',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{',setItem:()=>{throw Error('blocked');}});expect(readPreferences()).toEqual({assignments:{}});expect(savePreferences({assignments:{}})).toBe(false);});
