import { describe, expect, it } from 'vitest';
import { layoutOverlaps } from '../src/core/pilot/layout';

const assets = [
  { id: 'desk', width: 2, depth: 1 },
  { id: 'sofa', width: 4, depth: 2 },
];
const place = (
  id: string,
  assetId: string,
  x: number,
  z: number,
  rotation = 0,
) => ({
  id,
  assetId,
  x,
  z,
  rotation,
});

describe('F267 editor overlap warning', () => {
  it('flags overlapping footprints once per pair', () => {
    const doc = {
      placements: [
        place('a', 'desk', 2, 2),
        place('b', 'desk', 3, 2),
        place('c', 'sofa', 10, 10),
      ],
    };
    expect(layoutOverlaps(doc, assets)).toEqual([{ placementIds: ['a', 'b'] }]);
  });

  it('treats shared edges as touching, not overlapping', () => {
    const doc = {
      placements: [
        place('a', 'desk', 2, 2),
        place('b', 'desk', 4, 2),
        place('c', 'desk', 2, 3),
      ],
    };
    expect(layoutOverlaps(doc, assets)).toEqual([]);
  });

  it('uses the rotated footprint', () => {
    // A 4×2 sofa turned a quarter becomes 2×4 and now reaches the desk above it.
    const flat = {
      placements: [place('sofa', 'sofa', 5, 5), place('desk', 'desk', 5, 3.2)],
    };
    expect(layoutOverlaps(flat, assets)).toEqual([]);
    const turned = {
      placements: [
        place('sofa', 'sofa', 5, 5, 90),
        place('desk', 'desk', 5, 3.2),
      ],
    };
    expect(layoutOverlaps(turned, assets)).toEqual([
      { placementIds: ['sofa', 'desk'] },
    ]);
  });

  it('skips placements whose asset is unknown', () => {
    const doc = {
      placements: [place('a', 'desk', 2, 2), place('ghost', 'missing', 2, 2)],
    };
    expect(layoutOverlaps(doc, assets)).toEqual([]);
  });
});
