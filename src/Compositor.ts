import type { Meme } from './catalog';
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function contain(ctx:CanvasRenderingContext2D,source:CanvasImageSource,x:number,y:number,w:number,h:number,iw:number,ih:number){
  if(!iw||!ih)return;const s=Math.min(w/iw,h/ih);ctx.drawImage(source,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s);
}
export function paintAvatar(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,time:number){
  round(ctx,x,y,w,h,20,'#e7eade');
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,20);ctx.clip();ctx.translate(x+w/2,y+h/2+12);const bob=Math.sin(time/900)*4;
  ctx.translate(0,bob);ctx.fillStyle='#c1b2e3';ctx.beginPath();ctx.ellipse(0,h*.37,w*.30,h*.35,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c1ef70';ctx.beginPath();ctx.ellipse(0,-h*.03,w*.17,h*.24,-.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#282d24';for(const dx of [-w*.058,w*.058]){ctx.beginPath();ctx.ellipse(dx,-h*.048,5,9,0,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#282d24';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,h*.005,w*.047,0,Math.PI);ctx.stroke();ctx.restore();
}
export function compose(canvas:HTMLCanvasElement,state:{camera:HTMLVideoElement|null;image:HTMLImageElement|null;clip:HTMLVideoElement|null;meme:Meme;demo:boolean;ready:boolean;time:number;recording:boolean}){
  const c=canvas.getContext('2d');if(!c)return;
  c.fillStyle='#f6f5ef';c.fillRect(0,0,1280,800);
  c.fillStyle='#24291f';c.font='800 36px Arial';c.fillText('мемокам',38,58);
  c.font='16px Arial';c.fillStyle='#6a7065';c.fillText('У каждого мема есть ты.',890,52);
  round(c,30,86,604,508,24,'#e5e7df');round(c,648,86,604,508,24,state.meme.accent);
  if(state.ready&&state.camera&&state.camera.readyState>=2){
    c.save();c.beginPath();c.roundRect(30,86,604,508,24);c.clip();c.translate(664,0);c.scale(-1,1);
    contain(c,state.camera,30,86,604,508,state.camera.videoWidth,state.camera.videoHeight);c.restore();
  }else paintAvatar(c,30,86,604,508,state.time);
  c.save();c.beginPath();c.roundRect(648,86,604,508,24);c.clip();
  if(state.clip&&state.clip.readyState>=2)contain(c,state.clip,648,86,604,508,state.clip.videoWidth,state.clip.videoHeight);
  else if(state.image?.complete&&state.image.naturalWidth)contain(c,state.image,670,108,560,464,state.image.naturalWidth,state.image.naturalHeight);
  c.restore();
  round(c,48,103,188,33,16,'#ffffff');c.fillStyle='#2a3024';c.font='bold 13px Arial';c.fillText(state.demo?'ДЕМО • БЕЗ КАМЕРЫ':'ТВОЯ КАМЕРА',61,125);
  round(c,668,103,136,33,16,'#c3ef65');c.fillStyle='#253017';c.fillText('ТВОЙ МЕМ',684,125);
  c.fillStyle='#262c22';c.font='bold 35px Arial';
  let title=state.meme.title;while(c.measureText(title).width>1180) {c.font=`bold ${parseInt(c.font.split(' ')[1])-1}px Arial`;if(parseInt(c.font.split(' ')[1])<19)break;}
  c.fillText(title,40,653);c.fillStyle='#6a7065';c.font='22px Arial';c.fillText(state.meme.caption,40,692);
  c.fillStyle='#4f5947';c.font='16px Arial';c.fillText(state.demo?'Предпросмотр • мем выбран вручную':'Покажи жест. Поймай момент.',40,760);
  c.fillText('мемокам / '+state.meme.year,1060,760);
}
