import * as THREE from 'three';

/** A fictional Singapore-inspired district. Repeated details use instancing,
 * so thousands of windows and leaves add only a handful of draw calls. */
export function buildCity(scene: THREE.Scene) {
  const city = new THREE.Group();
  city.name = 'singapore-city-backdrop';
  scene.add(city);
  let cutaway = false;
  const cutawayPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6);
  type Shape = 'box' | 'leaf' | 'trunk';
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    leaf: new THREE.IcosahedronGeometry(1, 1),
    trunk: new THREE.CylinderGeometry(0.7, 1, 1, 7),
  };
  const batches = new Map<
    string,
    { shape: Shape; color: string; cutaway: boolean; matrices: THREE.Matrix4[] }
  >();
  const transform = new THREE.Object3D();
  function add(
    shape: Shape,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    ry = 0,
    rz = 0,
  ) {
    const key = `${shape}:${color}:${cutaway}`;
    if (!batches.has(key))
      batches.set(key, { shape, color, cutaway, matrices: [] });
    transform.position.set(x, y, z);
    transform.scale.set(sx, sy, sz);
    transform.rotation.set(0, ry, rz);
    transform.updateMatrix();
    batches.get(key)!.matrices.push(transform.matrix.clone());
  }
  const box = (
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotation = 0,
  ) => add('box', color, x, y, z, w, h, d, rotation);
  const greens = ['#386A48', '#4D8051', '#689551', '#2C624B'];
  function tree(x: number, z: number, size = 1) {
    add(
      'trunk',
      '#795A40',
      x,
      1.65 * size,
      z,
      0.22 * size,
      3.7 * size,
      0.22 * size,
    );
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 0.4;
      add(
        'leaf',
        greens[j % greens.length],
        x + Math.sin(a) * size,
        (3.7 + (j % 2) * 0.6) * size,
        z + Math.cos(a) * size,
        1.75 * size,
        1.1 * size,
        1.5 * size,
        a,
      );
    }
  }
  function palm(x: number, z: number) {
    add('trunk', '#9A8060', x, 2.1, z, 0.16, 4.5, 0.16);
    for (let j = 0; j < 7; j++) {
      const a = (j * Math.PI * 2) / 7;
      add(
        'leaf',
        greens[j % 3],
        x + Math.sin(a) * 1.1,
        4.5,
        z + Math.cos(a) * 1.1,
        0.4,
        0.16,
        1.8,
        a,
        0.15,
      );
    }
  }
  function planter(x: number, z: number, w: number, d: number, y = 0) {
    box('#B8B5A4', x, y + 0.3, z, w, 0.6, d);
    box('#4D8051', x, y + 0.7, z, w - 0.15, 0.5, d - 0.15);
    for (let i = 0; i < Math.ceil(w / 1.2); i++)
      add(
        'leaf',
        '#689551',
        x - w / 2 + 0.5 + i,
        y + 0.85,
        z,
        0.65,
        0.45,
        d * 0.45,
      );
  }

  // A continuous ground plane, streets and planted sidewalks anchor the hall.
  box('#7B997A', 0, -1, 0, 420, 0.4, 420);
  box('#D2CBBE', 0, -0.5, 0, 48, 0.6, 48);
  for (const s of [-1, 1]) {
    box('#414F56', 0, -0.68, s * 27, 62, 0.12, 6);
    box('#414F56', s * 27, -0.68, 0, 6, 0.12, 62);
    box('#CECFC7', 0, -0.57, s * 31, 65, 0.15, 2);
    box('#CECFC7', s * 31, -0.57, 0, 2, 0.15, 65);
    for (let n = -23; n <= 23; n += 5) {
      box('#E5DCA9', n, -0.6, s * 27, 2.2, 0.025, 0.12);
      box('#E5DCA9', s * 27, -0.6, n, 0.12, 0.025, 2.2);
    }
    for (let n = -2; n <= 2; n++) {
      box('#F3F1E6', n * 0.7, -0.59, s * 27, 0.38, 0.03, 5.4);
      box('#F3F1E6', s * 27, -0.59, n * 0.7, 5.4, 0.03, 0.38);
    }
    for (const n of [-18, -10, 10, 18]) {
      planter(n, s * 21, 4.2, 1.6, -0.2);
      tree(n, s * 21, 0.8 + (Math.abs(n) % 3) * 0.08);
      planter(s * 21, n, 1.6, 4.2, -0.2);
      palm(s * 21, n);
    }
  }

  // Street furniture, bicycle racks, and occasional cars give the ground scale.
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const x = Math.sin(a) * 23,
      z = Math.cos(a) * 23;
    add('trunk', '#354B4C', x, 1.8, z, 0.07, 4.4, 0.07);
    box('#354B4C', x, 4, z, 0.9, 0.1, 0.4, a);
    box('#FFF3C0', x, 3.92, z, 0.65, 0.06, 0.3, a);
    if (i % 2 === 0) {
      box('#977957', x * 0.93, 0.22, z * 0.93, 1.8, 0.16, 0.55, a);
      for (const d of [-0.6, 0.6])
        box(
          '#435351',
          x * 0.93 + Math.cos(a) * d,
          -0.04,
          z * 0.93 - Math.sin(a) * d,
          0.1,
          0.5,
          0.5,
          a,
        );
    }
  }
  for (const [x, z, rotation, color] of [
    [-14, 27, 0, '#BD3E39'],
    [12, -27, 0, '#E3E1D8'],
    [27, 9, Math.PI / 2, '#487E9B'],
    [-27, -16, Math.PI / 2, '#E1B94F'],
  ] as const) {
    box(color, x, -0.02, z, 3.7, 0.9, 1.65, rotation);
    box('#344D59', x, 0.65, z, 2.1, 0.55, 1.45, rotation);
  }

  function tower(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    style: number,
  ) {
    const glass = ['#557B8C', '#6A8B96', '#426778', '#81999E'][style % 4];
    box('#C2C7C2', x, 1, z, w + 2, 3, d + 2);
    box(glass, x, h / 2 + 2, z, w, h, d);
    box('#D6DAD4', x, h + 2.15, z, w + 0.25, 0.35, d + 0.25);
    // Shared instanced window panels create a legible curtain-wall grid.
    for (let y = 4; y < h + 1; y += 2.1) {
      for (let dx = -w / 2 + 0.8; dx < w / 2 - 0.2; dx += 1.5) {
        for (const side of [-1, 1])
          box(
            Math.round(y + dx + style) % 7 === 0 ? '#C5D9CF' : '#91B7C2',
            x + dx,
            y,
            z + side * (d / 2 + 0.025),
            1.05,
            1.4,
            0.045,
          );
      }
      for (let dz = -d / 2 + 0.8; dz < d / 2 - 0.2; dz += 1.5) {
        for (const side of [-1, 1])
          box(
            '#91B7C2',
            x + side * (w / 2 + 0.025),
            y,
            z + dz,
            0.045,
            1.4,
            1.05,
          );
      }
    }
    for (const dx of [-w / 2, w / 2])
      box('#CCD4D0', x + dx, h / 2 + 2, z, 0.18, h, d + 0.16);
    if (style % 2 === 0) {
      // Sky gardens and projecting planted terraces, common in a garden city.
      for (const y of [h * 0.38, h * 0.72, h + 2.5]) {
        box('#E0DED0', x, y, z, w + 1, 0.5, d + 0.8);
        planter(x, z + d / 2 + 0.15, w - 0.6, 1, y + 0.2);
      }
      box('#537B6C', x, h + 3.2, z, w - 1, 1.1, d - 1);
    } else {
      box('#C2C7C2', x, h + 3, z, w * 0.45, 2, d * 0.5);
    }
  }
  cutaway = true;
  // Buildings on all four sides, with lower street fronts and a layered skyline.
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI) / 10 + 0.08;
    const r = 43 + (i % 3) * 6;
    tower(
      Math.sin(a) * r,
      Math.cos(a) * r,
      6 + (i % 3) * 1.5,
      7 + (i % 2) * 2,
      19 + ((i * 11) % 31),
      i,
    );
  }
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI) / 10 + 0.2;
    const r = 73 + (i % 3) * 7;
    tower(
      Math.sin(a) * r,
      Math.cos(a) * r,
      9 + (i % 3),
      10,
      28 + ((i * 7) % 28),
      i + 1,
    );
  }
  // Low-rise neighbourhood blocks with shopfronts, sunshades and planted roofs.
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const x = -24 + i * 9.5,
        z = side * 35;
      const wall = ['#D8B89B', '#BCC6AC', '#CCAEAA'][i % 3];
      box(wall, x, 3.3, z, 7.5, 7.7, 5);
      box('#F1E4CF', x, 7.3, z, 8, 0.3, 5.5);
      for (const dx of [-2.3, 0, 2.3]) {
        box('#42656A', x + dx, 0.9, z - side * 2.55, 1.7, 2.8, 0.06);
        box('#5A7774', x + dx, 4.7, z - side * 2.55, 1.3, 2.1, 0.06);
        box('#F0D9B5', x + dx, 5.95, z - side * 2.8, 1.7, 0.18, 0.7);
      }
      box(
        i % 2 ? '#B8463E' : '#3F7C70',
        x,
        2.75,
        z - side * 2.85,
        7.7,
        0.2,
        1.4,
      );
      planter(x, z, 6.5, 1.8, 7.4);
    }
  // Rain trees in the spaces between blocks make the skyline green at eye level.
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    const r = 32 + (i % 4) * 5;
    tree(Math.sin(a) * r, Math.cos(a) * r, 1.1 + (i % 3) * 0.2);
  }
  for (const batch of batches.values()) {
    const material = new THREE.MeshStandardMaterial({
      color: batch.color,
      roughness: 0.82,
      clippingPlanes: batch.cutaway ? [cutawayPlane] : [],
    });
    const mesh = new THREE.InstancedMesh(
      geometry[batch.shape],
      material,
      batch.matrices.length,
    );
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    // The hall owns the shadow budget; the distant city uses ambient lighting.
    mesh.receiveShadow = true;
    city.add(mesh);
  }
  return {
    setCutaway(position: THREE.Vector3, enabled: boolean) {
      cutawayPlane.normal.set(-position.x, 0, -position.z).normalize();
      cutawayPlane.constant = enabled ? 29 : 1e6;
    },
  };
}
