import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

/** Actual canvas frames, recorded only for visual review. This avoids the
 * external Playwright recorder's Windows file/teardown failure. No game state,
 * pose, physics, camera or time is assigned. Performance gates never record. */
export async function startHeroRecording(page:Page){
  return page.evaluate(()=>{
    const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const mime=['video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime)throw Error('Required bounded native visual recording is unavailable');
    const stream=canvas.captureStream(15),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:900000});
    const chunks:BlobPart[]=[],started=performance.now();let completed=false,automaticStop=false;
    let resolve!:(x:any)=>void,reject!:(e:Error)=>void;
    const done=new Promise<any>((yes,no)=>{resolve=yes;reject=no;});
    // Always terminate capture, including a failed test body. The Promise is
    // consumed below; attach a rejection observer while ordinary inputs run.
    void done.catch(()=>{});
    const stopTracks=()=>stream.getTracks().forEach(t=>t.stop());
    const deadline=setTimeout(()=>{if(!completed){stopTracks();reject(Error('Native visual recorder did not stop within25seconds'));}},25000);
    const bound=setTimeout(()=>{automaticStop=true;if(recorder.state==='recording')recorder.stop();},20000);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{completed=true;clearTimeout(deadline);clearTimeout(bound);stopTracks();reject(Error('Native visual recording failed'));};
    recorder.onstop=async()=>{
      completed=true;clearTimeout(deadline);clearTimeout(bound);stopTracks();
      try{const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());
        if(bytes.length<1000)throw Error('Native visual recording is empty');
        resolve({bytes:Array.from(bytes),mime,startedAt:started,stoppedAt:performance.now(),automaticStop,elapsedMs:performance.now()-started,chunkCount:chunks.length,canvas:[canvas.width,canvas.height],captureFpsCap:15});
      }catch(error){reject(error as Error);}
    };
    (window as any).__wm004Recording={stop:()=>{if(recorder.state==='recording')recorder.stop();return done;}};
    recorder.start(250);return{mime,canvas:[canvas.width,canvas.height],captureFpsCap:15};
  });
}
export async function saveHeroRecording(page:Page,file:string){
  const result=await page.evaluate(async()=>await (window as any).__wm004Recording.stop());
  await writeFile(file,Buffer.from(result.bytes));
  const {bytes,...metadata}=result;return{...metadata,bytes:bytes.length,file};
}
