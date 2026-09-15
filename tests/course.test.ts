import { describe,it,expect } from "vitest";
import { COURSE_ANCHORS, COURSE_START, COURSE_FINISH, STREET, CITY_SOLIDS, RECOVERY_WALLS, restoreSafePosition, safeStaticPosition, bodyClear, cameraClearFraction, cameraSafeRadius, advanceCourse, newCourse, validCourseSave } from "../src/core/course";
import { newSwing, HERO_HEIGHT, HERO_RADIUS } from "../src/core/swing";
import { newTraversal, newPullObjects, stepTraversal, SURFACES, safeTraversal, type TraversalInput } from "../src/core/traversal";
import { gaitPose,newGait,newLegPose,HERO_RIG } from "../src/core/presentation";
import { COURSE_SOLIDS,driveCourse } from "./course-driver";
import type { MotionState } from "../src/core/types";

const input=(extras:Partial<TraversalInput>={}):TraversalInput=>({moveX:0,moveY:0,run:false,jumpPressed:false,swingHeld:false,climbHeld:false,pullHeld:false,
  cameraForward:{x:0,y:0,z:-1},aim:{origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:-1}},...extras});
describe("WM004 actual connected course and street recovery",()=>{
  it.each([[1/60],[1/30],[1/120],[.012,.033,.02,.015]])("earns all twenty anchors and finish using real physics at %j",(...schedule)=>{
    const r=driveCourse(schedule as number[]);
    expect(r.course).toMatchObject({next:20,completed:true,valid:true,completions:1});
    expect(r.skyline).toMatchObject({stage:4,completed:true});
    expect(r.events).toHaveLength(21);
    expect(COURSE_ANCHORS).toHaveLength(20);expect(new Set(COURSE_ANCHORS.map(a=>a.id)).size).toBe(20);
  });
  it("lets an ordinary missed extension ring land on the street without a fake finish",()=>{
    const r=driveCourse([1/60],1);expect(r.motion.grounded).toBe(true);expect(r.motion.position.y).toBe(-18);
    expect(r.course.completed).toBe(false);expect(r.course.next).toBe(7);
  });
  it.each(RECOVERY_WALLS)("walks, climbs and continuously tops out $id without body penetration",wall=>{
    let m:MotionState={position:{x:(wall.minX+wall.maxX)/2,y:-18,z:wall.maxZ+2},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:Math.PI};
    let t=newTraversal(),s=newSwing(),objects=newPullObjects();let attached=false,finished=false;
    for(let n=0;n<650;n++){
      const old={...m.position};
      const r=stepTraversal(m,t,s,objects,input({moveY:1,climbHeld:true}),COURSE_ANCHORS,COURSE_SOLIDS,[...SURFACES,...RECOVERY_WALLS]);
      m=r.motion;t=r.traversal;s=r.swing;objects=r.objects;
      attached ||= !!t.surfaceId;
      expect(bodyClear(m.position,COURSE_SOLIDS)).toBe(true);
      expect(Math.hypot(m.position.x-old.x,m.position.y-old.y,m.position.z-old.z)).toBeLessThan(.21);
      if(attached&&m.grounded){finished=true;break;}
    }
    expect(finished).toBe(true);expect(m.position.y).toBe(wall.maxY);expect(m.position.z).toBeLessThan(wall.maxZ);
  });
  it("every free street region, including narrow city alleys, connects to all marked wall approaches",()=>{
    expect(CITY_SOLIDS).toHaveLength(18);expect(CITY_SOLIDS.every(b=>COURSE_SOLIDS.includes(b))).toBe(true);
    // Exact rectangular cell decomposition of capsule-inflated footprints:
    // occupancy is constant inside each cell, so narrow passages cannot be skipped.
    const obstacles=COURSE_SOLIDS.filter(b=>b.maxY>STREET.maxY&&b.minY<STREET.maxY+HERO_HEIGHT);
    const cuts=(axis:"X"|"Z")=>{
      const low=STREET[`min${axis}`]+HERO_RADIUS,high=STREET[`max${axis}`]-HERO_RADIUS;
      return [...new Set([low,high,...obstacles.flatMap(b=>[b[`min${axis}`]-HERO_RADIUS,b[`max${axis}`]+HERO_RADIUS]).filter(v=>v>low&&v<high)])].sort((a,b)=>a-b);
    };
    const xs=cuts("X"),zs=cuts("Z"),width=xs.length-1,depth=zs.length-1,free=new Set<number>();
    for(let x=0;x<width;x++)for(let z=0;z<depth;z++){
      const px=(xs[x]!+xs[x+1]!)/2,pz=(zs[z]!+zs[z+1]!)/2;
      if(!obstacles.some(b=>px>b.minX-HERO_RADIUS&&px<b.maxX+HERO_RADIUS&&pz>b.minZ-HERO_RADIUS&&pz<b.maxZ+HERO_RADIUS))free.add(x*depth+z);
    }
    const seen=new Set<number>(),queue=[...free].slice(0,1);
    for(let n=0;n<queue.length;n++){
      const k=queue[n]!;if(seen.has(k))continue;seen.add(k);const x=Math.floor(k/depth),z=k%depth;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx!,nz=z+dz!,next=nx*depth+nz;
        if(nx>=0&&nx<width&&nz>=0&&nz<depth&&free.has(next)&&!seen.has(next))queue.push(next);
      }
    }
    expect(seen.size).toBe(free.size);expect(seen.size).toBeGreaterThan(1000);
    for(const wall of RECOVERY_WALLS){
      const px=(wall.minX+wall.maxX)/2,pz=wall.maxZ+1;
      expect(bodyClear({x:px,y:STREET.maxY,z:pz},COURSE_SOLIDS)).toBe(true);
      const x=xs.findIndex((v,i)=>i<width&&px>=v&&px<=xs[i+1]!),z=zs.findIndex((v,i)=>i<depth&&pz>=v&&pz<=zs[i+1]!);
      expect(seen.has(x*depth+z),wall.id).toBe(true);
    }
  });
  it("keeps full-body top-out obstruction blocking and held-input eligibility",()=>{
    const wall=RECOVERY_WALLS[0]!,m:MotionState={position:{x:0,y:-10,z:wall.maxZ+.6},velocity:{x:0,y:0,z:0},grounded:false,facingYaw:Math.PI};
    const r=stepTraversal(m,newTraversal(),newSwing(),[],input(),[],COURSE_SOLIDS,RECOVERY_WALLS);
    expect(r.traversal.surfaceId).toBeNull();
  });
});
describe("WM004 read-only safe restoration and visual/camera invariants",()=>{
  it("preserves a safe street save and moves a newly enclosed old position to the nearest safe street edge",()=>{
    const p={x:20,y:-18,z:120};expect(restoreSafePosition(p,COURSE_SOLIDS,{x:0,y:0,z:-8})).toEqual(p);
    const old={x:0,y:-18,z:120};expect(safeStaticPosition(old,COURSE_SOLIDS)).toBe(true);
    const changed=[...COURSE_SOLIDS,{id:"new-footprint",minX:-2,maxX:2,minZ:116,maxZ:124,minY:-18,maxY:5}];
    const fixed=restoreSafePosition(old,changed,{x:0,y:0,z:-8});expect(fixed).toEqual({x:-2.48,y:-18,z:120});
    expect(old).toEqual({x:0,y:-18,z:120});expect(safeStaticPosition(fixed,changed)).toBe(true);
    expect(restoreSafePosition(old,changed,{x:0,y:0,z:-8})).toEqual(fixed);
    const m:MotionState={position:p,velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};expect(safeTraversal(m,newTraversal(),false,newPullObjects())).toBe(true);
  });
  it("preserves original capsule while overlapping torso/pelvis and joint envelopes",()=>{
    expect([HERO_RADIUS,HERO_HEIGHT]).toEqual([.48,3.4]);
    expect(HERO_RIG.pelvisTop).toBeGreaterThan(HERO_RIG.torsoBottom);
    expect(HERO_RIG.hipHeight+HERO_RIG.hipJointRadius).toBeGreaterThan(HERO_RIG.pelvisBottom);
    expect(HERO_RIG.headTop).toBeLessThanOrEqual(HERO_HEIGHT);
  });
  it("alternates legs from hips, blends to idle and never kicks while standing",()=>{
    let p=newGait();let lo=1,hi=-1,maxJump=0;
    for(let n=0;n<240;n++){const next=gaitPose(p,5,"ground",newLegPose(),1/60);maxJump=Math.max(maxJump,...next.hips.map((h,i)=>Math.abs(h-p.hips[i]!)));p=next;lo=Math.min(lo,p.hips[0]);hi=Math.max(hi,p.hips[0]);}
    expect(lo).toBeLessThan(-.25);expect(hi).toBeGreaterThan(.25);expect(maxJump).toBeLessThan(.15);
    for(let n=0;n<180;n++)p=gaitPose(p,0,"ground",newLegPose(),1/60);
    expect(Math.max(...p.hips.map(Math.abs),...p.knees.map(Math.abs))).toBeLessThan(.001);
  });
  it("shortens a ground camera before a building and leaves an open view unchanged",()=>{
    expect(cameraClearFraction({x:0,y:-15,z:30},{x:0,y:-15,z:20},COURSE_SOLIDS)).toBeCloseTo(.58);
    expect(cameraClearFraction({x:30,y:-15,z:30},{x:30,y:-15,z:20},COURSE_SOLIDS)).toBe(1);
  });
  it("keeps a close street camera outside a facade even below the old minimum radius",()=>{
    const from={x:0,y:-15,z:24.48},to={x:0,y:-15,z:13.98};
    const radius=cameraSafeRadius(from,to,10.5,COURSE_SOLIDS);
    expect(radius).toBeCloseTo(.13);expect(from.z-radius).toBeGreaterThan(24.2);
  });
  it("rejects forged progress, duplicate/fall/fixture/load shortcut finishes",()=>{
    for(const s of [{version:1,next:21,completed:false},{version:1,next:19,completed:true},{version:2,next:20,completed:true}])expect(validCourseSave(s)).toBe(false);
    const p:MotionState={position:{x:67,y:1,z:6},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};
    const r=advanceCourse(newCourse(),{...p,position:{x:0,y:0,z:0}},p,newSwing(),newSwing());expect(r.valid).toBe(false);expect(r.completed).toBe(false);
    expect(newCourse({version:1,next:20,completed:false}).next).toBe(19);
  });
  it("re-arms an automatically broken web after street recovery without awarding a ring or finish",()=>{
    const m:MotionState={position:{x:67,y:-18,z:181},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};
    const s={...newCourse({version:1,next:7,completed:false}),released:false};
    expect(advanceCourse(s,m,m,newSwing(),newSwing())).toMatchObject({next:7,released:true,completed:false});
    const finish={...m,position:{...COURSE_FINISH}};
    expect(advanceCourse({...s,next:20},finish,finish,newSwing(),newSwing())).toMatchObject({next:20,released:false,completed:false});
  });
  it("activates the course only when facing its northward start and preserves inactive saved progress",()=>{
    const m:MotionState={position:{...COURSE_START},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:Math.PI};
    expect(advanceCourse(newCourse(),m,m,newSwing(),newSwing()).active).toBe(false);
    expect(advanceCourse(newCourse(),m,{...m,facingYaw:0},newSwing(),newSwing()).active).toBe(true);
    expect(newCourse({version:1,next:7,completed:false,active:false})).toMatchObject({next:7,active:false});
    expect(validCourseSave({version:1,next:7,completed:false,active:"false"})).toBe(false);
  });
});
