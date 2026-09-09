export class SoundEngine {
  context:AudioContext|null=null;
  destination:MediaStreamAudioDestinationNode|null=null;
  gain:GainNode|null=null;
  private sources=new WeakSet<HTMLMediaElement>();
  async unlock(){
    if(!this.context){
      this.context=new AudioContext();this.destination=this.context.createMediaStreamDestination();
      this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.gain.connect(this.destination);
    }
    await this.context.resume();
  }
  volume(value:number){if(this.gain)this.gain.gain.value=value;}
  connect(el:HTMLMediaElement){if(!this.context||!this.gain||this.sources.has(el))return;this.context.createMediaElementSource(el).connect(this.gain);this.sources.add(el);}
  ping(){
    if(!this.context||!this.gain)return;
    const osc=this.context.createOscillator(),env=this.context.createGain(),now=this.context.currentTime;
    osc.type='sine';osc.frequency.setValueAtTime(660,now);osc.frequency.exponentialRampToValueAtTime(990,now+.12);
    env.gain.setValueAtTime(.08,now);env.gain.exponentialRampToValueAtTime(.001,now+.18);
    osc.connect(env);env.connect(this.gain);osc.start(now);osc.stop(now+.2);osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
  close(){void this.context?.close();this.context=null;this.gain=null;this.destination=null;this.sources=new WeakSet();}
}

export type RecordingResult={url:string;extension:string;size:number};
export function recordCanvas(canvas:HTMLCanvasElement,audio:MediaStream|null,onDone:(r:RecordingResult)=>void,onError:(message:string)=>void){
  if(!('MediaRecorder' in window)||!canvas.captureStream)throw new Error('Запись недоступна в этом браузере. Открой приложение в Chrome.');
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/mp4','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('Браузер не поддерживает формат записи. Попробуй Chrome.');
  const stream=canvas.captureStream(30);
  for(const track of audio?.getAudioTracks()??[])stream.addTrack(track.clone());
  let recorder:MediaRecorder;
  try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000});}catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
  const chunks:Blob[]=[];let failed=false;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=()=>{failed=true;onError('Запись прервалась. Попробуй ещё раз.');stream.getTracks().forEach(t=>t.stop());};
  recorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());if(failed)return;
    const blob=new Blob(chunks,{type:recorder.mimeType});
    if(!blob.size){onError('Файл записи пуст. Попробуй ещё раз.');return;}
    onDone({url:URL.createObjectURL(blob),extension:recorder.mimeType.includes('mp4')?'mp4':'webm',size:blob.size});
  };
  recorder.start(250);
  return recorder;
}
