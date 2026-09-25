import * as THREE from 'three';
import { TABLE_POSITIONS } from './layout';

const palette = {
  iron: '#28574e',
  gold: '#d9ae67',
  cream: '#f9edcf',
  red: '#bc563d',
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
    ctx.font = 'bold 68px Georgia';
    ctx.fillText(text, 512, 115, 950);
    ctx.font = '25px system-ui';
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

  // A tiled open cutaway hall, inspired by the ironwork of Lau Pa Sat.
  box(scene, '#b89d7b', [0, -0.35, 1], [28, 0.65, 23]);
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 128;
  tileCanvas.height = 128;
  const t = tileCanvas.getContext('2d')!;
  t.fillStyle = '#e8ddc5';
  t.fillRect(0, 0, 128, 128);
  t.fillStyle = '#f5eddc';
  t.fillRect(0, 0, 64, 64);
  t.fillRect(64, 64, 64, 64);
  t.strokeStyle = '#d6cbb6';
  t.lineWidth = 1;
  t.strokeRect(0, 0, 128, 128);
  t.strokeRect(0, 0, 64, 64);
  t.strokeRect(64, 64, 64, 64);
  const tiles = new THREE.CanvasTexture(tileCanvas);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(14, 11);
  tiles.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 22),
    new THREE.MeshStandardMaterial({ map: tiles, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1);
  floor.receiveShadow = true;
  scene.add(floor);
  const picks: THREE.Object3D[] = [floor];
  floor.userData.kind = 'floor';

  const names = ['Heng Heng Kopi', 'Mei Mei Fishball Noodle', 'Dapur Aisyah'];
  const subtitles = [
    '01  /  KOPI & TEH  /  興興咖啡',
    '02  /  FISHBALL NOODLES  /  美美魚丸麵',
    '03  /  NASI LEMAK  /  MAKAN SEDAP',
  ];
  const colors = [palette.teal, palette.red, palette.green];
  const markers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const stall = new THREE.Group();
    stall.position.set((i - 1) * 8, 0, -7);
    stall.userData.stall = i;
    scene.add(stall);
    picks.push(stall);
    box(stall, '#e4d7bb', [0, 1.9, -1.3], [7.5, 3.8, 0.25]);
    box(stall, colors[i], [0, 0.68, 1.2], [7.5, 1.35, 0.5]);
    box(stall, '#d5ded9', [0, 1.4, 1.1], [7.7, 0.16, 1.25]);
    box(stall, colors[i], [0, 3.5, 0.6], [7.8, 0.9, 0.35]);
    const sign = label(names[i], subtitles[i], colors[i], 7.3, 0.98);
    sign.position.set(0, 3.55, 0.81);
    stall.add(sign);
    for (let j = 0; j < 12; j++) {
      const strip = box(
        stall,
        j % 2 ? palette.cream : colors[i],
        [-3.57 + j * 0.65, 2.98, 1.05],
        [0.65, 0.1, 1.7],
      );
      strip.rotation.x = 0.16;
    }
    for (const x of [-3.65, 3.65])
      cylinder(stall, palette.iron, [x, 1.5, 0.9], [0.07, 3, 0.07]);
    box(stall, '#876244', [0, 1.65, -1.1], [6.4, 0.13, 0.65]);
    for (let j = 0; j < 6; j++) {
      cylinder(
        stall,
        j % 2 ? '#ede3c9' : '#ba6b36',
        [-2.4 + j * 0.9, 1.9, -0.9],
        [0.19, 0.4, 0.19],
      );
    }
    const cook = character(
      i === 0 ? '#faf8ed' : i === 1 ? '#edb1a8' : '#d6a841',
      i === 2 ? '#bd895f' : '#edbf98',
      i === 0 ? '#999a91' : '#322c27',
    );
    cook.person.position.set(0, 0, 0);
    stall.add(cook.person);
    box(cook.person, colors[i], [0, 0.9, 0.25], [0.5, 0.67, 0.035]);
    for (const x of [-2.3, 2.3]) {
      cylinder(stall, '#eceade', [x, 1.54, 1.05], [0.38, 0.13, 0.38]);
      ball(
        stall,
        i === 0 ? '#623b21' : i === 1 ? '#e5c283' : '#f8f0d1',
        [x, 1.65, 1.05],
        [0.25, 0.14, 0.25],
      );
    }
    const mat = box(
      scene,
      colors[i],
      [(i - 1) * 8, 0.025, -4.3],
      [3.2, 0.04, 1.5],
    );
    mat.userData.stall = i;
    picks.push(mat);
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshStandardMaterial({
        color: palette.gold,
        emissive: palette.gold,
        emissiveIntensity: 0.2,
      }),
    );
    marker.position.set((i - 1) * 8, 4.45, -6);
    scene.add(marker);
    markers.push(marker);
  }

  TABLE_POSITIONS.forEach((p, i) => {
    cylinder(scene, palette.iron, [p.x, 0.65, p.z], [0.13, 1.3, 0.13]);
    cylinder(scene, '#f3e9cd', [p.x, 1.31, p.z], [1.27, 0.14, 1.27]);
    for (let j = 0; j < 4; j++) {
      const x = p.x + Math.cos((j * Math.PI) / 2) * 1.65,
        z = p.z + Math.sin((j * Math.PI) / 2) * 1.65;
      cylinder(scene, palette.iron, [x, 0.35, z], [0.08, 0.7, 0.08]);
      cylinder(scene, colors[i % 3], [x, 0.73, z], [0.37, 0.12, 0.37]);
    }
    const tissue = box(scene, '#fffaf0', [p.x, 1.46, p.z], [0.48, 0.16, 0.3]);
    box(tissue, '#b7543d', [0, 0.52, 0], [0.8, 0.05, 0.7]);
    tissue.userData.kind = 'chope';
    picks.push(tissue);
  });
  box(scene, palette.iron, [0, 0.9, 2.7], [2.1, 1.8, 1.4]);
  for (let i = 0; i < 4; i++)
    box(scene, '#c5cbc1', [0, 0.4 + i * 0.34, 3.43], [1.7, 0.08, 0.25]);
  const trayLabel = label(
    'TRAY RETURN',
    'THANK YOU FOR KEEPING IT CLEAN',
    palette.iron,
    2.3,
    0.58,
  );
  trayLabel.position.set(0, 1.6, 3.45);
  scene.add(trayLabel);
  trayLabel.userData.kind = 'tray';
  picks.push(trayLabel);

  for (const z of [-8.8, 1, 10.8]) {
    for (const x of [-13, 13]) {
      cylinder(scene, palette.iron, [x, 2.9, z], [0.14, 5.8, 0.14]);
      cylinder(scene, palette.gold, [x, 0.22, z], [0.34, 0.4, 0.34]);
      cylinder(scene, palette.gold, [x, 5.5, z], [0.27, 0.16, 0.27]);
    }
    // The front frame is lower to keep the walking area visible.
    if (z === 10.8) continue;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-13, 5.7, z),
      new THREE.Vector3(-7, 7.5, z),
      new THREE.Vector3(0, 8.1, z),
      new THREE.Vector3(7, 7.5, z),
      new THREE.Vector3(13, 5.7, z),
    ]);
    const arch = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.11, 6, false),
      material(palette.iron),
    );
    scene.add(arch);
    box(scene, palette.iron, [0, 5.7, z], [26, 0.12, 0.12]);
    for (const x of [-10, -7, -4, 0, 4, 7, 10]) {
      const height = 2.25 * (1 - Math.pow(x / 13, 2));
      box(scene, palette.iron, [x, 5.7 + height / 2, z], [0.07, height, 0.07]);
    }
  }
  const venue = label(
    'LAU PA SAT',
    'A LITTLE LINGO. A LOT OF FLAVOUR.',
    palette.iron,
    6,
    1.5,
  );
  venue.position.set(0, 6.7, -8.5);
  scene.add(venue);
  for (const x of [-12, 12])
    for (const z of [-3, 8]) {
      cylinder(scene, '#bf7752', [x, 0.35, z], [0.42, 0.7, 0.42]);
      for (let j = 0; j < 5; j++) {
        const leaf = ball(
          scene,
          j % 2 ? '#507c52' : '#6c934d',
          [x + Math.cos(j * 1.26) * 0.24, 1.03, z + Math.sin(j * 1.26) * 0.24],
          [0.18, 0.73, 0.18],
        );
        leaf.rotation.z = Math.cos(j * 1.26) * 0.48;
      }
    }
  const fans: THREE.Group[] = [];
  for (const x of [-6, 6]) {
    cylinder(scene, palette.iron, [x, 5.45, 0], [0.04, 0.7, 0.04]);
    const fan = new THREE.Group();
    fan.position.set(x, 5.05, 0);
    scene.add(fan);
    fans.push(fan);
    ball(fan, palette.gold, [0, 0, 0], [0.16, 0.12, 0.16]);
    for (let j = 0; j < 3; j++) {
      const blade = box(
        fan,
        palette.iron,
        [Math.cos(j * 2.094) * 0.53, 0, Math.sin(j * 2.094) * 0.53],
        [1.1, 0.03, 0.17],
      );
      blade.rotation.y = -j * 2.094;
    }
  }
  // Distant city blocks frame the pavilion without external models or downloads.
  for (let i = 0; i < 13; i++) {
    const h = 6 + ((i * 7) % 9);
    box(
      scene,
      i % 2 ? '#9caea3' : '#b1bcb0',
      [-25 + i * 4, h / 2 - 1, -19 - (i % 3) * 2],
      [3, h, 3],
    );
  }
  const player = character('#dc7848', '#edbd96', '#343934');
  scene.add(player.person);
  player.person.position.set(0, 0, 9);
  const you = label('YOU', '', palette.iron, 0.85, 0.26);
  you.position.set(0, 2.25, 0);
  player.person.add(you);
  return { floor, picks, markers, fans, player };
}
