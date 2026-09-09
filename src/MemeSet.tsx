import {migrateRouteKey} from './routeMigration';
import {FavoriteControls} from './FavoriteControls';
import {FaceChecks} from './FaceChecks';
import type {expressionChecks} from './expressions';
import type {FavoriteSet} from './preferences';
import {useEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import type {Meme,GestureId} from './catalog';
import {recognitionRoutes} from './expressions';
import type {ExpressionAssignments} from './preferences';
import {guideMarkdown,routeHint,routeKey,toggleRoute} from './memeGuide';
import {LandmarkOverlay} from './LandmarkOverlay';
import type {LatestObservation} from './LandmarkOverlay';
import './set.css';
export type Trial={title:string;gesture:GestureId;time:number};
export function MemeSet({selectedOnly=false,onBrowse,favorite,onSaveFavorite,onLoadFavorite,faceChecks,handsClear,memes,assignments,keys,onChange,onPreset,latest,stream,tracking,progress,trials,peekState,saved,calibrated,onRecalibrate}:{selectedOnly?:boolean;onBrowse:()=>void;favorite:FavoriteSet|undefined;onSaveFavorite:()=>void;onLoadFavorite:()=>void;faceChecks:ReturnType<typeof expressionChecks>;handsClear:boolean;memes:Meme[];assignments:ExpressionAssignments;keys:string[];onChange:(keys:string[])=>void;onPreset:()=>void;latest:RefObject<LatestObservation>;stream:MediaStream|null;tracking:string;progress:number;trials:Trial[];peekState:{face:boolean;hand:boolean;mouth:boolean;fingers:boolean;cheek:boolean};saved:boolean;calibrated:boolean;onRecalibrate:()=>void}){
 const [query,setQuery]=useState(''),[only,setOnly]=useState(false),[testing,setTesting]=useState(false);
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{if(video.current){video.current.srcObject=stream;void video.current.play().catch(()=>{});}},[stream,testing]);
 const routes=memes.flatMap(m=>recognitionRoutes(m,assignments));
 const validKeys=keys.map(migrateRouteKey).filter(k=>routes.some(m=>routeKey(m)===k));
 const exportList=()=>{const url=URL.createObjectURL(new Blob([guideMarkdown(memes,assignments,validKeys)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='memocam-my-memes.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const visible=memes.filter(m=>(!(only||selectedOnly)||recognitionRoutes(m,assignments).some(r=>validKeys.includes(routeKey(r))))&&`${m.title} ${m.hint} ${recognitionRoutes(m,assignments).map(routeHint).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="meme-set" aria-label="Точный набор реакций">
  <p>{selectedOnly?'Здесь только отмеченные тобой мемы и включённые действия. Снятие галочки убирает мем из этой вкладки.':'Выбирай конкретные действия. Для одного действия — один мем: новый выбор заменит прежний. Альтернативные действия у той же картинки включаются отдельно.'}</p>
  <span className={saved?'save-badge':'save-badge save-error'}>{saved?'Выбор сохраняется на этом устройстве':'Не удалось сохранить: выбор действует только до закрытия страницы'}</span>
  {selectedOnly?<details><summary>Ранее сохранённый набор</summary><FavoriteControls favorite={favorite} onSave={onSaveFavorite} onLoad={onLoadFavorite}/></details>:<FavoriteControls favorite={favorite} onSave={onSaveFavorite} onLoad={onLoadFavorite}/>}
  <div className="set-toolbar">{selectedOnly&&<button onClick={onBrowse}>Добавить из полного списка</button>}<strong>{validKeys.length} действий включено</strong><button onClick={()=>onChange([])}>Снять все действия</button>{!selectedOnly&&<button onClick={onPreset}>Окак + Тиньков</button>}<button onClick={exportList}>Скачать полный список</button></div>
  <div className="set-test-actions"><button className="primary" onClick={()=>{setTesting(v=>!v);}}>{testing?'Скрыть тест камеры':'Тестировать выбранные'}</button><span>При открытых настройках мемы в звонок не отправляются.</span></div>
  {testing&&<div className="set-lab"><div className="set-test-camera"><video ref={video} muted playsInline autoPlay aria-label="Камера для теста набора"/><LandmarkOverlay latest={latest} enabled={true}/></div><div className="set-test-result"><strong>{!stream?'Камера выключена':!calibrated?'Расслабь лицо для калибровки':tracking}</strong><progress max={1} value={progress} aria-label="Удержание выбранного действия"/><button onClick={onRecalibrate}>Заново калибровать</button><p>Покажи действие, затем верни нейтральную позу. Для эмоций убери руки; для Тинькова оставь лицо видимым и кисть у щеки.</p><ol aria-label="Журнал срабатываний">{trials.length?trials.slice().reverse().map(t=><li key={t.time}>{t.title} <small>{new Date(t.time).toLocaleTimeString()}</small></li>):<li>Пока ни одно выбранное действие не сработало.</li>}</ol></div></div>}
  {testing&&<FaceChecks checks={faceChecks} keys={validKeys} handsClear={handsClear}/>}
  {testing&&validKeys.includes('tinkov-tongue:peek')&&<div className="peek-checks" aria-label="Условия Тинькова"><strong>Для Тинькова нужно:</strong>{([['face','Лицо видно'],['hand','Одна кисть'],['mouth','Рот открыт'],['fingers','Видны 3 пальца'],['cheek','Кисть у щеки']] as const).map(([key,label])=><span key={key} data-pass={peekState[key]}>{peekState[key]?'✓':'○'} {label}</span>)}</div>}
  <div className="set-search"><input aria-label="Поиск в полном списке" placeholder="Найти мем или действие" value={query} onChange={e=>setQuery(e.target.value)}/>{!selectedOnly&&<label><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/> Только выбранные</label>}</div>
  <div className="set-list">{visible.map(m=>{const options=recognitionRoutes(m,assignments).filter(r=>!selectedOnly||validKeys.includes(routeKey(r)));return <article key={m.id} className="set-meme"><div className="set-meme-heading"><img src={m.image} alt=""/><div><h3>{m.title}</h3><small>{m.video?'Видео':m.image.endsWith('.gif')?'GIF':'Картинка'}{m.audio?' + звук':''}</small></div></div><div className="set-route-list">{options.map(r=><label key={r.gesture}><input type="checkbox" aria-label={`${m.title}: ${routeHint(r)}`} checked={validKeys.includes(routeKey(r))} onChange={e=>onChange(toggleRoute(validKeys,r,e.target.checked))}/><span>{routeHint(r)}</span></label>)}{!options.length&&<p>Назначь этому мему выражение во вкладке «Эмоции».</p>}</div><details><summary>Как выполнить и что может мешать</summary><p>{m.detail}</p></details></article>;})}</div>
  {!visible.length&&<p>Здесь пока нет выбранных мемов. Добавь их из полного списка.</p>}
 </section>;
}
