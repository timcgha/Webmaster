import HavokPhysics from "@babylonjs/havok";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { createBlockHero } from "./hero";
import { COURSE_ANCHORS, COURSE_NODES, COURSE_ROOFS, COURSE_START, COURSE_FINISH, RECOVERY_WALLS, STREET, CITY_SOLIDS, newCourse, advanceCourse, courseLabel, restoreSafePosition, cameraClearFraction, cameraSafeRadius, type CourseState } from "../core/course";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder.pure";
import { CreateLines } from "@babylonjs/core/Meshes/Builders/linesBuilder.pure";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.pure";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { paintedStreet, STREET_COLORS, STREET_QUAD_TRIANGLES } from "../core/street-visual";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { Scene } from "@babylonjs/core/scene";
import {
  FIXED_STEP,
  MAX_FRAME_DELTA,
  MAX_STEPS_PER_FRAME,
  copyVec3,
} from "../core/motion";
import type {
  GameSettings,
  MotionState,
  RunSavePayload,
  SemanticActions,
  Vec3Data,
} from "../core/types";

import {
  clearSwing,
  distance,
  handOrigin,
  newSwing,
  safeToSave,
  type Solid,
  type SwingState,
} from "../core/swing";
import {
  CHECKPOINTS,
  ROOFS,
  ROUTE_LABELS,
  SKY_START,
  advanceSkyline,
  newSkyline,
  resetSegment,
  type SkylineState,
} from "../core/skyline";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

import {
  TRAINING_SOLIDS,
  SURFACES,
  TRAINING_LABELS,
  newTraversal,
  newPullObjects,
  newTrainingRoute,
  clearTraversal,
  stepTraversal,
  advanceTraining,
  safeTraversal,
  trainingCheckpoint,
  restoreTraining,
  type TraversalState,
  type TrainingRoute,
  type PullObject,
} from "../core/traversal";
import {
  newLegPose,
  swingLegPose,
  type LegPose,
  newGait, gaitPose, type GaitPose,
} from "../core/presentation";

interface SolidBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldFrame {
  active: boolean;
  paused: boolean;
  safe: boolean;
  health: number;
  maxHealth: number;
  progress: number;
  progressLabel: string;
  position: Vec3Data;
  grounded: boolean;
  fps: number;
  cameraAlpha: number;
  cameraBeta: number;
  cameraRadius: number;
  cameraPosition: Vec3Data;
  inputSource: SemanticActions["source"];
  velocity: Vec3Data;
  swing: SwingState;
  hand: Vec3Data;
  skyline: SkylineState;
  traversal: TraversalState;
  training: TrainingRoute;
  pullObjects: PullObject[];
  legPose: LegPose;
  gait: GaitPose;
  course: CourseState;
  legWorld?: { hip: Vec3Data; tip: Vec3Data; forwardDisplacement: number }[];
  surfaceCameraBlend: number;
  heroPitch: number;
}

export interface WorldCallbacks {
  onProgress: (progress: number, label: string) => void;
  onRecovery: (health: number, fullRetry: boolean) => void;
  onFrame: (frame: WorldFrame) => void;
}

const START: Vec3Data = { x: 0, y: 0, z: -8 };
const MAX_HEALTH = 100;

export class GameWorld {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private heroRoot: TransformNode;
  private readonly physicsBodies: PhysicsAggregate[] = [];
  private motion: MotionState = {
    position: copyVec3(START),
    velocity: { x: 0, y: 0, z: 0 },
    grounded: true,
    facingYaw: 0,
  };
  private checkpoint: Vec3Data = copyVec3(START);
  private active = false;
  private paused = true;
  private health = MAX_HEALTH;
  private progress = 0;
  private progressLabel = "Reach the glowing sky gate";
  private accumulator = 0;
  private recoveringUntil = 0;
  private lastFrameAt = performance.now();
  private fpsWindowAt = performance.now();
  private fpsFrameCount = 0;
  private fps = 60;
  private readonly fpsSamples: number[] = [];
  private lastHudAt = 0;
  private pendingJump = false;
  private solids: SolidBox[] = [];
  private settings: GameSettings;
  private swing = newSwing();
  private skyline = newSkyline();
  private skylineSolids: Solid[] = [...ROOFS, STREET, ...COURSE_ROOFS];
  private course = newCourse();
  private gait = newGait();
  private rig!: ReturnType<typeof createBlockHero>;
  private lastVisualPosition = copyVec3(START);
  private readonly anchorMeshes = new Map<string, Mesh>();
  private webLine: LinesMesh | null = null;
  private wristFlash: Mesh | null = null;
  private rightArm: TransformNode | null = null;
  private courseContactShadow: Mesh | null = null;
  private pendingCheckpoint = false;
  private traversal = newTraversal();
  private training = newTrainingRoute();
  private pullObjects = newPullObjects();
  private readonly pullMeshes = new Map<string, Mesh>();
  private readonly legs: TransformNode[] = [];
  private legPose = newLegPose();
  private surfaceCameraBlend = 0;
  private groundBeta = 1.08;

  private constructor(
    canvas: HTMLCanvasElement,
    settings: GameSettings,
    private readonly callbacks: WorldCallbacks,
  ) {
    this.settings = { ...settings };
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
      powerPreference: "high-performance",
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.38, 0.76, 0.98, 1);
    this.camera = new ArcRotateCamera(
      "hero-camera",
      -Math.PI / 2,
      1.08,
      10.5,
      new Vector3(0, 1.4, 0),
      this.scene,
    );
    this.camera.minZ = 0.05;
    this.camera.lowerBetaLimit = 0.55;
    this.camera.upperBetaLimit = 1.65;
    this.camera.lowerRadiusLimit = 0.08;
    this.camera.upperRadiusLimit = 18;
    this.heroRoot = new TransformNode("webmaster-root", this.scene);
    this.applySettings(settings);
  }

  static async create(
    canvas: HTMLCanvasElement,
    settings: GameSettings,
    callbacks: WorldCallbacks,
  ): Promise<GameWorld> {
    const world = new GameWorld(canvas, settings, callbacks);
    await world.buildScene();
    world.engine.runRenderLoop(world.renderFrame);
    window.addEventListener("resize", world.resize);
    return world;
  }

  private async buildScene(): Promise<void> {
    try {
      const havok = await HavokPhysics();
      this.scene.enablePhysics(
        new Vector3(0, -9.81, 0),
        new HavokPlugin(true, havok),
      );
    } catch (error) {
      console.warn(
        "Havok initialization failed; static collision fallback remains active.",
        error,
      );
    }

    const skyLight = new HemisphericLight(
      "sky-light",
      new Vector3(0, 1, 0),
      this.scene,
    );
    skyLight.intensity = 1.05;
    skyLight.groundColor = new Color3(0.12, 0.2, 0.42);
    const sun = new DirectionalLight(
      "sun",
      new Vector3(-0.4, -1, 0.35),
      this.scene,
    );
    sun.position = new Vector3(14, 24, -16);
    sun.intensity = 1.6;
    const shadows = new ShadowGenerator(256, sun);
    shadows.usePoissonSampling = true;

    const arenaMaterial = this.material("arena-mat", "#273f8f", "#173167");
    const edgeMaterial = this.material("edge-mat", "#00e7d3", "#00a99c");
    const platform = CreateBox(
      "practice-roof",
      { width: 28, depth: 36, height: 1 },
      this.scene,
    );
    platform.position.set(0, -0.5, 6);
    platform.material = arenaMaterial;
    platform.receiveShadows = true;
    this.addStaticPhysics(platform);

    const lane = CreateBox(
      "practice-lane",
      { width: 6, depth: 31, height: 0.08 },
      this.scene,
    );
    lane.position.set(0, 0.02, 5.5);
    lane.material = this.material("lane-mat", "#7259e8", "#4635ab");
    lane.receiveShadows = true;

    for (const x of [-13.6, 13.6]) {
      const edge = CreateBox(
        `edge-${x}`,
        { width: 0.25, depth: 36, height: 0.35 },
        this.scene,
      );
      edge.position.set(x, 0.15, 6);
      edge.material = edgeMaterial;
    }

    this.createPracticeMarkers();
    this.createObstacle(-4.5, -1, 2.2, 2.2, 2.2, "#ffb11b");
    this.createObstacle(5.5, 3.5, 2.2, 3.5, 1.4, "#f95d9b");
    this.createObstacle(-6.5, 11, 2.4, 2.4, 3.2, "#19c6ef");
    this.createObstacle(6.5, 18, 2.6, 2.6, 4.2, "#ff7a32");
    this.createCity();
    this.createHero(shadows);
    this.createSkyline();
    this.createTraining();
    this.createStreetCourse();

    // Static authored geometry never moves. Keep culling, but avoid recomputing
    // its matrices/bounds each frame as the longer course comes into view.
    for (const mesh of this.scene.meshes) {
      if (!mesh.parent && !mesh.billboardMode && !this.anchorMeshes.has(mesh.name) &&
          !this.pullMeshes.has(mesh.name) && !mesh.name.startsWith("marker-ring") &&
          mesh !== this.webLine && mesh !== this.wristFlash) mesh.freezeWorldMatrix();
    }

    this.scene.onBeforeRenderObservable.add(() => {
      const pulse = 1 + Math.sin(performance.now() / 280) * 0.08;
      for (const mesh of this.scene.meshes.filter((candidate) =>
        candidate.name.startsWith("marker-ring"),
      )) {
        mesh.scaling.setAll(pulse);
        mesh.rotation.y += 0.01;
      }
    });
  }

  private material(
    name: string,
    diffuse: string,
    emissive?: string,
  ): StandardMaterial {
    const existing = this.scene.getMaterialByName(name);
    if (existing instanceof StandardMaterial) return existing;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(diffuse);
    material.specularColor = new Color3(0.18, 0.18, 0.28);
    if (emissive)
      material.emissiveColor = Color3.FromHexString(emissive).scale(0.25);
    return material;
  }

  private addStaticPhysics(mesh: Mesh): void {
    if (!this.scene.isPhysicsEnabled()) return;
    this.physicsBodies.push(
      new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        { mass: 0, restitution: 0, friction: 0.8 },
        this.scene,
      ),
    );
  }

  private createObstacle(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    color: string,
  ): void {
    const obstacle = CreateBox(
      `training-block-${x}-${z}`,
      { width, depth, height },
      this.scene,
    );
    obstacle.position.set(x, height / 2, z);
    obstacle.material = this.material(`training-block-mat-${x}-${z}`, color);
    obstacle.receiveShadows = true;
    this.addStaticPhysics(obstacle);
    this.solids.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    });
    this.skylineSolids.push({
      id: obstacle.name,
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      minY: 0,
      maxY: height,
    });
  }

  private createPracticeMarkers(): void {
    const teal = this.material("marker-teal", "#2fffd7", "#2fffd7");
    const gold = this.material("marker-gold", "#ffd83d", "#ffb91d");
    const pink = this.material("marker-pink", "#ff5db6", "#ff5db6");

    const archTop = CreateBox(
      "sky-gate-top",
      { width: 6, height: 0.35, depth: 0.35 },
      this.scene,
    );
    archTop.position.set(0, 4.2, 0);
    archTop.material = teal;
    for (const x of [-2.8, 2.8]) {
      const pillar = CreateBox(
        `sky-gate-pillar-${x}`,
        { width: 0.35, height: 4.2, depth: 0.35 },
        this.scene,
      );
      pillar.position.set(x, 2.1, 0);
      pillar.material = teal;
    }
    const ring1 = CreateTorus(
      "marker-ring-gate",
      { diameter: 3.2, thickness: 0.12 },
      this.scene,
    );
    ring1.position.set(0, 2.4, 0);
    ring1.rotation.x = Math.PI / 2;
    ring1.material = teal;

    const sunPad = CreateCylinder(
      "sun-pad",
      { diameter: 4.5, height: 0.22, tessellation: 48 },
      this.scene,
    );
    sunPad.position.set(5, 0.11, 10);
    sunPad.material = gold;
    const ring2 = CreateTorus(
      "marker-ring-pad",
      { diameter: 2.8, thickness: 0.12 },
      this.scene,
    );
    ring2.position.set(5, 1.9, 10);
    ring2.material = gold;

    const finish = CreateCylinder(
      "finish-beacon",
      { diameter: 1.2, height: 5, tessellation: 32 },
      this.scene,
    );
    finish.position.set(-4, 2.5, 18);
    finish.material = pink;
    const ring3 = CreateTorus(
      "marker-ring-finish",
      { diameter: 3.2, thickness: 0.14 },
      this.scene,
    );
    ring3.position.set(-4, 4.8, 18);
    ring3.material = pink;
  }

  private createCity(): void {
    const colors = ["#2751a5", "#6b4fc5", "#147d9a", "#d85791", "#e17734"];
    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (18 + (index % 4) * 3.5);
      const z = -16 + (index % 13) * 4;
      const height = 5 + ((index * 7) % 14);
      const width = 3 + (index % 3);
      const building = CreateBox(
        `city-${index}`,
        { width, depth: width, height: height + 13 },
        this.scene,
      );
      building.position.set(x, (height - 23) / 2, z);
      building.material = this.material(
        `city-mat-${index}`,
        colors[index % colors.length]!,
      );
      this.skylineSolids.push(CITY_SOLIDS[index]!);
      const roof = CreateBox(
        `city-roof-${index}`,
        { width: width + 0.2, depth: width + 0.2, height: 0.2 },
        this.scene,
      );
      roof.position.set(x, height - 5.1, z);
      roof.material = this.material(
        `city-roof-mat-${index}`,
        "#25e0d1",
        "#25e0d1",
      );
    }
    const sun = CreateSphere(
      "sky-sun",
      { diameter: 7, segments: 20 },
      this.scene,
    );
    sun.position.set(-28, 27, 38);
    sun.material = this.material("sky-sun-mat", "#ffed78", "#ffd34a");
  }

  private createHero(shadows: ShadowGenerator): void {
    this.rig = createBlockHero(this.scene, this.heroRoot, shadows);
    this.legs.push(...this.rig.hips);
    this.rightArm = this.rig.arms[1]!;
  }

  private createStreetCourse(): void {
    // R2: the same-runner render ablation isolated the regression to the new
    // large lit surfaces. Bake the static palette into opaque vertex colors:
    // no per-pixel lights, texture sampling or shadow filtering on these faces.
    // Accepted S1-S3 materials, hero lighting and every collider stay unchanged.
    const staticColor = new StandardMaterial("course-static-color", this.scene);
    staticColor.disableLighting = true;
    staticColor.emissiveColor = Color3.White();
    staticColor.specularColor = Color3.Black();
    const faceColors = (hex:string,top?:string) => [.82,.70,.74,.90,1,.60].map((shade,face) => {
      // These authored display colors feed an unlit material in the existing
      // default display pipeline; an extra linear conversion darkens them twice.
      const c=Color3.FromHexString(face===4&&top?top:hex).scale(shade);
      return new Color4(c.r,c.g,c.b,1);
    });
    const floor=CreateBox("solid-recovery-street",{width:206,depth:288,height:2},this.scene);
    floor.position.set(55,-19,54); floor.isVisible=false; this.addStaticPhysics(floor);
    const street=new Mesh("painted-recovery-street",this.scene);
    const positions:number[]=[],indices:number[]=[],normals:number[]=[],colors:number[]=[];
    const addFace=(vertices:number[],normal:number[],hex:string,shade=1) => {
      const base=positions.length/3,c=Color3.FromHexString(hex).scale(shade);
      positions.push(...vertices);indices.push(...STREET_QUAD_TRIANGLES.map(i=>base+i));
      for(let i=0;i<4;i++){normals.push(...normal);colors.push(c.r,c.g,c.b,1);}
    };
    for(const q of paintedStreet()) addFace([
      q.minX,-18,q.minZ,q.minX,-18,q.maxZ,q.maxX,-18,q.maxZ,q.maxX,-18,q.minZ,
    ],[0,1,0],STREET_COLORS[q.color]);
    // Four opaque outer edges keep the solid street readable at its boundary.
    const {minX:a,maxX:b,minZ:c,maxZ:d}=STREET;
    addFace([a,-20,c,a,-18,c,b,-18,c,b,-20,c],[0,0,-1],STREET_COLORS.street,.70);
    addFace([b,-20,d,b,-18,d,a,-18,d,a,-20,d],[0,0,1],STREET_COLORS.street,.82);
    addFace([a,-20,d,a,-18,d,a,-18,c,a,-20,c],[-1,0,0],STREET_COLORS.street,.74);
    addFace([b,-20,c,b,-18,c,b,-18,d,b,-20,d],[1,0,0],STREET_COLORS.street,.90);
    const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.colors=colors;
    data.applyToMesh(street);street.material=staticColor;street.isPickable=false;
    const palette=["#23a6ba","#e5a746","#8a75cf","#e67799"];
    for(const [i,b] of [{...ROOFS[0]!,maxY:-1},...COURSE_ROOFS].entries()) {
      const mesh=CreateBox(b.id+"-s4-building",{width:b.maxX-b.minX,depth:b.maxZ-b.minZ,height:b.maxY-b.minY,
        faceColors:faceColors(palette[i%4]!,i>0?(i===14?"#f477bc":"#32619a"):undefined)},this.scene);
      mesh.position.set((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2);
      mesh.material=staticColor;
      if(i>0) this.addStaticPhysics(mesh);
      // Landing paint is the actual top face: no coplanar overlay, extra draw,
      // flicker or offset between the visible roof and unchanged support height.
    }
    this.createCourseContactShadow();
    const stripeTexture=new DynamicTexture("original-recovery-stripes",{width:128,height:512},this.scene,true);
    const sc=stripeTexture.getContext();sc.fillStyle="#1b817d";sc.fillRect(0,0,128,512);
    sc.strokeStyle="#b7ffde";sc.lineWidth=9;
    for(let y=32;y<500;y+=58){sc.beginPath();sc.moveTo(22,y+24);sc.lineTo(64,y);sc.lineTo(106,y+24);sc.stroke();}
    // North-facing box face (+Z) has inverted V compared with the billboard's
    // opposite face: these chevrons must point up the climbable wall.
    stripeTexture.update(false); const stripe=this.material("street-climb-stripes","#ffffff");stripe.diffuseTexture=stripeTexture;
    for(const wall of RECOVERY_WALLS){
      const panel=CreateBox(`${wall.id}-recovery-stripe`,{width:3.2,height:wall.maxY-wall.minY,depth:0.025},this.scene);
      panel.position.set((wall.minX+wall.maxX)/2,(wall.minY+wall.maxY)/2,wall.maxZ+0.018);panel.material=stripe;
      this.courseSign(`wall-sign-${wall.id}`,"CLIMB UP",{x:panel.position.x,y:-15.6,z:wall.maxZ+0.06},"#175c68",2.8);
    }
    for(const [i,a] of COURSE_ANCHORS.entries()){
      this.courseSign(`ring-number-${i+1}`,String(i+1),{x:a.position.x,y:a.position.y+2,z:a.position.z},"#16576b",1.6);
    }
    for(let i=0;i<COURSE_NODES.length-1;i++){
      const from=COURSE_NODES[i]!,to=COURSE_NODES[i+1]!;
      const arrow=CreateCylinder(`course-direction-${i}`,{diameterTop:0,diameterBottom:2,height:2.5,tessellation:3},this.scene);
      arrow.position.set(from.x,from.y+0.08,from.z);
      arrow.rotation.x=Math.PI/2;arrow.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
      arrow.material=this.scene.getMaterialByName("skyline-marker-0");
    }
    this.courseSign("long-course-start","20 RINGS · START",{x:0,y:3,z:-43},"#127a80",5);
    this.courseSign("long-course-finish","20 RINGS · FINISH",{x:COURSE_FINISH.x,y:4,z:COURSE_FINISH.z+3},"#9b327a",5);
    this.courseSign("practice-course-guide","SOUTH: COURSE START",{x:4,y:2,z:-16},"#127a80",4);
  }

  private createCourseContactShadow(): void {
    // A small soft contact cue on the new unlit supports; it has no collider.
    // The accepted real shadow remains on every original lit support.
    const mesh=new Mesh("course-contact-shadow",this.scene),data=new VertexData();
    const positions=[0,0,0],colors=[0,0,0,.22],indices:number[]=[];
    for(let i=0;i<32;i++){const a=i*Math.PI/16;positions.push(Math.cos(a),0,Math.sin(a));colors.push(0,0,0,0);}
    for(let i=0;i<32;i++)indices.push(0,(i+1)%32+1,i+1);
    data.positions=positions;data.colors=colors;data.indices=indices;
    data.normals=Array.from({length:33},()=>[0,1,0]).flat();data.applyToMesh(mesh);
    const mat=new StandardMaterial("course-contact-shadow-material",this.scene);
    mat.disableLighting=true;mat.emissiveColor=Color3.White();mat.backFaceCulling=false;
    mat.transparencyMode=StandardMaterial.MATERIAL_ALPHABLEND;mesh.hasVertexAlpha=true;
    mesh.material=mat;mesh.isPickable=false;
    mesh.parent=new TransformNode("course-contact-shadow-motion",this.scene);
    this.courseContactShadow=mesh;
  }

  private updateCourseContactShadow():void {
    const mesh=this.courseContactShadow;if(!mesh)return;
    const p=this.motion.position;
    const support=this.skylineSolids.filter(b=>p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&b.maxY<=p.y+.1)
      .sort((a,b)=>b.maxY-a.maxY)[0];
    const gap=support?p.y-support.maxY:Infinity;
    mesh.isVisible=Boolean(support&&(support.id===STREET.id||COURSE_ROOFS.some(b=>b.id===support.id))&&gap<4&&!this.traversal.surfaceId);
    if(mesh.isVisible&&support){mesh.position.set(p.x,support.maxY+.018,p.z);mesh.scaling.set(.72+gap*.1,1,.72+gap*.1);mesh.visibility=1-gap/4;}
  }

  private courseSign(name:string,label:string,p:Vec3Data,color:string,width:number):void {
    const tex=new DynamicTexture(name+"-original-type",{width:512,height:128},this.scene,true);
    const ctx=tex.getContext() as CanvasRenderingContext2D;ctx.fillStyle=color;ctx.fillRect(0,0,512,128);
    ctx.fillStyle="#fff5cf";ctx.font="bold 35px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,256,64);
    tex.update();const mat=this.material(name+"-mat","#ffffff");mat.diffuseTexture=tex;mat.emissiveColor=new Color3(.13,.13,.13);
    const sign=CreateBox(name,{width,height:width/4,depth:.05},this.scene);sign.position.set(p.x,p.y,p.z);sign.material=mat;
    sign.billboardMode=Mesh.BILLBOARDMODE_Y;sign.isPickable=false;
  }

  private createTraining(): void {
    this.skylineSolids.push(...TRAINING_SOLIDS);
    for (const b of TRAINING_SOLIDS) {
      const mesh = CreateBox(
        b.id,
        {
          width: b.maxX - b.minX,
          height: b.maxY - b.minY,
          depth: b.maxZ - b.minZ,
        },
        this.scene,
      );
      mesh.position.set(
        (b.minX + b.maxX) / 2,
        (b.minY + b.maxY) / 2,
        (b.minZ + b.maxZ) / 2,
      );
      mesh.material = this.material(
        `${b.id}-material`,
        b.id === "climb-wall"
          ? "#698bac"
          : b.id === "climb-ceiling"
            ? "#bba678"
            : b.id === "pull-finish-ledge"
              ? "#e8bd49"
              : "#344d89",
      );
      mesh.metadata = {
        authoredRole:
          SURFACES.find((s) => s.id === b.id)?.role ?? "ORDINARY_SOLID",
      };
      mesh.receiveShadows = true;
      this.addStaticPhysics(mesh);
    }
    const stripe = this.material("climb-stripe", "#c4e5ee");
    for (let y = 1; y < 11; y += 1.5) {
      const line = CreateBox(
        `wall-grip-${y}`,
        { width: 19.5, height: 0.12, depth: 0.035 },
        this.scene,
      );
      line.position.set(0, y, -60.975);
      line.material = stripe;
    }
    const startStripe = CreateBox(
      "wall-start-stripe",
      { width: 0.15, height: 10, depth: 0.04 },
      this.scene,
    );
    startStripe.position.set(0, 5, -60.97);
    startStripe.material = this.material("wall-start-gold", "#f3c653");
    for (let z = -59; z <= -50; z += 2) {
      const grip = CreateBox(
        `ceiling-grip-${z}`,
        { width: 6.5, height: 0.035, depth: 0.12 },
        this.scene,
      );
      grip.position.set(-6.5, 10.975, z);
      grip.material = stripe;
    }
    const ring = CreateTorus(
      "training-ring",
      { diameter: 2.2, thickness: 0.17, tessellation: 24 },
      this.scene,
    );
    ring.position.set(0, 16, -29);
    ring.rotation.x = Math.PI / 2;
    ring.material = this.scene.getMaterialByName("anchor-available");
    this.anchorMeshes.set("training-ring", ring);
    for (const o of this.pullObjects) {
      const mesh = CreateBox(
        o.id,
        { width: o.half.x * 2, height: o.half.y * 2, depth: o.half.z * 2 },
        this.scene,
      );
      mesh.material = this.material(
        `${o.id}-material`,
        o.id === "route-step"
          ? "#e5ddc5"
          : o.role === "TOO_HEAVY"
            ? "#655973"
            : o.role === "PULLABLE_LIMITED"
              ? "#9dbead"
              : "#536078",
      );
      mesh.metadata = { authoredRole: o.role };
      this.pullMeshes.set(o.id, mesh);
    }
    const gold = this.material("pull-floor-mark", "#f3c653");
    for (const x of [-8.5, -4.8]) {
      const mark = CreateBox(
        `pull-mark-${x}`,
        { width: 0.08, height: 0.035, depth: 2.5 },
        this.scene,
      );
      mark.position.set(x, 0.025, -51);
      mark.material = gold;
    }
    for (const z of [-15, -19, -41, -47]) {
      const arrow = CreateBox(
        `training-arrow-${z}`,
        { width: 0.5, height: 0.04, depth: 1.4 },
        this.scene,
      );
      arrow.position.set(0, 0.03, z);
      arrow.material = gold;
    }
    const finish = CreateTorus(
      "climb-finish-ring",
      { diameter: 1.5, thickness: 0.12, tessellation: 20 },
      this.scene,
    );
    finish.position.set(-11, 4.2, -51);
    finish.rotation.x = Math.PI / 2;
    finish.material = gold;
  }

  private createSkyline(): void {
    const colors = ["#2456a7", "#785cd4", "#edaf37", "#149ab3", "#de4f8b"];
    for (const [index, roof] of ROOFS.slice(1).entries()) {
      const mesh = CreateBox(
        roof.id,
        {
          width: roof.maxX - roof.minX,
          height: roof.maxY - roof.minY,
          depth: roof.maxZ - roof.minZ,
        },
        this.scene,
      );
      mesh.position.set(
        (roof.minX + roof.maxX) / 2,
        (roof.minY + roof.maxY) / 2,
        (roof.minZ + roof.maxZ) / 2,
      );
      mesh.material = this.material(`${roof.id}-material`, colors[index]!);
      mesh.receiveShadows = true;
      this.addStaticPhysics(mesh);
      const trim = CreateBox(
        `${roof.id}-trim`,
        {
          width: roof.maxX - roof.minX,
          depth: roof.maxZ - roof.minZ,
          height: 0.1,
        },
        this.scene,
      );
      trim.position.set(mesh.position.x, roof.maxY + 0.01, mesh.position.z);
      trim.material = this.material(
        `${roof.id}-trim-mat`,
        "#40efd0",
        "#40efd0",
      );
    }
    const available = this.material("anchor-available", "#35ffee", "#35ffee");
    for (const a of COURSE_ANCHORS.slice(1)) {
      const ring = CreateTorus(
        a.id,
        { diameter: 2, thickness: 0.22, tessellation: 24 },
        this.scene,
      );
      ring.position.copyFromFloats(a.position.x, a.position.y, a.position.z);
      ring.rotation.x = Math.PI / 2;
      ring.material = available;
      ring.metadata = { swingAnchorId: a.id, eligible: true };
      this.anchorMeshes.set(a.id, ring);
      const core = CreateSphere(
        `${a.id}-core`,
        { diameter: 0.48, segments: 10 },
        this.scene,
      );
      core.position.copyFrom(ring.position);
      core.material = available;
    }
    this.material("anchor-target", "#ffec63", "#ffec63");
    this.material("anchor-attached", "#ffffff", "#ffffff");
    for (const [index, p] of CHECKPOINTS.entries()) {
      const marker = CreateTorus(
        `skyline-roof-marker-${index}`,
        { diameter: 3, thickness: 0.16, tessellation: 24 },
        this.scene,
      );
      marker.position.set(p.x, p.y + 0.14, p.z);
      marker.material = this.material(
        `skyline-marker-${index}`,
        index === 4 ? "#ff65c6" : "#fff376",
        index === 4 ? "#ff65c6" : "#fff376",
      );
      if (index < 4) {
        const tip = CreateCylinder(
          `skyline-arrow-${index}`,
          { diameterTop: 0, diameterBottom: 1.6, height: 2, tessellation: 3 },
          this.scene,
        );
        tip.position.set(p.x, p.y + 0.15, p.z + 2);
        tip.rotation.x = Math.PI / 2;
        tip.material = marker.material;
        if (index === 3) {
          tip.position.set(p.x + 3, p.y + 0.15, p.z);
          tip.rotation.z = -Math.PI / 2;
          tip.rotation.x = 0;
        }
      }
    }
    this.webLine = CreateLines(
      "active-hand-web",
      { points: [Vector3.Zero(), Vector3.Zero()], updatable: true },
      this.scene,
    );
    this.webLine.color = Color3.White();
    this.webLine.setEnabled(false);
    this.wristFlash = CreateSphere(
      "right-wrist-firing",
      { diameter: 0.22, segments: 8 },
      this.scene,
    );
    this.wristFlash.material = this.scene.getMaterialByName("anchor-attached");
    this.wristFlash.setEnabled(false);
  }

  private renderSwing(): void {
    const pulled = this.pullObjects.find((o) => o.id === this.traversal.pullId);
    const web =
      this.swing.web ??
      (pulled ? { anchor: pulled.position, anchorId: pulled.id } : null);
    for (const [id, mesh] of this.anchorMeshes) {
      const attached = web?.anchorId === id,
        target = this.swing.targetId === id;
      mesh.material = this.scene.getMaterialByName(
        attached
          ? "anchor-attached"
          : target
            ? "anchor-target"
            : "anchor-available",
      );
      mesh.scaling.setAll(attached ? 1.2 : target ? 1.18 : 1);
      mesh.visibility =
        distance(this.motion.position, {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        }) < 45
          ? 1
          : 0.28;
    }
    if (this.rightArm) {
      // Two-segment arm reaches the unchanged gameplay wrist origin exactly.
      const d = Math.hypot(0.44, 0.71);
      this.rightArm.rotation.x = web ? Math.atan2(-0.71,0.44) - Math.acos((0.55**2+d*d-0.52**2)/(2*0.55*d)) : this.traversal.surfaceId ? -2.5 : this.gait.arms[1];
      this.rightArm.rotation.z = 0;
      this.rig.elbows[1]!.rotation.x = web ? Math.acos((d*d-0.55**2-0.52**2)/(2*0.55*0.52)) : 0;
    }
    this.webLine?.setEnabled(Boolean(web));
    this.wristFlash?.setEnabled(Boolean(web));
    if (web && this.webLine && this.wristFlash) {
      const h = handOrigin(this.motion),
        origin = new Vector3(h.x, h.y, h.z),
        target = new Vector3(web.anchor.x, web.anchor.y, web.anchor.z);
      const amount =
        this.swing.phase === "WEB_FIRING" ||
        this.traversal.phase === "PULL_WEB_FIRING"
          ? Math.max(
              0.1,
              1 -
                Math.max(this.swing.phaseTime, this.traversal.phaseTime) / 0.12,
            )
          : 1;
      CreateLines(
        "active-hand-web",
        {
          points: [origin, Vector3.Lerp(origin, target, amount)],
          instance: this.webLine,
        },
        this.scene,
      );
      this.wristFlash.position.copyFrom(origin);
      this.wristFlash.scaling.setAll(
        this.swing.phase === "WEB_FIRING" ? 1.8 : 1,
      );
    }
  }

  private renderFrame = (): void => {
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameAt) / 1000, MAX_FRAME_DELTA);
    this.lastFrameAt = now;
    this.fpsFrameCount += 1;
    if (now - this.fpsWindowAt >= 1000) {
      this.fps = Math.round(
        (this.fpsFrameCount * 1000) / (now - this.fpsWindowAt),
      );
      this.fpsSamples.push(this.fps);
      if (this.fpsSamples.length > 60) this.fpsSamples.shift();
      if (this.settings.adaptiveQuality && this.fps < 30) {
        this.engine.setHardwareScalingLevel(
          Math.min(2.25, this.engine.getHardwareScalingLevel() + 0.2),
        );
      }
      this.fpsWindowAt = now;
      this.fpsFrameCount = 0;
    }
    if (this.active && !this.paused) this.tick(delta);
    this.heroRoot.position.copyFromFloats(
      this.motion.position.x,
      this.motion.position.y,
      this.motion.position.z,
    );
    this.heroRoot.rotation.y = this.motion.facingYaw;
    const desiredPitch =
      this.traversal.cameraMode === "ceiling" ? Math.PI / 2 : 0;
    this.heroRoot.rotation.x +=
      (desiredPitch - this.heroRoot.rotation.x) * Math.min(1, delta * 8);
    // Visual rotation about chest height keeps the unchanged upright collision capsule inside the surface bounds.
    this.heroRoot.position.y += (1 - Math.cos(this.heroRoot.rotation.x)) * 2.6;
    if (!this.paused)
      this.legPose = swingLegPose(this.legPose, this.motion, this.swing, delta);
    if (!this.paused) {
      const actual = distance(this.motion.position, this.lastVisualPosition) / Math.max(0.001,delta);
      this.gait = gaitPose(this.gait, this.traversal.surfaceId ? Math.min(3.5,actual) : Math.hypot(this.motion.velocity.x,this.motion.velocity.z),
        this.traversal.surfaceId ? "climb" : this.motion.grounded ? "ground" : "air", this.legPose, delta);
    }
    this.lastVisualPosition = copyVec3(this.motion.position);
    this.heroRoot.position.y += this.gait.lift;
    for (const i of [0,1] as const) {
      this.rig.hips[i]!.rotation.x = this.gait.hips[i];
      this.rig.knees[i]!.rotation.x = this.gait.knees[i];
      this.rig.ankles[i]!.rotation.x = -this.gait.hips[i] - this.gait.knees[i];
      this.rig.arms[i]!.rotation.x = this.traversal.surfaceId ? -2.5 : this.gait.arms[i];
    }
    for (const o of this.pullObjects) {
      const mesh = this.pullMeshes.get(o.id)!;
      mesh.position.set(o.position.x, o.position.y, o.position.z);
      mesh.renderOutline = o.id === this.traversal.targetId;
      mesh.outlineWidth = 0.045;
      mesh.outlineColor = Color3.FromHexString("#ffe394");
    }
    const attached = Boolean(this.traversal.surfaceId);
    this.surfaceCameraBlend +=
      ((attached ? 1 : 0) - this.surfaceCameraBlend) * Math.min(1, delta * 7);
    if (attached || this.surfaceCameraBlend > 0.01) {
      this.camera.beta =
        this.groundBeta * (1 - this.surfaceCameraBlend) +
        1.52 * this.surfaceCameraBlend;
      this.camera.radius = 10.5;
      const a = Math.atan2(
        Math.sin(this.camera.alpha),
        Math.cos(this.camera.alpha),
      );
      const bounded = Math.max(0.4, Math.min(Math.PI - 0.4, a));
      this.camera.alpha += (bounded - a) * Math.min(1, delta * 6);
    }

    const target = new Vector3(
      this.motion.position.x,
      this.motion.position.y +
        (this.motion.position.y < -1 ? 1.7 : this.training.active
          ? this.traversal.surfaceId
            ? 1.55
            : 3.4
          : this.skyline.active
            ? 3.4
            : 1.55),
      this.motion.position.z,
    );
    this.camera.target.copyFrom(
      Vector3.Lerp(this.camera.target, target, Math.min(1, delta * 10)),
    );
    const desiredRadius = this.traversal.surfaceId || this.motion.position.y < -1 ? 10.5 : this.skyline.active ? 16 : 10.5;
    // Near street facades, a smoothed target may trail through a corner. Keep
    // the target on the clear side of that wall before tracing the camera ray.
    if (cameraClearFraction(target,this.camera.target,this.skylineSolids)<1) this.camera.target.copyFrom(target);
    const t = this.camera.target;
    const wanted = { x: t.x + desiredRadius*Math.cos(this.camera.alpha)*Math.sin(this.camera.beta),
      y: t.y + desiredRadius*Math.cos(this.camera.beta), z: t.z + desiredRadius*Math.sin(this.camera.alpha)*Math.sin(this.camera.beta) };
    const freeRadius = cameraSafeRadius(t,wanted,desiredRadius,this.skylineSolids);
    this.camera.radius = freeRadius < this.camera.radius ? freeRadius : Math.min(freeRadius,this.camera.radius + delta*8);
    this.renderSwing();
    this.updateCourseContactShadow();
    this.scene.render();
    if (now - this.lastHudAt > 100) {
      this.lastHudAt = now;
      this.emitFrame(this.latestActions?.source ?? "keyboard-mouse");
    }
  };

  private latestActions: SemanticActions | null = null;

  update(actions: SemanticActions): void {
    this.latestActions = actions;
    if (!this.active || this.paused || performance.now() < this.recoveringUntil)
      return;
    const sensitivity = this.settings.cameraSensitivity * 0.0035;
    this.camera.alpha -= actions.lookX * sensitivity;
    const invert = this.settings.invertY ? -1 : 1;
    if (this.training.active) {
      if (!this.traversal.surfaceId)
        this.groundBeta = Math.max(
          0.55,
          Math.min(
            1.65,
            this.groundBeta + actions.lookY * sensitivity * invert,
          ),
        );
      this.camera.beta =
        this.groundBeta * (1 - this.surfaceCameraBlend) +
        1.52 * this.surfaceCameraBlend;
    } else {
      this.camera.beta = Math.max(
        0.55,
        Math.min(1.65, this.camera.beta + actions.lookY * sensitivity * invert),
      );
      this.groundBeta = this.camera.beta;
    }
    if (actions.recenterPressed)
      this.camera.alpha = -Math.PI / 2 - this.motion.facingYaw;
    if (actions.jumpPressed) this.pendingJump = true;
  }

  private tick(delta: number): void {
    const actions = this.latestActions;
    if (!actions || performance.now() < this.recoveringUntil) return;
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      const cameraForward = {
        x: -Math.cos(this.camera.alpha),
        y: 0,
        z: -Math.sin(this.camera.alpha),
      };
      const before = this.motion,
        priorSwing = this.swing;
      const target = this.camera.target;
      const cameraPosition = this.camera.position;
      const result = stepTraversal(
        this.motion,
        this.traversal,
        this.swing,
        this.pullObjects,
        {
          moveX: actions.moveX,
          moveY: actions.moveY,
          run: actions.run,
          jumpPressed: this.pendingJump,
          swingHeld: Boolean(actions.swingHeld),
          climbHeld: Boolean(actions.climbHeld),
          pullHeld: Boolean(actions.pullHeld),
          cameraForward,
          aim: {
            origin: {
              x: cameraPosition.x,
              y: cameraPosition.y,
              z: cameraPosition.z,
            },
            direction: {
              x: target.x - cameraPosition.x,
              y: target.y - cameraPosition.y,
              z: target.z - cameraPosition.z,
            },
          },
        },
        COURSE_ANCHORS,
        this.skylineSolids,
        [...SURFACES, ...RECOVERY_WALLS],
      );
      this.motion = result.motion;
      this.swing = result.swing;
      this.traversal = result.traversal;
      this.pullObjects = result.objects;
      const oldCourse = this.course;
      this.course = advanceCourse(this.course, before, this.motion, priorSwing, this.swing);
      if (oldCourse.next !== this.course.next || oldCourse.completed !== this.course.completed) this.pendingCheckpoint = true;
      const priorTraining = this.training;
      this.training = advanceTraining(
        this.training,
        before,
        this.motion,
        priorSwing,
        this.swing,
        this.traversal,
        this.pullObjects,
      );
      if (
        this.training.checkpoint !== priorTraining.checkpoint ||
        this.training.active !== priorTraining.active
      ) {
        this.checkpoint = trainingCheckpoint(this.training.checkpoint);
        this.pendingCheckpoint = true;
      }

      const route = advanceSkyline(
        this.skyline,
        before,
        this.motion,
        priorSwing,
        this.swing,
      );
      this.skyline = route.route;
      if (route.changed) {
        if (this.skyline.active) {
          this.camera.radius = 16;
          this.camera.fov = 1.08;
        }
        this.checkpoint = copyVec3(CHECKPOINTS[this.skyline.stage]!);
        this.pendingCheckpoint = true;
      }
      if (this.pendingCheckpoint && this.isSafe()) {
        this.pendingCheckpoint = false;
        this.callbacks.onProgress(
          this.progress,
          this.course.active ? courseLabel(this.course,this.motion.position.y < -1) : this.training.active
            ? TRAINING_LABELS[this.training.stage]!
            : ROUTE_LABELS[this.skyline.stage]!,
        );
      }
      this.pendingJump = false;
      this.accumulator -= FIXED_STEP;
      steps += 1;
      this.checkProgress();
      if (this.motion.position.y < STREET.minY - 10) {
        this.recoverFromFall();
        break;
      }
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.emitFrame(actions.source);
  }

  private checkProgress(): void {
    if (this.training.active || this.skyline.active || !this.motion.grounded)
      return;
    let next = this.progress;
    let label = this.progressLabel;
    let checkpoint = this.checkpoint;
    if (this.progress === 0 && this.motion.position.z >= 0) {
      next = 1;
      label = "Reach the golden sun pad";
      checkpoint = { x: 0, y: 0, z: 1.2 };
    } else if (
      this.progress === 1 &&
      this.motion.position.x >= 3.2 &&
      this.motion.position.z >= 8
    ) {
      next = 2;
      label = "Race to the pink finish beacon";
      checkpoint = { x: 5, y: 0, z: 10 };
    } else if (
      this.progress === 2 &&
      this.motion.position.x <= -2.2 &&
      this.motion.position.z >= 16
    ) {
      next = 3;
      label = "Practice route complete — explore or save";
      checkpoint = { x: -4, y: 0, z: 18 };
    }
    if (next !== this.progress) {
      this.progress = next;
      this.progressLabel = label;
      this.checkpoint = checkpoint;
      this.callbacks.onProgress(next, label);
    }
  }

  private recoverFromFall(): void {
    this.health = Math.max(0, this.health - 25);
    const fullRetry = this.health === 0;
    if (fullRetry) this.health = MAX_HEALTH;
    this.motion = {
      position: copyVec3(this.checkpoint),
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      facingYaw: 0,
    };
    this.swing = clearSwing(this.swing, "FALL_RECOVERY");
    this.resetTrainingTransient("FALL_RECOVERY");
    this.skyline = resetSegment(this.skyline);
    this.accumulator = 0;
    this.latestActions = null;
    this.pendingJump = false;
    this.recoveringUntil = performance.now() + 650;
    this.callbacks.onRecovery(this.health, fullRetry);
  }

  private emitFrame(source: SemanticActions["source"]): void {
    this.callbacks.onFrame({
      active: this.active,
      paused: this.paused,
      safe: this.isSafe(),
      health: this.health,
      maxHealth: MAX_HEALTH,
      progress: this.progress,
      progressLabel: this.motion.position.y < -1 || this.course.active ? courseLabel(this.course,this.motion.position.y < -1) : this.training.active
        ? TRAINING_LABELS[this.training.stage]!
        : this.skyline.active
          ? ROUTE_LABELS[this.skyline.stage]!
          : this.progressLabel,
      position: copyVec3(this.motion.position),
      grounded: this.motion.grounded,
      fps: this.fps,
      cameraAlpha: this.camera.alpha,
      cameraBeta: this.camera.beta,
      cameraRadius: this.camera.radius,
      cameraPosition: copyVec3(this.camera.position),
      inputSource: source,
      velocity: copyVec3(this.motion.velocity),
      swing: structuredClone(this.swing),
      hand: handOrigin(this.motion),
      skyline: structuredClone(this.skyline),
      traversal: structuredClone(this.traversal),
      training: structuredClone(this.training),
      pullObjects: structuredClone(this.pullObjects),
      legPose: structuredClone(this.legPose),
      gait: structuredClone(this.gait),
      course: structuredClone(this.course),
      surfaceCameraBlend: this.surfaceCameraBlend,
      heroPitch: this.heroRoot.rotation.x,
    });
  }

  start(payload?: RunSavePayload): void {
    this.active = true;
    this.paused = false;
    this.fpsSamples.length = 0;
    this.fpsWindowAt = performance.now();
    this.fpsFrameCount = 0;
    this.health = payload?.health ?? MAX_HEALTH;
    this.progress = payload?.progress ?? 0;
    this.progressLabel = payload?.skyline
      ? [
          "Reach the glowing sky gate",
          "Reach the golden sun pad",
          "Race to the pink finish beacon",
          "Practice route complete — explore or save",
        ][Math.min(payload.progress, 3)]!
      : (payload?.progressLabel ?? "Reach the glowing sky gate");
    this.traversal = newTraversal();
    this.traversal.freshClimb = true;
    this.traversal.freshPull = true;
    this.course = newCourse(payload?.course);
    this.gait = newGait();
    this.training = payload?.climb
      ? restoreTraining(payload.climb)
      : newTrainingRoute();
    this.pullObjects = newPullObjects();
    this.legPose = newLegPose();
    this.heroRoot.rotation.x = 0;
    this.surfaceCameraBlend = 0;
    this.swing = newSwing();
    this.swing.freshRequired = true;
    this.skyline = newSkyline();
    this.pendingCheckpoint = false;
    if (payload?.skyline) {
      this.skyline = {
        ...this.skyline,
        active: true,
        stage: payload.skyline.checkpoint,
        completed: payload.skyline.completed,
      };
    }
    this.checkpoint = copyVec3(
      payload?.climb
        ? trainingCheckpoint(payload.climb.checkpoint)
        : payload?.skyline
          ? CHECKPOINTS[payload.skyline.checkpoint]!
          : (payload?.checkpoint ?? START),
    );
    this.motion = {
      position: restoreSafePosition(payload?.position ?? this.checkpoint, this.skylineSolids, this.checkpoint,
        [...this.skylineSolids, ...this.pullObjects.map(o => ({ id:o.id, minX:o.position.x-o.half.x, maxX:o.position.x+o.half.x,
          minY:o.position.y-o.half.y,maxY:o.position.y+o.half.y,minZ:o.position.z-o.half.z,maxZ:o.position.z+o.half.z }))]),
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      facingYaw: 0,
    };
    this.accumulator = 0;
    this.pendingJump = false;
    this.recoveringUntil = 0;
    this.camera.alpha = this.training.active ? Math.PI / 2 : -Math.PI / 2;
    this.camera.beta = 1.08;
    this.groundBeta = 1.08;
    this.camera.radius = this.skyline.active ? 16 : 10.5;
    this.camera.fov = this.skyline.active ? 1.08 : 0.8;
    this.emitFrame("keyboard-mouse");
  }

  stop(): void {
    this.swing = clearSwing(this.swing);
    this.resetTrainingTransient();
    this.active = false;
    this.paused = true;
    this.latestActions = null;
    this.accumulator = 0;
  }

  pause(): boolean {
    if (!this.active || this.paused) return false;
    this.paused = true;
    this.latestActions = null;
    this.pendingJump = false;
    this.accumulator = 0;
    // Pausing is an input lifecycle boundary: do not let pre-pause running
    // momentum act like a held control after the player resumes.
    if (this.motion.grounded) {
      this.motion.velocity.x = 0;
      this.motion.velocity.z = 0;
    }
    this.swing = clearSwing(this.swing);
    this.traversal = clearTraversal(this.traversal);
    for (const o of this.pullObjects) o.speed = 0;
    this.emitFrame("keyboard-mouse");
    return true;
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.lastFrameAt = performance.now();
    this.emitFrame("keyboard-mouse");
  }

  restart(): void {
    this.swing = clearSwing(this.swing);
    this.resetTrainingTransient();
    this.skyline = resetSegment(this.skyline);
    this.latestActions = null;
    this.health = MAX_HEALTH;
    this.motion = {
      position: copyVec3(this.checkpoint),
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      facingYaw: 0,
    };
    this.recoveringUntil = 0;
    this.accumulator = 0;
    this.pendingJump = false;
    this.emitFrame("keyboard-mouse");
  }

  isSafe(): boolean {
    return (
      this.active &&
      safeTraversal(
        this.motion,
        this.traversal,
        performance.now() < this.recoveringUntil,
        this.pullObjects,
      ) &&
      safeToSave(
        this.motion,
        this.swing,
        performance.now() < this.recoveringUntil,
      )
    );
  }

  snapshot(
    slot: 1 | 2 | 3,
    difficulty: RunSavePayload["difficulty"],
  ): RunSavePayload {
    return {
      schemaVersion: 1,
      ...(this.course.active || this.course.next > 0 || this.course.completed ? { course: { version: 1 as const, next: this.course.next, completed: this.course.completed, active: this.course.active } } : {}),
      ...(this.training.active
        ? {
            climb: {
              version: 1 as const,
              checkpoint: this.training.checkpoint,
              completed: this.training.completed,
            },
          }
        : {}),
      ...(this.skyline.active
        ? {
            skyline: {
              version: 1 as const,
              checkpoint: this.skyline.stage,
              completed: this.skyline.completed,
            },
          }
        : {}),
      slot,
      difficulty,
      health: this.health,
      maxHealth: MAX_HEALTH,
      position: copyVec3(this.motion.position),
      checkpoint: copyVec3(this.checkpoint),
      progress: this.progress,
      progressLabel: this.motion.position.y < -1 || this.course.active ? courseLabel(this.course,this.motion.position.y < -1) : this.training.active
        ? TRAINING_LABELS[this.training.stage]!
        : this.skyline.active
          ? ROUTE_LABELS[this.skyline.stage]!
          : this.progressLabel,
      costumeId: "skyline-teal",
      completion: false,
      updatedAt: Date.now(),
    };
  }

  applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    const adaptiveScale = window.innerWidth >= 1600 ? 2.25 : 1.4;
    this.engine.setHardwareScalingLevel(
      settings.adaptiveQuality ? adaptiveScale : 1,
    );
  }

  performanceSummary(): {
    samples: number[];
    minimum: number | null;
    current: number;
  } {
    return {
      samples: [...this.fpsSamples],
      minimum: this.fpsSamples.length ? Math.min(...this.fpsSamples) : null,
      current: this.fps,
    };
  }

  setFixturePosition(position: Vec3Data): void {
    this.swing = clearSwing(this.swing);
    this.skyline = { ...resetSegment(this.skyline), valid: false };
    this.traversal = clearTraversal(this.traversal);
    this.training.valid = false;
    this.course.valid = false;
    this.motion.position = copyVec3(position);
    this.motion.velocity = { x: 0, y: 0, z: 0 };
    this.motion.grounded = false;
    this.motion.facingYaw = 0;
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = 1.08;
  }

  private resetTrainingTransient(
    phase: TraversalState["phase"] = "FREE_OR_GROUNDED",
  ): void {
    this.traversal = clearTraversal(this.traversal, phase);
    this.heroRoot.rotation.x = 0;
    this.surfaceCameraBlend = 0;
    this.legPose = newLegPose();
    this.gait = newGait();
    if (this.training.active) {
      this.camera.alpha = Math.PI / 2;
      this.groundBeta = 1.08;
      this.camera.beta = 1.08;
    }
    this.pullObjects = newPullObjects();
    if (this.training.active)
      this.training = {
        ...restoreTraining({
          version: 1,
          checkpoint: this.training.checkpoint,
          completed: this.training.completed,
        }),
        completions: this.training.completions,
      };
  }
  replayCourse(): void {
    this.course = newCourse();
    // Replay only this activity. Preserve earned S2/S3 checkpoints/completion.
    this.checkpoint = copyVec3(COURSE_START);
    this.restart();
    this.camera.alpha = -Math.PI / 2;
  }

  replayTraining(): void {
    this.course.active = false;
    this.training = {
      ...newTrainingRoute(),
      active: true,
      completed: this.training.completed,
      completions: this.training.completions,
    };
    this.checkpoint = trainingCheckpoint(0);
    this.restart();
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = 1.08;
    this.groundBeta = 1.08;
  }

  replaySkyline(): void {
    this.course.active = false;
    this.training = newTrainingRoute();
    this.skyline = {
      ...newSkyline(),
      completed: this.skyline.completed,
      completions: this.skyline.completions,
    };
    this.checkpoint = copyVec3(SKY_START);
    this.restart();
  }

  stateForTests(): WorldFrame {
    return {
      active: this.active,
      paused: this.paused,
      safe: this.isSafe(),
      health: this.health,
      maxHealth: MAX_HEALTH,
      progress: this.progress,
      progressLabel: this.motion.position.y < -1 || this.course.active ? courseLabel(this.course,this.motion.position.y < -1) : this.training.active
        ? TRAINING_LABELS[this.training.stage]!
        : this.skyline.active
          ? ROUTE_LABELS[this.skyline.stage]!
          : this.progressLabel,
      position: copyVec3(this.motion.position),
      grounded: this.motion.grounded,
      fps: this.fps,
      cameraAlpha: this.camera.alpha,
      cameraBeta: this.camera.beta,
      cameraRadius: this.camera.radius,
      cameraPosition: copyVec3(this.camera.position),
      inputSource: this.latestActions?.source ?? "keyboard-mouse",
      velocity: copyVec3(this.motion.velocity),
      swing: structuredClone(this.swing),
      hand: handOrigin(this.motion),
      skyline: structuredClone(this.skyline),
      traversal: structuredClone(this.traversal),
      training: structuredClone(this.training),
      pullObjects: structuredClone(this.pullObjects),
      legPose: structuredClone(this.legPose),
      gait: structuredClone(this.gait),
      course: structuredClone(this.course),
      legWorld: this.legs.map((leg) => {
        const matrix = leg.computeWorldMatrix(true);
        const hip = Vector3.TransformCoordinates(Vector3.Zero(), matrix);
        const tip = Vector3.TransformCoordinates(
          new Vector3(0, -1.54, 0),
          matrix,
        );
        const forward = Vector3.TransformNormal(
          new Vector3(0, 0, 1),
          this.heroRoot.computeWorldMatrix(true),
        ).normalize();
        return {
          hip: copyVec3(hip),
          tip: copyVec3(tip),
          forwardDisplacement: Vector3.Dot(tip.subtract(hip), forward),
        };
      }),
      surfaceCameraBlend: this.surfaceCameraBlend,
      heroPitch: this.heroRoot.rotation.x,
    };
  }

  private resize = (): void => this.engine.resize();

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    this.engine.stopRenderLoop(this.renderFrame);
    for (const body of this.physicsBodies) body.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
