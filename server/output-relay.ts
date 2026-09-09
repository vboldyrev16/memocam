import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Plugin} from 'vite';
export function outputRelay():Plugin{
 let frame:Buffer|null=null,at=0,compactRequestedAt=0;const clients=new Set<ServerResponse>();
 const send=(res:ServerResponse)=>{if(!frame||res.writableLength>1024*1024)return;res.write(`--memocam\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);res.write(frame);res.write('\r\n');};
 const middleware=(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  const path=req.url?.split('?')[0];if(!path?.startsWith('/__memocam/'))return next();
  res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){res.writeHead(403).end();return;}
  if(path==='/__memocam/compact'&&req.method==='POST'){if(req.headers.origin!==`http://${host}`){res.writeHead(403).end();return;}compactRequestedAt=Date.now();res.writeHead(204).end();return;}
  if(path==='/__memocam/frame'&&req.method==='POST'){
   if(req.headers.origin!==`http://${host}`){res.writeHead(403).end();return;}
   let size=0;const chunks:Buffer[]=[];req.on('data',c=>{size+=c.length;if(size>1024*1024){res.writeHead(413).end();req.destroy();}else chunks.push(c);});req.on('end',()=>{if(res.writableEnded)return;const data=Buffer.concat(chunks);if(data.length<4||data[0]!==255||data[1]!==216){res.writeHead(400).end();return;}frame=data;at=Date.now();for(const client of clients)send(client);res.writeHead(204).end();});return;
  }
  if(path==='/__memocam/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({live:!!frame&&Date.now()-at<1800,ageMs:frame?Date.now()-at:null,viewers:clients.size,compactRequestedAt}));return;}
  if(path==='/__memocam/stream'){
   res.writeHead(200,{'Content-Type':'multipart/x-mixed-replace; boundary=memocam'});clients.add(res);if(frame&&Date.now()-at<1800)send(res);req.on('close',()=>clients.delete(res));return;
  }
  res.writeHead(404).end();
 };
 return{name:'memocam-local-output',configureServer(server){server.middlewares.use(middleware);server.httpServer?.on('close',()=>{for(const client of clients)client.end();clients.clear();frame=null;});},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
