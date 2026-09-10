import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const state=(window as any).__cams={requests:[],streams:[],external:true};
  Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{value:async()=>[
   {kind:'videoinput',deviceId:'builtin',label:'Встроенная камера'},
   ...(state.external?[{kind:'videoinput',deviceId:'usb',label:'USB Camera'}]:[])]});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async(c:any)=>{
   state.requests.push(c);if(c.video.deviceId?.exact==='usb'&&!state.external)throw new DOMException('Missing','OverconstrainedError');
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d')!.fillRect(0,0,640,480);
   const stream=canvas.captureStream(10);state.streams.push(stream);return stream;
  }});
  Object.defineProperty(window,'Worker',{value:class{onmessage:any;postMessage(m:any){if(m.type==='init')setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),0);m.bitmap?.close();}terminate(){}}});
 });
});
test('switch camera, release old stream, preserve choice and recover after unplug',async({page})=>{
 await page.goto('/?compact=1');await expect(page.locator('.camera-message')).toHaveCount(0);
 const picker=page.getByRole('combobox',{name:'Камера',exact:true});await picker.selectOption('usb');
 await expect(page.locator('.camera-message')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__cams.requests.at(-1).video.deviceId.exact)).toBe('usb');
 expect(await page.evaluate(()=>(window as any).__cams.streams[0].getTracks()[0].readyState)).toBe('ended');
 await page.reload();await expect(picker).toHaveValue('usb');await expect(page.locator('.camera-message')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/camera-picker.png'});
 await page.evaluate(()=>{(window as any).__cams.external=false;const s=(window as any).__cams.streams.at(-1);s.getTracks()[0].dispatchEvent(new Event('ended'));navigator.mediaDevices.dispatchEvent(new Event('devicechange'));});
 await expect(page.getByText('Камера отключилась. Подключи её и попробуй снова.')).toBeVisible();
 await picker.selectOption('builtin');await expect(page.locator('.camera-message')).toHaveCount(0);
 await page.getByRole('button',{name:'Показать моё видео'}).click();await expect(picker).toBeVisible();await expect(picker).toHaveValue('builtin');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
test('missing saved device can be replaced without resetting meme preferences',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('memocam.camera.v1','usb');(window as any).__cams.external=false;localStorage.setItem('memocam.preferences.v1',JSON.stringify({assignments:{},exactPairs:['okak:surprise']}));});
 await page.goto('/');await expect(page.getByText('Выбранная камера недоступна. Подключи её или выбери другую в списке камер.')).toBeVisible();
 await page.getByRole('combobox',{name:'Камера',exact:true}).selectOption('builtin');await expect(page.locator('.camera-message')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('memocam.preferences.v1')!).exactPairs)).toEqual(['okak:surprise']);
});
test('preview mirror toggles video and synchronized landmarks together and persists',async({page,context})=>{
 await page.goto('/?send=1');await expect(page.locator('.camera-message')).toHaveCount(0);
 await expect(page.locator('.live-feed')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
 await page.getByRole('button',{name:'Зеркало: вкл',exact:true}).click();
 await expect(page.locator('.live-feed')).toHaveCSS('transform','none');
 await expect(page.locator('.landmark-overlay')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
 await page.reload();await expect(page.getByRole('button',{name:'Зеркало: выкл',exact:true})).toBeVisible();
 await expect(page.locator('.live-feed')).toHaveCSS('transform','none');
 const opened=context.waitForEvent('page');await page.getByRole('button',{name:'Кадр для звонка ↗'}).click();const output=await opened;
 await expect(output.locator('img')).toHaveJSProperty('naturalWidth',1280);await expect(output.locator('img')).toHaveCSS('transform','none');
 await expect(output.locator('canvas,video,button')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/mirror-controls.png'});
 await output.close();
 await page.getByRole('button',{name:'Моя подборка',exact:true}).click();
 await page.getByRole('button',{name:'Тестировать выбранные',exact:true}).click();
 await expect(page.locator('.set-test-camera video')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
 await expect(page.locator('.set-test-camera .landmark-overlay')).toHaveCSS('transform','none');
});
