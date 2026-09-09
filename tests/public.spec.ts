import {test,expect} from '@playwright/test';
test('public edition starts local models and offers working demo assets and settings backup',async({page})=>{
 await page.goto('/');await expect(page.locator('.camera-message')).toHaveCount(0,{timeout:30000});
 await page.getByRole('button',{name:'Моя подборка',exact:true}).click();await expect(page.locator('.set-meme').first()).toBeVisible();
 expect(await page.locator('.set-meme img').first().evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.getByText('Перенести или сохранить настройки',{exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать настройки',exact:true}).click();expect((await download).suggestedFilename()).toBe('memocam-settings.json');
 await page.getByLabel('Файл настроек Мемокам').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.getByText('Не удалось прочитать настройки. Текущий выбор сохранён.')).toBeVisible();
 await page.getByLabel('Файл настроек Мемокам').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'memocam-settings',version:1,preferences:{assignments:{},enabled:['know'],exactPairs:['know:squint']}}))});
 await expect(page.locator('.set-meme')).not.toHaveCount(1);await page.getByRole('button',{name:'Применить загруженные настройки'}).click();await expect(page.locator('.set-meme')).toHaveCount(1);await expect(page.locator('.set-meme')).toContainText('Знаю, но не могу доказать');
 await page.screenshot({path:'test-results/public-product.png'});
 await page.reload();await page.getByRole('button',{name:'Моя подборка',exact:true}).click();await expect(page.locator('.set-meme')).toHaveCount(1);
});
