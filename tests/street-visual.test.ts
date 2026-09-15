import {describe,it,expect} from 'vitest';
import {paintedStreet} from '../src/core/street-visual';
import {STREET} from '../src/core/course';

describe('WM004 bounded opaque street rendering',()=>{
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
