import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
if(!process.argv[2])throw Error('Pass a memocam-settings.json exported from the author browser.');
const text=await readFile(process.argv[2],'utf8');
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {importSettings}=await server.ssrLoadModule('/src/settingsTransfer.ts');
 const {favoriteFrom}=await server.ssrLoadModule('/src/preferences.ts');
 const prefs=importSettings(text);
 if(!prefs.exactPairs?.length)throw Error('The export must contain a non-empty exact selection; no preset will be guessed.');
 const preset=favoriteFrom({assignments:prefs.assignments,exactPairs:prefs.exactPairs});
 await writeFile('src/author-preset.json',JSON.stringify(preset,null,2)+'\n');
 console.log(`Saved ${preset.exactPairs.length} author actions. Only assignments and action IDs were retained.`);
}finally{await server.close();}
