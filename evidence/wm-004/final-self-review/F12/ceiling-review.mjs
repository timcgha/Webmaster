// Read-only geometric corroboration of an actual inherited-route capture.
// Run from the frozen candidate with: node .wm004-derived/ceiling-review.mjs <route.json>
// This reconstructs authored presentation transforms; it is NOT a new browser observation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Matrix, Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const routePath=process.argv[2];
const routeBytes=fs.readFileSync(routePath),route=JSON.parse(routeBytes);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!=='aef5f5ae4dac555d8efed6bbc6553b87a9a2a444')throw Error('wrong frozen source');
const world=fs.readFileSync('src/game/world.ts','utf8'),hero=fs.readFileSync('src/game/hero.ts','utf8');
const baseline=execFileSync('git',['show','3962446ca00c6e1db6bd8b250335b24619a0aeab:src/game/world.ts'],{encoding:'utf8'});
const rotation=s=>s.slice(s.indexOf('    this.heroRoot.rotation.y = this.motion.facingYaw;'),s.indexOf('    if (!this.paused)\n      this.legPose = swingLegPose'));
if(rotation(world)!==rotation(baseline))throw Error('rotation lineage differs');
const p=route.state.training.ceilingStart;
const wall={minX:-10,maxX:10,minY:0,maxY:11,minZ:-62,maxZ:-61};
const shapes=['pelvis','torso','mask'].map(name=>{
 const match=hero.match(new RegExp('block\\("webmaster-'+name+'",\\[([^\\]]+)\\],\\[([^\\]]+)\\]'));
 if(!match)throw Error('shape not found');
 return {name,size:match[1].split(',').map(Number),position:match[2].split(',').map(Number)};
});
const frames=[0,.3,.6,1.2,1.56,Math.PI/2].map(pitch=>{
 // Exact renderFrame root translation and Babylon Euler composition. Climbing lift converges to zero.
 const root=new Vector3(p.x,p.y+(1-Math.cos(pitch))*2.6,p.z);
 const matrix=Matrix.Compose(Vector3.One(),Quaternion.RotationYawPitchRoll(Math.PI,pitch,0),root);
 const bounds=shapes.map(s=>{
  const vertices=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertices.push(Vector3.TransformCoordinates(new Vector3(...s.position.map((v,i)=>v+[x,y,z][i]*s.size[i]/2)),matrix));
  const min=Object.fromEntries(['x','y','z'].map(k=>[k,Math.min(...vertices.map(v=>v[k]))]));
  const max=Object.fromEntries(['x','y','z'].map(k=>[k,Math.max(...vertices.map(v=>v[k]))]));
  return {name:s.name,min,max,aabbOverlapsWall:min.x<wall.maxX&&max.x>wall.minX&&min.y<wall.maxY&&max.y>wall.minY&&min.z<wall.maxZ&&max.z>wall.minZ};
 });
 return {pitch,root,bounds};
});
// At the stable 90-degree pose all three reconstructed boxes are axis-aligned,
// so the positive pelvis intersection is exact, not merely a conservative AABB.
if(!frames.at(-1).bounds.find(b=>b.name==='pelvis').aabbOverlapsWall)throw Error('finding not corroborated');
const result={classification:'CONFIRMED_PRESENTATION_WALL_INTERSECTION; SELF_REVIEW_NOT_PASS',method:'Analytic reconstruction of exact authored transforms, corroborated by actual ordinary-route screenshots; pitch samples are reconstructed, not measured screenshot angles.',head,tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),route:{path:routePath,sha256:sha256(routeBytes),actualCeilingStart:p},sourceHashes:Object.fromEntries(['src/game/world.ts','src/game/hero.ts','src/core/traversal.ts','src/core/presentation.ts'].map(f=>[f,sha256(fs.readFileSync(f))])),inheritedRootRotationByteIdentical:true,wall,shapes,frames,limitations:'No browser or gameplay state was mutated. Intermediate AABB overlaps are conservative; the stable axis-aligned pelvis overlap is exact. Upright gameplay capsule clearance remains valid; this is a presentation defect.'};
fs.writeFileSync('../wm004-ceiling-review/geometry.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({classification:result.classification,actualCeilingStart:p,stable:frames.at(-1),inheritedRotation:result.inheritedRootRotationByteIdentical}));
