import {useState} from 'react';
import type {Meme,GestureId} from './catalog';
import {expressionBindings} from './expressions';
import type {ExpressionAssignments} from './preferences';
import './controls.css';
const icons:Record<string,string>={squint:'🧐',skeptic:'🤨',smile:'🙂',surprise:'😮',frown:'😠',wink:'😉',kiss:'😗',disgust:'😖',sad:'🥺',laugh:'😂'};
export function ExpressionEditor({memes,assignments,enabled,onAssign,onReset,gesture,progress,calibrated,saved,hold,onHold,exactPairs=null}:{memes:Meme[];assignments:ExpressionAssignments;enabled:string[];onAssign:(gesture:GestureId,id:string|null)=>void;onReset:()=>void;gesture:GestureId|null;progress:number;calibrated:boolean;saved:boolean;hold:number;onHold:(value:number)=>void;exactPairs?:string[]|null}){
 const [preview,setPreview]=useState<string|null>(null);
 return <section className="expression-editor" aria-label="Назначение эмоций">
  <div className="editor-intro"><div><h3>Твоё выражение → твой мем</h3><p>Выбери реакцию, убери руки из кадра и повтори выражение. Здесь можно тренироваться: мемы в звонок не отправляются.</p></div><span className={saved?'save-badge':'save-badge save-error'}>{saved?'Сохранено на этом устройстве':'Не удалось сохранить'}</span></div>
  <div className="expression-check" role="status"><span className="check-light"/><div><strong>{!calibrated?'Калибровка: расслабь лицо на две секунды':gesture?`Вижу: ${expressionBindings.find(b=>b.gesture===gesture)?.label??'жест'}`:'Готово к примерке'}</strong><small>{!calibrated?'Рот закрыт, руки опущены':progress>=1?'Реакция сработала. Расслабь лицо перед следующей попыткой.':'Удерживай выражение, пока полоса не заполнится.'}</small></div><progress aria-label="Удержание выражения" max={1} value={progress}/></div>
  <div className="expression-grid">{expressionBindings.map(b=>{const id=Object.hasOwn(assignments,b.gesture)?assignments[b.gesture]:b.ids[0];const m=memes.find(m=>m.id===id);const active=gesture===b.gesture;return <article className={`expression-card${active?' detecting':''}`} key={b.gesture}>
   <div className="expression-card-title"><span aria-hidden="true">{icons[b.gesture]}</span><div><h4>{b.label}</h4><p>{b.hint}</p></div></div>
   <div className="assigned-meme">{m?<img src={m.image} alt=""/>:<div className="no-assignment">—</div>}<div><label htmlFor={`assign-${b.gesture}`}>Какой мем показывать</label><select id={`assign-${b.gesture}`} aria-label={`Мем: ${b.label}`} value={id??''} onChange={e=>onAssign(b.gesture,e.target.value||null)}><option value="">Не реагировать</option>{memes.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></div></div>
   <div className="expression-card-bottom"><span>{!m?'Выключено':enabled.includes(m.id)&&(exactPairs===null||exactPairs.includes(`${m.id}:${b.gesture}`))?active?'Распознаётся сейчас':'Включено':'Действие выключено в наборе'}</span>{m&&<button type="button" aria-expanded={preview===b.gesture} onClick={()=>setPreview(preview===b.gesture?null:b.gesture)}>{preview===b.gesture?'Скрыть':'Посмотреть мем'}</button>}</div>
   {m&&preview===b.gesture&&<div className="local-meme-preview">{m.video?<video src={m.video} poster={m.image} controls autoPlay muted playsInline/>:<img src={m.image} alt={m.title}/>}<p>{m.title} · предпросмотр только для тебя</p></div>}
  </article>;})}</div>
  <div className="editor-timing"><label>Защита от случайных реакций<select aria-label="Защита от случайных реакций" value={hold<=450?'450':String(hold)} onChange={e=>onHold(Number(e.target.value))}><option value="450">Обычная · 0,45 с</option>{hold>450&&hold!==650&&hold!==800&&<option value={hold}>Своя · {hold/1000} с</option>}<option value="650">Сильнее · 0,65 с</option><option value="800">Максимальная · 0,8 с</option></select></label><button onClick={onReset}>Вернуть стандартные эмоции</button></div>
 </section>;
}
