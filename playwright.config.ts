import { defineConfig } from '@playwright/test';
const port=Number(process.env.MEMOCAM_TEST_PORT??5190);
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'./tests',timeout:45000,workers:1,use:{baseURL,headless:true,launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}},webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:baseURL,reuseExistingServer:true}});
