import { defineConfig } from 'vite';
import {outputRelay} from './server/output-relay.ts';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(),outputRelay()], server: { port: 5173, strictPort: true, watch:{ignored:['**/build/**']} } });
