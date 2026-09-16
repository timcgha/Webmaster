import {it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {createRoundedBlock} from '../src/game/rounded-block';
import {addBlockShadow} from '../src/game/shadow-proxy';
import {CreateSphere} from '@babylonjs/core/Meshes/Builders/sphereBuilder.pure';
it('lower joint tessellation preserves the accepted contact envelope and smooth unit normals',()=>{
 const engine=new NullEngine(),scene=new Scene(engine);
 for(const radius of [.145,.18,.195,.21]){
  const old=CreateSphere('accepted',{diameter:radius*2,segments:8},scene),joint=CreateSphere('bounded',{diameter:radius*2,segments:4},scene);
  expect(joint.getBoundingInfo().boundingBox.minimum.asArray()).toEqual(old.getBoundingInfo().boundingBox.minimum.asArray());
  expect(joint.getBoundingInfo().boundingBox.maximum.asArray()).toEqual(old.getBoundingInfo().boundingBox.maximum.asArray());
  const normals=joint.getVerticesData('normal')!;
  for(let i=0;i<normals.length;i+=3)expect(Math.hypot(normals[i]!,normals[i+1]!,normals[i+2]!)).toBeCloseTo(1,6);
  expect(joint.getTotalIndices()).toBeLessThan(old.getTotalIndices()/2);
 }
 scene.dispose();engine.dispose();
});
it('opaque low-poly shadow follows the rounded costume while remaining excluded from the camera',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),camera=new FreeCamera('camera',Vector3.Zero(),scene);
 const shadow=new ShadowGenerator(256,new DirectionalLight('sun',new Vector3(-.4,-1,.35),scene));
 const block=createRoundedBlock('head',{width:.72,height:.78,depth:.66},scene);
 const proxy=addBlockShadow(block,[.72,.78,.66],shadow,new StandardMaterial('opaque',scene));
 expect(proxy.getTotalIndices()).toBe(36);expect(block.getTotalIndices()).toBe(324);
 expect(shadow.getShadowMap()!.renderList).toHaveLength(1);expect(shadow.getShadowMap()!.renderList![0]).toBe(proxy);
 expect(shadow.getShadowMap()!.forceLayerMaskCheck).toBe(false);
 expect(proxy.isVisible).toBe(true);expect(proxy.isEnabled()).toBe(true);expect(proxy.isPickable).toBe(false);
 expect(proxy.layerMask & camera.layerMask).toBe(0);expect(block.layerMask & camera.layerMask).not.toBe(0);
 block.position.set(2,8,-5);block.rotation.set(-1.3,.8,.2);block.computeWorldMatrix(true);proxy.computeWorldMatrix(true);
 expect(proxy.getWorldMatrix().asArray()).toEqual(block.getWorldMatrix().asArray());
 const box=proxy.getBoundingInfo().boundingBox;expect(box.extendSize.asArray()).toEqual([.36,.39,.33]);
 scene.dispose();expect(engine.scenes).toHaveLength(0);engine.dispose();
});
