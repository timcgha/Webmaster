import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder.pure";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.pure";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { CombatState } from "../core/combat";
import type { createBlockHero } from "./hero";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { createRoundedBlock } from "./rounded-block";
import { CombatAudio } from "./combat-audio";

export class CombatView {
  readonly audio = new CombatAudio();
  private targets = new Map<
    string,
    {
      body: Mesh;
      wrap: Mesh;
      bar: Mesh;
      label: Mesh;
      texture: DynamicTexture;
      last: string;
    }
  >();
  private shots: Mesh[] = [];
  private bursts: Mesh[] = [];
  private lastEvent = 0;
  private previousState: CombatState | null = null;
  private machine: Mesh;
  private machineBase: Mesh;
  private machineArm: Mesh;
  private warning: Mesh;
  private warningMaterial: StandardMaterial;
  private strikeMaterial: StandardMaterial;
  private mat(scene: Scene, name: string, color: string) {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.emissiveColor = m.diffuseColor.scale(0.18);
    m.specularColor = Color3.Black();
    return m;
  }
  constructor(scene: Scene, s: CombatState) {
    const prior = new Set(scene.meshes);
    const orange = this.mat(scene, "training-orange", "#ffab3d"),
      pink = this.mat(scene, "training-pink", "#f36cce"),
      teal = this.mat(scene, "training-teal", "#25dbc8"),
      gold = this.mat(scene, "training-gold", "#ffe257"),
      white = this.mat(scene, "training-web", "#eefff8");
    for (let i = 0; i < 5; i++) {
      const mat = CreateBox(
        "combat-station-mat-" + i,
        { width: 9, height: 0.035, depth: i === 4 ? 23 : 6 },
        scene,
      );
      mat.position.set(-38, -17.97, [-49, -41, -33, -23, -7][i]!);
      mat.material = [orange, pink, teal, gold, teal][i]!;
    }
    for (const t of s.targets) {
      const body = createRoundedBlock(
        "combat-" + t.id,
        { width: 1.25, height: t.kind === "dummy" ? 2.3 : 1.25, depth: 1.1 },
        scene,
      );
      body.material =
        t.kind === "box" ? orange : t.kind === "high" ? pink : teal;
      const wrap = CreateTorus(
        "wrap-" + t.id,
        { diameter: 1.7, thickness: 0.1, tessellation: 12 },
        scene,
      );
      wrap.material = white;
      const bar = CreateBox(
        "health-" + t.id,
        { width: 1.8, height: 0.13, depth: 0.12 },
        scene,
      );
      bar.material = gold;
      const label = CreatePlane(
        "label-" + t.id,
        { width: 3.8, height: 0.9, sideOrientation:Mesh.DOUBLESIDE },
        scene,
      );
      label.billboardMode = Mesh.BILLBOARDMODE_ALL;
      const texture = new DynamicTexture(
          "status-" + t.id,
          { width: 512, height: 128 },
          scene,
          false,
        ),
        lm = this.mat(scene, "label-mat-" + t.id, "#ffffff");
      lm.diffuseTexture = texture;
      label.material = lm;
      this.targets.set(t.id, { body, wrap, bar, label, texture, last: "" });
    }
    for (let i = 0; i < 4; i++) {
      const mesh = CreateSphere(
        "combat-web-projectile-" + i,
        { diameter: 0.4, segments: 4 },
        scene,
      );
      mesh.material = white;
      mesh.setEnabled(false);
      this.shots.push(mesh);
      for (let j = 0; j < 2; j++) {
        const satellite = CreateSphere(
          "spiral-" + i + "-" + j,
          { diameter: 0.22, segments: 3 },
          scene,
        );
        satellite.parent = mesh;
        satellite.position.x = j ? -0.4 : 0.4;
        satellite.material = teal;
      }
    }
    for (let i = 0; i < 8; i++) {
      const ring = CreateTorus(
        "combat-impact-" + i,
        { diameter: 1, thickness: 0.07, tessellation: 16 },
        scene,
      );
      ring.material = i % 2 ? gold : white;
      ring.setEnabled(false);
      this.bursts.push(ring);
    }
    this.machine = createRoundedBlock(
      "padded-practice-arm",
      { width: 3.8, height: 0.8, depth: 0.9 },
      scene,
    );
    this.machine.material = pink;
    this.machineBase=createRoundedBlock('training-machine-post',{width:.7,height:2.5,depth:.7},scene);
    this.machineBase.material=teal;
    this.machineArm=CreateBox('training-machine-boom',{width:.25,height:.25,depth:1},scene);
    this.machineArm.material=teal;
    this.warning = CreateBox(
      "training-warning",
      { width: 3, height: 0.04, depth: 3 },
      scene,
    );
    this.warning.material = gold;
    this.warningMaterial=gold;this.strikeMaterial=pink;
    for (const mesh of scene.meshes)
      if (!prior.has(mesh))
        mesh.metadata = { ...mesh.metadata, combatDynamic: true };
  }
  update(
    s: CombatState,
    rig: ReturnType<typeof createBlockHero>,
    root: TransformNode,
  ) {
    if (this.previousState !== s) {
      this.previousState = s;
      this.lastEvent = 0;
      this.audio.reset();
      for (const b of this.bursts) b.setEnabled(false);
    }
    for (const t of s.targets) {
      const v = this.targets.get(t.id)!;
      v.body.setEnabled(s.active && t.active && t.hp > 0);
      v.body.position.set(t.position.x, t.position.y, t.position.z);
      v.body.rotation.z = Math.sin(t.flash * 50) * t.flash * 0.5;
      v.body.scaling.setAll(t.flash > 0 ? 1 + t.flash * 0.3 : 1);
      v.wrap.setEnabled(s.active && t.active && t.wrap > 0);
      v.wrap.position.copyFrom(v.body.position);
      v.wrap.rotation.z = Math.PI / 4;
      v.wrap.scaling.y = 1.8;
      v.bar.setEnabled(s.active && t.active);
      v.bar.position.set(t.position.x, t.position.y + 1.5, t.position.z);
      v.bar.scaling.x = Math.max(0.01, t.hp / t.maxHp);
      v.label.setEnabled(s.active && t.active);
      v.label.position.set(t.position.x, t.position.y + 2.2, t.position.z);
      const text =
        (t.kind === "box"
          ? "PUNCH BOX"
          : t.kind === "high"
            ? "JUMP KICK"
            : "WEB DUMMY") +
        `  ${t.hp}/${t.maxHp}` +
        (t.wrap > 0
          ? `  WRAPPED ${t.wrap.toFixed(1)}s`
          : t.released
            ? "  FREE AGAIN"
            : "");
      if (s.active && t.active && v.last !== text) {
        v.last = text;
        const c = v.texture.getContext() as CanvasRenderingContext2D;
        c.fillStyle = "#12334d";
        c.fillRect(0, 0, 512, 128);
        c.font = "bold 24px sans-serif";
        c.fillStyle = "#ffffff";
        c.textAlign = "center";
        c.fillText(text, 256, 75);
        v.texture.update();
      }
    }
    this.shots.forEach((v, i) => {
      const p = s.shots[i];
      v.setEnabled(!!p);
      if (p) {
        v.position.set(p.position.x, p.position.y, p.position.z);
        v.scaling.setAll(p.step === 3 ? 1.8 : 1);
        v.rotation.z = s.time * 12;
        v.getChildMeshes().forEach((m) => m.setEnabled(p.step > 1));
      }
    });
    const machine =
      s.active && (s.stage === 3 || (s.stage === 4 && s.finalPart === 3));
    this.machine.setEnabled(machine);
    this.machineBase.setEnabled(machine);this.machineArm.setEnabled(machine);
    this.warning.setEnabled(machine && (s.machine.phase === "warning" || s.machine.phase === "strike"));
    this.warning.material=s.machine.phase==='strike'?this.strikeMaterial:this.warningMaterial;
    const z = s.stage === 3 ? -23 : 1;
    const targetZ=s.machine.phase==='idle'?z:s.machine.aim.z;
    const headZ=s.machine.phase==='strike'?targetZ:targetZ+2;
    const headX=s.machine.phase==='idle'?-38:s.machine.aim.x;
    this.machineBase.position.set(-38,-16.75,z+3.4);
    this.machine.position.set(headX, -16, headZ);
    this.machineArm.position.set((-38+headX)/2,-16,(z+3.4+headZ)/2);
    this.machineArm.scaling.z=Math.max(.3,Math.hypot(headX+38,z+3.4-headZ));
    this.machineArm.rotation.y=Math.atan2(headX+38,headZ-z-3.4);
    this.warning.position.set(s.machine.aim.x, -17.94, s.machine.aim.z);
    this.warning.scaling.setAll(1 + Math.sin(s.machine.age * 12) * 0.08);
    for (const e of s.events) {
      if (e.id <= this.lastEvent) continue;
      this.lastEvent = e.id;
      this.audio.play(e);
      if (e.kind === "swing") continue;
      const ring = this.bursts[e.id % this.bursts.length]!;
      ring.setEnabled(true);
      ring.position.set(e.position.x, e.position.y + 1, e.position.z);
      ring.metadata = { born: s.time };
    }
    for (const ring of this.bursts) {
      if (!ring.isEnabled()) continue;
      const age = s.time - (ring.metadata?.born ?? 0);
      if (age > 0.4) ring.setEnabled(false);
      else {
        ring.scaling.setAll(0.2 + age * 5);
        ring.visibility = 1 - age / 0.4;
      }
    }
    for (let i = 0; i < 2; i++) {
      rig.arms[i]!.rotation.z = 0;
      rig.arms[i]!.rotation.y = 0;
      rig.hips[i]!.rotation.z = 0;
      rig.hips[i]!.rotation.y = 0;
    }
    root.rotation.z = 0;
    const a = s.attack;
    if (a) {
      const phase = Math.min(1, a.age / a.duration),
        power = Math.sin(Math.PI * phase),
        side = a.step === 1 ? 0 : 1;
      if (a.kind === "punch") {
        rig.arms[side]!.rotation.x = -1.6 * power;
        rig.elbows[side]!.rotation.x = -0.4 * power;
        if (a.step === 3) {
          root.rotation.y += Math.sin(phase * Math.PI * 2) * 0.6;
          rig.arms[side]!.rotation.z = -1.2 * power;
        }
      }
      if (a.kind === "kick") {
        rig.hips[side]!.rotation.x = -1.9 * power;
        rig.knees[side]!.rotation.x = 0.25 * power;
        rig.arms[0]!.rotation.z = -0.7 * power;
        rig.arms[1]!.rotation.z = 0.7 * power;
        if (a.step === 2) {
          rig.hips[side]!.rotation.z = -0.8 * power;
          root.rotation.y += power * 0.8;
        }
        if (a.step === 3) root.rotation.y += phase * Math.PI * 2;
      }
      if (a.kind === "web") {
        rig.arms[1]!.rotation.x = -1.55 * power;
        if (a.step > 1) rig.arms[0]!.rotation.x = -1.55 * power;
        if (a.step === 3) {
          rig.arms[0]!.rotation.z = -0.5 * power;
          rig.arms[1]!.rotation.z = 0.5 * power;
        }
      }
    }
    if (s.dodge) {
      const p = Math.sin(Math.min(1, s.dodge.age / 0.48) * Math.PI);
      root.position.y += p * 0.4;
      root.rotation.z = -s.dodge.direction.x * p * 0.24;
    }
  }
  dispose() {
    this.audio.dispose();
  }
}
