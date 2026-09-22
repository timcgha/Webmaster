import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.pure";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { createRoundedBlock } from "./rounded-block";
import { HERO_RIG } from "../core/presentation";

/** Original ski-mask bank robber — procedural only; no third-party likeness. */
const ROBBER = Object.freeze({
  jacket: "#2a3340",
  jeans: "#3d4a5c",
  mask: "#1a1a1e",
  eyes: "#f4f1e8",
  gloves: "#111114",
  bag: "#5c4033",
});

function paint(
  scene: Scene,
  name: string,
  color: string,
  detail: "plain" | "ski" = "plain",
) {
  const tile = 256,
    texture = new DynamicTexture(
      `${name}-atlas`,
      { width: tile * 6, height: tile },
      scene,
      true,
    );
  const c = texture.getContext() as CanvasRenderingContext2D;
  for (let face = 0; face < 6; face++) {
    c.save();
    c.translate(face * tile, 0);
    c.fillStyle = color;
    c.fillRect(0, 0, tile, tile);
    if (detail === "ski" && face === 0) {
      // Opaque ski mask with two almond eye holes — original canvas art.
      c.fillStyle = ROBBER.mask;
      c.fillRect(0, 0, tile, tile);
      for (const side of [-1, 1]) {
        c.save();
        c.translate(128 + side * 48, 100);
        c.beginPath();
        c.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
        c.fillStyle = ROBBER.eyes;
        c.fill();
        c.restore();
      }
      c.strokeStyle = "#0a0a0c";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(40, 170);
      c.quadraticCurveTo(128, 200, 216, 170);
      c.stroke();
    }
    c.restore();
  }
  texture.update(false);
  texture.anisotropicFilteringLevel = 2;
  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.specularColor = new Color3(0.05, 0.05, 0.05);
  material.emissiveColor = new Color3(0.04, 0.04, 0.04);
  return material;
}

export function createBlockRobber(scene: Scene, root: TransformNode) {
  const jacket = paint(scene, "robber-jacket", ROBBER.jacket);
  const jeans = paint(scene, "robber-jeans", ROBBER.jeans);
  const mask = paint(scene, "robber-ski-mask", ROBBER.mask, "ski");
  const gloves = paint(scene, "robber-gloves", ROBBER.gloves);
  const bagMat = paint(scene, "robber-bag", ROBBER.bag);
  const faceUV = Array.from(
    { length: 6 },
    (_, i) =>
      new Vector4((i * 256 + 1) / 1536, 1 / 256, ((i + 1) * 256 - 1) / 1536, 255 / 256),
  );
  function block(
    name: string,
    size: [number, number, number],
    pos: [number, number, number],
    parent: TransformNode,
    material: StandardMaterial,
  ) {
    const mesh = createRoundedBlock(
      name,
      { width: size[0], height: size[1], depth: size[2], faceUV },
      scene,
    );
    mesh.parent = parent;
    mesh.position.set(...pos);
    mesh.material = material;
    mesh.metadata = {
      originalProcedural: true,
      surfaceArtwork: true,
      visualOnly: true,
      robber: true,
    };
    mesh.isPickable = false;
    return mesh;
  }
  function joint(name: string, radius: number, parent: TransformNode, material: StandardMaterial) {
    const mesh = CreateSphere(
      name,
      { diameter: radius * 2, segments: 4 },
      scene,
    );
    mesh.parent = parent;
    mesh.material = material;
    mesh.metadata = { originalProcedural: true, visualOnly: true, robber: true };
    mesh.isPickable = false;
    return mesh;
  }
  block("robber-pelvis", [0.58, 0.4, 0.42], [0, 1.48, 0], root, jeans);
  block("robber-torso", [1.02, 1.1, 0.52], [0, 2.08, 0], root, jacket);
  block("robber-neck", [0.32, 0.2, 0.32], [0, 2.68, 0], root, mask);
  block("robber-mask", [0.72, 0.76, 0.66], [0, 3.02, 0], root, mask);
  block("robber-loot-bag", [0.42, 0.5, 0.28], [-0.55, 1.9, -0.35], root, bagMat);
  const hips: TransformNode[] = [],
    knees: TransformNode[] = [],
    arms: TransformNode[] = [],
    elbows: TransformNode[] = [];
  for (const side of [-1, 1] as const) {
    const hip = new TransformNode(`robber-hip-${side}`, scene);
    hip.parent = root;
    hip.position.set(side * HERO_RIG.hipSeparation / 2, HERO_RIG.hipHeight, 0);
    joint(`robber-hip-joint-${side}`, HERO_RIG.hipJointRadius, hip, jeans);
    block(`robber-upper-leg-${side}`, [0.34, 0.66, 0.36], [0, -0.3, 0], hip, jeans);
    const knee = new TransformNode(`robber-knee-${side}`, scene);
    knee.parent = hip;
    knee.position.y = -HERO_RIG.upperLeg;
    joint(`robber-knee-joint-${side}`, HERO_RIG.kneeJointRadius, knee, jeans);
    block(`robber-lower-leg-${side}`, [0.32, 0.64, 0.34], [0, -0.3, 0], knee, jeans);
    const ankle = new TransformNode(`robber-ankle-${side}`, scene);
    ankle.parent = knee;
    ankle.position.y = -HERO_RIG.lowerLeg;
    block(`robber-boot-${side}`, [0.36, 0.26, 0.48], [0, -0.01, 0.05], ankle, gloves);
    hips.push(hip);
    knees.push(knee);
    const arm = new TransformNode(`robber-shoulder-${side}`, scene);
    arm.parent = root;
    arm.position.set(side * 0.64, 2.48, 0);
    joint(`robber-shoulder-joint-${side}`, 0.2, arm, jacket);
    block(`robber-upper-arm-${side}`, [0.36, 0.58, 0.36], [0, -0.28, 0], arm, jacket);
    const elbow = new TransformNode(`robber-elbow-${side}`, scene);
    elbow.parent = arm;
    elbow.position.y = -0.55;
    joint(`robber-elbow-joint-${side}`, 0.14, elbow, jacket);
    block(`robber-forearm-${side}`, [0.32, 0.52, 0.32], [0, -0.24, 0], elbow, jacket);
    block(`robber-hand-${side}`, [0.3, 0.22, 0.32], [0, -0.52, 0], elbow, gloves);
    arms.push(arm);
    elbows.push(elbow);
  }
  return { hips, knees, arms, elbows };
}
