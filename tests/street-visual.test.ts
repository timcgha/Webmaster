import {describe,it,expect} from 'vitest';
import {paintedStreet,STREET_QUAD_TRIANGLES} from '../src/core/street-visual';
import {CreateGroundVertexData} from '@babylonjs/core/Meshes/Builders/groundBuilder.pure';
import {STREET} from '../src/core/course';

describe('WM004 bounded opaque street rendering',()=>{
  it('faces the playable upper side using the same front winding as Babylon ground',()=>{
    const crossY=(p:readonly number[],ids:readonly number[])=>{
      const a=ids[0]!*3,b=ids[1]!*3,c=ids[2]!*3;
      return (p[b+2]!-p[a+2]!)*(p[c]!-p[a]!)-(p[b]!-p[a]!)*(p[c+2]!-p[a+2]!);
    };
    const ground=CreateGroundVertexData({width:1,height:1});
    const frontSign=Math.sign(crossY(Array.from(ground.positions!),Array.from(ground.indices!).slice(0,3)));
    expect(frontSign).not.toBe(0);
    for(const q of paintedStreet()){
      const p=[q.minX,-18,q.minZ,q.minX,-18,q.maxZ,q.maxX,-18,q.maxZ,q.maxX,-18,q.minZ];
      for(let n=0;n<6;n+=3)expect(Math.sign(crossY(p,STREET_QUAD_TRIANGLES.slice(n,n+3)))).toBe(frontSign);
    }
  });
  it('covers the entire unchanged solid exactly once, with no overlapping depth layers or holes',()=>{
    const q=paintedStreet();expect(q.length).toBeLessThan(600);
    expect(new Set(q.map(x=>x.color))).toEqual(new Set(['street','path','dash']));
    let area=0;
    for(const a of q){
      expect(a.minX).toBeGreaterThanOrEqual(STREET.minX);expect(a.maxX).toBeLessThanOrEqual(STREET.maxX);
      expect(a.minZ).toBeGreaterThanOrEqual(STREET.minZ);expect(a.maxZ).toBeLessThanOrEqual(STREET.maxZ);
      expect(a.maxX-a.minX).toBeGreaterThan(0);expect(a.maxZ-a.minZ).toBeGreaterThan(0);
      area+=(a.maxX-a.minX)*(a.maxZ-a.minZ);
    }
    expect(area).toBeCloseTo((STREET.maxX-STREET.minX)*(STREET.maxZ-STREET.minZ),6);
    for(let i=0;i<q.length;i++)for(let j=i+1;j<q.length;j++){
      const a=q[i]!,b=q[j]!;expect(Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)>1e-9&&Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ)>1e-9).toBe(false);
    }
  });
});
