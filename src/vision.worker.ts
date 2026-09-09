import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { Face, Point } from './gestures';
let face:FaceLandmarker|null=null;
let hands:HandLandmarker|null=null;
self.onmessage=async (event:MessageEvent)=>{
  if(event.data.type==='init'){
    try {
      const files=await FilesetResolver.forVisionTasks('/wasm',true);
      // Import a local module through a blob so Vite's development import analysis
      // does not rewrite MediaPipe's runtime loader in public/.
      const response=await fetch(files.wasmLoaderPath);
      if(!response.ok)throw new Error('Local WASM loader unavailable');
      const loaderSource=await response.text();
      const loader=URL.createObjectURL(new Blob([loaderSource],{type:'text/javascript'}));
      files.wasmLoaderPath=loader;
      hands=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/hand.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.6});
      URL.revokeObjectURL(loader);
      // Each task consumes and clears ModuleFactory; give the second task a fresh module URL.
      const faceLoader=URL.createObjectURL(new Blob([loaderSource],{type:'text/javascript'}));
      files.wasmLoaderPath=faceLoader;
      face=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.6});
      URL.revokeObjectURL(faceLoader);
      self.postMessage({type:'ready'});
    }catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
  }
  if(event.data.type==='frame'){
    const bitmap:ImageBitmap=event.data.bitmap;
    let transferred=false;
    try {
      if(!hands||!face)throw new Error('Models not ready');
      const timestamp=event.data.time;
      const hr=hands.detectForVideo(bitmap,timestamp);
      const fr=face.detectForVideo(bitmap,timestamp);
      // Convert both model outputs to the same aspect-corrected image plane.
      const aspect=bitmap.width/bitmap.height;
      const xy=(p:Point)=>({x:p.x*aspect,y:p.y});
      let faceData:Face|null=null;
      const f=fr.faceLandmarks[0];
      if(f){
        const scores=Object.fromEntries((fr.faceBlendshapes[0]?.categories??[]).map(c=>[c.categoryName,c.score]));
        const eyeX=(f[33].x+f[263].x)/2,eyeY=(f[33].y+f[263].y)/2,eyeSpan=Math.max(.01,Math.abs(f[263].x-f[33].x));
        faceData={yaw:(f[1].x-eyeX)/eyeSpan,pitch:(f[1].y-eyeY)/eyeSpan,scores,mouth:xy(f[13]),brow:xy(f[168]),center:xy(f[1]),top:f[10].y,width:Math.abs(f[454].x-f[234].x)*aspect,jaw:scores.jawOpen??0,smile:((scores.mouthSmileLeft??0)+(scores.mouthSmileRight??0))/2};
      }
      (self as unknown as {postMessage(message:unknown,transfer:Transferable[]):void}).postMessage({type:'observation',observation:{time:timestamp,hands:hr.landmarks.map(h=>h.map(xy)),face:faceData,facePoints:f?.map(xy)??[],aspect,snapshot:bitmap},aspect},[bitmap]);transferred=true;
    }catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
    finally{if(!transferred)bitmap.close();}
  }
};
