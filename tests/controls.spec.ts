import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
async function fake(page:Page){await page.addInitScript(()=>{class W{onmessage:((e:MessageEvent)=>void)|null=null;postMessage(m:{type:string;bitmap?:ImageBitmap}){if(m.type==='init')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})),0);m.bitmap?.close();}terminate(){}}Object.defineProperty(window,'Worker',{value:class extends W{constructor(){super();(window as any).__vision=this;}}});});}
async function feed(page:Page,smile=false){await page.evaluate(smile=>{(window as any).__vision.onmessage(new MessageEvent('message',{data:{type:'observation',observation:{time:performance.now(),aspect:4/3,hands:[],face:{mouth:{x:.5,y:.5},brow:{x:.5,y:.35},center:{x:.5,y:.4},top:.2,width:.25,jaw:0,smile:smile?.8:0,scores:{}}}}}));},smile);}
async function calibrate(page:Page){await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__vision?.onmessage))).toBe(true);for(let i=0;i<9;i++){await feed(page);await page.waitForTimeout(160);}}
test('assign expression, rehearse privately, persist and trigger after reload',async({page})=>{
 await fake(page);await page.goto('/');await calibrate(page);await page.getByRole('button',{name:'Настроить эмоции',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Мем: Улыбка',exact:true})).toHaveValue('tinkov-wow');await page.getByRole('combobox',{name:'Мем: Улыбка',exact:true}).selectOption('nichosi');
 await page.getByRole('combobox',{name:'Мем: Смех',exact:true}).selectOption('');
 for(let i=0;i<8;i++){await feed(page,true);await page.waitForTimeout(100);}
 await expect(page.getByText('Реакция сработала. Расслабь лицо перед следующей попыткой.',{exact:true})).toBeVisible();await expect(page.locator('.live-reaction')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/emotion-editor.png'});
 await page.reload();await calibrate(page);for(let i=0;i<8;i++){await feed(page,true);await page.waitForTimeout(100);}await expect(page.locator('.live-reaction img')).toHaveAttribute('src','/media/nichosi.jpg');
 await page.getByRole('button',{name:'Настроить эмоции',exact:true}).click();await expect(page.getByRole('combobox',{name:'Мем: Смех',exact:true})).toHaveValue('');await page.getByRole('button',{name:'Вернуть стандартные эмоции'}).click();await expect(page.getByRole('combobox',{name:'Мем: Улыбка',exact:true})).toHaveValue('tinkov-wow');
});
test('compact desk transmits frames without showing duplicate video; preview and pause work',async({page,context})=>{
 await page.goto('/?send=1&compact=1');await expect(page.locator('.camera-message')).toHaveCount(0,{timeout:30000});await expect(page.locator('.live-feed')).toHaveCSS('opacity','0');
 const output=await context.newPage();await output.goto('/?output=1');await expect(output.locator('img')).toHaveJSProperty('naturalWidth',1280);await expect(page.getByText('Видеопоток получает OBS',{exact:true})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/call-desk.png'});await page.getByRole('button',{name:'Показать моё видео'}).click();await expect(page.locator('.live-feed')).toHaveCSS('opacity','1');await page.getByRole('button',{name:'Скрыть моё видео · пульт'}).click();
 await page.getByRole('button',{name:'Пауза',exact:true}).click();await expect(page.getByText('Пауза · в звонке чёрный кадр',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('button',{name:'Настроить эмоции и мемы'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(output.getByRole('dialog')).toHaveCount(0);
});
test('mobile editor, local clip preview and unavailable storage remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fake(page);await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('Storage unavailable');};});await page.goto('/');await calibrate(page);await page.getByRole('button',{name:'Настроить эмоции',exact:true}).click();await expect(page.getByText('Не удалось сохранить',{exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Мем: Улыбка',exact:true}).selectOption('squirrel-goodbye');
 const card=page.locator('.expression-card').filter({has:page.getByRole('heading',{name:'Улыбка',exact:true})});await card.getByRole('button',{name:'Посмотреть мем'}).click();await expect.poll(()=>card.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);await expect(page.locator('.live-reaction')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/emotion-editor-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.getByRole('button',{name:'Закрыть настройки'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('launcher can reuse a running sender by switching it to the compact desk',async({page,request,baseURL})=>{
 await page.goto('/?send=1');await expect(page.locator('.camera-message')).toHaveCount(0,{timeout:30000});
 expect((await request.post('/__memocam/compact')).status()).toBe(403);
 expect((await request.post('/__memocam/compact',{headers:{Origin:baseURL!}})).status()).toBe(204);
 await expect(page.locator('.camera-scene')).toHaveClass(/compact-scene/);await expect(page.locator('.live-feed')).toHaveJSProperty('readyState',4);
});
