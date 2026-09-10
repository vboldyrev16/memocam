import {authorPreset} from './authorPreset';
import {SettingsTransfer} from './SettingsBackupPanel';
import {expressionChecks} from './expressions';
import { useCallback,useEffect,useRef,useState } from 'react';
import { memes as originals,packs,inPack } from './catalog';
import type { Meme,PackId } from './catalog';
import { RealtimeRecognizer } from './realtime';
import {peekChecks} from './gestures';
import type { Observation } from './gestures';
import { useCamera } from './useCamera';
import './camera.css';
import {LandmarkOverlay} from './LandmarkOverlay';
import type {LatestObservation} from './LandmarkOverlay';
import {expressionFor,expressionBindings,isExpression} from './expressions';
import {useOutput} from './useOutput';
import {coreIds,callIds} from './legends';
import {loadMedia} from './storage';
import {ExpressionEditor} from './ExpressionEditor';
import {readPreferences,savePreferences,favoriteFrom} from './preferences';
import type {ExpressionAssignments,FavoriteSet} from './preferences';
import type {GestureId} from './catalog';
import type {Dispatch,SetStateAction} from 'react';
import {MemeSet} from './MemeSet';
import type {Trial} from './MemeSet';
import {selectedRoutes,routeKey} from './memeGuide';
const people:Record<string,string>={tinkov:'Тиньков',dud:'Дудь',monetochka:'Монеточка',oxxxymiron:'Оксимирон',morgenshtern:'Моргенштерн',shulman:'Шульман',katz:'Кац',galkin:'Галкин'};

export default function CameraScene(){
 const [preferences]=useState(readPreferences);
 const useAuthorDefaults=authorPreset.exactPairs.length>0&&preferences.enabled===undefined&&preferences.exactPairs===undefined&&!new URLSearchParams(location.search).has('pack')&&!new URLSearchParams(location.search).has('meme');
 const [assignments,setAssignments]=useState<ExpressionAssignments>(useAuthorDefaults?authorPreset.assignments:preferences.assignments);
 const [favorite,setFavorite]=useState<FavoriteSet|undefined>(()=>preferences.favorite??(preferences.enabled?favoriteFrom({assignments:preferences.assignments,exactPairs:selectedRoutes(originals.filter(m=>preferences.enabled!.includes(m.id)),preferences.assignments,null).map(routeKey)}):undefined));
 const [faceChecks,setFaceChecks]=useState(()=>expressionChecks(null));
 const [handsClear,setHandsClear]=useState(false);
 const [saved,setSaved]=useState(true);
 const [tab,setTab]=useState<'library'|'emotions'|'set'|'chosen'>('library');
 const [trials,setTrials]=useState<Trial[]>([]);
 const [peekState,setPeekState]=useState(()=>peekChecks(null,[]));
 const [mirrored,setMirrored]=useState(()=>{try{return localStorage.getItem('memocam.preview-mirror.v1')!=='off';}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem('memocam.preview-mirror.v1',mirrored?'on':'off');}catch{/* Preview works without storage. */}},[mirrored]);
 const [compact,setCompact]=useState(new URLSearchParams(location.search).has('compact'));
 const [receiving,setReceiving]=useState(false);
 const compactRequestSeen=useRef(Date.now());
 const [detected,setDetected]=useState<{gesture:GestureId|null;progress:number}>({gesture:null,progress:0});
 const [memes,setMemes]=useState(originals);
 useEffect(()=>{let cancelled=false;const urls:string[]=[];void loadMedia().then(items=>{if(cancelled)return;const updated=originals.map(m=>({...m}));for(const item of items){const m=updated.find(m=>m.id===item.id);if(!m)continue;const url=URL.createObjectURL(item.file);urls.push(url);m[item.kind]=url;if(item.kind==='image')m.video=undefined;}setMemes(updated);}).catch(()=>{});return()=>{cancelled=true;urls.forEach(url=>URL.revokeObjectURL(url));};},[]);
 const requested=new URLSearchParams(location.search).get('pack');
 const requestedMeme=new URLSearchParams(location.search).get('meme');
 const broadcast=new URLSearchParams(location.search).has('broadcast');
 const [exactPairs,setExactPairs]=useState<string[]|null>(()=>!requested&&!requestedMeme?preferences.exactPairs??(useAuthorDefaults?authorPreset.exactPairs:null):null);
 const [enabled,setEnabledState]=useState<string[]>(()=>useAuthorDefaults?[...new Set(authorPreset.exactPairs.map(k=>k.split(':')[0]))]:!requested&&!requestedMeme&&preferences.enabled?preferences.enabled:memes.filter(m=>requestedMeme?m.id===requestedMeme:requested==='all'?true:requested==='calls'?callIds.includes(m.id):requested?inPack(m,requested as PackId):(broadcast||new URLSearchParams(location.search).has('send')?callIds:coreIds).includes(m.id)).map(m=>m.id));
 const setEnabled:Dispatch<SetStateAction<string[]>>=value=>{setExactPairs(null);setEnabledState(value);};
 const [settings,setSettings]=useState(false),[help,setHelp]=useState(true),[paused,setPaused]=useState(false);
 const [reaction,setReaction]=useState<Meme|null>(null),[calibrated,setCalibrated]=useState(false);
 const [hold,setHold]=useState(preferences.hold??250),[sound,setSound]=useState(false),[side,setSide]=useState<'left'|'right'>(preferences.side??'right');
 const [sendOutput,setSendOutput]=useState(new URLSearchParams(location.search).has('send'));
 const [rotate,setRotate]=useState(preferences.rotate??false);
 const [faceHold,setFaceHold]=useState(preferences.faceHold??450);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const [points,setPoints]=useState(preferences.points??true),[tracking,setTracking]=useState('Ищем лицо…');
 const latest=useRef<LatestObservation>({value:null,at:0});
 const settingsDialog=useRef<HTMLDialogElement|null>(null);
 useEffect(()=>{if(settings)settingsDialog.current?.showModal();},[settings]);
 const recognizer=useRef(new RealtimeRecognizer()),lastMatch=useRef(0),minimumUntil=useRef(0),current=useRef<Meme|null>(null);
 const state=useRef({enabled,settings,paused,hold,memes,rotate,assignments,faceHold,exactPairs});state.current={enabled,settings,paused,hold,memes,rotate,assignments,faceHold,exactPairs};
 const observe=useCallback((o:Observation)=>{
  latest.current={value:o,at:performance.now()};
  const s=state.current;
  const base=o.face?`Лицо видно · Рук: ${o.hands.length}`:'Лицо не видно — посмотри в камеру';
  setTracking(base);
  if(s.paused){recognizer.current.reset();return;}
  const update=recognizer.current.update(o,s.memes.filter(m=>s.enabled.includes(m.id)),s.hold,s.exactPairs===null&&s.rotate,s.assignments,s.faceHold,s.exactPairs);
  setCalibrated(update.calibrated);
  if(s.settings){setFaceChecks(update.expressionChecks);setHandsClear(!!o.face&&o.hands.length===0);setPeekState(update.peek);setDetected(old=>({gesture:update.gesture,progress:old.gesture===update.gesture&&old.progress===1?1:update.progress}));if(update.fired){const fired=update.fired;setTrials(old=>[...old,{title:fired.title,gesture:fired.gesture,time:Date.now()}].slice(-8));}return;}
  const expression=expressionBindings.find(b=>b.gesture===update.gesture);
  if(expression&&o.face)setTracking(`${expression.label}${update.progress>0&&update.progress<1?' · удержи…':''}`);
  if(update.fired&&performance.now()>=minimumUntil.current){current.current=update.fired;lastMatch.current=performance.now();minimumUntil.current=lastMatch.current+Math.min(update.fired.minDisplayMs??0,10000);setReaction(update.fired);}
  else if(current.current&&update.gesture===current.current.gesture)lastMatch.current=performance.now();
 },[]);
 const camera=useCamera(observe,{background:broadcast||sendOutput});
 useOutput(camera.video,current,sendOutput,camera.status==='ready',paused);
 const clear=useCallback(()=>{current.current=null;minimumUntil.current=0;setReaction(null);recognizer.current.reset();},[]);
 const start=useCallback(()=>{recognizer.current.recalibrate();setCalibrated(false);setPaused(false);clear();void camera.start();},[camera.start,clear]);
 useEffect(()=>{const id=setTimeout(start,0);return()=>clearTimeout(id);},[start]);
 useEffect(()=>{const id=setInterval(()=>{if(current.current&&performance.now()>=minimumUntil.current&&performance.now()-lastMatch.current>1400){current.current=null;setReaction(null);}},100);return()=>clearInterval(id);},[]);
 useEffect(()=>{if(camera.status!=='ready'){clear();latest.current={value:null,at:0};}},[camera.status,clear]);
 useEffect(()=>{const timer=setTimeout(()=>setHelp(false),5500);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
  if((e.target as HTMLElement).matches('input,textarea,select'))return;
  if(e.code==='KeyH'){setSettings(v=>!v);clear();}
  if(e.code==='Escape'){setSettings(false);setHelp(false);}
  if(e.code==='Space'){e.preventDefault();setPaused(v=>!v);clear();}
  if(e.code==='KeyL')setPoints(v=>!v);
  if(e.code==='KeyM')setSound(v=>!v);
  if(e.code==='KeyF'){if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[clear]);
 useEffect(()=>{clear();setDetected({gesture:null,progress:0});setTrials([]);},[enabled,assignments,exactPairs,settings,clear]);
 useEffect(()=>{setSaved(savePreferences({assignments,favorite,enabled,...(exactPairs===null?{}:{exactPairs}),hold,faceHold,side,points,rotate}));},[assignments,favorite,enabled,exactPairs,hold,faceHold,side,points,rotate]);
 useEffect(()=>{if(!sendOutput)return;let disposed=false;const check=()=>{void fetch('/__memocam/status').then(r=>r.json()).then(s=>{if(!disposed){setReceiving(s.live&&s.viewers>0);if(s.compactRequestedAt>compactRequestSeen.current){compactRequestSeen.current=s.compactRequestedAt;setCompact(true);setSettings(false);}}}).catch(()=>{if(!disposed)setReceiving(false);});};check();const id=setInterval(check,1000);return()=>{disposed=true;clearInterval(id);};},[sendOutput]);
 const assign=(gesture:GestureId,id:string|null)=>{setAssignments(old=>({...old,[gesture]:id}));if(id)setEnabledState(old=>old.includes(id)?old:[...old,id]);setExactPairs(old=>old===null?null:[...old.filter(k=>!k.endsWith(`:${gesture}`)),...(id?[`${id}:${gesture}`]:[])]);};
 const choosePairs=(keys:string[])=>{setExactPairs(keys);setEnabledState([...new Set(keys.map(k=>k.split(':')[0]))]);};
 const openSet=()=>{setTab('set');setSettings(true);};
 const openChosen=()=>{setTab('chosen');setSettings(true);};
 const currentPairs=exactPairs??selectedRoutes(memes.filter(m=>enabled.includes(m.id)),assignments,null).map(routeKey);
 const resetAssignments=()=>{setAssignments({});setEnabledState(old=>[...new Set([...old,...expressionBindings.flatMap(b=>b.ids)])]);setExactPairs(old=>old===null?null:[...old.filter(k=>!isExpression(k.split(':')[1] as GestureId)),...expressionBindings.flatMap(b=>b.ids.map(id=>`${id}:${b.gesture}`))]);};
 const togglePack=(pack:PackId)=>{const ids=memes.filter(m=>inPack(m,pack)).map(m=>m.id);setEnabled(old=>ids.every(id=>old.includes(id))?old.filter(id=>!ids.includes(id)):[...new Set([...old,...ids])]);};
 const ready=camera.status==='ready';
 const outputPreview=sendOutput&&<button onClick={()=>window.open('/?output=1','memocam-output-preview')}>Кадр для звонка ↗</button>;
 const mirrorToggle=<button aria-pressed={mirrored} onClick={()=>setMirrored(v=>!v)}>Зеркало: {mirrored?'вкл':'выкл'}</button>;
 const cameraPicker=<div className="camera-picker"><label>Камера<select aria-label="Камера" value={camera.deviceId} onChange={e=>{recognizer.current.recalibrate();setCalibrated(false);setPaused(false);clear();void camera.start(e.target.value);}}><option value="">Системная камера</option>{camera.deviceId&&!camera.devices.some(d=>d.deviceId===camera.deviceId)&&<option value={camera.deviceId}>Выбранная камера · недоступна</option>}{camera.devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Камера ${i+1}`}</option>)}</select></label><button type="button" aria-label="Обновить список камер" onClick={()=>{void camera.refreshDevices();}}>↻</button></div>;

 const visibleMemes=memes.filter(m=>(filter==='all'||(filter==='face'?expressionFor(m,assignments).length>0:!isExpression(m.gesture)))&&`${m.title} ${m.hint} ${m.person??''} ${expressionFor(m,assignments).map(b=>b.hint+' '+b.label).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 return <main className={`camera-scene${broadcast?' broadcast-scene':''}${compact?' compact-scene':''}${!mirrored?' unmirrored-preview':''}`}  onDoubleClick={()=>{void document.documentElement.requestFullscreen().catch(()=>{});}}>
  {compact&&<section className="call-desk"><span className="call-eyebrow">Мемокам · пульт звонка</span><h1>Ты в звонке.<br/>Мемы — по настроению.</h1><p>Выбери OBS Virtual Camera в Meet или Zoom. Здесь управляй реакциями — своё видео можно смотреть только в звонке.</p><div className="call-status"><span className="check-light"/><div><strong>{!ready?'Камера подключается':paused?'Пауза · в звонке чёрный кадр':!sendOutput?'Передача выключена':receiving?'Видеопоток получает OBS':'Ожидаем приёмник OBS'}</strong><small>{calibrated?tracking:'Расслабь лицо и опусти руки для калибровки'}</small></div></div>{cameraPicker}<div className="call-actions">{outputPreview}<button onClick={openChosen}>Моя подборка</button><button onClick={openSet}>Мой набор и тест</button><button className="primary" onClick={()=>{setTab('emotions');setSettings(true);}}>Настроить эмоции и мемы</button><button onClick={()=>{setPaused(v=>!v);clear();}}>{paused?'Продолжить':'Пауза'}</button><button onClick={()=>setCompact(false)}>Показать моё видео</button><button onClick={()=>{setTab('library');setSettings(true);}}>Все жесты и мемы</button><button onClick={()=>{recognizer.current.recalibrate();setCalibrated(false);clear();}}>Калибровка</button></div><p className="call-hint">Оставь пульт открытым и переключись в звонок. Точки и настройки видны только тебе. Звук мемов в звонок не передаётся.</p></section>}
  {!compact&&sendOutput&&<button className="return-compact" onClick={()=>setCompact(true)}>Скрыть моё видео · пульт</button>}
  <video className="live-feed" ref={camera.video} autoPlay playsInline muted aria-label="Камера в реальном времени"/>
  <LandmarkOverlay latest={latest} enabled={points&&ready&&!paused&&!compact}/>
  {ready&&!settings&&<div className="tracking-status">{paused?'Распознавание на паузе':tracking}</div>}
  {reaction&&ready&&!paused&&!settings&&<aside key={reaction.id} className={`live-reaction ${side}`} aria-label={`Распознано: ${reaction.title}`}>
   {reaction.video?<video src={reaction.video} poster={reaction.image} autoPlay muted={!sound} playsInline onError={()=>{}}/>:<img src={reaction.image} alt={reaction.title}/>}
   {reaction.audio&&sound&&<audio src={reaction.audio} autoPlay/>}<div className="reaction-caption">{reaction.title}</div>
  </aside>}
  {!ready&&<div className="camera-message" role="status"><h1>{camera.status==='error'?'Камера недоступна':camera.status==='off'?'Камера выключена':'Подключаем камеру'}</h1><p>{camera.status==='error'?camera.error:camera.status==='loading'?'Готовим распознавание…':'Разреши камеру. Затем здесь останешься только ты и мемы.'}</p>{(camera.status==='error'||camera.status==='off')&&<button onClick={start}>Включить камеру</button>}<button className="subtle" onClick={()=>setSettings(true)}>Жесты и настройки</button></div>}
  {ready&&!calibrated&&!settings&&<div className="calibration-note">Посмотри прямо, расслабь лицо, закрой рот. Руки вниз. Пара секунд калибровки.</div>}
  {ready&&paused&&<div className="calibration-note">Пауза · пробел — продолжить</div>}
  {help&&ready&&calibrated&&!settings&&<div className="key-hint">H — список мемов · L — точки · F — весь экран</div>}
  <nav className="camera-tools" aria-label="Управление камерой">{!compact&&cameraPicker}{!compact&&mirrorToggle}{!compact&&outputPreview}<button aria-label="Жесты и настройки" onClick={()=>{setTab('library');setSettings(true);clear();}}>Мемы и что делать <kbd>H</kbd></button><button aria-pressed={points} onClick={()=>setPoints(v=>!v)}>Точки: {points?'вкл':'выкл'} <kbd>L</kbd></button><button onClick={()=>{setTab('emotions');setSettings(true);clear();}}>Настроить эмоции</button><button onClick={openChosen}>Моя подборка</button><button onClick={openSet}>Мой набор и тест</button></nav>
  {settings&&<dialog ref={settingsDialog} className={`live-settings${tab==='emotions'?' emotion-settings':(tab==='set'||tab==='chosen')?' set-settings':''}`} aria-label="Настройки распознавания" onCancel={()=>setSettings(false)}>
   <header><h2>{tab==='chosen'?'Моя подборка':tab==='emotions'?'Эмоции и мемы':'Мемы и что делать'}</h2><button aria-label="Закрыть настройки" onClick={()=>setSettings(false)}>×</button></header>
   <div className="settings-tabs" role="tablist" aria-label="Раздел настроек"><button role="tab" aria-selected={tab==='chosen'} onClick={openChosen}>Моя подборка</button><button role="tab" aria-selected={tab==='set'} onClick={openSet}>Мой набор и тест</button><button role="tab" aria-selected={tab==='emotions'} onClick={()=>setTab('emotions')}>Эмоции → мемы</button><button role="tab" aria-selected={tab==='library'} onClick={()=>setTab('library')}>Библиотека и жесты</button></div>
   {exactPairs!==null&&tab!=='set'&&tab!=='chosen'&&<p>Активен точный набор: {exactPairs.length} действий. Выбор другого пака заменит его. <button onClick={openSet}>Изменить точный набор</button></p>}
   {paused&&<p>Распознавание на паузе. <button onClick={()=>setPaused(false)}>Продолжить для примерки</button></p>}
   {(tab==='set'||tab==='chosen')&&<SettingsTransfer current={{assignments,favorite,enabled,...(exactPairs===null?{}:{exactPairs}),hold,faceHold,side,points,rotate}} onApply={p=>{setAssignments(p.assignments);setFavorite(p.favorite);setEnabledState(p.enabled??[]);setExactPairs(p.exactPairs??null);if(p.hold!==undefined)setHold(p.hold);if(p.faceHold!==undefined)setFaceHold(p.faceHold);if(p.side)setSide(p.side);if(p.points!==undefined)setPoints(p.points);if(p.rotate!==undefined)setRotate(p.rotate);clear();}}/>}
   {(tab==='set'||tab==='chosen')?<MemeSet authorCount={authorPreset.exactPairs.length} onAuthor={()=>{setAssignments({...authorPreset.assignments});choosePairs([...authorPreset.exactPairs]);}} selectedOnly={tab==='chosen'} onBrowse={openSet} favorite={favorite} onSaveFavorite={()=>setFavorite(favoriteFrom({assignments,exactPairs:currentPairs}))} onLoadFavorite={()=>{if(favorite){setAssignments({...favorite.assignments});choosePairs([...favorite.exactPairs]);}}} faceChecks={faceChecks} handsClear={handsClear} memes={memes} assignments={assignments} keys={currentPairs} onChange={choosePairs} onPreset={()=>{setAssignments(old=>({...old,surprise:'okak'}));choosePairs(['okak:surprise','tinkov-tongue:peek']);}} latest={latest} stream={camera.video.current?.srcObject as MediaStream|null} tracking={tracking} progress={detected.progress} trials={trials} peekState={peekState} saved={saved} calibrated={calibrated} onRecalibrate={()=>{recognizer.current.recalibrate();setCalibrated(false);setTrials([]);clear();}}/>:tab==='emotions'?<ExpressionEditor memes={memes} assignments={assignments} enabled={enabled} onAssign={assign} onReset={resetAssignments} gesture={detected.gesture} progress={detected.progress} calibrated={calibrated} saved={saved} hold={faceHold} onHold={setFaceHold} exactPairs={exactPairs}/>:<>
   <p>Повтори действие из списка: руки — {hold/1000} с, лицо — {Math.max(faceHold,hold)/1000} с. Для следующей реакции расслабь лицо и опусти руки. Пока список открыт, реакции на паузе.</p>
   <div className="live-packs edition-packs"><button onClick={()=>setEnabled(coreIds)}>Лучшие · 16</button><button onClick={()=>setEnabled(callIds)}>Для звонков · 14</button><button onClick={()=>setEnabled(memes.map(m=>m.id))}>Вся библиотека</button></div>
   <details className="advanced-camera"><summary>Настройки камеры и наборы</summary>
   <div className="setting-row"><label>Звук <input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/></label><label>Сторона <select value={side} onChange={e=>setSide(e.target.value as 'left'|'right')}><option value="right">Справа</option><option value="left">Слева</option></select></label></div>
   <label className="rotation-setting"><input type="checkbox" checked={sendOutput} onChange={e=>setSendOutput(e.target.checked)}/> Передавать чистый кадр в OBS</label>
   <label className="rotation-setting"><input type="checkbox" checked={rotate} onChange={e=>setRotate(e.target.checked)}/> Чередовать мемы с одинаковым жестом</label>
   <label className="hold-setting">Удержание: {hold} мс<input type="range" min={150} max={800} step={50} value={hold} onChange={e=>setHold(+e.target.value)}/></label>
   <div className="live-packs">{packs.map(p=><button key={p.id} aria-pressed={memes.filter(m=>inPack(m,p.id)).every(m=>enabled.includes(m.id))} onClick={()=>togglePack(p.id)}>{p.label}</button>)}</div>
   <div className="live-packs" aria-label="Наборы персонажей">{Object.entries(people).filter(([id])=>memes.some(m=>m.person===id)).map(([id,name])=>{const ids=memes.filter(m=>m.person===id).map(m=>m.id);return <button key={id} aria-pressed={ids.every(id=>enabled.includes(id))} onClick={()=>setEnabled(old=>ids.every(id=>old.includes(id))?old.filter(id=>!ids.includes(id)):[...new Set([...old,...ids])])}>{name} · {ids.length}</button>;})}</div>
   <div className="setting-row"><strong>{enabled.length} из {memes.length} мемов</strong><button onClick={()=>setEnabled(memes.map(m=>m.id))}>Все</button><button onClick={()=>setEnabled([])}>Ни одного</button></div>
   </details>
   <div className="live-packs filter-packs" aria-label="Тип действия">{[['all','Все действия'],['face','Мимика'],['hands','Жесты']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
   <input className="live-search" aria-label="Найти мем или персонажа" placeholder="Персонаж, мем или поза" value={query} onChange={e=>setQuery(e.target.value)}/>
   <div className="live-meme-list">{visibleMemes.map(m=><label key={m.id}><input type="checkbox" checked={enabled.includes(m.id)} onChange={e=>setEnabled(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id))}/><img src={m.image} alt=""/><span><strong>{m.title}</strong><small>{isExpression(m.gesture)?'Лицо':'Действие'}: {m.hint}</small>{expressionFor(m,assignments).filter(b=>b.gesture!==m.gesture).map(b=><small className="face-instruction" key={b.gesture}>Лицо: {b.hint}</small>)}</span><button className="only-meme" type="button" aria-label={`Только ${m.title}`} onClick={e=>{e.preventDefault();setEnabled([m.id]);setSettings(false);}}>Только этот</button><details><summary aria-label={`Подробнее: ${m.title}`}>?</summary><p>{m.detail}</p></details></label>)}</div>
   {visibleMemes.length===0&&<p role="status">Ничего не найдено. Попробуй другой запрос.</p>}
   </>}
   <p className="live-fineprint">Кадры обрабатываются локально. Подборка персон — по архиву реестра 31.05.2024, текущий статус не проверен. Жест выбирает сцену, а не определяет личность. В отдельных клипах есть мат.</p>
   <footer><span>{camera.fps} кадров/с</span><button onClick={()=>{recognizer.current.recalibrate();setCalibrated(false);setSettings(false);clear();}}>Калибровка</button><button onClick={()=>{camera.stop();setSettings(false);}}>Остановить камеру</button><a href="/?studio=1">Студия и свои файлы ↗</a></footer>
  </dialog>}
 </main>;
}
