import {STREET} from './course';

export interface PaintedStreetQuad {minX:number;maxX:number;minZ:number;maxZ:number;color:'street'|'path'|'dash'}
export const STREET_COLORS={street:'#538daf',path:'#85e4cb',dash:'#fce28c'} as const;
/** One non-overlapping opaque mosaic replaces a large lit texture. These are
 * visual colors only; the original single solid STREET remains the collider. */
export function paintedStreet():PaintedStreetQuad[]{
  const vertical=[-35,20,51,83,115,150],horizontal=[-78,-10,30,66,110,146,188],quads:PaintedStreetQuad[]=[];
  const xs=[STREET.minX,...vertical.flatMap(x=>[x-1.6,x-.25,x+.25,x+1.6]),STREET.maxX].sort((a,b)=>a-b);
  const roadZ=[STREET.minZ,...horizontal.flatMap(z=>[z-2.25,z+2.25]),STREET.maxZ].sort((a,b)=>a-b);
  const dashZ=[STREET.minZ,STREET.maxZ];for(let z=STREET.minZ+2;z<STREET.maxZ;z+=8)dashZ.push(z,Math.min(z+3,STREET.maxZ));dashZ.sort((a,b)=>a-b);
  for(let i=0;i<xs.length-1;i++){
    const minX=xs[i]!,maxX=xs[i+1]!,x=(minX+maxX)/2;
    const center=vertical.some(v=>Math.abs(v-x)<.25),road=vertical.some(v=>Math.abs(v-x)<1.6);
    const zs=center?dashZ:road?[STREET.minZ,STREET.maxZ]:roadZ;
    for(let j=0;j<zs.length-1;j++){
      const minZ=zs[j]!,maxZ=zs[j+1]!,z=(minZ+maxZ)/2;
      const phase=((z-STREET.minZ-2)%8+8)%8;
      const color=center&&phase<3?'dash':road||horizontal.some(v=>Math.abs(v-z)<2.25)?'path':'street';
      if(maxZ>minZ)quads.push({minX,maxX,minZ,maxZ,color});
    }
  }
  return quads;
}
