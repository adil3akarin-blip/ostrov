/* Остров: процедурная low-poly сцена на three.js.
   THREE приходит из модуля в index.html. Этот файл подключён обычным скриптом,
   чтобы прототип открывался и двойным кликом по index.html. */
(function () {
  'use strict';

  const R = 3.1;      // базовый радиус острова
  const TOP = 0.08;   // высота травяной поверхности
  const ORDER = ['health', 'mind', 'work', 'money', 'people', 'spirit'];
  // +z смотрит в камеру: озеро с водопадом спереди, башня сзади
  const ANGLE = {
    mind: -Math.PI / 2,
    work: -Math.PI / 6,
    people: Math.PI / 6,
    spirit: Math.PI / 2,
    money: 5 * Math.PI / 6,
    health: 7 * Math.PI / 6,
  };
  const PHASE = {
    morning: { sun: 0xffd6ae, sunI: 2.7, sunPos: [6, 5, 5], sky: 0xd5e4f2, ground: 0x9f8a70, hemiI: 1.5, glow: 0.12, flies: 0, fire: 0.5 },
    day:     { sun: 0xfff6ea, sunI: 3.0, sunPos: [3, 10, 6], sky: 0xe2efff, ground: 0x8c7b62, hemiI: 1.6, glow: 0.05, flies: 0, fire: 0.3 },
    evening: { sun: 0xff9d6a, sunI: 2.5, sunPos: [-8, 3.5, 4], sky: 0xa592cf, ground: 0x5b4654, hemiI: 1.15, glow: 1.3, flies: 0.55, fire: 2.4 },
    night:   { sun: 0x9fb3ff, sunI: 0.9, sunPos: [-4, 8, -3], sky: 0x3a4c86, ground: 0x171b2c, hemiI: 0.85, glow: 2.2, flies: 1, fire: 3.4 },
  };
  const VIEWS = {
    today:   { ty: 2.0, elev: 0.30, fitR: 4.65, fitH: 8.0 },
    world:   { ty: 1.1, elev: 0.36, fitR: 3.95, fitH: 7.0 },
    overlay: { ty: 0.7, elev: 0.34, fitR: 4.1, fitH: 7.4 },
  };

  let T = null, ready = false, pendingMount = null;
  let renderer, canvas, scene, camera, root, clock, ro, io, sun, hemi;
  let onScreen = true;
  let host = null, view = 'today', labelLayer = null, labelEls = {}, labelText = {};
  let phase = 'day', onTap = null;
  const regions = {};
  const hits = [];
  const clouds = [];
  const islets = [];
  const sparks = [];
  let cloudRing, flies, flyBase = [], centerTree, treeScale = 1, treeGoal = 1, waterMap, dotTex, DRY, Y;
  const cur = {};
  const camPos = { x: 0, y: 3, z: 10 }, camLook = { x: 0, y: 0, z: 0 };
  let camGoal = null, snapCam = true;
  let dragging = false, lastX = 0, downX = 0, downY = 0, rotVel = 0;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Утилиты ---------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash3(x, y, z) {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function rimR(a) {
    return R + 0.17 * Math.sin(3 * a + 0.6) + 0.1 * Math.sin(5 * a + 2.1) + 0.06 * Math.sin(8 * a + 0.3);
  }
  function smooth(e0, e1, x) {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function M(color, o) {
    return new T.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.88, metalness: 0 }, o || {}));
  }
  function addMesh(parent, geo, mat, x, y, z) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function deformRim(geo) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const d = Math.hypot(x, z);
      if (d < 1e-4) continue;
      const s = rimR(Math.atan2(z, x)) / R;
      p.setX(i, x * s);
      p.setZ(i, z * s);
    }
    geo.computeVertexNormals();
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return new T.CanvasTexture(c);
  }

  /* ---------- Сцена ---------- */
  function buildLights() {
    hemi = new T.HemisphereLight(0xffffff, 0x888888, 1.4);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 0.5; sc.far = 30;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);
    cur.sun = new T.Color(); cur.sky = new T.Color(); cur.ground = new T.Color();
    cur.sunPos = new T.Vector3(); cur.sunI = 2.5; cur.hemiI = 1.4; cur.glow = 0; cur.flies = 0; cur.fire = 0;
  }

  function buildIsland() {
    const SEG = 30;
    const cap = new T.CylinderGeometry(R, R * 0.99, 0.16, SEG, 1);
    deformRim(cap);
    const capMesh = new T.Mesh(cap, M(0x79b45f));
    capMesh.receiveShadow = true;
    root.add(capMesh);

    const band = new T.CylinderGeometry(R * 0.985, R * 0.93, 0.42, SEG, 1);
    band.translate(0, -0.29, 0);
    deformRim(band);
    const bandMesh = new T.Mesh(band, M(0x8a6a4a));
    bandMesh.receiveShadow = true;
    root.add(bandMesh);

    // скалистое дно: конус вершиной вниз, неровный, с цветом от земли к камню
    const H = 3.3;
    const cone = new T.ConeGeometry(R * 0.93, H, SEG, 5);
    cone.rotateX(Math.PI);
    cone.translate(0, -0.5 - H / 2, 0);
    const p = cone.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cTop = new T.Color(0x8a6a4a), cMid = new T.Color(0x7a6658), cBot = new T.Color(0x56546a), c = new T.Color();
    const yTop = -0.5, yBot = -0.5 - H;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const h = hash3(Math.round(x * 1000), Math.round(y * 1000), Math.round(z * 1000));
      const d = Math.hypot(x, z);
      if (d > 1e-4) {
        let s = rimR(Math.atan2(z, x)) / R;
        if (y < yTop - 0.01) s *= 0.84 + 0.3 * h;
        x *= s; z *= s;
      }
      if (y < yTop - 0.01 && y > yBot + 0.01) y += (h - 0.5) * 0.28;
      p.setXYZ(i, x, y, z);
      const t = (y - yBot) / H;
      if (t > 0.5) c.copy(cMid).lerp(cTop, (t - 0.5) * 2); else c.copy(cBot).lerp(cMid, t * 2);
      c.offsetHSL(0, 0, (h - 0.5) * 0.06);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    cone.setAttribute('color', new T.BufferAttribute(col, 3));
    cone.computeVertexNormals();
    root.add(new T.Mesh(cone, M(0xffffff, { vertexColors: true })));

    // парящие обломки под островом
    const rock = M(0x66627a);
    [[0.9, -3.1, 0.4, 0.26], [-0.7, -2.7, -0.8, 0.2], [0.25, -4.25, -0.2, 0.15], [-1.4, -1.9, 0.9, 0.14]].forEach(function (r) {
      const m = addMesh(root, new T.DodecahedronGeometry(r[3], 0), rock, r[0], r[1], r[2]);
      islets.push({ g: m, baseY: r[1], ph: r[0] * 3, amp: 0.06 });
    });
  }

  function regionBase(key, rr) {
    const a = ANGLE[key];
    const g = new T.Group();
    g.position.set(Math.cos(a) * rr, TOP, Math.sin(a) * rr);
    root.add(g);
    const hit = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 1.9, 10), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    hit.position.y = 0.85;
    hit.userData.sphere = key;
    g.add(hit);
    hits.push(hit);
    const reg = { key, group: g, living: [], glows: [], weeds: [], vit: 1, goal: 1, eff: 1, dirty: true, pop: 0, labelY: 1.3 };
    regions[key] = reg;
    return reg;
  }
  function living(reg, hex, o) {
    const mat = M(hex, o);
    const base = new T.Color(hex);
    reg.living.push({ mat, base, dry: base.clone().lerp(DRY, 0.72) });
    return mat;
  }
  function glowMat(reg) {
    const m = new T.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffaa45, emissiveIntensity: 0, flatShading: true, roughness: 0.6 });
    reg.glows.push(m);
    return m;
  }
  function weeds(reg, n, spread) {
    const rnd = mulberry(reg.key.length * 97 + n);
    const mats = [M(0x9b9256), M(0x8b8a4c), M(0xab9c63)];
    for (let i = 0; i < n; i++) {
      const h = 0.3 + rnd() * 0.32;
      const geo = new T.ConeGeometry(0.05 + rnd() * 0.03, h, 4);
      geo.translate(0, h / 2, 0);
      const a = rnd() * Math.PI * 2, d = 0.22 + rnd() * (spread || 0.7);
      const m = addMesh(reg.group, geo, mats[i % 3], Math.cos(a) * d, 0, Math.sin(a) * d);
      m.rotation.z = (rnd() - 0.5) * 0.5;
      m.scale.setScalar(0.001);
      reg.weeds.push(m);
    }
  }
  function pine(parent, x, y, z, s, mat, trunk) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    addMesh(g, new T.CylinderGeometry(0.05, 0.07, 0.3, 5), trunk, 0, 0.15, 0);
    addMesh(g, new T.ConeGeometry(0.36, 0.55, 7), mat, 0, 0.5, 0);
    addMesh(g, new T.ConeGeometry(0.28, 0.45, 7), mat, 0, 0.78, 0);
    addMesh(g, new T.ConeGeometry(0.18, 0.36, 7), mat, 0, 1.02, 0);
    parent.add(g);
    return g;
  }
  function roundTree(parent, x, y, z, s, mat, trunk) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    addMesh(g, new T.CylinderGeometry(0.06, 0.09, 0.45, 6), trunk, 0, 0.22, 0);
    addMesh(g, new T.IcosahedronGeometry(0.34, 0), mat, 0, 0.62, 0);
    addMesh(g, new T.IcosahedronGeometry(0.22, 0), mat, 0.18, 0.5, 0.1);
    parent.add(g);
    return g;
  }
  function pyramidRoof(parent, mat, r, h, y, sx, sz) {
    const m = addMesh(parent, new T.ConeGeometry(r, h, 4), mat, 0, y, 0);
    m.rotation.y = Math.PI / 4;
    m.scale.set(sx, 1, sz);
    return m;
  }

  function buildHealth() {
    const reg = regionBase('health', 1.85);
    const p1 = living(reg, 0x3f8a52), p2 = living(reg, 0x4f9a5c), leaf = living(reg, 0x7dbb5a);
    const trunk = M(0x7a5536);
    [[0, 0, 1.15, 'p', p1], [0.48, 0.18, 0.9, 'p', p2], [-0.42, 0.3, 0.8, 'r', leaf], [0.12, -0.48, 1.0, 'p', p2],
     [-0.32, -0.36, 0.78, 'p', p1], [0.55, -0.3, 0.7, 'r', leaf], [-0.64, -0.04, 0.62, 'p', p2]].forEach(function (s) {
      (s[3] === 'p' ? pine : roundTree)(reg.group, s[0], 0, s[1], s[2], s[4], trunk);
    });
    weeds(reg, 7);
    reg.labelY = 1.55;
  }

  function buildMind() {
    const reg = regionBase('mind', 1.8);
    const stone = M(0xdcd3c4), stoneDark = M(0xb6aa96);
    addMesh(reg.group, new T.CylinderGeometry(0.44, 0.5, 0.16, 8), stoneDark, 0, 0.08, 0);
    addMesh(reg.group, new T.CylinderGeometry(0.3, 0.36, 1.25, 8), stone, 0, 0.78, 0);
    addMesh(reg.group, new T.CylinderGeometry(0.41, 0.36, 0.14, 8), stoneDark, 0, 1.45, 0);
    addMesh(reg.group, new T.ConeGeometry(0.45, 0.64, 8), living(reg, 0x4a78cc), 0, 1.84, 0);
    const win = glowMat(reg);
    [[0.5, 0.4], [0.95, 1.6], [0.75, 2.9], [1.2, 4.2], [1.15, 1.0]].forEach(function (w) {
      const m = addMesh(reg.group, new T.BoxGeometry(0.1, 0.16, 0.05), win, Math.cos(w[1]) * 0.33, w[0], Math.sin(w[1]) * 0.33);
      m.rotation.y = Math.PI / 2 - w[1];
      m.castShadow = false;
    });
    reg.orb = addMesh(reg.group, new T.IcosahedronGeometry(0.12, 0),
      new T.MeshStandardMaterial({ color: 0xc4d8ff, emissive: 0x6f9dff, emissiveIntensity: 0.9, flatShading: true, roughness: 0.3 }), 0, 2.45, 0);
    weeds(reg, 6);
    reg.labelY = 2.85;
  }

  function buildWork() {
    const reg = regionBase('work', 1.9);
    const wall = M(0xead8bd), wood = M(0x8c6239), dark = M(0x4a4038);
    const house = new T.Group();
    house.rotation.y = 0.45;
    reg.group.add(house);
    addMesh(house, new T.BoxGeometry(0.78, 0.48, 0.56), wall, 0, 0.24, 0);
    pyramidRoof(house, living(reg, 0xd8672c), 0.62, 0.42, 0.69, 1.25, 0.95);
    addMesh(house, new T.BoxGeometry(0.1, 0.3, 0.1), dark, 0.24, 0.8, -0.08);
    addMesh(house, new T.BoxGeometry(0.16, 0.26, 0.02), wood, -0.15, 0.13, 0.285);
    const w = addMesh(house, new T.BoxGeometry(0.15, 0.12, 0.02), glowMat(reg), 0.18, 0.28, 0.285);
    w.castShadow = false;
    const c1 = addMesh(reg.group, new T.BoxGeometry(0.18, 0.18, 0.18), wood, 0.58, 0.09, 0.28);
    c1.rotation.y = 0.3;
    const c2 = addMesh(reg.group, new T.BoxGeometry(0.14, 0.14, 0.14), wood, 0.6, 0.25, 0.27);
    c2.rotation.y = 0.9;
    reg.smoke = [];
    for (let i = 0; i < 3; i++) {
      const puff = addMesh(house, new T.IcosahedronGeometry(0.07, 0), M(0xf4f4f4, { transparent: true, opacity: 0.8 }), 0.24, 0.98, -0.08);
      puff.castShadow = false;
      reg.smoke.push({ m: puff, t: i / 3 });
    }
    weeds(reg, 6);
    reg.labelY = 1.4;
  }

  function buildMoney() {
    const reg = regionBase('money', 1.85);
    const rock = addMesh(reg.group, new T.DodecahedronGeometry(0.3, 0), M(0x8d8a93), 0, 0.06, 0);
    rock.scale.set(1.3, 0.45, 1.1);
    const gold = living(reg, 0xe6b43a, { emissive: 0x5a3a00, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.25 });
    reg.crystals = [[0, 0, 0.32, 0], [0.3, 0.12, 0.22, 0.5], [-0.24, 0.18, 0.2, -0.4], [0.08, -0.28, 0.18, 0.9], [-0.32, -0.2, 0.14, 0.3]].map(function (c) {
      const m = addMesh(reg.group, new T.OctahedronGeometry(c[2], 0), gold, c[0], c[2] * 1.9 + 0.03, c[1]);
      m.scale.set(1, 1.9, 1);
      m.rotation.z = c[3] * 0.25;
      return m;
    });
    weeds(reg, 6);
    reg.labelY = 1.35;
  }

  function buildPeople() {
    const reg = regionBase('people', 1.9);
    const wall = M(0xf2e4d2), wood = M(0x7d5737), stone = M(0x9a958f);
    const house = new T.Group();
    house.position.set(-0.2, 0, -0.14);
    house.rotation.y = -0.55;
    reg.group.add(house);
    addMesh(house, new T.BoxGeometry(0.62, 0.44, 0.52), wall, 0, 0.22, 0);
    pyramidRoof(house, living(reg, 0xcf4f74), 0.52, 0.4, 0.64, 1.2, 1.05);
    addMesh(house, new T.BoxGeometry(0.15, 0.24, 0.02), wood, 0.12, 0.12, 0.265);
    const w = addMesh(house, new T.BoxGeometry(0.13, 0.12, 0.02), glowMat(reg), -0.14, 0.27, 0.265);
    w.castShadow = false;

    const fire = new T.Group();
    fire.position.set(0.44, 0, 0.36);
    reg.group.add(fire);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      addMesh(fire, new T.DodecahedronGeometry(0.045, 0), stone, Math.cos(a) * 0.13, 0.03, Math.sin(a) * 0.13);
    }
    const log1 = addMesh(fire, new T.CylinderGeometry(0.025, 0.025, 0.2, 5), wood, 0, 0.04, 0);
    log1.rotation.z = Math.PI / 2; log1.rotation.y = 0.6;
    const log2 = addMesh(fire, new T.CylinderGeometry(0.025, 0.025, 0.2, 5), wood, 0, 0.05, 0);
    log2.rotation.z = Math.PI / 2; log2.rotation.y = -0.6;
    const f1 = addMesh(fire, new T.ConeGeometry(0.08, 0.26, 5), new T.MeshBasicMaterial({ color: 0xff9a3c }), 0, 0.16, 0);
    const f2 = addMesh(fire, new T.ConeGeometry(0.045, 0.16, 5), new T.MeshBasicMaterial({ color: 0xffe08a }), 0.02, 0.12, 0.02);
    f1.castShadow = f2.castShadow = false;
    reg.flames = [f1, f2];
    reg.fireLight = new T.PointLight(0xff9a4a, 0, 3.2, 2);
    reg.fireLight.position.set(0, 0.35, 0);
    fire.add(reg.fireLight);
    const bench = addMesh(reg.group, new T.CylinderGeometry(0.05, 0.05, 0.36, 6), wood, 0.78, 0.05, 0.2);
    bench.rotation.z = Math.PI / 2; bench.rotation.y = 1.1;
    const bench2 = addMesh(reg.group, new T.CylinderGeometry(0.05, 0.05, 0.36, 6), wood, 0.3, 0.05, 0.72);
    bench2.rotation.z = Math.PI / 2; bench2.rotation.y = -0.2;
    weeds(reg, 12, 0.8);
    reg.labelY = 1.3;
  }

  function buildSpirit() {
    const a = ANGLE.spirit, rr = 1.75;
    const reg = regionBase('spirit', rr);
    const water = living(reg, 0x5ec4da, { roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.92 });
    const pond = new T.Mesh(new T.CircleGeometry(0.55, 18), water);
    pond.rotation.x = -Math.PI / 2;
    pond.position.y = 0.012;
    pond.scale.set(1.15, 1, 1);
    pond.receiveShadow = true;
    reg.group.add(pond);
    const stone = M(0xa29d96);
    const dirX = Math.cos(a), dirZ = Math.sin(a);
    for (let i = 0; i < 12; i++) {
      const t = i / 12 * Math.PI * 2;
      const sx = Math.cos(t), sz = Math.sin(t);
      if (sx * dirX + sz * dirZ > 0.85) continue; // проход для ручья
      addMesh(reg.group, new T.DodecahedronGeometry(0.06 + (i % 3) * 0.015, 0), stone, sx * 0.64, 0.03, sz * 0.57);
    }
    const pad = M(0x6fae4f);
    [[0.2, 0.1], [-0.18, -0.15], [-0.05, 0.25]].forEach(function (pp) {
      addMesh(reg.group, new T.CylinderGeometry(0.075, 0.075, 0.015, 7), pad, pp[0], 0.022, pp[1]);
    });
    const lantern = new T.Group();
    lantern.position.set(-0.7, 0, -0.3);
    reg.group.add(lantern);
    addMesh(lantern, new T.BoxGeometry(0.16, 0.06, 0.16), stone, 0, 0.03, 0);
    addMesh(lantern, new T.BoxGeometry(0.07, 0.24, 0.07), stone, 0, 0.18, 0);
    addMesh(lantern, new T.BoxGeometry(0.13, 0.11, 0.13), glowMat(reg), 0, 0.35, 0).castShadow = false;
    pyramidRoof(lantern, stone, 0.14, 0.1, 0.46, 1, 1);

    // ручей от озера к краю и водопад
    const rim = rimR(a);
    const start = rr + 0.55, len = rim - start + 0.04;
    const channel = addMesh(reg.group, new T.BoxGeometry(0.2, 0.02, len), water, dirX * (start + len / 2 - rr), 0.012, dirZ * (start + len / 2 - rr));
    channel.rotation.y = Math.PI / 2 - a;
    channel.castShadow = false;
    const alpha = canvasTex(4, 64, function (g) {
      const gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#bbb'); gr.addColorStop(1, '#000');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
    });
    waterMap = canvasTex(32, 128, function (g) {
      g.fillStyle = '#a6e6f4'; g.fillRect(0, 0, 32, 128);
      const rnd = mulberry(7);
      for (let i = 0; i < 46; i++) {
        g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(64,166,206,0.55)';
        g.fillRect(Math.floor(rnd() * 32), Math.floor(rnd() * 128), 1 + Math.floor(rnd() * 2), 8 + Math.floor(rnd() * 30));
      }
    });
    waterMap.colorSpace = T.SRGBColorSpace;
    waterMap.wrapS = waterMap.wrapT = T.RepeatWrapping;
    waterMap.repeat.set(1, 2);
    const fall = new T.Mesh(new T.PlaneGeometry(0.22, 2.6),
      new T.MeshBasicMaterial({ map: waterMap, alphaMap: alpha, transparent: true, depthWrite: false, side: T.DoubleSide }));
    fall.position.set(dirX * (rim + 0.025 - rr), -1.3, dirZ * (rim + 0.025 - rr));
    fall.rotation.y = Math.PI / 2 - a;
    reg.group.add(fall);
    const foam = addMesh(reg.group, new T.IcosahedronGeometry(0.09, 0), M(0xffffff, { transparent: true, opacity: 0.9 }), dirX * (rim - rr), 0.01, dirZ * (rim - rr));
    foam.scale.set(1.4, 0.5, 1.4);
    foam.castShadow = false;
    weeds(reg, 6);
    reg.labelY = 1.0;
  }

  function buildCenterTree() {
    centerTree = new T.Group();
    centerTree.position.set(0, TOP, 0);
    root.add(centerTree);
    const trunk = M(0x6e4b31);
    addMesh(centerTree, new T.CylinderGeometry(0.1, 0.18, 0.95, 7), trunk, 0, 0.47, 0);
    const br = addMesh(centerTree, new T.CylinderGeometry(0.04, 0.06, 0.45, 5), trunk, 0.17, 0.85, 0.05);
    br.rotation.z = -0.8;
    const leafA = M(0x5fae58), leafB = M(0x77c063), leafC = M(0x4e9b4f);
    addMesh(centerTree, new T.IcosahedronGeometry(0.62, 0), leafA, 0, 1.3, 0);
    addMesh(centerTree, new T.IcosahedronGeometry(0.45, 0), leafB, 0.45, 1.05, 0.15);
    addMesh(centerTree, new T.IcosahedronGeometry(0.42, 0), leafC, -0.4, 1.1, -0.1);
    addMesh(centerTree, new T.IcosahedronGeometry(0.34, 0), leafB, 0.05, 1.75, -0.05);
    const fruit = new T.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffa31a, emissiveIntensity: 0.5, flatShading: true });
    [[0.5, 1.3, 0.32], [-0.3, 1.5, 0.45], [0.15, 1.0, 0.55], [-0.6, 1.0, 0.2], [0.3, 1.8, 0.2]].forEach(function (f) {
      addMesh(centerTree, new T.IcosahedronGeometry(0.055, 0), fruit, f[0], f[1], f[2]).castShadow = false;
    });
  }

  function buildScatter() {
    const rnd = mulberry(11);
    const centers = ORDER.map(function (k) { return regions[k].group.position; });
    function ok(x, z, a, d) {
      if (d > rimR(a) - 0.25 || Math.hypot(x, z) < 0.8) return false;
      for (let i = 0; i < centers.length; i++) if (Math.hypot(x - centers[i].x, z - centers[i].z) < 0.85) return false;
      return true;
    }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), col = new T.Color();
    function scatter(mesh, max, y, colors, scaleFn) {
      let n = 0, guard = 0;
      while (n < max && guard++ < 4000) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!ok(x, z, a, d)) continue;
        p.set(x, y, z);
        q.setFromAxisAngle(Y, rnd() * 6.28);
        scaleFn(s);
        m4.compose(p, q, s);
        mesh.setMatrixAt(n, m4);
        mesh.setColorAt(n, col.setHex(colors[n % colors.length]));
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      root.add(mesh);
    }
    const tuftGeo = new T.ConeGeometry(0.035, 0.17, 4);
    tuftGeo.translate(0, 0.085, 0);
    const tufts = new T.InstancedMesh(tuftGeo, M(0xffffff), 120);
    tufts.receiveShadow = true;
    scatter(tufts, 120, TOP, [0x5f9f4c, 0x6fae55, 0x86c063, 0x4f8f45], function (v) { const k = 0.7 + rnd() * 0.8; v.set(k, k * (0.8 + rnd() * 0.8), k); });
    const flowers = new T.InstancedMesh(new T.IcosahedronGeometry(0.04, 0), M(0xffffff, { roughness: 0.6 }), 40);
    scatter(flowers, 40, TOP + 0.05, [0xffffff, 0xffd166, 0xf4a3c0, 0xc6b5ff, 0xffb38a], function (v) { v.setScalar(0.8 + rnd() * 0.6); });
    const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(0.08, 0), M(0xffffff), 10);
    rocks.castShadow = true;
    scatter(rocks, 10, TOP + 0.02, [0x9a958f, 0x8a8682, 0xaaa59c], function (v) { const k = 0.6 + rnd() * 1.1; v.set(k, k * 0.6, k); });
  }

  function buildIslets() {
    const trunk = M(0x7a5536), pineMat = M(0x3f8a52), grass = M(0x79b45f), rock = M(0x75685d);
    [[4.1, 0.6, -1.5, 0.5], [-4.1, -0.5, 1.0, 0.42], [1.2, 1.7, -4.1, 0.32]].forEach(function (c, i) {
      const g = new T.Group();
      g.position.set(c[0], c[1], c[2]);
      g.scale.setScalar(c[3]);
      root.add(g);
      const cone = new T.ConeGeometry(1, 1.8, 7, 2);
      cone.rotateX(Math.PI);
      cone.translate(0, -1.0, 0);
      addMesh(g, cone, rock);
      addMesh(g, new T.CylinderGeometry(1.03, 1, 0.2, 7), grass, 0, 0, 0);
      pine(g, 0.15, 0.1, 0.05, 1.5, pineMat, trunk);
      islets.push({ g: g, baseY: c[1], ph: i * 1.7, amp: 0.12 });
    });
  }

  function buildClouds() {
    cloudRing = new T.Group();
    scene.add(cloudRing);
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.94 });
    const rnd = mulberry(5);
    for (let i = 0; i < 6; i++) {
      const c = new T.Group();
      const a = i / 6 * Math.PI * 2 + rnd() * 0.6, d = 5.6 + rnd() * 1.4;
      const y = i % 2 ? 1.9 + rnd() * 0.7 : -2.2 - rnd() * 0.9;
      c.scale.setScalar(0.8);
      c.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
      const k = 3 + Math.floor(rnd() * 3);
      for (let j = 0; j < k; j++) {
        const m = new T.Mesh(new T.IcosahedronGeometry(0.3 + rnd() * 0.28, 0), mat);
        m.position.set((j - k / 2) * 0.36, rnd() * 0.16, (rnd() - 0.5) * 0.3);
        m.scale.y = 0.72;
        c.add(m);
      }
      cloudRing.add(c);
      clouds.push({ c: c, baseY: y, ph: rnd() * 6 });
    }
  }

  function buildFlies() {
    const n = 42, rnd = mulberry(23);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 2.7;
      const b = { x: Math.cos(a) * d, y: TOP + 0.25 + rnd() * 1.5, z: Math.sin(a) * d, ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.8 };
      flyBase.push(b);
      pos[i * 3] = b.x; pos[i * 3 + 1] = b.y; pos[i * 3 + 2] = b.z;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    flies = new T.Points(geo, new T.PointsMaterial({ color: 0xffe08a, size: 0.1, map: dotTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
    root.add(flies);
  }

  /* ---------- Взаимодействие ---------- */
  function bindPointer() {
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      lastX = downX = e.clientX;
      downY = e.clientY;
      rotVel = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      root.rotation.y += dx * 0.01;
      rotVel = dx * 0.01;
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      if (e.type === 'pointerup' && Math.hypot(e.clientX - downX, e.clientY - downY) < 7) tapAt(e);
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  function tapAt(e) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hits, false)[0];
    if (onTap) onTap(hit ? hit.object.userData.sphere : null, view);
  }

  /* ---------- Камера и размеры ---------- */
  function computeGoal() {
    if (!host) return;
    const v = VIEWS[view] || VIEWS.today;
    const vf = camera.fov * Math.PI / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.max(v.fitR / Math.tan(hf / 2), (v.fitH / 2) / Math.tan(vf / 2));
    camGoal = { x: 0, y: v.ty + Math.sin(v.elev) * dist, z: Math.cos(v.elev) * dist, ty: v.ty };
    if (snapCam) {
      camPos.x = camGoal.x; camPos.y = camGoal.y; camPos.z = camGoal.z;
      camLook.y = camGoal.ty;
      snapCam = false;
    }
  }
  function resize() {
    if (!host) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeGoal();
  }

  /* ---------- Метки мест (вид «Остров») ---------- */
  function buildLabels() {
    labelEls = {};
    if (!labelLayer) return;
    labelLayer.textContent = '';
    ORDER.forEach(function (k) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'isl-label';
      b.dataset.sphere = k;
      const dot = document.createElement('i');
      dot.style.background = 'var(--c-' + k + ')';
      b.appendChild(dot);
      b.appendChild(document.createTextNode(labelText[k] || k));
      labelLayer.appendChild(b);
      labelEls[k] = b;
    });
  }
  const tmpV = new Array(3);
  function updateLabels() {
    if (!labelLayer || !labelLayer.isConnected) return;
    const w = host.clientWidth, h = host.clientHeight;
    const camDist = Math.hypot(camera.position.x, camera.position.y, camera.position.z);
    ORDER.forEach(function (k) {
      const el = labelEls[k];
      if (!el) return;
      const reg = regions[k];
      const v = tmpV[0] || (tmpV[0] = new T.Vector3());
      reg.group.getWorldPosition(v);
      v.y += reg.labelY;
      const d = v.distanceTo(camera.position);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
      const back = Math.min(1, Math.max(0, (d - (camDist - 2.2)) / 4.4));
      el.style.opacity = (1 - back * 0.55).toFixed(2);
      el.style.zIndex = String(Math.round(100 - d * 5));
    });
  }

  /* ---------- Цикл ---------- */
  function applyPhaseTargets(instant) {
    const P = PHASE[phase];
    const k = instant ? 1 : null;
    if (k) {
      cur.sun.setHex(P.sun); cur.sky.setHex(P.sky); cur.ground.setHex(P.ground);
      cur.sunPos.set(P.sunPos[0], P.sunPos[1], P.sunPos[2]);
      cur.sunI = P.sunI; cur.hemiI = P.hemiI; cur.glow = P.glow; cur.flies = P.flies; cur.fire = P.fire;
    }
  }
  const tc = {};
  function stepPhase(dt) {
    const P = PHASE[phase];
    const k = 1 - Math.exp(-dt * 2.2);
    if (!tc.sun) { tc.sun = new T.Color(); tc.sky = new T.Color(); tc.ground = new T.Color(); tc.pos = new T.Vector3(); }
    cur.sun.lerp(tc.sun.setHex(P.sun), k);
    cur.sky.lerp(tc.sky.setHex(P.sky), k);
    cur.ground.lerp(tc.ground.setHex(P.ground), k);
    cur.sunPos.lerp(tc.pos.set(P.sunPos[0], P.sunPos[1], P.sunPos[2]), k);
    cur.sunI += (P.sunI - cur.sunI) * k;
    cur.hemiI += (P.hemiI - cur.hemiI) * k;
    cur.glow += (P.glow - cur.glow) * k;
    cur.flies += (P.flies - cur.flies) * k;
    cur.fire += (P.fire - cur.fire) * k;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    sun.position.copy(cur.sunPos);
    hemi.color.copy(cur.sky);
    hemi.groundColor.copy(cur.ground);
    hemi.intensity = cur.hemiI;
  }

  function stepRegions(dt, t) {
    const k = 1 - Math.exp(-dt * 1.6);
    ORDER.forEach(function (key) {
      const reg = regions[key];
      if (Math.abs(reg.goal - reg.vit) > 0.001 || reg.dirty) {
        reg.vit += (reg.goal - reg.vit) * (reg.dirty && reg.snap ? 1 : k);
        reg.snap = false;
        reg.dirty = false;
        reg.eff = smooth(0.2, 0.85, reg.vit);
        reg.living.forEach(function (L) { L.mat.color.copy(L.dry).lerp(L.base, reg.eff); });
        const w = Math.min(1, Math.max(0, (0.7 - reg.vit) / 0.4));
        reg.weeds.forEach(function (m) { m.scale.setScalar(Math.max(0.001, w)); });
      }
      const g = cur.glow * (0.3 + 0.7 * reg.eff);
      reg.glows.forEach(function (m) { m.emissiveIntensity = g; });
      if (reg.pop > 0) {
        reg.pop = Math.max(0, reg.pop - dt * 1.8);
        const s = 1 + Math.sin(reg.pop * Math.PI) * 0.07;
        reg.group.scale.set(s, s, s);
      }
    });
    const fireReg = regions.people;
    if (fireReg && fireReg.flames) {
      const e = 0.4 + 0.6 * fireReg.eff;
      const fl = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
      fireReg.flames[0].scale.set(e, e * fl, e);
      fireReg.flames[1].scale.set(e, e * (2 - fl), e);
      fireReg.fireLight.intensity = cur.fire * e * fl;
    }
    const mind = regions.mind;
    if (mind && mind.orb) {
      mind.orb.position.y = 2.45 + Math.sin(t * 1.6) * 0.07;
      mind.orb.rotation.y += dt * 0.9;
    }
    const money = regions.money;
    if (money && money.crystals) money.crystals.forEach(function (c, i) { c.rotation.y += dt * (0.25 + i * 0.07); });
    const work = regions.work;
    if (work && work.smoke) {
      work.smoke.forEach(function (s) {
        s.t = (s.t + dt * 0.35) % 1;
        s.m.position.y = 0.98 + s.t * 0.75;
        s.m.position.x = 0.24 + Math.sin(s.t * 5 + t) * 0.04 + s.t * 0.12;
        const sc = 0.6 + s.t * 1.6;
        s.m.scale.set(sc, sc, sc);
        s.m.material.opacity = 0.75 * (1 - s.t);
      });
    }
  }

  function stepSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      const p = s.pts.geometry.attributes.position;
      for (let j = 0; j < s.vel.length; j++) {
        const v = s.vel[j];
        v.y -= dt * 1.4;
        p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt);
      }
      p.needsUpdate = true;
      s.pts.material.opacity = Math.max(0, 1 - s.life / s.max);
      if (s.life >= s.max) {
        root.remove(s.pts);
        s.pts.geometry.dispose();
        s.pts.material.dispose();
        sparks.splice(i, 1);
      }
    }
  }

  function loop() {
    requestAnimationFrame(loop);
    // не рисуем, когда остров не виден: экономим батарею телефона
    if (!host || !host.isConnected || document.hidden || !onScreen) { clock.getDelta(); return; }
    frame(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  }

  function frame(dt, t) {
    if (!dragging) {
      root.rotation.y += rotVel + (reduce ? 0 : dt * 0.06);
      rotVel *= 0.93;
    }
    if (!reduce) {
      cloudRing.rotation.y += dt * 0.025;
      clouds.forEach(function (c) { c.c.position.y = c.baseY + Math.sin(t * 0.5 + c.ph) * 0.12; });
      islets.forEach(function (s) { s.g.position.y = s.baseY + Math.sin(t * 0.8 + s.ph) * s.amp; });
    }
    if (waterMap) waterMap.offset.y += dt * 0.7;

    stepPhase(dt);
    stepRegions(dt, t);
    stepSparks(dt);

    treeScale += (treeGoal - treeScale) * (1 - Math.exp(-dt * 2));
    centerTree.scale.setScalar(treeScale);

    flies.material.opacity = cur.flies * 0.95;
    flies.visible = cur.flies > 0.02;
    if (flies.visible) {
      const p = flies.geometry.attributes.position;
      flyBase.forEach(function (b, i) {
        p.setXYZ(i, b.x + Math.sin(t * b.sp + b.ph) * 0.18, b.y + Math.sin(t * b.sp * 1.3 + b.ph * 2) * 0.12, b.z + Math.cos(t * b.sp + b.ph) * 0.18);
      });
      p.needsUpdate = true;
    }

    if (camGoal) {
      const k = 1 - Math.exp(-dt * 3.5);
      camPos.x += (camGoal.x - camPos.x) * k;
      camPos.y += (camGoal.y - camPos.y) * k;
      camPos.z += (camGoal.z - camPos.z) * k;
      camLook.y += (camGoal.ty - camLook.y) * k;
      camera.position.set(camPos.x, camPos.y, camPos.z);
      camera.lookAt(0, camLook.y, 0);
    }
    renderer.render(scene, camera);
    if (view === 'world') updateLabels();
  }

  /* ---------- Публичное API ---------- */
  function init(opts) {
    if (ready || !window.THREE) return;
    T = window.THREE;
    onTap = opts && opts.onTap;
    DRY = new T.Color(0xa39377);
    Y = new T.Vector3(0, 1, 0);
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      return; // WebGL недоступен: остаётся плоская иллюстрация
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    if (T.NeutralToneMapping !== undefined) renderer.toneMapping = T.NeutralToneMapping;
    canvas = renderer.domElement;
    canvas.className = 'island-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    root = new T.Group();
    root.rotation.y = -0.35;
    scene.add(root);
    dotTex = canvasTex(64, 64, function (g) {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });

    buildLights();
    buildIsland();
    buildHealth(); buildMind(); buildWork(); buildMoney(); buildPeople(); buildSpirit();
    buildCenterTree();
    buildScatter();
    buildIslets();
    buildClouds();
    buildFlies();
    bindPointer();

    ro = new ResizeObserver(resize);
    io = 'IntersectionObserver' in window
      ? new IntersectionObserver(function (entries) { onScreen = entries[entries.length - 1].isIntersecting; })
      : null;
    clock = new T.Clock();
    applyPhaseTargets(true);
    ready = true;
    if (pendingMount) { mount.apply(null, pendingMount); pendingMount = null; }
    requestAnimationFrame(loop);
  }

  function mount(el, v, labels) {
    if (!ready) { pendingMount = [el, v, labels]; return; }
    if (!el) return;
    host = el;
    view = v || 'today';
    labelLayer = labels || null;
    if (canvas.parentNode !== el) el.appendChild(canvas);
    el.classList.add('has-3d');
    ro.disconnect();
    ro.observe(el);
    onScreen = true;
    if (io) { io.disconnect(); io.observe(el); }
    resize();
    buildLabels();
  }

  function setPhase(p, instant) {
    if (!PHASE[p]) return;
    phase = p;
    if (ready && instant) applyPhaseTargets(true);
  }

  function setVitality(key, v, instant) {
    const reg = regions[key];
    if (!reg) return;
    reg.goal = Math.max(0, Math.min(1, v));
    if (instant) { reg.vit = reg.goal; reg.snap = true; }
    reg.dirty = true;
  }

  function setLevel(l) { treeGoal = 0.72 + Math.min(40, l) * 0.026; }

  function burst(key, cssColor) {
    const reg = regions[key];
    if (!ready || !reg) return;
    reg.pop = 1;
    const n = 38;
    const pos = new Float32Array(n * 3);
    const vel = [];
    const base = reg.group.position;
    const rnd = Math.random;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base.x + (rnd() - 0.5) * 0.4;
      pos[i * 3 + 1] = base.y + 0.4 + rnd() * 0.4;
      pos[i * 3 + 2] = base.z + (rnd() - 0.5) * 0.4;
      vel.push({ x: (rnd() - 0.5) * 1.1, y: 1.2 + rnd() * 1.6, z: (rnd() - 0.5) * 1.1 });
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const color = new T.Color();
    try { color.setStyle(cssColor || '#ffd166'); } catch (err) { color.setHex(0xffd166); }
    const pts = new T.Points(geo, new T.PointsMaterial({ color: color, size: 0.13, map: dotTex, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending }));
    root.add(pts);
    sparks.push({ pts: pts, vel: vel, life: 0, max: 1.6 });
  }

  function setLabels(map) { labelText = map || {}; }

  window.Island = {
    init: init,
    mount: mount,
    setPhase: setPhase,
    setVitality: setVitality,
    setLevel: setLevel,
    burst: burst,
    setLabels: setLabels,
    isReady: function () { return ready; },
  };
})();
