import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OutputViewer from './OutputViewer';
import App from './App';
import CameraScene from './CameraScene';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode>{new URLSearchParams(location.search).has('output')?<OutputViewer/>:new URLSearchParams(location.search).has('studio')?<App/>:<CameraScene/>}</StrictMode>);
