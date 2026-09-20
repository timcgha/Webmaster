import { describe, expect, it } from 'vitest';
import { newRenderQuality, sampleRenderQuality } from '../src/core/render-quality';
import { newSwing, stepSwing, type Anchor, type Solid, type SwingInput } from '../src/core/swing';
import type { MotionState } from '../src/core/types';
const ring: Anchor = {id:'ring',position:{x:0,y:15,z:10},eligible:true,visible:true};
const roof: Solid = {id:'roof',minX:-10,maxX:10,minY:-10,maxY:0,minZ:-10,maxZ:10};
const standing: MotionState = {position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0},grounded:true,facingYaw:0};
const input: SwingInput = {moveX:0,moveY:0,run:false,jumpPressed:false,swingHeld:true,cameraForward:{x:0,y:0,z:1},aim:{origin:{x:0,y:4,z:-9},direction:{x:0,y:0,z:1}}};
describe('sponsor follow-up standing launch',()=>{
  it('launches once on a successful grounded catch, with more clearance than an ordinary jump',()=>{
    let r=stepSwing(standing,newSwing(),input,[ring],[roof]);
    expect(r.attached).toBe(true);expect(r.motion.grounded).toBe(false);
    expect(r.motion.velocity.y).toBeGreaterThan(8.2);
    let apex=r.motion.position.y;
    for(let i=0;i<35;i++) {const vy=r.motion.velocity.y;r=stepSwing(r.motion,r.swing,input,[ring],[roof]);expect(r.motion.velocity.y).toBeLessThan(vy);apex=Math.max(apex,r.motion.position.y);}
    expect(apex).toBeGreaterThan(3);expect(r.swing.attachments).toBe(1);
  });
  it('does not boost airborne catches or failed/paused attachment',()=>{
    const running=stepSwing({...standing,velocity:{x:0,y:0,z:8}},newSwing(),{...input,jumpPressed:true},[ring],[roof]);
    expect(running.motion.velocity.y).toBeCloseTo(8.2-22/60);
    const air=stepSwing({...standing,grounded:false,position:{x:0,y:3,z:0}},newSwing(),input,[ring],[roof]);
    expect(air.motion.velocity.y).toBeLessThan(0);
    expect(stepSwing(standing,newSwing(),input,[],[roof]).motion.position.y).toBe(0);
    expect(stepSwing(standing,newSwing(),{...input,paused:true},[ring],[roof]).motion).toEqual(standing);
  });
  it('cannot launch through a low ceiling or solid obstruction',()=>{
    const ceiling={...roof,id:'ceiling',minY:4,maxY:5,minZ:-2,maxZ:2};
    let r=stepSwing(standing,newSwing(),input,[ring],[roof,ceiling]);
    for(let i=0;i<60;i++){expect(r.motion.position.y+3.4).toBeLessThanOrEqual(4.00001);r=stepSwing(r.motion,r.swing,input,[ring],[roof,ceiling]);}
    const wall={...roof,id:'wall',minY:0,maxY:30,minZ:4,maxZ:5};
    const blocked=stepSwing(standing,newSwing(),input,[ring],[roof,wall]);
    expect(blocked.attached).toBe(false);expect(blocked.motion.position.y).toBe(0);
  });
});
describe('adaptive clarity hysteresis',()=>{
  it('starts at full resolution regardless of viewport and ignores isolated slow seconds',()=>{
    const q=newRenderQuality();expect(q.scale).toBe(1);
    expect(sampleRenderQuality(sampleRenderQuality(q,20),45)).toEqual(q);
  });
  it('degrades after sustained low FPS and recovers only after five fast seconds',()=>{
    let q=sampleRenderQuality(sampleRenderQuality(newRenderQuality(),20),20);expect(q.scale).toBe(1.45);
    for(let i=0;i<4;i++)q=sampleRenderQuality(q,60);expect(q.scale).toBe(1.45);
    q=sampleRenderQuality(q,60);expect(q.scale).toBe(1.35);
    for(let i=0;i<50;i++)q=sampleRenderQuality(q,60);expect(q.scale).toBe(1);
    for(let i=0;i<100;i++)q=sampleRenderQuality(q,10);expect(q.scale).toBe(2.25);
  });
  it('uses the gradual step for mild sub-30 dips that are not critically slow',()=>{
    let q=sampleRenderQuality(sampleRenderQuality(newRenderQuality(),25),25);expect(q.scale).toBe(1.2);
    q=sampleRenderQuality(sampleRenderQuality(q,25),25);expect(q.scale).toBe(1.4);
  });
  it('keeps stepping past a mid-scale plateau under 42 FPS but leaves native 40 FPS alone',()=>{
    expect(sampleRenderQuality(sampleRenderQuality(newRenderQuality(),40),40)).toEqual(newRenderQuality());
    let q={scale:1.9,slow:0,fast:0};
    q=sampleRenderQuality(sampleRenderQuality(q,35),35);expect(q.scale).toBe(2.1);
    q=sampleRenderQuality(sampleRenderQuality(q,35),35);expect(q.scale).toBe(2.25);
  });
  it('does not count invalid or middling samples toward recovery',()=>{
    let q={scale:2,slow:0,fast:4};
    for(const fps of [NaN,Infinity,0,45])expect(sampleRenderQuality(q,fps)).toEqual({scale:2,slow:0,fast:0});
  });
});
