import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder.pure';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Material } from '@babylonjs/core/Materials/material';

/** The 256px shadow map cannot resolve the costume's 0.045m bevel. Preserve
 * its opaque box silhouette in that pass without drawing bevels a second time.
 * The explicit shadow render list ignores camera layers; the ordinary camera
 * excludes this layer. Visible costume geometry/materials remain untouched. */
export const HERO_SHADOW_LAYER = 0x10000000;
export function addBlockShadow(mesh: Mesh, size: [number,number,number], shadows: ShadowGenerator, material: Material): Mesh {
  const proxy=CreateBox(`${mesh.name}-shadow`,{width:size[0],height:size[1],depth:size[2]},mesh.getScene());
  proxy.parent=mesh; proxy.material=material; proxy.layerMask=HERO_SHADOW_LAYER;
  proxy.isPickable=false; proxy.metadata={shadowOnly:true,visualOnly:true,originalProcedural:true};
  shadows.addShadowCaster(proxy,false);
  return proxy;
}
