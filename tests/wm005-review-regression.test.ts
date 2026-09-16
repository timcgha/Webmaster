import {it,expect} from 'vitest';
import {newSwing,stepSwing} from '../src/core/swing';
import {climbLimbPose} from '../src/core/presentation';
it('F-WM005-SR-01 retains earned tangential momentum on a new attachment',()=>{
 const m={position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:40},grounded:false,facingYaw:0};
 const a={id:'next-loop',position:{x:.56,y:14.03,z:.71},eligible:true,visible:true};
 const r=stepSwing(m,newSwing(),{moveX:0,moveY:0,run:false,jumpPressed:false,swingHeld:true,cameraForward:{x:0,y:0,z:1},aim:{origin:{x:0,y:0,z:0},direction:{x:0,y:1,z:1}}},[a],[]);
 expect(r.swing.web?.anchorId).toBe(a.id);expect(r.motion.velocity.z).toBeGreaterThan(39);
});
it('F-WM005-SR-02 keeps the full climbing boot clear of wall and ceiling',()=>{
 for(let phase=0;phase<1;phase+=.01){const p=climbLimbPose(phase,1);for(const i of[0,1]){
  const toe=-.66*Math.sin(p.hips[i]!)-.66*Math.sin(p.hips[i]!+p.knees[i]!)+.055+.235;
  expect(toe).toBeLessThan(.495+.7-.005);expect(7.6+2.2+toe).toBeLessThan(11-.005);
 }}
});
