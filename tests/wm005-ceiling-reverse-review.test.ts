import {it,expect} from 'vitest';
import {newTraversal,stepTraversal,SURFACES} from '../src/core/traversal';
import {EXTERIOR_WALLS} from '../src/core/course';
import {newSwing} from '../src/core/swing';
import {HERO_RIG,ceilingClimbOffset} from '../src/core/presentation';
import {COURSE_SOLIDS} from './course-driver';
it('F-WM005-SR-09 keeps the head clear when reversing toward the wall beneath the ceiling',()=>{
 let m={position:{x:-6,y:7.6,z:-55},velocity:{x:0,y:0,z:0},grounded:false,facingYaw:Math.PI};
 let t={...newTraversal(),surfaceId:'climb-ceiling',cameraMode:'ceiling' as const,wallNormal:{x:0,y:0,z:1}},sw=newSwing();
 const input={moveX:0,moveY:1,run:false,jumpPressed:false,swingHeld:false,climbHeld:true,pullHeld:false,cameraForward:{x:0,y:0,z:-1},aim:{origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:-1}}};
 for(let i=0;i<55;i++){const r=stepTraversal(m,t,sw,[],input,[],COURSE_SOLIDS,[...SURFACES,...EXTERIOR_WALLS]);m=r.motion;t=r.traversal as typeof t;sw=r.swing;}
 expect(t.surfaceId).toBe('climb-ceiling');expect(m.position.z).toBeLessThan(-58);expect(m.facingYaw).toBeCloseTo(0);
 // At face-up pitch, actual head top (local +Y) points toward world -Z.
 // Its complete vertical band is inside the adjacent wall's0..11 height.
 const headZ=m.position.z+ceilingClimbOffset(-Math.PI/2,m.facingYaw,t.wallNormal).z-HERO_RIG.headTop;
 expect(headZ,'head must remain outside the wall front at z=-61').toBeGreaterThanOrEqual(-61);
});

it('ceiling reversal pivots the body centre in place for every heading',()=>{
 for(const normal of [{x:0,y:0,z:1},{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:0,z:-1}]){
  for(let yaw=0;yaw<Math.PI*2;yaw+=.05){
   const o=ceilingClimbOffset(-Math.PI/2,yaw,normal);
   expect(o.x-1.7*Math.sin(yaw)).toBeCloseTo(1.7*normal.x);
   expect(o.z-1.7*Math.cos(yaw)).toBeCloseTo(1.7*normal.z);
  }
 }
});
