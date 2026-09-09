import {mkdir,readFile,writeFile,rename,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const models=[['face','face_landmarker','64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff'],['hand','hand_landmarker','fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1']];
await mkdir('public/models',{recursive:true});
for(const [name,model,hash] of models){
 const path=`public/models/${name}.task`;const digest=b=>createHash('sha256').update(b).digest('hex');
 try{if(digest(await readFile(path))===hash){console.log(`${name}: ready`);continue;}}catch{}
 const url=`https://storage.googleapis.com/mediapipe-models/${model}/${model}/float16/1/${model}.task`;
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`Model download failed: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());if(digest(bytes)!==hash)throw Error(`Unexpected checksum for ${name}; existing model was not replaced.`);
 await writeFile(`${path}.download`,bytes);await rename(`${path}.download`,path);console.log(`${name}: downloaded and verified`);
}
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/wasm',{recursive:true});
console.log('Local recognition runtime ready. Run npm run dev.');
