import * as THREE from 'three';
import {
  TABLE_POSITIONS,
  STALL_LAYOUT,
  HALL_RADIUS,
  SPAWN,
  radial,
} from './layout';

const palette = {
  iron: '#37474F',
  gold: '#d9ae67',
  cream: '#f9edcf',
  red: '#D32F2F',
  teal: '#257f7e',
  green: '#64834a',
};

/** Shared geometries/materials keep the procedural scene inexpensive and disposable. */
export function buildEnvironment(scene: THREE.Scene) {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  function material(color: string) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
    return materials.get(color)!;
  }
  function mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: string,
    p: number[],
    scale: number[],
  ) {
    const item = new THREE.Mesh(geometry, material(color));
    item.position.set(p[0], p[1], p[2]);
    item.scale.set(scale[0], scale[1], scale[2]);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const box = (
    parent: THREE.Object3D,
    color: string,
    p: number[],
    scale: number[],
  ) => mesh(parent, boxGeometry, color, p, scale);
  const cylinder = (
    parent: THREE.Object3D,
    color: string,
    p: number[],
    scale: number[],
  ) => mesh(parent, cylinderGeometry, color, p, scale);
  const ball = (
    parent: THREE.Object3D,
    color: string,
    p: number[],
    scale: number[],
  ) => mesh(parent, sphereGeometry, color, p, scale);
  function label(
    text: string,
    subtitle: string,
    color: string,
    width: number,
    height: number,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, 1000, 232);
    ctx.textAlign = 'center';
    ctx.fillStyle = palette.cream;
    ctx.font = '400 64px "Permanent Marker"';
    ctx.fillText(text, 512, 115, 950);
    ctx.font = '500 28px Outfit';
    ctx.fillText(subtitle, 512, 184, 950);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    return sign;
  }
  function character(shirt: string, skin: string, hair: string) {
    const person = new THREE.Group();
    const left = cylinder(
      person,
      '#304c55',
      [-0.18, 0.35, 0],
      [0.13, 0.7, 0.14],
    );
    const right = cylinder(
      person,
      '#304c55',
      [0.18, 0.35, 0],
      [0.13, 0.7, 0.14],
    );
    cylinder(person, shirt, [0, 0.94, 0], [0.37, 0.7, 0.25]);
    ball(person, skin, [0, 1.57, 0], [0.3, 0.34, 0.29]);
    ball(person, hair, [0, 1.77, -0.03], [0.31, 0.2, 0.29]);
    cylinder(person, skin, [-0.45, 0.94, 0], [0.105, 0.63, 0.1]);
    cylinder(person, skin, [0.45, 0.94, 0], [0.105, 0.63, 0.1]);
    for (const x of [-0.1, 0.1])
      ball(person, '#253d36', [x, 1.59, 0.272], [0.025, 0.03, 0.025]);
    return { person, left, right };
  }

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(HALL_RADIUS, HALL_RADIUS + 0.3, 0.65, 8),
    material('#BCADA0'),
  );
  base.position.y = -0.36;
  base.receiveShadow = true;
  scene.add(base);
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 128;
  tileCanvas.height = 128;
  const tile = tileCanvas.getContext('2d')!;
  tile.fillStyle = '#F4EDDF';
  tile.fillRect(0, 0, 128, 128);
  tile.fillStyle = '#E9E1D1';
  tile.fillRect(0, 0, 64, 64);
  tile.fillRect(64, 64, 64, 64);
  tile.strokeStyle = '#DFD4C3';
  tile.lineWidth = 1;
  tile.strokeRect(0, 0, 128, 128);
  const tiles = new THREE.CanvasTexture(tileCanvas);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(19, 19);
  tiles.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(HALL_RADIUS, 8),
    new THREE.MeshStandardMaterial({ map: tiles, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.kind = 'floor';
  scene.add(floor);
  const picks: THREE.Object3D[] = [floor];
  const markers: THREE.Mesh[] = [];
  const fans: THREE.Group[] = [];

  // Eight radial walkways connect the central landmark and perimeter entrances.
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      point = radial(angle, 10.8);
    const path = box(
      scene,
      '#FAF6ED',
      [point.x, 0.015, point.z],
      [2.2, 0.025, 15.6],
    );
    path.rotation.y = angle;
    for (const side of [-1, 1]) {
      const line = box(
        scene,
        '#CBB780',
        [
          point.x + Math.cos(angle) * side * 1.12,
          0.032,
          point.z - Math.sin(angle) * side * 1.12,
        ],
        [0.055, 0.02, 15.6],
      );
      line.rotation.y = angle;
    }
  }

  STALL_LAYOUT.forEach((definition, index) => {
    const { position, rotation, color, lessonIndex } = definition;
    const interactive = lessonIndex !== undefined;
    const stall = new THREE.Group();
    stall.position.set(position.x, 0, position.z);
    stall.rotation.y = rotation;
    stall.name = `stall-${definition.id}`;
    // Decorative stalls deliberately have no lesson identifier or interaction handler.
    if (interactive) stall.userData.stall = lessonIndex;
    else stall.userData.kind = 'placeholder';
    scene.add(stall);
    picks.push(stall);
    box(stall, '#E8DFD0', [0, 1.65, -1.1], [6.8, 3.3, 0.2]);
    for (const x of [-3.3, 3.3])
      box(stall, '#DED5C5', [x, 1.5, 0], [0.15, 3, 2.4]);
    box(stall, color, [0, 0.65, 1.05], [6.8, 1.3, 0.5]);
    box(stall, '#E2E4DF', [0, 1.34, 1], [7, 0.13, 1.1]);
    const roof = box(stall, '#FDF9EF', [0, 3.05, -0.05], [7.15, 0.15, 3.35]);
    roof.rotation.x = 0.06;
    box(stall, color, [0, 2.92, 1.65], [7.15, 0.34, 0.12]);
    for (let j = 0; j < 12; j++) {
      const stripe = box(
        stall,
        j % 2 ? '#FFF9F2' : color,
        [-3.27 + j * 0.595, 2.91, 1.08],
        [0.59, 0.05, 1.25],
      );
      stripe.rotation.x = 0.13;
    }
    const text = interactive
      ? `${String(index + 1).padStart(2, '0')} / ${definition.cuisine.toUpperCase()}`
      : `${definition.cuisine.toUpperCase()} / COMING SOON`;
    for (const side of [-1, 1]) {
      const sign = label(definition.name, text, color, 6.8, 1.25);
      sign.position.set(0, 3.75, side === 1 ? 0.6 : -1.24);
      if (side === -1) sign.rotation.y = Math.PI;
      stall.add(sign);
    }
    for (const x of [-3.25, 3.25])
      cylinder(stall, palette.iron, [x, 1.55, 1.35], [0.055, 3.1, 0.055]);
    if (interactive) {
      const cook = character(
        lessonIndex === 0
          ? '#FAF7F0'
          : lessonIndex === 1
            ? '#E6B1A6'
            : '#D5A14D',
        lessonIndex === 2 ? '#BD895F' : '#EDBF98',
        lessonIndex === 0 ? '#96968D' : '#322C27',
      );
      stall.add(cook.person);
      box(cook.person, color, [0, 0.9, 0.25], [0.5, 0.67, 0.035]);
      box(stall, '#906A47', [0, 1.6, -0.9], [5.8, 0.1, 0.6]);
      for (let j = 0; j < 5; j++)
        cylinder(
          stall,
          j % 2 ? '#EDE3C9' : '#A6653B',
          [-2 + j, 1.87, -0.8],
          [0.16, 0.45, 0.16],
        );
      for (const x of [-2.1, 2.1]) {
        cylinder(stall, '#FFFAEB', [x, 1.45, 1], [0.35, 0.12, 0.35]);
        ball(
          stall,
          lessonIndex === 0 ? '#613B25' : '#E4CE93',
          [x, 1.57, 1],
          [0.22, 0.13, 0.22],
        );
      }
      const mat = box(stall, color, [0, 0.035, 2.65], [3, 0.04, 1.3]);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.27),
        new THREE.MeshStandardMaterial({
          color: palette.gold,
          emissive: palette.gold,
          emissiveIntensity: 0.15,
        }),
      );
      marker.position.set(0, 4.7, 0);
      stall.add(marker);
      markers[lessonIndex] = marker;
      mat.userData.stall = lessonIndex;
    } else {
      // Closed shutters and no host/marker make the placeholder state unambiguous.
      box(stall, '#B6B3AA', [0, 1.95, 0.75], [6.35, 1.15, 0.1]);
      for (let j = 0; j < 7; j++)
        box(stall, '#D3CEC3', [0, 1.44 + j * 0.16, 0.82], [6.35, 0.025, 0.02]);
    }
  });

  TABLE_POSITIONS.forEach((p, i) => {
    cylinder(scene, palette.iron, [p.x, 0.52, p.z], [0.1, 1.04, 0.1]);
    cylinder(scene, '#FCF9EC', [p.x, 1.06, p.z], [0.94, 0.12, 0.94]);
    cylinder(scene, '#DACCAA', [p.x, 1.13, p.z], [0.77, 0.012, 0.77]);
    cylinder(scene, '#FCF9EC', [p.x, 1.14, p.z], [0.72, 0.015, 0.72]);
    for (let j = 0; j < 4; j++) {
      const angle = (j * Math.PI) / 2 + (i * Math.PI) / 4,
        x = p.x + Math.cos(angle) * 1.25,
        z = p.z + Math.sin(angle) * 1.25;
      cylinder(scene, palette.iron, [x, 0.29, z], [0.065, 0.58, 0.065]);
      cylinder(
        scene,
        j % 2 ? '#C44E43' : '#6D8980',
        [x, 0.62, z],
        [0.28, 0.1, 0.28],
      );
    }
    if (i % 2 === 0) {
      const tissue = box(
        scene,
        '#FFFFFF',
        [p.x, 1.23, p.z],
        [0.43, 0.16, 0.26],
      );
      box(tissue, '#D32F2F', [0, 0.52, 0], [0.75, 0.04, 0.65]);
      tissue.userData.kind = 'chope';
      picks.push(tissue);
    }
  });

  // Octagonal clock pavilion: a readable landmark at the heart of the hall.
  for (const [r, h, y, color] of [
    [3, 0.3, 0.15, '#D6C6A4'],
    [2.7, 1, 0.8, palette.iron],
    [2.9, 0.15, 1.35, '#D9BF86'],
  ] as const) {
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 8),
      material(color),
    );
    platform.position.y = y;
    platform.receiveShadow = true;
    platform.castShadow = true;
    scene.add(platform);
  }
  box(scene, '#F5EFDA', [0, 2.3, 0], [1.8, 1.8, 1.8]);
  for (const x of [-0.7, 0, 0.7])
    for (const z of [-0.92, 0.92])
      box(scene, palette.iron, [x, 2.25, z], [0.16, 1.6, 0.05]);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.75, 0.7, 4),
    material(palette.iron),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.5;
  roof.castShadow = true;
  scene.add(roof);
  box(scene, '#FCF7E8', [0, 4.08, 0], [1.14, 1.1, 1.14]);
  const clockCanvas = document.createElement('canvas');
  clockCanvas.width = 256;
  clockCanvas.height = 256;
  const clock = clockCanvas.getContext('2d')!;
  clock.fillStyle = '#FAF4E4';
  clock.fillRect(0, 0, 256, 256);
  clock.strokeStyle = palette.iron;
  clock.lineWidth = 9;
  clock.beginPath();
  clock.arc(128, 128, 109, 0, Math.PI * 2);
  clock.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    clock.beginPath();
    clock.moveTo(128 + Math.sin(a) * 85, 128 - Math.cos(a) * 85);
    clock.lineTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96);
    clock.stroke();
  }
  clock.lineWidth = 12;
  clock.lineCap = 'round';
  clock.beginPath();
  clock.moveTo(128, 63);
  clock.lineTo(128, 128);
  clock.lineTo(178, 151);
  clock.stroke();
  const clockTexture = new THREE.CanvasTexture(clockCanvas);
  clockTexture.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2,
      face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.94, 0.94),
        new THREE.MeshBasicMaterial({ map: clockTexture }),
      );
    face.position.set(Math.sin(a) * 0.578, 4.09, Math.cos(a) * 0.578);
    face.rotation.y = a;
    scene.add(face);
  }
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 0.68, 4),
    material(palette.iron),
  );
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 4.96;
  scene.add(cap);
  cylinder(scene, palette.iron, [0, 5.6, 0], [0.035, 0.8, 0.035]);
  box(scene, palette.red, [0.28, 5.84, 0], [0.54, 0.24, 0.035]);
  box(scene, '#FFFFFF', [0.28, 5.72, 0], [0.54, 0.12, 0.04]);

  // Perimeter ironwork leaves the front open, like the reference's cutaway view.
  const columns = Array.from({ length: 8 }, (_, i) =>
    radial((i * Math.PI) / 4, HALL_RADIUS - 0.2),
  );
  const beam = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    color: string,
    r = 0.055,
  ) => {
    const direction = b.clone().sub(a),
      item = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, direction.length(), 6),
        material(color),
      );
    item.position.copy(a).add(b).multiplyScalar(0.5);
    item.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    scene.add(item);
  };
  columns.forEach((p, i) => {
    const height = p.z > 8 ? 3.4 : 5.8;
    cylinder(scene, palette.iron, [p.x, height / 2, p.z], [0.12, height, 0.12]);
    cylinder(scene, palette.gold, [p.x, height, p.z], [0.22, 0.12, 0.22]);
    const next = columns[(i + 1) % 8];
    if (p.z <= 8 && next.z <= 8) {
      beam(
        new THREE.Vector3(p.x, 5.65, p.z),
        new THREE.Vector3(next.x, 5.65, next.z),
        palette.iron,
        0.075,
      );
      beam(
        new THREE.Vector3(p.x, 4.8, p.z),
        new THREE.Vector3(next.x, 4.8, next.z),
        palette.iron,
        0.055,
      );
      for (let j = 1; j < 8; j++) {
        const x = p.x + ((next.x - p.x) * j) / 8,
          z = p.z + ((next.z - p.z) * j) / 8;
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.5, 3),
          material(j % 2 ? '#FAF6EF' : palette.red),
        );
        flag.position.set(x, 5.27, z);
        flag.rotation.z = Math.PI;
        scene.add(flag);
      }
    }
    const number = label(String(i + 1), '', palette.red, 0.65, 0.35);
    number.position.set(p.x, 2.3, p.z + 0.14);
    scene.add(number);
  });
  const entrance = label(
    'COME IN, MAKAN',
    'SINGAPORE / EIGHT STALLS, ONE ROOF',
    palette.red,
    4.5,
    1.12,
  );
  entrance.rotation.x = -Math.PI / 2;
  entrance.position.set(0, 0.06, 17.2);
  scene.add(entrance);
  const tray = box(scene, palette.iron, [-2.3, 0.6, 16.4], [1.1, 1.2, 0.8]);
  tray.userData.kind = 'tray';
  picks.push(tray);
  const traySign = label('TRAY RETURN', 'THANK YOU', palette.iron, 1.3, 0.4);
  traySign.position.set(-2.3, 1.4, 16.83);
  scene.add(traySign);
  // Quiet city silhouettes and planting frame the playable pavilion.
  for (let i = 0; i < 11; i++) {
    const h = 5 + ((i * 7) % 9);
    box(
      scene,
      i % 2 ? '#C5C5BD' : '#D9D6CB',
      [-26 + i * 5, h / 2 - 1, -28 - (i % 3)],
      [3.7, h, 3.7],
    );
  }
  for (const x of [-20.5, 20.5])
    for (const z of [-8, 7]) {
      cylinder(scene, '#C08A69', [x, 0.4, z], [0.7, 0.8, 0.7]);
      cylinder(scene, '#76674E', [x, 1.3, z], [0.1, 1.8, 0.1]);
      for (let i = 0; i < 5; i++) {
        const leaf = ball(
          scene,
          i % 2 ? '#628474' : '#799382',
          [x + Math.sin(i) * 0.45, 2.2, z + Math.cos(i) * 0.45],
          [0.35, 1.05, 0.35],
        );
        leaf.rotation.z = Math.sin(i) * 0.6;
      }
    }
  const player = character('#D32F2F', '#EDBD96', '#343934');
  player.person.position.set(SPAWN.x, 0, SPAWN.z);
  scene.add(player.person);
  const you = label('YOU', '', palette.red, 0.9, 0.28);
  you.position.set(0, 2.3, 0);
  player.person.add(you);
  return { floor, picks, markers, fans, player };
}
