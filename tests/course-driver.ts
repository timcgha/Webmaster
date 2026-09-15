import { COURSE_ANCHORS, COURSE_NODES, COURSE_ROOFS, COURSE_START, RECOVERY_WALLS, STREET, CITY_SOLIDS, advanceCourse, newCourse } from "../src/core/course";
import { ROOFS, advanceSkyline, newSkyline } from "../src/core/skyline";
import { TRAINING_SOLIDS, SURFACES, newPullObjects, newTraversal, stepTraversal, type TraversalInput } from "../src/core/traversal";
import { newSwing } from "../src/core/swing";
import type { MotionState } from "../src/core/types";

export const COURSE_SOLIDS = [...ROOFS,...TRAINING_SOLIDS,...COURSE_ROOFS,STREET,...CITY_SOLIDS];
/** Ordinary authored course start, then only inputs through the real motion state machine. */
export function driveCourse(profile: number[] = [1/60], omit = -1, recoverMiss = false) {
  let motion:MotionState={position:{...COURSE_START},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};
  let web=newSwing(),traversal=newTraversal(),objects=newPullObjects(),course=newCourse(),skyline=newSkyline();
  let forward={x:0,y:0,z:1}, elapsed=0, frame=0, accumulator=0, pendingJump=false;
  const events:unknown[]=[],recoveries:unknown[]=[];let recovered=false;
  function advance(input:Partial<TraversalInput>={}) {
    const delta=profile[frame++%profile.length]!;accumulator+=delta;elapsed+=delta;
    pendingJump ||= !!input.jumpPressed;
    while(accumulator+1e-10>=1/60) {
      const old=motion,oldWeb=web;
      const i:TraversalInput={moveX:0,moveY:0,run:true,swingHeld:false,climbHeld:false,pullHeld:false,
        cameraForward:forward,aim:{origin:{x:motion.position.x-forward.x*10,y:motion.position.y+4,z:motion.position.z-forward.z*10},
          direction:{...forward,y:0.08}},...input,jumpPressed:pendingJump};
      const r=stepTraversal(motion,traversal,web,objects,i,COURSE_ANCHORS,COURSE_SOLIDS,[...SURFACES,...RECOVERY_WALLS]);
      motion=r.motion;traversal=r.traversal;web=r.swing;objects=r.objects;
      const next=advanceCourse(course,old,motion,oldWeb,web);
      if(next.next!==course.next||next.completed!==course.completed) events.push({t:elapsed,position:{...motion.position},web:web.web?.anchorId,course:next.next,completed:next.completed});
      course=next;skyline=advanceSkyline(skyline,old,motion,oldWeb,web).route;
      pendingJump=false;accumulator-=1/60;
    }
  }
  function until(check:()=>boolean,input:Partial<TraversalInput>,label:string) {
    for(let i=0;i<3000;i++){if(check()) return;advance(input);}
    throw Error(`${label}: ${JSON.stringify({motion,web,course,skyline})}`);
  }
  function rest(seconds=.55) { const end=elapsed+seconds;while(elapsed<end)advance(); }
  function go(z:number){until(()=>motion.position.z>=z,{moveY:1},`go ${z}`);}
  function launch(){advance({moveY:1,jumpPressed:true,swingHeld:true});}
  function fly(z:number){until(()=>motion.position.z>=z,{moveY:1,swingHeld:true},`fly ${z}`);}
  rest(.1);go(-39);advance({moveY:1,jumpPressed:true});until(()=>motion.position.y>1.25,{moveY:1},"first jump");fly(-23.5);until(()=>motion.grounded,{moveY:1},"first landing");
  go(21);launch();fly(37);until(()=>skyline.stage===1,{moveY:1},"legacy 1");
  go(53);launch();fly(76.5);until(()=>skyline.stage===2,{moveY:1},"legacy 2");
  go(95);launch();fly(122);go(123.2);fly(152);until(()=>skyline.stage===3,{moveY:1},"legacy 3");
  go(165.5);rest();forward={x:1,y:0,z:0};until(()=>motion.position.x>=5,{moveY:1},"legacy turn");launch();
  until(()=>motion.position.x>=20,{moveY:1,swingHeld:true},"legacy 5");
  until(()=>skyline.stage===4,{moveY:1},"legacy finish");
  until(()=>motion.position.x>=34.5,{moveY:1},"extension entry");rest();
  for(let n=0;n<14;n++) {
    const a=COURSE_NODES[n]!,b=COURSE_NODES[n+1]!;
    const dx=Math.sign(b.x-a.x),dz=Math.sign(b.z-a.z);forward={x:dx,y:0,z:dz};
    const along=()=>dx*(motion.position.x-a.x)+dz*(motion.position.z-a.z);
    until(()=>along()>=5,{moveY:1},`takeoff ${n}`);
    advance({moveY:1,jumpPressed:true});
    until(()=>motion.position.y>2.25,{moveY:1},`jump ${n}`);
    until(()=>along()>=18,{moveY:1,swingHeld:n!==omit||recovered},`gap ${n}`);
    until(()=>motion.grounded,{moveY:-1},`landing ${n}`);
    rest(.9);
    if(motion.position.y < -1 && omit===n){
      if(!recoverMiss)break;
      if(n!==0)throw Error("Recovery demonstration uses first extension's marked old roof4 wall");
      const landed={...motion.position},progress=course.next;
      forward={x:0,y:0,z:1};until(()=>motion.position.z>=181,{moveY:1,run:false},"street north");rest();
      forward={x:-1,y:0,z:0};until(()=>motion.position.x<=35,{moveY:1,run:false},"street west");rest();
      forward={x:0,y:0,z:-1};until(()=>traversal.surfaceId==="roof-4",{moveY:1,climbHeld:true,run:false},"street attach");
      until(()=>motion.grounded&&motion.position.y===1,{moveY:1,climbHeld:true,run:false},"street topout");rest();
      until(()=>motion.position.z<=166,{moveY:1,run:false},"rejoin course start roof");rest();
      if(course.next!==progress)throw Error("Ground recovery falsely awarded a ring");
      recoveries.push({landed,returned:{...motion.position},progress});recovered=true;n--;continue;
    }
    if(motion.position.y<0) throw Error(`fell after gap ${n}: ${JSON.stringify({motion,course,web})}`);
    // Center on the landing roof through ordinary analog steering before the next turn.
    for(let k=0;k<600;k++) {
      const x=b.x-motion.position.x,z=b.z-motion.position.z;
      if(Math.hypot(x,z)<.35) break;
      advance({moveX: (forward.z*x-forward.x*z)*.15,moveY:(forward.x*x+forward.z*z)*.15,run:false});
    }
    rest(.4);
  }
  return {motion,web,traversal,course,skyline,events,recoveries,elapsed};
}
