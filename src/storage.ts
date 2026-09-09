export type SavedMedia={key:string;id:string;kind:'image'|'video'|'audio';file:Blob;name:string};
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const r=indexedDB.open('memocam-local',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'key'});
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});}
export async function loadMedia():Promise<SavedMedia[]>{
  const db=await database();return new Promise((resolve,reject)=>{
    const tx=db.transaction('media','readonly'),req=tx.objectStore('media').getAll();
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();
  });
}
export async function saveMedia(item:SavedMedia){
  const db=await database();return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('media','readwrite');tx.objectStore('media').put(item);
    if(item.kind==='image')tx.objectStore('media').delete(`${item.id}:video`);
    if(item.kind==='video')tx.objectStore('media').delete(`${item.id}:image`);
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
export async function removeMedia(id:string){
  const db=await database();return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('media','readwrite');for(const kind of ['image','video','audio'])tx.objectStore('media').delete(`${id}:${kind}`);
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
export async function validateMedia(file:File):Promise<SavedMedia['kind']>{
  if(file.size>30*1024*1024)throw new Error('Файл слишком большой. Максимум — 30 МБ.');
  const kind=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':null;
  if(!kind || file.type==='image/svg+xml')throw new Error('Выбери JPG, PNG, GIF, WebP, MP4, WebM, MP3 или WAV.');
  const url=URL.createObjectURL(file);
  try {
    if(kind==='image'){const im=new Image();im.src=url;await im.decode();if(im.width>8000||im.height>8000)throw new Error('Изображение слишком большое. Максимальная сторона — 8000 пикселей.');}
    else await new Promise<void>((resolve,reject)=>{
      const el=document.createElement(kind==='video'?'video':'audio');const timeout=setTimeout(()=>{clean();reject(new Error('Не удалось прочитать медиафайл.'));},8000);
      const clean=()=>{clearTimeout(timeout);el.removeAttribute('src');el.load();};
      el.onloadedmetadata=()=>{const duration=el.duration;clean();if(!Number.isFinite(duration)||duration>60)reject(new Error('Выбери фрагмент продолжительностью до 60 секунд.'));else resolve();};
      el.onerror=()=>{clean();reject(new Error('Формат файла не поддерживается браузером.'));};el.src=url;
    });
    return kind;
  }finally{URL.revokeObjectURL(url);}
}
