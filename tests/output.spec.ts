import {test,expect} from '@playwright/test';
test('local relay rejects foreign writes and invalid images',async({request,baseURL})=>{
 expect((await request.post('/__memocam/frame',{data:'bad'})).status()).toBe(403);
 expect((await request.post('/__memocam/frame',{headers:{Origin:baseURL!},data:'bad'})).status()).toBe(400);
});
test('clean output carries camera and reaction, hides controls, and expires after stop',async({page,context})=>{
 await page.addInitScript(()=>{
  class MockWorker{onmessage:((e:MessageEvent)=>void)|null=null;postMessage(m:{type:string;bitmap?:ImageBitmap}){if(m.type==='init')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})),0);m.bitmap?.close();}terminate(){}}
  Object.defineProperty(window,'Worker',{value:class extends MockWorker{constructor(){super();(window as any).__vision=this;}}});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d')!;ctx.fillStyle='#183e52';ctx.fillRect(0,0,640,480);setInterval(()=>ctx.fillRect(0,0,640,480),60);return c.captureStream(15);};
 });
 await page.goto('/?send=1');await expect(page.locator('.camera-message')).toHaveCount(0);
 const feed=async(smile=false)=>page.evaluate(smile=>{(window as any).__vision.onmessage(new MessageEvent('message',{data:{type:'observation',observation:{time:performance.now(),aspect:4/3,hands:[],face:{mouth:{x:.65,y:.5},brow:{x:.65,y:.35},center:{x:.65,y:.4},top:.2,width:.25,jaw:0,smile:smile?.8:0,scores:{mouthSmileLeft:smile?.8:0,mouthSmileRight:smile?.8:0}}}}}));},smile);
 for(let i=0;i<9;i++){await feed();await page.waitForTimeout(160);}for(let i=0;i<8;i++){await feed(true);await page.waitForTimeout(100);}
 await expect(page.locator('.live-reaction img')).toBeVisible();
 const output=await context.newPage();await output.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw Error('Output must not open a camera');};});
 await output.goto('/?output=1');await expect(output.locator('img')).toHaveJSProperty('naturalWidth',1280);await expect(output.getByRole('button')).toHaveCount(0);
 const edges=await output.locator('img').evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return [[4,360],[1275,360],[640,4],[640,715]].map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data));});
 for(const pixel of edges){for(const [i,value] of [24,62,82].entries())expect(Math.abs(pixel[i]-value)).toBeLessThan(7);}
 await output.screenshot({path:'docs/screenshots/clean-output.png'});
 await page.keyboard.press('h');await expect(page.getByRole('dialog')).toBeVisible();await expect(output.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Остановить камеру'}).click();await expect(output.locator('img')).toHaveCount(0,{timeout:4000});
});
test('points are drawn over the processed frame with the same mirror transform',async({page})=>{
 await page.addInitScript(()=>{class W{onmessage:((e:MessageEvent)=>void)|null=null;postMessage(m:{type:string;bitmap?:ImageBitmap}){if(m.type==='init')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})),0);m.bitmap?.close();}terminate(){}}Object.defineProperty(window,'Worker',{value:class extends W{constructor(){super();(window as any).__vision=this;}}});});
 await page.setViewportSize({width:800,height:600});await page.goto('/');await expect(page.locator('.camera-message')).toHaveCount(0);
 await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,320,480);ctx.fillStyle='#0000ff';ctx.fillRect(320,0,320,480);const snapshot=await createImageBitmap(c);(window as any).__vision.onmessage(new MessageEvent('message',{data:{type:'observation',observation:{time:1234,hands:[],face:null,aspect:4/3,facePoints:[{x:1/3,y:.5}],snapshot}}}));});
 const overlay=page.locator('.landmark-overlay');await expect(overlay).toHaveAttribute('data-frame','1234');
 const samples=await overlay.evaluate((c:HTMLCanvasElement)=>{const ctx=c.getContext('2d')!;return[Array.from(ctx.getImageData(100,300,1,1).data),Array.from(ctx.getImageData(700,300,1,1).data),Array.from(ctx.getImageData(600,300,1,1).data)];});
 expect(samples[0]).toEqual([0,0,255,255]);expect(samples[1]).toEqual([255,0,0,255]);expect(samples[2][1]).toBeGreaterThan(100);
 await page.keyboard.press('l');await expect(overlay).toHaveAttribute('data-points','0');
});
test('curated packs and a single favourite select predictable subsets',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Жесты и настройки',exact:true}).first().click();
 await expect(page.locator('.live-meme-list input:checked')).toHaveCount(16);
 await page.getByRole('button',{name:'Для звонков · 14',exact:true}).click();await expect(page.locator('.live-meme-list input:checked')).toHaveCount(14);
 await page.getByRole('button',{name:'Вся библиотека',exact:true}).click();await expect(page.locator('.live-meme-list input:checked')).toHaveCount(48);
 await page.getByRole('button',{name:'Только Ничоси!',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.keyboard.press('h');await expect(page.locator('.live-meme-list input:checked')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/edition-2-guide.png'});
 await page.goto('/?pack=calls');await page.getByRole('button',{name:'Жесты и настройки',exact:true}).first().click();await expect(page.locator('.live-meme-list input:checked')).toHaveCount(14);
});
