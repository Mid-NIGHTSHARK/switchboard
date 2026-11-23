/**
 * Arc-length parameterized quadratic Bézier math and automatic
 * diamond-crossing detection. Pure JS — safe in both browser and Node.
 */

export const TrackMath = {
  evalQuad(p0, p1, p2, t) {
    const mt = 1 - t;
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
    const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return { x, y, angle: Math.atan2(dy, dx) };
  },

  buildEdgeLUT(edge, nodeMap, steps = 64) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) {
      throw new Error(`TrackMath: Edge "${edge.id}" references missing node (${edge.from} -> ${edge.to})`);
    }
    const cp = edge.cp || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const lut = [];
    let total = 0;
    let prev = null;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = this.evalQuad(a, cp, b, t);
      if (prev) total += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      lut.push({ t, s: total, x: pt.x, y: pt.y, angle: pt.angle });
      prev = pt;
    }
    return { lut, length: total, cp };
  },

  sampleEdge(edge, dist) {
    const lut = edge._lut;
    if (dist <= 0) return lut[0];
    if (dist >= edge._length) return lut[lut.length - 1];

    let lo = 0;
    let hi = lut.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (lut[mid].s <= dist) lo = mid;
      else hi = mid;
    }

    const p0 = lut[lo];
    const p1 = lut[hi];
    const span = p1.s - p0.s || 1;
    const frac = (dist - p0.s) / span;

    let da = p1.angle - p0.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;

    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
      angle: p0.angle + da * frac
    };
  },

  findDiamondCrossings(edges) {
    const crossings = [];
    const segIntersect = (p1, p2, p3, p4) => {
      const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
      if (Math.abs(d) < 1e-6) return null;
      const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
      const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
      if (t > 0 && t < 1 && u > 0 && u < 1) {
        return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
      }
      return null;
    };

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const ea = edges[i];
        const eb = edges[j];
        if (ea.from === eb.from || ea.from === eb.to || ea.to === eb.from || ea.to === eb.to) continue;

        const la = ea._lut;
        const lb = eb._lut;
        let found = false;
        for (let a = 6; a < la.length - 7 && !found; a += 4) {
          for (let b = 6; b < lb.length - 7 && !found; b += 4) {
            const hit = segIntersect(la[a], la[a + 4], lb[b], lb[b + 4]);
            if (hit) {
              crossings.push(hit);
              found = true;
            }
          }
        }
      }
    }
    return crossings;
  }
};
