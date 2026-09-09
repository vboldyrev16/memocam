import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Camera, Check, ChevronRight, CircleHelp, Expand, Hand, LoaderCircle, Maximize2, MoreHorizontal, Play, RotateCcw, ScanFace, Search, Settings2, ShieldCheck, Sparkles, Square, Video, Volume2, VolumeX, X, Upload, WandSparkles, Zap } from 'lucide-react';
import { memes, packs, inPack } from './catalog';
import type { Meme, PackId } from './catalog';
import { GestureDetector, GestureGate } from './gestures';
import type { Observation } from './gestures';
import { useCamera } from './useCamera';
import { SoundEngine, recordCanvas } from './media';
import type { RecordingResult } from './media';
import { compose } from './Compositor';
import { loadMedia, removeMedia, saveMedia, validateMedia } from './storage';
import type { SavedMedia } from './storage';

function Modal({title,children,close,wide=false}:{title:string;children:ReactNode;close:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className={`modal ${wide?'wide':''}`} onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-label={title}>
    <div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Закрыть окно" onClick={close}><X size={22}/></button></div>{children}
  </dialog>;
}
function Avatar(){return <svg className="avatar" viewBox="0 0 480 310" role="img" aria-label="Иллюстрация: человек готов стать мемом">
  <g className="avatar-float"><path d="M128 314c-2-79 37-114 114-114s116 36 112 114" fill="#c8b7e6"/>
  <path d="M169 107c5-44 36-68 76-64 46 4 72 37 68 81l-4 50c-3 37-34 67-74 63-41-3-69-32-67-72z" fill="#c6ee83"/>
  <path d="M211 122v13m61-11v13" stroke="#293023" strokeWidth="8" strokeLinecap="round"/>
  <path d="M224 166q16 22 34-2" fill="none" stroke="#293023" strokeWidth="6" strokeLinecap="round"/>
  <path d="M166 125c-25-23-53-23-49-46 5-29 31-27 45-12l19 20m143 55c25-23 59-29 57-49-2-20-23-30-39-17l-17 21" fill="#c6ee83"/>
  <path d="m115 83-9-17m23 4-5-21m231 24 13-16m-3 31 22-12" stroke="#293023" strokeWidth="5" strokeLinecap="round"/>
  </g><path d="m73 126 6 17 17 6-17 6-6 17-6-17-17-6 17-6z" fill="#a7b3e1"/><path d="m381 184 5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#b6c08a"/>
</svg>;}

const requestedPack=new URLSearchParams(window.location.search).get('pack');
const initialPack:PackId=packs.find(p=>p.id===requestedPack)?.id??'classic';
const initialMeme=initialPack==='classic'?'paws':memes.find(m=>inPack(m,initialPack))!.id;

export default function App(){
  const [pack,setPack]=useState<PackId>(initialPack);
  const [mode,setMode]=useState<'free'|'target'>('free');
  const [activeId,setActiveId]=useState(initialMeme);
  const [targetId,setTargetId]=useState(initialMeme);
  const [demo,setDemo]=useState(false);
  const [volume,setVolume]=useState(65);
  const [hold,setHold]=useState(450);
  const [dialog,setDialog]=useState<'help'|'settings'|'collection'|'recording'|null>(null);
  const [detail,setDetail]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [toast,setToast]=useState('');
  const [history,setHistory]=useState<string[]>([]);
  const [reason,setReason]=useState<'preview'|'camera'|'demo'>('preview');
  const [progress,setProgress]=useState(0);
  const [matched,setMatched]=useState<string|null>(null);
  const [faceSeen,setFaceSeen]=useState(false);
  const [calibrated,setCalibrated]=useState(false);
  const [recording,setRecording]=useState(false);
  const [finalizing,setFinalizing]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const [result,setResult]=useState<RecordingResult|null>(null);
  const [saved,setSaved]=useState<SavedMedia[]>([]);
  const [uploading,setUploading]=useState(false);
  const image=useRef<HTMLImageElement|null>(null),clip=useRef<HTMLVideoElement|null>(null),audio=useRef<HTMLAudioElement|null>(null);
  const canvas=useRef<HTMLCanvasElement|null>(null),stage=useRef<HTMLDivElement|null>(null);
  const sound=useRef(new SoundEngine()),recorder=useRef<MediaRecorder|null>(null);
  const detector=useRef(new GestureDetector()),gate=useRef(new GestureGate());
  const calibration=useRef({started:0,count:0,jaw:0,smile:0,done:false});
  const lastUI=useRef(0),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [playVersion,setPlayVersion]=useState(0);
  const previousResult=useRef<string|null>(null),mounted=useRef(true);
  const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),5500);},[]);
  const [overrides,setOverrides]=useState<Record<string,{image?:string;video?:string;audio?:string;name?:string}>>({});
  useEffect(()=>{
    const map:Record<string,{image?:string;video?:string;audio?:string;name?:string}>={};
    for(const item of saved){map[item.id]??={};map[item.id][item.kind]=URL.createObjectURL(item.file);map[item.id].name=item.name;}
    setOverrides(map);
    return()=>{for(const m of Object.values(map))for(const k of ['image','video','audio'] as const)if(m[k])URL.revokeObjectURL(m[k]!);};
  },[saved]);
  const catalog=useMemo(()=>memes.map(m=>{
    const custom=overrides[m.id];return custom?{...m,...custom,audio:custom.audio??(custom.video?undefined:m.audio),custom:true}:m;
  }),[overrides]);
  const list=catalog.filter(m=>inPack(m,pack));
  const active=catalog.find(m=>m.id===activeId)!;
  const target=catalog.find(m=>m.id===targetId)!;
  const detailMeme=catalog.find(m=>m.id===detail);
  const state=useRef({pack,mode,targetId,hold,catalog,paused:!!dialog||!!detail});state.current={pack,mode,targetId,hold,catalog,paused:!!dialog||!!detail};
  const activate=useCallback((id:string,cause:'preview'|'camera'|'demo')=>{
    setActiveId(id);setReason(cause);setPlayVersion(n=>n+1);
    if(cause!=='preview')setHistory(h=>[id,...h].slice(0,6));
  },[]);
  const observe=useCallback((observation:Observation)=>{
    const s=state.current,c=calibration.current;
    if(s.paused){gate.current.reset();detector.current.reset();return;}
    if(observation.face&&!c.done){
      c.started||=observation.time;c.count++;c.jaw+=observation.face.jaw;c.smile+=observation.face.smile;
      if(observation.time-c.started>1400&&c.count>=8){c.jaw/=c.count;c.smile/=c.count;c.done=true;setCalibrated(true);}
    }
    if(c.done&&observation.face)observation={...observation,face:{...observation.face,jaw:Math.max(0,observation.face.jaw-c.jaw),smile:Math.max(0,observation.face.smile-c.smile)}};
    const candidates=c.done?detector.current.detect(observation):[];
    const allowed=s.catalog.filter(m=>inPack(m,s.pack)&&(s.mode==='target'?m.id===s.targetId:!m.targetOnly));
    const update=gate.current.update(candidates,allowed,observation.time,s.hold);
    if(update.fired)activate(update.fired,'camera');
    if(observation.time-lastUI.current>100){lastUI.current=observation.time;setProgress(update.progress);setMatched(update.matched);setFaceSeen(!!observation.face);}
  },[activate]);
  const camera=useCamera(observe);
  const isLive=camera.status==='ready';
  const loading=camera.status==='permission'||camera.status==='loading';
  const resetRecognition=()=>{detector.current.reset();gate.current.reset();setProgress(0);setMatched(null);};
  const unlock=async()=>{await sound.current.unlock();sound.current.volume(volume/100);};
  useEffect(()=>{sound.current.volume(volume/100);},[volume]);
  useEffect(()=>{
    let cancelled=false;loadMedia().then(items=>{if(!cancelled)setSaved(items);}).catch(()=>{if(!cancelled)notify('Локальное хранилище недоступно. Основная коллекция работает.');});
    return()=>{cancelled=true;};
  },[notify]);
  useEffect(()=>{
    const soundEngine=sound.current;mounted.current=true;
    return()=>{mounted.current=false;if(toastTimer.current)clearTimeout(toastTimer.current);if(recorder.current?.state==='recording')recorder.current.stop();soundEngine.close();if(previousResult.current)URL.revokeObjectURL(previousResult.current);};
  },[]);
  useEffect(()=>{
    if(playVersion===0)return;
    const a=audio.current,v=clip.current;
    let cancelled=false;
    const play=async()=>{
      try {
        await sound.current.unlock();sound.current.volume(volume/100);
        if(cancelled)return;
        if(v&&active.video){sound.current.connect(v);v.currentTime=0;await v.play();}
        if(a&&active.audio){sound.current.connect(a);a.currentTime=0;await a.play();}
        else if(!active.video)sound.current.ping();
      }catch{if(!cancelled)notify('Не удалось воспроизвести звук или клип. Нажми «Повторить».');}
    };
    void play();
    return()=>{cancelled=true;a?.pause();v?.pause();};
    // Volume has its own live gain; changing it must not restart the clip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active.id,active.audio,active.video,playVersion,notify]);
  const composeState=useRef({active,demo,isLive,recording});composeState.current={active,demo,isLive,recording};
  useEffect(()=>{
    let frame=0;const draw=(time:number)=>{
      const s=composeState.current;
      if(canvas.current)compose(canvas.current,{camera:camera.video.current,image:image.current,clip:clip.current,meme:s.active,demo:s.demo||!s.isLive,ready:s.isLive,time,recording:s.recording});
      frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[camera.video]);
  const stopRecording=useCallback(()=>{
    if(recorder.current?.state==='recording'){setFinalizing(true);recorder.current.stop();}setRecording(false);
  },[]);
  useEffect(()=>{
    if(!recording)return;const start=performance.now();
    const interval=setInterval(()=>{const elapsed=Math.floor((performance.now()-start)/1000);setSeconds(elapsed);if(elapsed>=15)stopRecording();},200);
    return()=>clearInterval(interval);
  },[recording,stopRecording]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){gate.current.reset();detector.current.reset();setProgress(0);if(recorder.current?.state==='recording')stopRecording();}};
    document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);
  },[stopRecording]);
  useEffect(()=>{if(camera.status==='error'){stopRecording();setCalibrated(false);}},[camera.status,stopRecording]);
  const startCamera=async()=>{
    if(recording)return;setDemo(false);resetRecognition();setCalibrated(false);setFaceSeen(false);
    calibration.current={started:0,count:0,jaw:0,smile:0,done:false};
    try{await unlock();}catch{/* Camera can still work without audio. */}
    await camera.start();
  };
  const startDemo=async()=>{
    if(recording||finalizing)return;camera.stop();resetRecognition();setDemo(true);
    try{await unlock();}catch{notify('Звук недоступен в этом браузере.');}
    activate(activeId,'demo');
  };
  const choosePack=(id:PackId)=>{
    if(recording||finalizing)return;setPack(id);resetRecognition();
    const first=catalog.find(m=>inPack(m,id))!;setTargetId(first.id);setActiveId(first.id);setReason('preview');setPlayVersion(0);
  };
  const select=(m:Meme)=>{setTargetId(m.id);resetRecognition();activate(m.id,demo?'demo':'preview');if(m.targetOnly&&isLive&&mode==='free'){setMode('target');notify('Для этого мема включён режим «Повтори мем».');}};
  const beginRecording=async()=>{
    if(!canvas.current||(!isLive&&!demo))return;
    try{
      await unlock();setSeconds(0);setRecording(true);
      recorder.current=recordCanvas(canvas.current,sound.current.destination?.stream??null,r=>{
        if(!mounted.current){URL.revokeObjectURL(r.url);return;}
        if(previousResult.current)URL.revokeObjectURL(previousResult.current);previousResult.current=r.url;
        setResult(r);setFinalizing(false);setRecording(false);setDialog('recording');
      },message=>{if(mounted.current){notify(message);setFinalizing(false);setRecording(false);}});
      setPlayVersion(n=>n+1);
    }catch(e){setRecording(false);notify(e instanceof Error?e.message:'Не удалось начать запись.');}
  };
  const upload=async(file:File,id:string)=>{
    if(recording||finalizing){notify('Сначала заверши запись.');return;}
    setUploading(true);
    try{const kind=await validateMedia(file);await saveMedia({key:`${id}:${kind}`,id,kind,file,name:file.name});setSaved(await loadMedia());notify('Файл сохранён на этом устройстве. Готово!');}
    catch(e){notify(e instanceof Error?e.message:'Не удалось сохранить файл.');}finally{setUploading(false);}
  };
  const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.current?.requestFullscreen();}catch{notify('Полноэкранный режим недоступен в этом браузере.');}};
  const indicator=loading?'Подключаем…':isLive?(calibrated?'Камера включена':'Калибровка…'):demo?'Демонстрация':'Камера выключена';
  const liveHint=!faceSeen?'Посмотри в камеру — лицо должно быть видно':!calibrated?'Руки вниз. Посмотри прямо пару секунд.':matched?`Удерживай: ${catalog.find(m=>m.id===matched)?.hint.toLowerCase()}`:mode==='target'?target.hint:'Покажи любой жест из подборки';
  const filtered=catalog.filter(m=>(dialog==='collection'||inPack(m,pack))&&`${m.title} ${m.hint}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));

  return <div className="app-shell">
    <header className="header">
      <a className="brand" href="#" aria-label="Мемокам — главная"><span className="brand-icon"><ScanFace size={24} strokeWidth={2.3}/></span>мемокам<span className="beta">BETA</span></a>
      <nav aria-label="Основное меню"><button className="nav-active" onClick={()=>stage.current?.scrollIntoView({behavior:'smooth',block:'center'})}>Мем-камера</button><button onClick={()=>{setQuery('');setDialog('collection');}}>Коллекция <span>{catalog.length}</span></button><button onClick={()=>setDialog('help')}>Как это работает <ArrowUpRight size={14}/></button></nav>
      <button className="icon-button settings-top" onClick={()=>setDialog('settings')} aria-label="Настройки"><Settings2 size={20}/></button>
    </header>
    <main>
      <section className="intro">
        <div><div className="eyebrow"><span/> ЛИЦО ЗНАКОМОЕ. МЕМ — ЛЕГЕНДАРНЫЙ.</div><h1>У каждого мема<br/>есть <span className="you">ты.<svg viewBox="0 0 130 15" aria-hidden="true"><path d="M4 10Q61 1 126 7M16 14Q81 6 115 11"/></svg></span><span className="hero-star" aria-hidden="true">✳</span></h1><p>Покажи жест — поймай свой мем.<br className="mobile-break"/> Всё остальное сделает камера.</p></div>
        <div className="intro-note"><div className="note-icons"><span>✋</span><ArrowRight size={20}/><span>😎</span></div><span>Твои жесты.<br/>Наш культурный код.</span><svg viewBox="0 0 110 52" aria-hidden="true"><path d="M8 6Q72 1 81 39m-18-6 19 10 12-17"/></svg></div>
      </section>

      <section className="workspace" aria-label="Мем-камера" ref={stage}>
        <div className="workspace-top"><div className="pack-tabs" role="tablist" aria-label="Подборки">{packs.filter(p=>!p.person).map(p=><button role="tab" aria-selected={pack===p.id} key={p.id} className={pack===p.id?'selected':''} onClick={()=>choosePack(p.id)} disabled={recording||finalizing}><span>{p.emoji}</span>{p.label}{p.id==='fresh'&&<i>NEW</i>}</button>)}</div><span className="local-tag"><ShieldCheck size={14}/> Только на устройстве</span></div>
        <div className="person-packs"><span>ПАКИ ЛИЧНОСТЕЙ</span>{packs.filter(p=>p.person).map(p=><button key={p.id} aria-pressed={pack===p.id} className={pack===p.id?'selected':''} disabled={recording||finalizing} onClick={()=>choosePack(p.id)}><img src={p.cover} alt=""/><strong>{p.label}</strong><span>{catalog.filter(m=>inPack(m,p.id)).length} мемов</span><ChevronRight size={14}/></button>)}<span className="person-packs-note">Одна личность. Целая палитра реакций.</span></div>
        <div className="studio">
          <div className={`camera-pane ${isLive?'is-live':''}`}>
            <div className="pane-label"><span className={`status-dot ${isLive?'on':demo?'demo':''}`}/>{indicator}</div>
            <video ref={camera.video} autoPlay playsInline muted className={`camera-video ${isLive||camera.status==='loading'?'visible':''}`}/>
            {!isLive&&camera.status!=='loading'&&<div className="camera-placeholder"><div className="viewfinder"><i/><i/><i/><i/></div><Avatar/>
              <div className="placeholder-copy">{demo?<><h2>Ты в демо-режиме</h2><p>Выбирай карточки ниже и смотри результат.<br/>Распознавание камеры здесь выключено.</p><button className="primary small" onClick={()=>void startCamera()} disabled={recording}><Camera size={17}/> Попробовать с камерой</button></>:<><h2>{camera.status==='error'?'Камера пока недоступна':'Ну что, станем мемом?'}</h2><p>{camera.status==='error'?camera.error:'Разреши доступ к камере — и покажи свой лучший жест.'}</p><button className="primary" onClick={()=>void startCamera()} disabled={loading}>{loading?<LoaderCircle className="spin" size={18}/>:<Camera size={18}/>} {loading?'Ждём разрешение…':camera.status==='error'?'Попробовать снова':'Включить камеру'}<ArrowRight size={16}/></button><button className="text-button" onClick={()=>void startDemo()}><Play size={12}/> Посмотреть без камеры</button></>}</div>
            </div>}
            {camera.status==='loading'&&<div className="loading-overlay"><LoaderCircle className="spin" size={28}/><h2>Настраиваем наше зрение</h2><p>Модели загружаются с локального сервера.<br/>Это нужно только при запуске камеры.</p><button onClick={camera.stop} className="text-button">Отменить</button></div>}
            {isLive&&<div className="live-bottom"><span><ScanFace size={16}/>{liveHint}</span><div className="progress-track"><div style={{width:`${progress*100}%`}}/></div></div>}
            {isLive&&<button className="stop-camera" aria-label="Выключить камеру" disabled={recording} onClick={()=>{camera.stop();resetRecognition();}}><Video size={16}/><span>Выключить</span></button>}
            {loading&&camera.status==='permission'&&<button className="cancel-permission" onClick={camera.stop}>Отменить подключение</button>}
          </div>
          <div className="connector" aria-hidden="true"><Sparkles size={20}/></div>
          <div className="meme-pane" style={{background:active.accent}}>
            <div className={`meme-badge ${reason==='camera'?'detected':''}`}><Sparkles size={13}/>{reason==='camera'?'Мем пойман!':demo?'Демо • выбран вручную':'Твой будущий мем'}</div>
            <button className="icon-button expand" aria-label="Подробнее о текущем меме" onClick={()=>setDetail(active.id)}><Expand size={17}/></button>
            {active.video?<video key={active.video} ref={clip} src={active.video} poster={active.image} playsInline preload="auto" className="meme-media" onError={()=>notify('Клип не загрузился. Выбери другой файл в карточке мема.')}/>:<img ref={image} key={active.image} className={`meme-media image-${active.id}`} src={active.image} alt={active.title} onError={()=>notify('Изображение не загрузилось. Проверь локальный сервер.')}/>}
            <div className="meme-caption"><span>{active.year} <span>•</span> {active.video?'Видеомем':active.audio?'Мем со звуком':'Классная картинка'}</span><h2>{active.title}</h2><p>{active.caption}</p></div>
          </div>
        </div>
        <div className="studio-controls"><div className="mode-switch" aria-label="Режим распознавания"><button aria-pressed={mode==='free'} className={mode==='free'?'active':''} onClick={()=>{setMode('free');resetRecognition();}}><Zap size={15}/>Свободный</button><button aria-pressed={mode==='target'} className={mode==='target'?'active':''} onClick={()=>{setMode('target');setTargetId(activeId);resetRecognition();}}><Hand size={15}/>Повтори мем</button></div>
          <div className="player-controls"><button className="icon-button" title={volume?'Выключить звук':'Включить звук'} aria-label={volume?'Выключить звук':'Включить звук'} onClick={()=>{setVolume(volume?0:65);void sound.current.unlock().catch(()=>notify('Звук недоступен.'));}}>{volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="icon-button" title="Повторить мем" aria-label="Повторить мем" onClick={()=>activate(activeId,demo?'demo':'preview')}><RotateCcw size={17}/></button><button className="icon-button fullscreen" aria-label="Полный экран" onClick={()=>void fullscreen()}><Maximize2 size={17}/></button><span className="control-divider"/>
            <button className={`record-button ${recording?'recording':''}`} disabled={(!isLive&&!demo)||finalizing} onClick={()=>recording?stopRecording():void beginRecording()}>{finalizing?<LoaderCircle className="spin" size={16}/>:recording?<Square size={13} fill="currentColor"/>:<span className="record-dot"/>}{recording?`Стоп · 0:${String(seconds).padStart(2,'0')}`:finalizing?'Сохраняем…':'Записать'}{!recording&&!finalizing&&<span>15 сек</span>}</button>
          </div>
        </div>
        <div className="studio-foot"><span><span className="tiny-dot"/>{isLive?`${camera.fps} кадров/с · распознавание локально`:demo?'Демо — можно записать и сохранить':'Видео с камеры никуда не отправляется'}</span><button onClick={()=>setDialog('help')}><CircleHelp size={13}/> Подсказки</button></div>
      </section>

      <section className="collection-preview" aria-label="Мемы выбранной подборки"><div className="section-heading"><div><h2>{mode==='target'?'Выбери мем. Повтори жест.':'Твой следующий мем'} <span>{list.length}</span></h2><p>{mode==='target'?`Цель: ${target.title} — ${target.hint.toLowerCase()}`:packs.find(p=>p.id===pack)?.description}</p></div><button className="text-button browse" onClick={()=>{setQuery('');setDialog('collection');}}>Вся коллекция <ArrowUpRight size={16}/></button></div>
        <div className="meme-grid">{list.map(m=><article className={`meme-card ${active.id===m.id?'current':''}`} key={m.id}><button className="card-main" onClick={()=>select(m)} aria-label={`Выбрать мем ${m.title}`}><div className="thumbnail" style={{background:m.accent}}><img src={m.image} alt="" loading="lazy"/><span className="gesture-emoji">{m.emoji}</span>{m.audio||m.video?<span className="sound-marker"><Volume2 size={12}/></span>:null}{active.id===m.id&&<span className="selected-check"><Check size={12}/></span>}<div className="card-hover"><Play size={17} fill="currentColor"/></div></div><div className="card-text"><h3>{m.title}</h3><p>{m.hint}</p></div></button><button className="card-more" aria-label={`Инструкция: ${m.title}`} onClick={()=>setDetail(m.id)}><MoreHorizontal size={17}/></button></article>)}</div>
        {(pack==='special'||pack==='tinkov')&&<p className="registry-note">* Подборка по архиву реестра Минюста от 31.05.2024. Текущий статус персон не проверен. Жест выбирает мем, а не определяет личность.</p>}
      </section>

      {history.length>0&&<section className="history"><span>{demo?'ПОСМОТРЕЛИ':'ПОЙМАЛИ В ЭТОЙ СЕССИИ'}</span><div>{history.map((id,i)=>{const m=catalog.find(m=>m.id===id)!;return <button key={`${id}-${i}`} onClick={()=>select(m)}><img src={m.image} alt=""/>{m.title}<ArrowUpRight size={13}/></button>;})}</div>{result&&<button className="text-button" onClick={()=>setDialog('recording')}><ArrowDownToLine size={15}/>Последняя запись</button>}</section>}
      <section className="how-strip"><div><span className="step-number">01</span><div><h3>Выбери настроение</h3><p>Классика, новая волна или свои мемы.</p></div></div><ArrowRight className="step-arrow" size={19}/><div><span className="step-number">02</span><div><h3>Покажи жест</h3><p>Чуть подержи — камера поймает момент.</p></div></div><ArrowRight className="step-arrow" size={19}/><div><span className="step-number">03</span><div><h3>Забери себе</h3><p>Запиши реакцию и отправь друзьям.</p></div></div></section>
    </main>
    <footer><a className="brand small-brand" href="#">мемокам<span>✳</span></a><span>Сделано из жестов и воспоминаний.</span><button onClick={()=>setDialog('help')}><ShieldCheck size={14}/> Твоя камера. Твои данные.</button></footer>

    <audio ref={audio} src={active.audio} preload="auto"/>
    <canvas className="record-canvas" ref={canvas} width={1280} height={800} aria-hidden="true"/>
    {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Скрыть уведомление"><X size={16}/></button></div>}

    {dialog==='help'&&<Modal title="Стань мемом за минуту" close={()=>setDialog(null)}><div className="help-content"><div className="help-hero"><WandSparkles size={32}/><h3>Здесь всё начинается с тебя.</h3></div><ol><li><strong>Включи камеру.</strong> Сядь при хорошем свете. Лицо и обе кисти должны помещаться в кадре. Первые пару секунд смотри прямо с нейтральным лицом.</li><li><strong>Выбери режим.</strong> «Свободный» узнаёт жесты текущей подборки. «Повтори мем» ждёт только выбранную карточку.</li><li><strong>Удержи жест.</strong> Примерно полсекунды. Для нового срабатывания опусти руки на секунду и повтори.</li><li><strong>Запиши момент.</strong> «Записать» сохранит до 15 секунд камеры и мема со звуком. Микрофон не записывается.</li></ol><div className="notice"><ShieldCheck size={21}/><p>Камера обрабатывается на твоём устройстве. Загруженные клипы хранятся в этом браузере. Никакой отправки видео на сервер.</p></div><p className="muted">Демо выбирает мемы вручную и не проверяет распознавание. У картинок без аудио — короткий сигнал. Для настоящего фрагмента открой карточку и добавь свой клип.</p><p className="muted">Это локальный прототип. Источники доступны в карточках; разрешение на публичное распространение материалов не установлено. Даты в «Новой волне» обозначают найденную волну, а не рейтинг популярности сегодня.</p></div></Modal>}
    {dialog==='settings'&&<Modal title="Как тебе удобнее" close={()=>setDialog(null)}><div className="settings-content"><label>Громкость <strong>{volume}%</strong><input type="range" aria-label="Громкость" min={0} max={100} value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><label>Удержание жеста <strong>{(hold/1000).toFixed(2)} сек</strong><input type="range" aria-label="Удержание жеста" min={250} max={1000} step={50} value={hold} onChange={e=>{setHold(Number(e.target.value));gate.current.reset();}}/></label><p className="muted">Увеличь время, если мемы срабатывают от случайных движений. Для взмаха используется отдельное короткое окно.</p><button className="secondary" onClick={()=>{calibration.current={started:0,count:0,jaw:0,smile:0,done:false};setCalibrated(false);resetRecognition();notify('Калибровка сброшена. Посмотри прямо в камеру.');}} disabled={!isLive}><ScanFace size={17}/> Повторить калибровку</button><div className="notice"><ShieldCheck size={20}/><p>Микрофон выключен. В запись попадает только звук мема. Запись автоматически останавливается при уходе с вкладки.</p></div></div></Modal>}
    {dialog==='collection'&&<Modal title="Маленькая энциклопедия реакций" close={()=>setDialog(null)} wide><div className="search-field"><Search size={18}/><input aria-label="Найти мем" placeholder="Мем, настроение или жест…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={15}/></button>}</div><div className="collection-list">{filtered.map(m=><button key={m.id} onClick={()=>{if(recording||finalizing){notify('Сначала заверши запись.');return;}choosePack(m.pack);select(m);setDialog(null);setDetail(m.id);}}><img src={m.image} alt=""/><div><strong>{m.title}</strong><span>{m.hint} · {m.year}</span></div><ChevronRight size={18}/></button>)}</div>{!filtered.length&&<div className="empty-search"><Search size={28}/><h3>Пока такого мема нет</h3><p>Попробуй другое название или найди по жесту.</p></div>}</Modal>}
    {detailMeme&&<Modal title={detailMeme.title} close={()=>setDetail(null)}><div className="detail-preview" style={{background:detailMeme.accent}}><img src={detailMeme.image} alt={detailMeme.title}/><span>{detailMeme.emoji}</span></div><div className="detail-content"><div className="eyebrow">ТВОЙ ЖЕСТ</div><h3>{detailMeme.hint}</h3><p>{detailMeme.detail}</p>{detailMeme.targetOnly&&<p className="notice compact">Распознаётся только в режиме «Повтори мем».</p>}<button className="primary" onClick={()=>{if(recording){notify('Сначала заверши запись.');return;}setPack(inPack(detailMeme,pack)?pack:detailMeme.pack);setMode('target');select(detailMeme);setDetail(null);}}><Hand size={17}/> Повторить этот мем<ArrowRight size={16}/></button><div className="detail-links"><a href={detailMeme.source} target="_blank" rel="noreferrer"><BookOpen size={15}/> История мема<ArrowUpRight size={12}/></a><span>{detailMeme.year} · {detailMeme.custom?'Свой файл':detailMeme.video?'Видеоклип':detailMeme.audio?'Есть звук':'Без исходного звука'}</span></div><div className="upload-box"><div><Upload size={20}/><strong>Сделай мем своим</strong></div><p>Добавь картинку, видео или звук для этого жеста.<br/>До 30 МБ и 60 секунд. Останется в этом браузере.</p><label className={`secondary upload-label ${recording||uploading?'disabled':''}`}>{uploading?<LoaderCircle size={16} className="spin"/>:<Upload size={15}/>} {uploading?'Сохраняем…':'Выбрать файл'}<input type="file" aria-label="Добавить свой медиафайл" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg" disabled={uploading||recording||finalizing} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file,detailMeme.id);e.target.value='';}}/></label>{detailMeme.custom&&<button className="text-button" disabled={recording||uploading} onClick={()=>void removeMedia(detailMeme.id).then(async()=>{setSaved(await loadMedia());notify('Оригинальный мем восстановлен.');}).catch(()=>notify('Не удалось восстановить. Попробуй ещё раз.'))}><RotateCcw size={13}/> Восстановить оригинал</button>}</div></div></Modal>}
    {dialog==='recording'&&result&&<Modal title="Момент пойман. Забирай!" close={()=>setDialog(null)} wide><div className="recording-preview"><video src={result.url} controls playsInline aria-label="Просмотр готовой записи"/></div><div className="recording-actions"><div><strong>Твой маленький шедевр</strong><p>{result.extension.toUpperCase()} · {(result.size/1024/1024).toFixed(1)} МБ · хранится только здесь</p></div><a className="primary" href={result.url} download={`memocam-${Date.now()}.${result.extension}`}><ArrowDownToLine size={18}/>Скачать видео</a></div><p className="muted recording-note">Проверь звук в плеере перед отправкой. Скачай файл до закрытия страницы.</p></Modal>}
  </div>;
}
