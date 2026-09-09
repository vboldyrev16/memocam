import {useEffect} from 'react';
import type {RefObject} from 'react';
import type {Meme} from './catalog';
export function useOutput(video:RefObject<HTMLVideoElement|null>,current:RefObject<Meme|null>,enabled:boolean,ready:boolean,paused:boolean){
 useEffect(()=>{if(!enabled||!ready)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d')!;let busy=false,disposed=false;
 const contain=(image:CanvasImageSource,iw:number,ih:number,x:number,y:number,w:number,h:number)=>{if(!iw||!ih)return;const scale=Math.min(w/iw,h/ih);ctx.drawImage(image,x+(w-iw*scale)/2,y+(h-ih*scale)/2,iw*scale,ih*scale);};
 const tick=()=>{if(disposed||busy)return;const v=video.current;if(!v||v.readyState<2)return;ctx.fillStyle='#080808';ctx.fillRect(0,0,1280,720);if(!paused)contain(v,v.videoWidth,v.videoHeight,0,0,1280,720);
 const m=current.current;const el=document.querySelector('.live-reaction video,.live-reaction img');if(m&&!paused&&el){let iw=0,ih=0;if(el instanceof HTMLVideoElement&&el.readyState>=2){iw=el.videoWidth;ih=el.videoHeight;}if(el instanceof HTMLImageElement&&el.complete){iw=el.naturalWidth;ih=el.naturalHeight;}if(iw&&ih){const x=document.querySelector('.live-reaction.left')?24:896;contain(el as HTMLImageElement,iw,ih,x,140,360,400);ctx.font='bold 24px Arial';ctx.fillStyle='white';ctx.strokeStyle='black';ctx.lineWidth=4;ctx.textAlign='center';const words=m.title.split(' ');let line='',y=140+(400+ih*Math.min(360/iw,400/ih))/2+35;for(const word of words){if(ctx.measureText(line+' '+word).width>350&&line){ctx.strokeText(line,x+180,y);ctx.fillText(line,x+180,y);y+=29;line=word;}else line+=(line?' ':'')+word;}ctx.strokeText(line,x+180,y);ctx.fillText(line,x+180,y);}}
 busy=true;c.toBlob(blob=>{if(!blob||disposed){busy=false;return;}void fetch('/__memocam/frame',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob}).catch(()=>{}).finally(()=>{busy=false;});},'image/jpeg',.75);};tick();const timer=setInterval(tick,33);return()=>{disposed=true;clearInterval(timer);};
 },[video,current,enabled,ready,paused]);
}
