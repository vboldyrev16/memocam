import {it,expect} from 'vitest';
import {exportSettings,importSettings} from './settingsTransfer';
it('roundtrips an exact personal selection without adding memes',()=>{const p={assignments:{},enabled:['know'],exactPairs:['know:squint'],faceHold:650,points:false};expect(importSettings(exportSettings(p))).toEqual(p);});
it('rejects unrelated files and versions rather than clearing the selection',()=>{for(const text of ['{}','null','{',JSON.stringify({format:'memocam-settings',version:2,preferences:{}})])expect(()=>importSettings(text)).toThrow();});
