import { describe, expect, it } from 'vitest';
import { checkFit, layout } from '../src/lib/build/layout';
import { BUILD_PARTS } from '../src/data/build';

describe('build layout', () => {
  const boxes = layout();
  const fit = checkFit(boxes);

  it('draws every listed part', () => {
    const drawn = new Set(boxes.map((b) => b.part));
    for (const p of BUILD_PARTS) expect(drawn, p.id).toContain(p.id);
  });

  it('keeps solid parts inside the chassis and apart from each other', () => {
    expect(fit.outside).toEqual([]);
    expect(fit.overlaps).toEqual([]);
  });

  it('leaves room between the GPU and the pull fans', () => {
    const gap = fit.gaps.find((g) => g.label.startsWith('GPU end'))!;
    expect(gap.mm).toBeGreaterThan(0);
  });
});
