// Botsen: niemand loopt door huizen, bomen of muren heen.
// Een zone heeft:
//   colliders: cirkels { x, z, r }
//   boxes:     rechthoeken { x, z, hw, hd } (hw/hd = halve breedte/diepte; off: true = even uit)
//   bounds:    de rand van de zone: een cirkel { x, z, r } of een rechthoek { minX, maxX, minZ, maxZ }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function collide(pos, radius, zone) {
  for (let i = 0; i < 3; i++) {
    for (const c of zone.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min) {
        if (d < 1e-4) { pos.x += min; continue; }
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    for (const b of zone.boxes) {
      if (b.off || Math.abs(pos.x - b.x) > b.hw + radius || Math.abs(pos.z - b.z) > b.hd + radius) continue;
      const nx = clamp(pos.x, b.x - b.hw, b.x + b.hw), nz = clamp(pos.z, b.z - b.hd, b.z + b.hd);
      const dx = pos.x - nx, dz = pos.z - nz, d = Math.hypot(dx, dz);
      if (d >= radius) continue;
      if (d > 1e-4) {
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        // Midden in de doos: duw naar de dichtstbijzijnde kant
        const sides = [
          [pos.x - (b.x - b.hw), () => { pos.x = b.x - b.hw - radius; }],
          [b.x + b.hw - pos.x, () => { pos.x = b.x + b.hw + radius; }],
          [pos.z - (b.z - b.hd), () => { pos.z = b.z - b.hd - radius; }],
          [b.z + b.hd - pos.z, () => { pos.z = b.z + b.hd + radius; }],
        ];
        sides.sort((p, q) => p[0] - q[0])[0][1]();
      }
    }
    const B = zone.bounds;
    if (B.r) {
      const dx = pos.x - B.x, dz = pos.z - B.z, r = Math.hypot(dx, dz);
      if (r > B.r) { pos.x = B.x + (dx * B.r) / r; pos.z = B.z + (dz * B.r) / r; }
    } else {
      pos.x = clamp(pos.x, B.minX, B.maxX);
      pos.z = clamp(pos.z, B.minZ, B.maxZ);
    }
  }
}
