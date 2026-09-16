import type {Page} from '@playwright/test';

/** Browser-frame input sequencing avoids CDP round-trip delays at roof edges.
 * The only writes are ordinary keyboard/mouse events or the simulated Gamepad
 * device. Production position, progression, camera, physics and time are read-only. */
export async function installCourseControls(page:Page,pad:boolean){
  await page.evaluate(pad=>{
    const w=window as any,held=new Set<string>(),events:any[]=[],anchors:any[]=[];
    const state=()=>w.__WM_DEBUG__.getState();let lastAnchor:string|null=null;
    const code=(k:string)=>k==='Shift'?'ShiftLeft':k==='Space'?'Space':`Key${k.toUpperCase()}`;
    const buttons:Record<string,number>={e:6,c:5,q:4,Shift:7,Space:0};
    function keys(...wanted:string[]){
      const next=new Set(wanted);
      if(pad){w.__wm003pad.pressed=[...next].flatMap(k=>buttons[k]===undefined?[]:[buttons[k]]);w.__wm003pad.axes=[Number(next.has('d'))-Number(next.has('a')),Number(next.has('s'))-Number(next.has('w')),0,0];}
      else for(const k of new Set([...held,...next]))if(held.has(k)!==next.has(k))window.dispatchEvent(new KeyboardEvent(next.has(k)?'keydown':'keyup',{code:code(k),key:k==='Space'?' ':k,bubbles:true}));
      held.clear();for(const k of next)held.add(k);events.push({at:performance.now(),keys:[...held]});
    }
    async function frame(){await new Promise(requestAnimationFrame);const s=state(),id=s.swing.web?.anchorId??null;if(id&&id!==lastAnchor)anchors.push({expected:id,at:performance.now(),state:s});lastAnchor=id;return s;}
    async function until(check:(s:any)=>boolean,label:string,timeout=20000){const started=performance.now();while(!check(state())){if(performance.now()-started>timeout)throw Error(`${label}: ${JSON.stringify(state())}`);await frame();}}
    async function rest(ms=500){keys();const start=performance.now();while(performance.now()-start<ms)await frame();}
    async function look(alpha:number,beta=1.65){
      keys();
      if(pad){await until(s=>{const dx=s.cameraAlpha-alpha,dy=beta-s.cameraBeta;w.__wm003pad.axes=[0,0,Math.abs(dx)<.014?0:Math.sign(dx)*(.18+Math.min(.5,Math.abs(dx)*.6)),Math.abs(dy)<.014?0:Math.sign(dy)*(.18+Math.min(.5,Math.abs(dy)*.6))];return Math.abs(dx)<.014&&Math.abs(dy)<.014;},'controller look');w.__wm003pad.axes=[0,0,0,0];}
      else{
        const s=state(),dx=(s.cameraAlpha-alpha)/.0035,dy=(beta-s.cameraBeta)/.0035,canvas=document.querySelector('#game-canvas')!;
        canvas.dispatchEvent(new MouseEvent('mousedown',{clientX:600,clientY:380,button:0,buttons:1,bubbles:true}));
        for(let n=1;n<=10;n++){document.body.dispatchEvent(new MouseEvent('mousemove',{clientX:600+dx*n/10,clientY:380+dy*n/10,buttons:1,bubbles:true}));await frame();}
        document.body.dispatchEvent(new MouseEvent('mouseup',{clientX:600+dx,clientY:380+dy,button:0,bubbles:true}));
      }
      await rest(150);
    }
    const at=(axis:'x'|'z',target:number,sign=1)=>until(s=>sign*(s.position[axis]-target)>=0,`${axis} ${target}`);
    async function jump(web=false){keys('Shift','w','Space',...(web?['e']:[]));await frame();keys('Shift','w',...(web?['e']:[]));}
    async function fly(axis:'x'|'z',target:number,id:string,sign=1){keys('Shift','w','e');await until(s=>s.swing.web?.anchorId===id,`attach ${id}`);await at(axis,target,sign);keys('Shift','w');}
    async function center(b:{x:number,z:number}){
      keys();await until(s=>{const dx=b.x-s.position.x,dz=b.z-s.position.z;if(Math.hypot(dx,dz)<.55){keys();return true;}
        const fx=-Math.cos(s.cameraAlpha),fz=-Math.sin(s.cameraAlpha),forward=dx*fx+dz*fz,side=dx*fz-dz*fx;
        keys(Math.abs(forward)>Math.abs(side)?(forward>0?'w':'s'):(side>0?'d':'a'));return false;
      },'center on landing');await rest(450);
    }
    async function legacy(){
      await look(-Math.PI/2);keys('Shift','w');await at('z',-39);await jump();await until(s=>s.position.y>1.25,'first jump');await fly('z',-23.5,'training-ring');
      await until(s=>s.grounded,'south landing');await at('z',21);await jump(true);await fly('z',37,'ring-1');await until(s=>s.grounded&&s.position.z>38.6&&s.position.z<57.4&&Math.abs(s.position.y)<.03,'legacy1');
      await at('z',53);await jump(true);await fly('z',76.5,'ring-2');await until(s=>s.grounded&&s.position.z>77.6&&s.position.z<100.4&&Math.abs(s.position.y-2)<.03,'legacy2');
      await at('z',95);await jump(true);await fly('z',122,'ring-3');await at('z',123.2);await fly('z',152,'ring-4');await until(s=>s.grounded&&s.position.z>153.6&&s.position.z<178.4&&Math.abs(s.position.y)<.03,'legacy3');
      await at('z',165.5);await rest(650);await look(Math.PI);keys('Shift','w');await at('x',5);await jump(true);await fly('x',20,'ring-5');
      await until(s=>s.grounded&&s.position.x>25.6&&s.position.x<44.4&&Math.abs(s.position.y-1)<.03,'legacy4');await at('x',34.5);await rest(650);return state();
    }
    async function extension(a:{x:number,z:number},b:{x:number,y:number,z:number},n:number){
      await center(a);const length=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
      const along=(s:any)=>(s.position.x-a.x)*dx+(s.position.z-a.z)*dz;
      await look(Math.atan2(-dz,-dx));keys('Shift','w');await until(s=>along(s)>=5,'takeoff');await jump();
      await until(s=>s.position.y>2.25,`extension ${n} jump`);keys('Shift','w','e');
      await until(s=>s.swing.web?.anchorId===`ring-${n+6}`,`ring-${n+6}`);
      await until(s=>along(s)>=Math.max(18,length-14),'release');keys('Shift','s');
      await until(s=>s.grounded,`extension ${n} landing`);await rest(900);
      if(Math.abs(state().position.y-b.y)>.02)throw Error(`extension ${n} missed landing: ${JSON.stringify(state())}`);
      await center(b);return state();
    }
    async function closeLap(){
      await look(-Math.PI/2);keys('Shift','w');await at('z',-39);await jump();await until(s=>s.position.y>1.25,'first jump');
      await fly('z',-23.5,'training-ring');keys();return state();
    }
    async function loopSetup(){
      await look(-Math.PI/2);keys('Shift','w');await at('z',21);await jump(true);await fly('z',37,'ring-1');
      await until(s=>s.grounded&&s.position.z>38.6&&s.position.z<57.4,'roof1');
      await at('z',53);await jump(true);await fly('z',76.5,'ring-2');
      await until(s=>s.grounded&&s.position.z>77.6&&Math.abs(s.position.y-2)<.03,'roof2');
      await at('z',95);await jump(true);await until(s=>s.swing.web?.anchorId==='ring-3','loop ring');keys('e');return state();
    }
    async function missFirst(){
      await center({x:35,z:166});await look(Math.PI);keys('Shift','w');await at('x',40);await jump();await at('x',48);keys();
      await until(s=>s.grounded&&s.position.y===-18,'ordinary missed ring street landing');await rest(500);return state();
    }
    async function approachRecovery(){
      await look(-Math.PI/2,1.1);keys('w');await at('z',181);await rest();await look(0,1.1);keys('w');await at('x',35,-1);await rest();
      await look(Math.PI/2,1.1);keys('w','c');await until(s=>s.traversal.surfaceId==='roof-4','recovery wall');await until(s=>s.position.y>-9,'recovery midway');keys('c');return state();
    }
    async function finishRecovery(){keys('w','c');await until(s=>s.grounded&&s.position.y===1,'recovery continuous topout');await rest(600);await center({x:35,z:166});return state();}
    w.__wm005Controls={state,keys,frame,until,rest,look,at,center,legacy,extension,missFirst,approachRecovery,finishRecovery,events,anchors,jump,fly,closeLap,loopSetup};
  },pad);
}

