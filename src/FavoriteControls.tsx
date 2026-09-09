import type {FavoriteSet} from './preferences';
export function FavoriteControls({favorite,onSave,onLoad}:{favorite:FavoriteSet|undefined;onSave:()=>void;onLoad:()=>void}){
 return <div className="favorite-controls"><strong>Моя подборка{favorite?` · ${favorite.exactPairs.length} действий`:''}</strong><p>Сохрани лучшие реакции, пробуй другие и возвращай свою подборку одной кнопкой. При запуске сохраняются текущие галочки. Сохранённый набор включается только этой кнопкой. После изменения галочек сохрани её заново.</p><button onClick={onSave}>Сохранить выбранные в мою подборку</button> <button disabled={!favorite} onClick={onLoad}>Включить мою подборку</button></div>;
}
