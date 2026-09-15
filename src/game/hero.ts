import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.pure";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { Scene } from "@babylonjs/core/scene";
import { HERO_PRESENTATION, HERO_RIG } from "../core/presentation";

// All artwork is original Canvas linework authored here. The atlas is the
// diffuse surface itself: no separate eye/emblem plates or offset web meshes.
function costume(scene: Scene, name: string, color: string, detail: "web" | "mask" | "emblem" = "web") {
  const tile = 256, texture = new DynamicTexture(`${name}-surface-atlas`, { width: tile * 6, height: tile }, scene, true);
  const c = texture.getContext() as CanvasRenderingContext2D;
  for (let face = 0; face < 6; face++) {
    c.save(); c.translate(face * tile, 0); c.fillStyle = color; c.fillRect(0,0,tile,tile);
    c.beginPath(); c.strokeStyle = detail === "mask" ? "#682437" : "#bfd1e8"; c.lineWidth = detail === "mask" ? 3 : 2;
    // A readable tapered fan and bowed cross-lines, continued on every face.
    for (let x = -128; x <= 384; x += 64) { c.moveTo(128,128); c.lineTo(x,0); c.moveTo(128,128); c.lineTo(x,256); }
    for (let y = 35; y <= 230; y += 42) { c.moveTo(0,y); c.quadraticCurveTo(128,y+22,256,y); }
    c.stroke();
    if (detail === "mask" && face === 0) {
      for (const side of [-1,1]) {
        c.save(); c.translate(128 + side * 58, 82); c.rotate(-side * Math.PI / 4);
        c.beginPath(); c.ellipse(0,0,48,23,0,0,Math.PI*2);
        c.fillStyle = "#fffef5"; c.fill(); c.lineWidth = 5; c.strokeStyle = "#482537"; c.stroke(); c.restore();
      }
    }
    if (detail === "emblem" && face === 0) {
      // Original small sun-spider: two central ovals and four angled legs per side.
      c.fillStyle = "#ffcb57"; c.strokeStyle = "#ffcb57"; c.lineWidth = 8; c.lineCap = "round";
      c.beginPath(); c.ellipse(128,139,16,25,0,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(128,107,11,13,0,0,Math.PI*2); c.fill();
      for (const side of [-1,1]) for (const [i, y] of [110,126,145,160].entries()) {
        c.beginPath(); c.moveTo(128+side*10,y); c.lineTo(128+side*(32+i*3),y-14+i*6);
        c.lineTo(128+side*(57-i*3),y-29+i*14); c.stroke();
      }
    }
    c.restore();
  }
  texture.update(); texture.anisotropicFilteringLevel = 4;
  const material = new StandardMaterial(name, scene); material.diffuseTexture = texture;
  material.specularColor = new Color3(0.08,0.08,0.08);
  material.emissiveColor = new Color3(0.06,0.06,0.06);
  return material;
}
export function createBlockHero(scene: Scene, root: TransformNode, shadows: ShadowGenerator) {
  const red = costume(scene,"hero-red-integrated",HERO_PRESENTATION.red);
  const blue = costume(scene,"hero-blue-integrated",HERO_PRESENTATION.blue);
  const mask = costume(scene,"hero-mask-integrated",HERO_PRESENTATION.red,"mask");
  const chest = costume(scene,"hero-chest-integrated",HERO_PRESENTATION.red,"emblem");
  const faceUV = Array.from({length:6},(_,i)=>new Vector4((i*256+1)/1536,1/256,((i+1)*256-1)/1536,255/256));
  function block(name: string, size: [number,number,number], pos: [number,number,number], parent: TransformNode, material = blue) {
    const mesh = CreateBox(name,{width:size[0],height:size[1],depth:size[2],faceUV},scene);
    mesh.parent=parent; mesh.position.set(...pos); mesh.material=material;
    mesh.metadata={originalProcedural:true,surfaceArtwork:true,visualOnly:true}; return mesh;
  }
  function joint(name: string, radius: number, parent: TransformNode, material = blue) {
    const mesh = CreateSphere(name,{diameter:radius*2,segments:8},scene); mesh.parent=parent; mesh.material=material;
    return mesh;
  }
  block("webmaster-pelvis",[0.72,0.44,0.46],[0,1.50,0],root);
  block("webmaster-torso",[0.90,1.10,0.48],[0,2.09,0],root,chest);
  block("webmaster-neck",[0.34,0.25,0.34],[0,2.63,0],root,red);
  block("webmaster-mask",[0.72,0.78,0.66],[0,2.99,0],root,mask);
  const hips: TransformNode[]=[], knees: TransformNode[]=[], ankles: TransformNode[]=[], arms: TransformNode[]=[], elbows: TransformNode[]=[];
  for (const side of [-1,1]) {
    const hip = new TransformNode(`hip-${side}`,scene); hip.parent=root; hip.position.set(side*HERO_RIG.hipSeparation/2,HERO_RIG.hipHeight,0);
    joint(`hip-joint-${side}`,HERO_RIG.hipJointRadius,hip);
    block(`upper-leg-${side}`,[0.31,0.69,0.34],[0,-0.30,0],hip);
    const knee = new TransformNode(`knee-${side}`,scene); knee.parent=hip; knee.position.y=-HERO_RIG.upperLeg;
    joint(`knee-joint-${side}`,HERO_RIG.kneeJointRadius,knee);
    block(`lower-leg-${side}`,[0.30,0.67,0.32],[0,-0.30,0],knee);
    const ankle = new TransformNode(`ankle-${side}`,scene); ankle.parent=knee; ankle.position.y=-HERO_RIG.lowerLeg;
    block(`boot-${side}`,[0.33,0.26,0.47],[0,-0.01,0.055],ankle,red);
    hips.push(hip); knees.push(knee); ankles.push(ankle);
    const arm = new TransformNode(`shoulder-${side}`,scene); arm.parent=root; arm.position.set(side*0.56,2.47,0);
    joint(`shoulder-joint-${side}`,0.18,arm,red);
    block(`upper-arm-${side}`,[0.29,0.59,0.31],[0,-0.26,0],arm,red);
    const elbow = new TransformNode(`elbow-${side}`,scene); elbow.parent=arm; elbow.position.y=-0.55;
    joint(`elbow-joint-${side}`,0.145,elbow,red);
    block(`forearm-${side}`,[0.27,0.55,0.29],[0,-0.24,0],elbow,red);
    block(`hand-${side}`,[0.28,0.23,0.30],[0,-0.53,0],elbow,red);
    arms.push(arm); elbows.push(elbow);
  }
  for (const mesh of root.getChildMeshes()) { mesh.isPickable=false; shadows.addShadowCaster(mesh); }
  return {hips,knees,ankles,arms,elbows};
}
