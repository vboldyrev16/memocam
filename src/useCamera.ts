import { useCallback, useEffect, useRef, useState } from 'react';
import type { Observation } from './gestures';
export type CameraStatus='off'|'permission'|'loading'|'ready'|'error';
export function useCamera(onObservation:(o:Observation)=>void,options:{background?:boolean}={}) {
  const background=options.background??false;
  const [status,setStatus]=useState<CameraStatus>('off');
  const [error,setError]=useState('');
  const [fps,setFps]=useState(0);
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([]);
  const [deviceId,setDeviceId]=useState(()=>{try{return localStorage.getItem('memocam.camera.v1')??'';}catch{return '';}});
  const preferred=useRef(deviceId);
  const refreshDevices=useCallback(async()=>{
    try{const all=await navigator.mediaDevices?.enumerateDevices();setDevices((all??[]).filter(d=>d.kind==='videoinput'&&d.deviceId));}catch{/* Permission errors are reported when starting the camera. */}
  },[]);
  useEffect(()=>{void refreshDevices();navigator.mediaDevices?.addEventListener('devicechange',refreshDevices);return()=>navigator.mediaDevices?.removeEventListener('devicechange',refreshDevices);},[refreshDevices]);
  const video=useRef<HTMLVideoElement|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const worker=useRef<Worker|null>(null);
  const frame=useRef(0), generation=useRef(0),busy=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),sampleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const snapshot=useRef<ImageBitmap|null>(null);
  const callback=useRef(onObservation);callback.current=onObservation;
  const release=useCallback(()=>{
    snapshot.current?.close();snapshot.current=null;
    generation.current++;cancelAnimationFrame(frame.current);
    if(sampleTimer.current)clearTimeout(sampleTimer.current);
    if(timer.current)clearTimeout(timer.current);
    stream.current?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream.current=null;
    worker.current?.terminate();worker.current=null;busy.current=false;
    if(video.current){video.current.pause();video.current.srcObject=null;}
    setFps(0);
  },[]);
  const stop=useCallback(()=>{release();setStatus('off');},[release]);
  const start=useCallback(async(selected?:string)=>{
    if(selected!==undefined){preferred.current=selected;setDeviceId(selected);try{localStorage.setItem('memocam.camera.v1',selected);}catch{/* Camera remains usable without storage. */}}
    release();const gen=generation.current;setError('');setStatus('permission');
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Для камеры открой приложение на localhost или по HTTPS.');
      const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},...(preferred.current?{deviceId:{exact:preferred.current}}:{facingMode:'user'})},audio:false});
      if(gen!==generation.current){s.getTracks().forEach(t=>t.stop());return;}
      stream.current=s;void refreshDevices();
      const el=video.current;if(!el)throw new Error('Не удалось открыть окно камеры.');
      el.srcObject=s;await el.play();
      if(gen!==generation.current)return;
      s.getVideoTracks()[0].onended=()=>{release();setStatus('error');setError('Камера отключилась. Подключи её и попробуй снова.');};
      setStatus('loading');
      const w=new Worker(new URL('./vision.worker.ts',import.meta.url),{type:'module'});worker.current=w;
      let lastSample=0,lastVideo=-1,count=0,windowStart=performance.now();
      const fail=(message:string)=>{if(gen!==generation.current)return;release();setStatus('error');setError(message);};
      timer.current=setTimeout(()=>fail('Модели долго не отвечают. Попробуй перезапустить камеру.'),35000);
      const loop=async(now:number)=>{
        if(gen!==generation.current)return;
        if(background)sampleTimer.current=setTimeout(()=>{void loop(performance.now());},80);else frame.current=requestAnimationFrame(loop);
        if((document.hidden&&!background)||busy.current||now-lastSample<75||el.readyState<2||el.currentTime===lastVideo)return;
        busy.current=true;lastSample=now;lastVideo=el.currentTime;
        try {
          const bitmap=await createImageBitmap(el,{resizeWidth:640,resizeHeight:Math.round(640*el.videoHeight/el.videoWidth)});
          if(gen!==generation.current){bitmap.close();return;}
          w.postMessage({type:'frame',bitmap,time:now},[bitmap]);
        }catch{busy.current=false;fail('Не удалось прочитать изображение камеры. Попробуй снова.');}
      };
      w.onmessage=(e:MessageEvent)=>{
        if(gen!==generation.current){e.data.observation?.snapshot?.close();return;}
        if(e.data.type==='ready'){
          if(timer.current)clearTimeout(timer.current);setStatus('ready');if(background)void loop(performance.now());else frame.current=requestAnimationFrame(loop);
        }
        if(e.data.type==='observation'){
          busy.current=false;const previous=snapshot.current;snapshot.current=e.data.observation.snapshot??null;callback.current(e.data.observation);previous?.close();count++;
          const now=performance.now();if(now-windowStart>1200){setFps(Math.round(count*1000/(now-windowStart)));count=0;windowStart=now;}
        }
        if(e.data.type==='error'){console.error('Vision initialization/inference:',e.data.message);fail('Распознавание не запустилось. Перезапусти камеру или открой сайт в Chrome.');}
      };
      w.onerror=()=>fail('Не удалось загрузить распознавание. Проверь локальный сервер и попробуй снова.');
      w.postMessage({type:'init'});
    }catch(e){
      if(gen!==generation.current)return;
      release();setStatus('error');
      const name=e instanceof DOMException?e.name:'';
      setError(name==='NotAllowedError'?'Доступ к камере не разрешён. Разреши его в настройках сайта рядом с адресом и попробуй снова.':name==='OverconstrainedError'?'Выбранная камера недоступна. Подключи её или выбери другую в списке камер.':name==='NotFoundError'?'Камера не найдена. Подключи веб-камеру или открой приложение на устройстве с камерой.':name==='NotReadableError'?'Камера занята другим приложением. Освободи её и попробуй снова.':e instanceof Error?e.message:'Камера недоступна. Попробуй снова.');
    }
  },[release,background,refreshDevices]);
  useEffect(()=>()=>release(),[release]);
  return {status,error,fps,video,start,stop,devices,deviceId,refreshDevices};
}
