import {describe,it,expect} from 'vitest';
import {roundedBlockData} from '../src/game/rounded-block';
import {COURSE_ANCHORS,EXTERIOR_WALLS,bodyClear,newCourse,validCourseSave,advanceCourse} from '../src/core/course';
import {SURFACES,TRAINING_SOLIDS,newTraversal,stepTraversal,selectWall,type TraversalState} from '../src/core/traversal';
import {newSwing,stepSwing,handOrigin,distance,HERO_HEIGHT,HERO_RADIUS,MAX_SWING_SPEED} from '../src/core/swing';
import {climbLimbPose,ceilingClimbOffset,HERO_PRESENTATION} from '../src/core/presentation';
import {COURSE_SOLIDS,driveCourse} from './course-driver';
import type {MotionState} from '../src/core/types';
const still={moveX:0,moveY:0,run:false,jumpPressed:false,swingHeld:false,climbHeld:false,pullHeld:false,cameraForward:{x:0,y:0,z:1},aim:{origin:{x:0,y:0,z:0},direction:{x:0,y:1,z:1}}};

describe('WM005 all exterior faces and preserved body collision',()=>{
 let tested=0;
 for(const wall of EXTERIOR_WALLS)it(`full capsule attachment and local-plane travel: ${wall.id}`,()=>{
  const n=wall.normal,p={x:(wall.minX+wall.maxX)/2,y:Math.max(-18,wall.minY),z:(wall.minZ+wall.maxZ)/2};
  if(n.x)p.x=(n.x>0?wall.maxX:wall.minX)+n.x*.53;else p.z=(n.z>0?wall.maxZ:wall.minZ)+n.z*.53;
  const m:MotionState={position:p,velocity:{x:0,y:0,z:0},grounded:false,facingYaw:Math.atan2(-n.x,-n.z)};
  const selected=selectWall(m,true,[wall],COURSE_SOLIDS);
  if(!bodyClear(p,COURSE_SOLIDS)){expect(selected).toBeNull();return;} // enclosed/shared facade is not reachable
  expect(selected?.id).toBe(wall.id);tested++;
  const attach=stepTraversal(m,newTraversal(),newSwing(),[],{...still,climbHeld:true},[],COURSE_SOLIDS,[wall]);
  expect(attach.traversal.surfaceId).toBe(wall.id);expect(bodyClear(attach.motion.position,COURSE_SOLIDS)).toBe(true);
  const move=stepTraversal(attach.motion,attach.traversal,attach.swing,[],{...still,climbHeld:true,moveX:1,moveY:1},[],COURSE_SOLIDS,[wall]);
  expect(distance(attach.motion.position,move.motion.position)).toBeLessThanOrEqual(3.4/60+.0001);
  expect(bodyClear(move.motion.position,COURSE_SOLIDS)).toBe(true);
  const release=stepTraversal(move.motion,move.traversal,move.swing,[],{...still},[],COURSE_SOLIDS,[wall]);
  expect(release.traversal.surfaceId).toBeNull();expect(release.traversal.freshClimb).toBe(true);
 });
 it('covers clear faces in every direction',()=>{expect(tested).toBeGreaterThan(100);expect(new Set(EXTERIOR_WALLS.map(w=>`${w.normal.x},${w.normal.z}`)).size).toBe(4);});
 it('continuously crawls over the ceiling lip then climbs the fascia onto the platform top',()=>{
  let m:MotionState={position:{x:-6,y:7.6,z:-50},velocity:{x:0,y:0,z:0},grounded:false,facingYaw:Math.PI},t:TraversalState={...newTraversal(),surfaceId:'climb-ceiling',cameraMode:'ceiling' as const,phase:'CEILING_MOVING' as const},sw=newSwing();
  let reached=false,done=false;const surfaces=[...SURFACES,...EXTERIOR_WALLS];
  for(let i=0;i<300;i++){
    const was=m.position,wall=t.cameraMode==='wall';const r=stepTraversal(m,t,sw,[],{...still,climbHeld:true,moveY:wall?1:-1,cameraForward:{x:0,y:0,z:-1}},[],COURSE_SOLIDS,surfaces);
    m=r.motion;t=r.traversal as typeof t;sw=r.swing;reached ||= t.surfaceId==='climb-ceiling:face-0';
    expect(distance(was,m.position)).toBeLessThan(.06);expect(bodyClear(m.position,COURSE_SOLIDS)).toBe(true);
    if(reached&&m.grounded){done=true;break;}
  }expect(reached).toBe(true);expect(done).toBe(true);expect(m.position.y).toBe(11.5);
 });
 it('tops out the challenge wall outside the ceiling junction using held movement',()=>{
  let m:MotionState={position:{x:0,y:0,z:-60.5},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:Math.PI},t=newTraversal(),s=newSwing();let attached=false;
  for(let i=0;i<350;i++){const r=stepTraversal(m,t,s,[],{...still,climbHeld:true,moveY:1},[],TRAINING_SOLIDS,SURFACES);m=r.motion;t=r.traversal;s=r.swing;attached||=!!t.surfaceId;expect(bodyClear(m.position,TRAINING_SOLIDS)).toBe(true);if(attached&&m.grounded)break;}
  expect(m.grounded).toBe(true);expect(m.position.y).toBe(11);expect(m.position.z).toBeLessThan(-61.48);
 });
});

describe('WM005 genuine continuous circuit',()=>{
 it.each([[1/60],[1/30],[1/120],[.012,.033,.02,.015]])('earns two laps including final-to-first using ordinary inputs %j',(...schedule)=>{
  const r=driveCourse(schedule as number[],-1,false,2);expect(r.course).toMatchObject({next:1,completed:true,completions:2,valid:true});
  expect(r.events).toHaveLength(41);expect(COURSE_ANCHORS).toHaveLength(20);
 });
 it('keeps completed WM004 save identity and resumes next lap without fabricating completion',()=>{
  const old={version:1 as const,next:20,completed:true};expect(validCourseSave(old)).toBe(true);
  expect(newCourse(old)).toMatchObject({completed:true,next:0,completions:0});
  const current={...old,lapNext:7};expect(validCourseSave(current)).toBe(true);expect(newCourse(current).next).toBe(7);
  expect(validCourseSave({...current,lapNext:21})).toBe(false);
  const m={position:{x:0,y:0,z:-42},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};
  expect(advanceCourse({...newCourse(),next:20,active:true},m,m,newSwing(),newSwing()).completed).toBe(false);
 });
});
function orbit(pump:boolean,dt=1/60){
 let m:MotionState={position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:8},grounded:false,facingYaw:0},s=newSwing();
 const a={id:'loop',position:{x:.56,y:14.03,z:.71},eligible:true,visible:true};
 let angle=0,prior=0,max=0,reverse=false,minRadius=12;const frames:any[]=[];
 for(let n=0;n<Math.ceil(18/dt);n++){
  const r=stepSwing(m,s,{...still,moveY:pump?1:0,swingHeld:true},[a],[],dt);m=r.motion;s=r.swing;
  expect(s.web?.anchorId).toBe('loop');expect(Math.hypot(m.velocity.x,m.velocity.y,m.velocity.z)).toBeLessThanOrEqual(MAX_SWING_SPEED+.001);
  const h=handOrigin(m),at=Math.atan2(h.z-a.position.z,a.position.y-h.y);let d=at-prior;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
  expect(Math.abs(d)).toBeLessThan(10*dt);angle+=d;prior=at;max=Math.max(max,angle);reverse ||= d<-.002;minRadius=Math.min(minRadius,distance(h,a.position));
  expect(distance(h,a.position)).toBeLessThanOrEqual(12.001);
  frames.push({m:structuredClone(m),s:structuredClone(s),at,angle});
 }
 return{angle,max,reverse,minRadius,frames};
}
describe('WM005 roof attachment and physical loops',()=>{
 it('does not release a clear held web on roof contact and still prevents unsafe saving',()=>{
  let m:MotionState={position:{x:0,y:2,z:0},velocity:{x:0,y:-3,z:0},grounded:false,facingYaw:0},s=newSwing();
  const a={id:'roof-ring',position:{x:8,y:12,z:.71},eligible:true,visible:true},roof={id:'roof',minX:-10,maxX:10,minY:-18,maxY:0,minZ:-10,maxZ:10};
  for(let i=0;i<90;i++){const r=stepSwing(m,s,{...still,moveX:1,swingHeld:true},[a],[roof]);m=r.motion;s=r.swing;expect(s.web?.anchorId).toBe(a.id);}
  expect(m.grounded).toBe(true);expect(m.position.y).toBe(0);expect(s.releases).toBe(0);
  expect(stepSwing(m,s,{...still,swingHeld:false},[a],[roof]).swing.web).toBeNull();
 });
 it('naturally swings back without enough energy',()=>{const r=orbit(false);expect(r.reverse).toBe(true);expect(r.max).toBeLessThan(Math.PI/2);expect(Math.abs(r.angle)).toBeLessThan(Math.PI/2);});
 it.each([1/60,1/120,1/30])('forward pumping produces a real attached360 and predictable releases at %s',dt=>{
  const r=orbit(true,dt);expect(r.max).toBeGreaterThan(2*Math.PI);expect(r.minRadius).toBeGreaterThan(1);
  for(const phase of[0,Math.PI/2,Math.PI,-Math.PI/2]){
   const f=r.frames.find(f=>f.angle>2*Math.PI&&Math.abs(f.at-phase)<.12)!;expect(f).toBeDefined();
   const released=stepSwing(f.m,f.s,{...still},[],[],dt);expect(released.released).toBe(true);expect(released.swing.web).toBeNull();
   expect(distance(released.motion.velocity,f.m.velocity)).toBeLessThan(22*dt+.01);
  }
 });
});

describe('WM005 restrained rounding and connected face-up climbing',()=>{
 it('rounds inside unchanged box bounds with unit normals and original face UV atlas',()=>{
  const d=roundedBlockData({width:.72,height:.78,depth:.66}),p=d.positions!,n=d.normals!;
  expect(p.length/3).toBe(96);for(let i=0;i<p.length;i+=3){expect(Math.abs(p[i]!)).toBeLessThanOrEqual(.36+.00001);expect(Math.abs(p[i+1]!)).toBeLessThanOrEqual(.39+.00001);expect(Math.abs(p[i+2]!)).toBeLessThanOrEqual(.33+.00001);expect(Math.hypot(n[i]!,n[i+1]!,n[i+2]!)).toBeCloseTo(1);}
  expect(d.indices!.length).toBe(324);expect([HERO_RADIUS,HERO_HEIGHT]).toEqual([.48,3.4]);
 });
 it('uses gray costume webs and face-up pitch with alternating attached limbs',()=>{
  expect(HERO_PRESENTATION.web).toBe('#bfc5ce');expect(ceilingClimbOffset(0)).toEqual({x:0,y:0,z:0});
  expect(ceilingClimbOffset(-Math.PI/2).y).toBeCloseTo(2.2); // front +Z rotates toward +Y; local head +Y toward -Z
  const a=climbLimbPose(.25,1),b=climbLimbPose(.75,1);expect(a.arms[0]).toBeCloseTo(b.arms[1]);expect(a.hips[0]).toBeCloseTo(b.hips[1]);
  for(let phase=0;phase<1;phase+=.01){const p=climbLimbPose(phase,1);for(const i of[0,1]){
   const handZ=-.55*Math.sin(p.arms[i]!)-.53*Math.sin(p.arms[i]!+p.elbows[i]!)+.17;
   expect(handZ).toBeLessThan(.495+.7);expect(7.6+2.2+handZ).toBeLessThan(11);
  }}
 });
});
