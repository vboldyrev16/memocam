import {parsePreferences} from './preferences';
import type {Preferences} from './preferences';
export const exportSettings=(preferences:Preferences)=>JSON.stringify({format:'memocam-settings',version:1,preferences},null,2);
export function importSettings(text:string):Preferences{
 if(text.length>262144)throw Error('Файл настроек слишком большой.');
 const data=JSON.parse(text);
 if(data?.format!=='memocam-settings'||data.version!==1||!data.preferences||!Array.isArray(data.preferences.enabled)||!data.preferences.assignments||typeof data.preferences.assignments!=='object')throw Error('Это не файл настроек Мемокам версии 1.');
 const result=parsePreferences(JSON.stringify(data.preferences));if(!Object.hasOwn(data.preferences,'favorite'))delete result.favorite;return result;
}
