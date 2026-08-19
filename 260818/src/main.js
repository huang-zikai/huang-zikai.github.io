import * as THREE from 'three';

console.log('qixi-roses init');

// --- WebGL 检测（todo 11 将补全 2D 降级渲染） ---
let gl = null;
try {
  const probe = document.createElement('canvas');
  gl = probe.getContext('webgl2') || probe.getContext('webgl');
} catch (e) {
  gl = null;
}

let renderer = null;

// 光晕 Sprite 列表（todo 6）：animate 循环里做正弦呼吸
let glowSprites = [];

// 模块级引用（todo 7）：相机与花束 Group 供入场动画使用
let camera = null;
let bouquetGroup = null;

// 入场动画状态（todo 7）：entranceDone 供 todo 9 自转暂停/恢复检查
let entranceStart = -1;
let entranceDone = false;

// 设备档位（todo 8）：low = 窄屏或低核数；todo 12 将正式化 __deviceInfo，
// 目前仅用于粒子数量降档。必须置于模块顶部：initScene() 在模块执行期间即被调用。
const deviceTier =
  window.innerWidth < 768 || (navigator.hardwareConcurrency || 4) <= 4
    ? 'low'
    : 'high';

// 粒子系统状态（todo 8）：由 createParticleSystem() 创建，animate 循环驱动；
// 帧率采样（todo 8）：最近 2s 的平均 fps，由 __fps() 暴露。
let particleSystem = null;
let fpsSamples = [];
let fpsAvg = 0;
let lastFrameTime = -1;

// ==================== 交互与环境动效（todo 9） ====================
// prefers-reduced-motion：跳过自转/视差；爱心保留但迸发数减半（8-12）
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 鼠标/触摸归一化偏移（-1..1），供相机视差使用（animate 内缓动）
let mouseNX = 0;
let mouseNY = 0;

// 爱心粒子池（2D canvas #hearts 覆盖层）：池上限 200，超出丢弃最旧。
// 必须置于模块顶部：事件监听在模块执行期间即注册（3D 与降级两路径都可用）。
const heartsCanvas = document.getElementById('hearts');
const hctx = heartsCanvas ? heartsCanvas.getContext('2d') : null;
const heartSprite = createHeartSprite(); // 预热渲染的贝塞尔心形渐变精灵（32x32）
const hearts = []; // 活跃爱心粒子数组
let heartsSpawned = 0; // 累计迸发爱心数（__interactStats 用）
let heartsDPR = 1; // 当前 canvas 设备像素比（cap：low 1.5 / high 2）

const HEART_MAX_LIFE = 1.2; // 生命周期（秒）
const HEART_POOL_CAP = 200; // 粒子池上限
const HEART_GRAVITY = -6; // 重力（世界坐标 y 向上，负值 = 下落）
const HEART_FRICTION = 0.98; // 每帧速度阻尼
const HEART_SPEED_MIN = 2; // 初速下限（×S 缩放单位）
const HEART_SPEED_MAX = 5; // 初速上限（×S 缩放单位）

// 爱心 canvas 尺寸 = 视口 × DPR（cap：low 1.5 / high 2），绘制坐标仍用 CSS 像素
function sizeHeartsCanvas() {
  if (!heartsCanvas) return;
  heartsDPR = Math.min(
    window.devicePixelRatio || 1,
    deviceTier === 'low' ? 1.5 : 2
  );
  heartsCanvas.width = Math.round(window.innerWidth * heartsDPR);
  heartsCanvas.height = Math.round(window.innerHeight * heartsDPR);
}

// 点击/轻触任意处迸发爱心
document.addEventListener('pointerdown', (e) => burstHearts(e.clientX, e.clientY));
// 鼠标视差：pointermove 记录归一化偏移（touch 由 touchmove 同样处理）
window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY));
window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (t) setPointer(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('resize', sizeHeartsCanvas);
sizeHeartsCanvas();

// 入场动画常量与元素缓存（todo 7）：
// 必须置于模块顶部——initEntrance() 在模块执行期间（initScene 内）即被调用，
// 若声明在文件末尾会触发 TDZ（Cannot access before initialization）错误。
const ENTRANCE_DURATION = 2.5; // 秒
const PETAL_CLOSED_ADD = -70 * (Math.PI / 180); // 花瓣闭合叠加角（-70°）

// 缓动函数（https://easings.net/）
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
// easeOutBack：过冲回弹（花瓣外翻用，先过冲再归位）
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// 文字层元素缓存（initEntrance 时获取）
let introEl = null;
let nameEl = null;
let poemEl = null;
let dateEl = null;
let hintEl = null;

// 花瓣顶点色（todo 6）：基部 #d42b4e → 尖端 #8f1530 渐变。
// 必须置于模块顶部：createPetalGeometry 在 initScene()（模块中部调用）期间即被使用，
// 若声明在函数之后，初始化晚于首次调用会触发 TDZ/undefined 错误。
const PETAL_COLOR_BASE = new THREE.Color(0xd42b4e);
const PETAL_COLOR_TIP = new THREE.Color(0x8f1530);
const PETAL_COLOR_TMP = new THREE.Color();

// 七夕之七：花束株数（todo 5 花束组装用；QA 失败场景临时改 6 验证）
const BOUQUET_ROSE_COUNT = 7;

// 调试钩子：3D 与降级两条路径下都可用
window.__degraded = () => gl === null;
window.__sceneInfo = () => ({
  hasCanvas: !!renderer,
  w: renderer?.domElement.width ?? 0,
  h: renderer?.domElement.height ?? 0,
  cameraZ: camera ? +camera.position.z.toFixed(3) : null,
});

if (!gl) {
  // WebGL 不可用：切到 2D 降级容器（渲染逻辑由 todo 11 完成）
  const sceneEl = document.getElementById('scene');
  const fallbackEl = document.getElementById('fallback2d');
  if (sceneEl) sceneEl.style.display = 'none';
  if (fallbackEl) fallbackEl.style.display = 'block';
} else {
  initScene();
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('scene').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = createSkyTexture();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 6.5);
  camera.lookAt(0, 0.9, 0);

  // 光照：半球环境光 + 暖白主光 + 冷蓝补光
  scene.add(new THREE.HemisphereLight(0x3a4a7a, 0x1a1030, 1));

  const mainLight = new THREE.DirectionalLight(0xfff2d8, 1.2);
  mainLight.position.set(2, 4, 3);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x4a6bd4, 0.4);
  fillLight.position.set(-3, 1.5, -2);
  scene.add(fillLight);

  // 花束（todo 5：7 株玫瑰组装，整体定位在 (0,0.9,0)）
  bouquetGroup = createBouquet();
  scene.add(bouquetGroup);

  // 光晕（todo 6）：花束中心 + 两侧共 3 个呼吸光点（animate 循环里做正弦呼吸）
  glowSprites = createGlowSprites();
  for (const sprite of glowSprites) scene.add(sprite);

  // 粒子系统（todo 8）：飘落花瓣（InstancedMesh）+ 星光（Points）
  particleSystem = createParticleSystem(scene);

  // 视口变化（resize / 旋转屏幕）时同步画布与相机
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // 渲染循环：光晕 opacity 随正弦呼吸（0.35-0.6，周期 ~2.5s，todo 9 联调）；
  // 每帧驱动粒子系统（下落/横漂/自转/重置、星光闪烁）、爱心粒子与帧率采样
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt =
      lastFrameTime < 0 ? 0.016 : Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    const t = now * 0.001;
    // 光晕呼吸（todo 6 + 9 联调）：角速度 2π/2.5 ≈ 2.513 rad/s，周期 ~2.5s
    const breath = 0.475 + 0.125 * Math.sin(t * 2.513);
    for (const sprite of glowSprites) {
      sprite.material.opacity = breath;
    }
    updateEntrance(now);
    // 慢自转（todo 9）：入场完成后绕花束中心 Y 轴旋转，reduced-motion 跳过
    if (entranceDone && !reducedMotion && bouquetGroup) {
      bouquetGroup.rotation.y += dt * 0.05;
    }
    // 鼠标/触摸视差（todo 9）：相机 x/z 缓动 ±0.35（z 反向补偿，产生景深错位）
    if (entranceDone && !reducedMotion && camera) {
      const k = 1 - Math.exp(-dt * 4);
      camera.position.x += (mouseNX * 0.35 - camera.position.x) * k;
      camera.position.z += (6.5 - mouseNY * 0.35 - camera.position.z) * k;
    }
    if (particleSystem) particleSystem.update(t, dt);
    updateHearts(dt);
    updateFps(now);
    renderer.render(scene, camera);
  }
  initEntrance();
  animate();
}

// 512x512 夜空渐变 + 星点背景纹理
function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0b1026');
  grad.addColorStop(1, '#1a1030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // ~60 颗随机白色星点
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// --- 光晕：128x128 径向渐变（白 → 暖粉 → 透明）纹理 + AdditiveBlending Sprite ---
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 244, 250, 0.9)');
  grad.addColorStop(0.25, 'rgba(255, 138, 178, 0.5)');
  grad.addColorStop(1, 'rgba(255, 120, 170, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3 个光晕 Sprite：花束中心（大）+ 左右两侧（小）
function createGlowSprites() {
  const texture = createGlowTexture();
  const positions = [
    { x: 0, y: 0.9, z: 0, scale: 2.2 },
    { x: -1.3, y: 0.7, z: -0.6, scale: 1.6 },
    { x: 1.3, y: 0.7, z: -0.6, scale: 1.6 },
  ];
  return positions.map((p) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.475,
        depthWrite: false,
      })
    );
    sprite.position.set(p.x, p.y, p.z);
    sprite.scale.setScalar(p.scale);
    return sprite;
  });
}

// --- 确定性 PRNG：mulberry32（全局 seed=20260819，保证每次构建一致） ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 花瓣几何：12x6 分段，中心线为二次贝塞尔（沿长向卷曲），
// 宽度方向绕切线旋转（沿宽向外展成 U 形杯状）。
// 顶点色沿长向 u 渐变（todo 6）：基部 #d42b4e → 尖端 #8f1530，
// 供花瓣材质 vertexColors 使用；花萼复用本几何但用纯色材质忽略顶点色。
function createPetalGeometry(len, width, rise, tipY, curlMid, curlTip) {
  const segL = 12;
  const segW = 6;
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i <= segL; i++) {
    const u = i / segL;
    // 中心线：二次贝塞尔 P0=(0,0) P1=(0.5len,rise) P2=(len,tipY)
    const x = u * len;
    const y = 2 * (1 - u) * u * rise + u * u * tipY;
    // 切线方向（XY 平面）
    const dx = len;
    const dy = 2 * (1 - 2 * u) * rise + 2 * u * tipY;
    const inv = 1 / Math.hypot(dx, dy);
    const tx = dx * inv;
    const ty = dy * inv;
    // 平面内垂直方向
    const wx = -ty;
    const wy = tx;
    // 卷曲角沿长向的贝塞尔分布：中段卷起、尖端略回卷
    const theta = 2 * (1 - u) * u * curlMid + u * u * curlTip;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    // 宽度轮廓：基部与尖端收窄
    const w = Math.sin(Math.PI * Math.pow(u, 0.8));

    for (let j = 0; j <= segW; j++) {
      const v = j / segW - 0.5;
      const half = v * w * width;
      positions.push(
        x + half * wx * cosT,
        y + half * wy * cosT,
        half * sinT
      );
      PETAL_COLOR_TMP.lerpColors(PETAL_COLOR_BASE, PETAL_COLOR_TIP, u);
      colors.push(PETAL_COLOR_TMP.r, PETAL_COLOR_TMP.g, PETAL_COLOR_TMP.b);
    }
  }

  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segW; j++) {
      const a = i * (segW + 1) + j;
      const b = a + 1;
      const c = a + segW + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// 叶片几何：椭圆片沿中脉对折
function createLeafGeometry(len, width, foldAngle) {
  const segL = 8;
  const segW = 4;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segL; i++) {
    const u = i / segL;
    const w = Math.sin(Math.PI * u);
    for (let j = 0; j <= segW; j++) {
      const v = j / segW - 0.5;
      const z = v * w * width;
      const x = u * len;
      // 沿中脉（X 轴）对折：两侧半叶向上折起
      const ang = foldAngle * Math.sign(z);
      positions.push(x, z * Math.sin(ang), z * Math.cos(ang));
    }
  }

  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segW; j++) {
      const a = i * (segW + 1) + j;
      const b = a + 1;
      const c = a + segW + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// 玫瑰材质工厂（todo 6）：一次性创建、全局复用（7 株共享，避免每株重建）。
// 花瓣 MeshStandardMaterial：DoubleSide、transparent、opacity 0.92、roughness 0.45、
// metalness 0、vertexColors 开启（红渐变由 createPetalGeometry 顶点色提供）。
let roseMaterials = null;
function createRoseMaterials() {
  if (roseMaterials) return roseMaterials;
  roseMaterials = {
    petal: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.45,
      metalness: 0,
      vertexColors: true,
    }),
    sepal: new THREE.MeshStandardMaterial({ color: 0x3e8e41, roughness: 0.6 }),
    stem: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 }),
    stamen: new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.5 }),
    thorn: new THREE.MeshStandardMaterial({ color: 0x6d8f4e, roughness: 0.6 }),
  };
  return roseMaterials;
}

// 单株玫瑰：花瓣（内 5x3 层 + 外 6x2 层）、花蕊、花萼、茎、叶、刺
// 所有随机值来自 mulberry32(seed)，同 seed 结果完全一致
function createRose(seed) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const mats = createRoseMaterials();

  // --- 花瓣：内层 5 片 x 3 层（半径 0.12/0.18/0.26，层间螺旋错位 36°），
  //     外层 6 片 x 2 层（半径 0.34/0.42，层间错位 30°） ---
  const LAYERS = [
    { count: 5, radius: 0.12, len: 0.16, width: 0.10, rise: 0.10, tipY: 0.05, curlMid: 1.4, curlTip: 0.6, tilt: 1.35, offset: 0 },
    { count: 5, radius: 0.18, len: 0.20, width: 0.12, rise: 0.12, tipY: 0.06, curlMid: 1.3, curlTip: 0.55, tilt: 1.2, offset: 0.628 },
    { count: 5, radius: 0.26, len: 0.24, width: 0.14, rise: 0.13, tipY: 0.06, curlMid: 1.15, curlTip: 0.5, tilt: 1.05, offset: 1.257 },
    { count: 6, radius: 0.34, len: 0.30, width: 0.17, rise: 0.15, tipY: 0.07, curlMid: 1.0, curlTip: 0.45, tilt: 0.87, offset: 0 },
    { count: 6, radius: 0.42, len: 0.34, width: 0.19, rise: 0.16, tipY: 0.07, curlMid: 0.85, curlTip: 0.4, tilt: 0.73, offset: 0.524 },
  ];

  for (const layer of LAYERS) {
    const step = (Math.PI * 2) / layer.count;
    for (let i = 0; i < layer.count; i++) {
      const angle = layer.offset + i * step + (rng() - 0.5) * 0.1;
      const len = layer.len * (0.9 + rng() * 0.2);
      const width = layer.width * (0.9 + rng() * 0.2);
      const rise = layer.rise * (0.9 + rng() * 0.2);
      const tipY = layer.tipY * (0.8 + rng() * 0.4);
      const curlMid = layer.curlMid + (rng() - 0.5) * 0.2;
      const curlTip = layer.curlTip + (rng() - 0.5) * 0.15;
      const tilt = layer.tilt + (rng() - 0.5) * 0.15;

      const geo = createPetalGeometry(len, width, rise, tipY, curlMid, curlTip);
      const mesh = new THREE.Mesh(geo, mats.petal);
      mesh.rotation.set(0, angle, -tilt);
      // todo 7 入场绽放：记录花瓣基准 rotation.z，动画时叠加 -70°→0° 外翻
      mesh.userData.baseRotZ = -tilt;
      mesh.position.set(
        Math.cos(angle) * layer.radius,
        (rng() - 0.5) * 0.02,
        Math.sin(angle) * layer.radius
      );
      group.add(mesh);
    }
  }

  // --- 花蕊：12 根短圆柱 + 球头（暖黄 #f5c542） ---
  const stamenCylGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.12, 6);
  const stamenBallGeo = new THREE.SphereGeometry(0.02, 8, 6);
  for (let i = 0; i < 12; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = 0.03 + rng() * 0.05;
    const tilt = 0.25 + rng() * 0.45;
    const len = 0.09 + rng() * 0.05;
    const cyl = new THREE.Mesh(stamenCylGeo, mats.stamen);
    cyl.scale.set(1, len / 0.12, 1);
    cyl.position.set(Math.cos(ang) * rad, len / 2 + 0.02, Math.sin(ang) * rad);
    cyl.rotation.set(0, ang, tilt);
    const ball = new THREE.Mesh(stamenBallGeo, mats.stamen);
    ball.position.set(0, len / 2, 0);
    cyl.add(ball);
    group.add(cyl);
  }

  // --- 花萼：5 片小曲面（复用花瓣几何，尖端朝下外；纯色绿材质忽略顶点色） ---
  const sepalGeo = createPetalGeometry(0.09, 0.05, 0.05, 0.02, 0.9, 0.4);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + (rng() - 0.5) * 0.2;
    const mesh = new THREE.Mesh(sepalGeo, mats.sepal);
    mesh.rotation.set(0, angle, -1.2);
    mesh.position.set(Math.cos(angle) * 0.03, -0.01, Math.sin(angle) * 0.03);
    group.add(mesh);
  }

  // --- 茎：TubeGeometry + CatmullRomCurve3（4 控制点、2 弯曲） ---
  const stemPts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3((rng() - 0.5) * 0.08, -0.25, (rng() - 0.5) * 0.08),
    new THREE.Vector3((rng() - 0.5) * 0.1, -0.5, (rng() - 0.5) * 0.1),
    new THREE.Vector3((rng() - 0.5) * 0.06, -0.75, (rng() - 0.5) * 0.06),
  ];
  const stemCurve = new THREE.CatmullRomCurve3(stemPts);
  const stemMesh = new THREE.Mesh(
    new THREE.TubeGeometry(stemCurve, 16, 0.02, 8),
    mats.stem
  );
  group.add(stemMesh);

  // --- 叶：4-6 片椭圆对折叶，沿茎交错，上倾 30-60° ---
  const leafCount = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < leafCount; i++) {
    const t = Math.min(0.18 + i * (0.62 / leafCount) + (rng() - 0.5) * 0.04, 0.99);
    const pos = stemCurve.getPointAt(t);
    const len = 0.1 + rng() * 0.06;
    const width = len * (0.45 + rng() * 0.15);
    const fold = 0.7 + rng() * 0.5;
    const yaw = rng() * Math.PI * 2;
    const mesh = new THREE.Mesh(createLeafGeometry(len, width, fold), mats.stem);
    mesh.position.set(pos.x + Math.cos(yaw) * 0.02, pos.y, pos.z + Math.sin(yaw) * 0.02);
    mesh.rotation.set(0, yaw, 0.5 + rng() * 0.55);
    group.add(mesh);
  }

  // --- 刺：2-4 个锥体，尖端朝下外（#6d8f4e） ---
  const thornGeo = new THREE.ConeGeometry(0.008, 0.03, 6);
  const thornCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < thornCount; i++) {
    const t = 0.3 + rng() * 0.55;
    const pos = stemCurve.getPointAt(t);
    const yaw = rng() * Math.PI * 2;
    const mesh = new THREE.Mesh(thornGeo, mats.thorn);
    mesh.position.set(pos.x + Math.cos(yaw) * 0.02, pos.y, pos.z + Math.sin(yaw) * 0.02);
    mesh.rotation.set(0, yaw, -1.1);
    group.add(mesh);
  }

  return group;
}

// 花束组装（todo 5）：BOUQUET_ROSE_COUNT 株玫瑰（七夕之七）错落环列成「一捧」——
// 中心 1 株略高，周围 6 株绕中心环列、轻微外倾 5-15°；根部聚拢到 (0,0.05,0) 附近，
// 束口用棕色细圆柱模拟捆扎，附 3 片向下外翻的包装叶；整体 Group 定位 (0,0.9,0)。
// 每株玫瑰种子 = 全局种子 20260819 + i * 7919（确定且互异）。
function createBouquet() {
  const GLOBAL_SEED = 20260819;
  const bouquet = new THREE.Group();

  const tieMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 }); // 束口棕
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0x5a7d4a }); // 包装叶（深绿）

  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const X_AXIS = new THREE.Vector3(1, 0, 0);
  const Z_AXIS = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i < BOUQUET_ROSE_COUNT; i++) {
    const roseSeed = GLOBAL_SEED + i * 7919;
    const rose = createRose(roseSeed);
    const rng = mulberry32(roseSeed + 1); // 排布随机流，独立于几何随机流

    if (i === 0) {
      // 中心株：根部 (0,0.05,0)、花头略高（y=0.85），仅绕 Y 随机旋转
      rose.position.set(0, 0.8, 0);
      rose.rotation.y = rng() * Math.PI * 2;
      bouquet.add(rose);
      continue;
    }

    // 环列株：根部小半径聚拢（0.08-0.14），花头低于中心株 0.2-0.4，
    // 绕径向轻微外倾 5-15°，并绕自身 Y 随机旋转
    const theta = ((i - 1) / 6) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const rootR = 0.08 + rng() * 0.06;
    const rootY = 0.05 + (rng() - 0.5) * 0.03;
    const headY = 0.85 - (0.2 + rng() * 0.2);
    const tilt = (5 + rng() * 10) * (Math.PI / 180);

    // 以根部为枢轴：将玫瑰 +Y 轴向径向方向外倾 tilt
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(theta) * rootR, rootY, Math.sin(theta) * rootR);
    const tiltedUp = new THREE.Vector3(
      Math.cos(theta) * Math.sin(tilt),
      Math.cos(tilt),
      Math.sin(theta) * Math.sin(tilt)
    );
    pivot.quaternion.setFromUnitVectors(Y_AXIS, tiltedUp);

    // 花头落在目标高度 headY；lift = (headY - rootY) / cos(tilt)
    rose.position.set(0, (headY - rootY) / Math.cos(tilt), 0);
    rose.rotation.y = rng() * Math.PI * 2;
    pivot.add(rose);
    bouquet.add(pivot);
  }

  // --- 束口捆扎：3 根细长棕圆柱（#8d6e63）斜交缠绕于根部聚拢处 ---
  const tieGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10);
  const qYaw = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  for (let k = 0; k < 3; k++) {
    const tie = new THREE.Mesh(tieGeo, tieMat);
    qYaw.setFromAxisAngle(Y_AXIS, (Math.PI / 3) * k + (k % 2) * 0.4); // 平躺后绕 Y 斜交
    qTilt.setFromAxisAngle(X_AXIS, Math.PI / 2); // 圆柱轴 Y -> 水平
    tie.quaternion.copy(qYaw).multiply(qTilt);
    tie.position.set(0, 0.072 - k * 0.022, 0);
    bouquet.add(tie);
  }

  // --- 包装叶：3 片向下外翻的叶片围在束口下方 ---
  for (let k = 0; k < 3; k++) {
    const theta = (k / 3) * Math.PI * 2 + (mulberry32(GLOBAL_SEED + 700 + k)() - 0.5) * 0.4;
    const leaf = new THREE.Mesh(createLeafGeometry(0.3, 0.15, 0.55), wrapMat);
    leaf.position.set(Math.cos(theta) * 0.12, 0, Math.sin(theta) * 0.12);
    qYaw.setFromAxisAngle(Y_AXIS, -theta);
    qTilt.setFromAxisAngle(Z_AXIS, -1.0); // 叶尖向下外翻（径向朝外）
    leaf.quaternion.copy(qYaw).multiply(qTilt);
    bouquet.add(leaf);
  }

  bouquet.position.set(0, 0.9, 0);
  return bouquet;
}
window.__roseTest = () => {
  const g = createRose(20260819);
  return {
    children: g.children.length,
    hasGeometry: g.children.every((c) => c.geometry !== undefined),
  };
};

window.__roseInfo = () => {
  const g = createRose(20260819);
  let hash = 0;
  let meshes = 0;
  g.traverse((o) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (pos) {
      meshes++;
      const arr = pos.array;
      for (let i = 0; i < arr.length; i++) {
        hash = (hash * 31 + Math.round(arr[i] * 1000)) % 2147483647;
      }
    }
  });
  return { children: g.children.length, meshes, hash };
};

window.__roseBox = () => {
  const g = createRose(20260819);
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3());
  return {
    min: box.min.toArray().map((v) => +v.toFixed(3)),
    max: box.max.toArray().map((v) => +v.toFixed(3)),
    size: size.toArray().map((v) => +v.toFixed(3)),
  };
};

// 调试钩子（todo 5 QA 用）：花束统计
window.__bouquetInfo = () => {
  const b = createBouquet();
  let totalMeshes = 0;
  let nanFree = true;
  b.traverse((o) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (pos) {
      totalMeshes++;
      const arr = pos.array;
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) {
          nanFree = false;
          break;
        }
      }
    }
  });
  return { roseCount: BOUQUET_ROSE_COUNT, totalMeshes, nanFree };
};

// 调试钩子（todo 6 QA 用）：材质规格与光晕呼吸状态
window.__materialsInfo = () => {
  const m = createRoseMaterials();
  return {
    petalOpacity: m.petal.opacity,
    petalSide: m.petal.side,
    petalVertexColors: m.petal.vertexColors,
    petalRoughness: m.petal.roughness,
    petalMetalness: m.petal.metalness,
    sepalColor: '#' + m.sepal.color.getHexString(),
    stemColor: '#' + m.stem.color.getHexString(),
    stamenColor: '#' + m.stamen.color.getHexString(),
    thornColor: '#' + m.thorn.color.getHexString(),
    glowCount: glowSprites.length,
    glowOpacities: glowSprites.map((s) => s.material.opacity),
  };
};

// ==================== 入场绽放动画（todo 7） ====================
// performance.now 时间轴手写 tween（约 2.5s，easeInOutCubic）：
//   0-0.8s   #intro 遮罩 opacity 1→0（JS 驱动，与 3D 时间轴同步）
//   0.3-1.5s 花束 scale 0.01→1 + 花瓣层 -70°→0° 外翻（easeOutBack 过冲回弹）
//   0.8-2.2s 相机 z 8→6.5 缓推
//   1.2-2.5s #name→#poem→#date 依次 opacity 0→1、translateY 20px→0
//   2.5s 后  #hint 淡入 + 轻微呼吸
// prefers-reduced-motion：跳过动画，直接置为最终状态。
// 常量/缓动/元素缓存声明在模块顶部（TDZ 安全），函数声明提升无此问题。

function initEntrance() {
  introEl = document.getElementById('intro');
  nameEl = document.getElementById('name');
  poemEl = document.getElementById('poem');
  dateEl = document.getElementById('date');
  hintEl = document.getElementById('hint');

  // 遮罩渐隐改由 JS 时间轴驱动（与 3D 同步），禁用 CSS 动画避免双轨竞争
  if (introEl) introEl.style.animation = 'none';

  // prefers-reduced-motion：瞬时完成，直接置最终状态
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (introEl) introEl.style.opacity = '0';
    if (bouquetGroup) bouquetGroup.scale.setScalar(1);
    if (camera) camera.position.z = 6.5;
    for (const el of [nameEl, poemEl, dateEl, hintEl]) {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    }
    entranceDone = true;
    return;
  }

  // 初始状态：遮罩全遮、文字隐藏、花束闭合（scale 0.01 + 花瓣叠加 -70°）
  if (introEl) introEl.style.opacity = '1';
  for (const el of [nameEl, poemEl, dateEl, hintEl]) {
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    }
  }
  if (bouquetGroup) {
    bouquetGroup.scale.setScalar(0.01);
    bouquetGroup.traverse((o) => {
      if (o.userData && o.userData.baseRotZ !== undefined) {
        o.rotation.z = o.userData.baseRotZ + PETAL_CLOSED_ADD;
      }
    });
  }

  entranceStart = performance.now();
}

function updateEntrance(now) {
  // 入场完成后：#hint 淡入（0.8s）+ 轻微呼吸（0.35-0.65）。
  // entranceStart >= 0 才呼吸：prefers-reduced-motion 路径 entranceStart 保持 -1，
  // hint 已在 initEntrance 置为静态 opacity 1，此处不得再覆盖。
  if (entranceDone) {
    if (hintEl && entranceStart >= 0) {
      const fade = Math.min(
        Math.max((now - entranceStart) / 1000 - ENTRANCE_DURATION, 0) / 0.8,
        1
      );
      hintEl.style.opacity = String(
        fade * (0.5 + 0.15 * Math.sin(now * 0.001 * 1.8))
      );
    }
    return;
  }
  if (entranceStart < 0) return;

  const elapsed = (now - entranceStart) / 1000;

  // 1. 遮罩 0-0.8s：opacity 1→0
  if (introEl) {
    const p = Math.min(elapsed / 0.8, 1);
    introEl.style.opacity = String(1 - easeInOutCubic(p));
  }

  // 2. 花束 0.3-1.5s：scale 0.01→1 + 花瓣 -70°→0° 外翻（过冲回弹）
  if (bouquetGroup) {
    const p = Math.min(Math.max((elapsed - 0.3) / 1.2, 0), 1);
    bouquetGroup.scale.setScalar(0.01 + 0.99 * easeInOutCubic(p));
    const add = PETAL_CLOSED_ADD * (1 - easeOutBack(p));
    bouquetGroup.traverse((o) => {
      if (o.userData && o.userData.baseRotZ !== undefined) {
        o.rotation.z = o.userData.baseRotZ + add;
      }
    });
  }

  // 3. 相机 0.8-2.2s：z 8→6.5 缓推
  if (camera) {
    const p = Math.min(Math.max((elapsed - 0.8) / 1.4, 0), 1);
    camera.position.z = 8 - 1.5 * easeInOutCubic(p);
  }

  // 4. 文字 1.2-2.5s：#name(1.2)→#poem(1.6)→#date(2.0) 依次淡入上移
  const textSeq = [
    { el: nameEl, start: 1.2 },
    { el: poemEl, start: 1.6 },
    { el: dateEl, start: 2.0 },
  ];
  for (const { el, start } of textSeq) {
    if (!el) continue;
    const p = Math.min(Math.max((elapsed - start) / 0.4, 0), 1);
    const e = easeInOutCubic(p);
    el.style.opacity = String(e);
    el.style.transform = `translateY(${(1 - e) * 20}px)`;
  }

  if (elapsed >= ENTRANCE_DURATION) {
    entranceDone = true;
  }
}

// 调试钩子（todo 7 QA 用）：入场阶段与进度
window.__animState = () => {
  if (entranceDone) return { phase: 'done', progress: 1 };
  if (entranceStart < 0) return { phase: 'intro', progress: 0 };
  const elapsed = (performance.now() - entranceStart) / 1000;
  const progress = Math.min(elapsed / ENTRANCE_DURATION, 1);
  let phase = 'intro';
  if (elapsed >= 1.2) phase = 'text';
  else if (elapsed >= 0.8) phase = 'camera';
  else if (elapsed >= 0.3) phase = 'bloom';
  return { phase, progress: +progress.toFixed(3) };
};

// ==================== 粒子系统（todo 8） ====================
// 飘落花瓣：每株 60-120 片小平面（低档减半），共用一个 InstancedMesh（单次 draw call）。
//   canvas 生成 32x32 两色渐变粉色纹理；PlaneGeometry 随机大小 0.04-0.09；
//   初始随机 x/z/高度；每帧下落 vy 0.3-0.6 + 正弦横漂 + 自身旋转；y<-2 重置到顶部。
// 星光：THREE.Points 800-1600（低档减半），随机球壳分布半径 3-8，
//   PointsMaterial size 0.035、transparent、AdditiveBlending，顶点色正弦闪烁
//   （AdditiveBlending 下颜色亮度即等效透明度，更新 color attribute 实现）。
// prefers-reduced-motion：跳过粒子（执行策略 line 66）；__particleStats 返回 0。

// 32x32 花瓣纹理：粉色两色渐变（浅粉 → 深粉）
function createPetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0, '#ffb3d1');
  grad.addColorStop(1, '#e75480');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 创建粒子系统（飘落花瓣 + 星光），返回 { update, petals, stars, petalY0 }
function createParticleSystem(scene) {
  // prefers-reduced-motion：跳过粒子
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const rng = mulberry32(20260819 + 800); // 粒子随机流（确定性，独立于几何流）
  const low = deviceTier === 'low';

  // --- 飘落花瓣：InstancedMesh（每株 60-120，低档减半） ---
  const petalsPerRose = low
    ? Math.floor((60 + Math.floor(rng() * 61)) / 2)
    : 60 + Math.floor(rng() * 61);
  const petalCount = petalsPerRose * BOUQUET_ROSE_COUNT;

  const petalGeo = new THREE.PlaneGeometry(1, 1);
  const petalMat = new THREE.MeshBasicMaterial({
    map: createPetalTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);

  // 每片花瓣的独立状态数组
  const px = new Float32Array(petalCount);
  const py = new Float32Array(petalCount);
  const pz = new Float32Array(petalCount);
  const pvy = new Float32Array(petalCount);
  const pPhase = new Float32Array(petalCount);
  const pDrift = new Float32Array(petalCount);
  const pRot = new Float32Array(petalCount);
  const pRotSpeed = new Float32Array(petalCount);
  const pScale = new Float32Array(petalCount);

  // 复用的矩阵/向量/欧拉（避免每帧分配）
  const m4 = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();

  for (let i = 0; i < petalCount; i++) {
    px[i] = (rng() - 0.5) * 8;
    py[i] = -2 + rng() * 5; // 初始高度散布 -2..3
    pz[i] = (rng() - 0.5) * 8;
    pvy[i] = 0.3 + rng() * 0.3; // 0.3-0.6
    pPhase[i] = rng() * Math.PI * 2;
    pDrift[i] = 0.15 + rng() * 0.25; // 正弦横漂幅度
    pRot[i] = rng() * Math.PI * 2;
    pRotSpeed[i] = (rng() - 0.5) * 2; // 自身旋转速度（rad/s，可正可负）
    pScale[i] = 0.04 + rng() * 0.05; // 0.04-0.09
  }

  function writeInstance(i) {
    pos.set(px[i], py[i], pz[i]);
    euler.set(0, 0, pRot[i]);
    quat.setFromEuler(euler);
    scl.setScalar(pScale[i]);
    m4.compose(pos, quat, scl);
    petalMesh.setMatrixAt(i, m4);
  }
  for (let i = 0; i < petalCount; i++) writeInstance(i);
  petalMesh.instanceMatrix.needsUpdate = true;
  scene.add(petalMesh);

  // --- 星光：THREE.Points（800-1600，低档减半），球壳分布半径 3-8 ---
  const starCount = low
    ? 400 + Math.floor(rng() * 401)
    : 800 + Math.floor(rng() * 801);
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starBase = new Float32Array(starCount); // 基础亮度
  const starPhase = new Float32Array(starCount); // 闪烁相位
  const starSpeed = new Float32Array(starCount); // 闪烁角速度

  for (let i = 0; i < starCount; i++) {
    const r = 3 + rng() * 5;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const sp = Math.sin(phi);
    starPos[i * 3] = r * sp * Math.cos(theta);
    starPos[i * 3 + 1] = r * sp * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    starBase[i] = 0.3 + rng() * 0.7;
    starPhase[i] = rng() * Math.PI * 2;
    starSpeed[i] = 0.5 + rng() * 1.5;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // 第一片花瓣的当前世界 y（InstancedMesh 位于场景原点，世界 y = 实例 y）
  let petalY0 = py[0];

  function update(t, dt) {
    // 花瓣：下落 + 正弦横漂 + 自转；y<-2 重置到顶部
    for (let i = 0; i < petalCount; i++) {
      py[i] -= pvy[i] * dt;
      px[i] += Math.sin(t * 0.8 + pPhase[i]) * pDrift[i] * dt;
      pz[i] += Math.cos(t * 0.6 + pPhase[i]) * pDrift[i] * dt;
      pRot[i] += pRotSpeed[i] * dt;
      if (py[i] < -2) {
        py[i] = 2.5 + rng() * 1.5;
        px[i] = (rng() - 0.5) * 8;
        pz[i] = (rng() - 0.5) * 8;
      }
      writeInstance(i);
    }
    petalMesh.instanceMatrix.needsUpdate = true;
    petalY0 = py[0];

    // 星光：顶点色正弦闪烁（AdditiveBlending 下亮度即透明度）
    const col = starGeo.attributes.color;
    for (let i = 0; i < starCount; i++) {
      const a =
        0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * starSpeed[i] + starPhase[i]));
      const v = starBase[i] * a;
      starCol[i * 3] = v;
      starCol[i * 3 + 1] = v;
      starCol[i * 3 + 2] = v;
    }
    col.needsUpdate = true;
  }

  return {
    update,
    petals: petalCount,
    stars: starCount,
    get petalY0() {
      return petalY0;
    },
  };
}

// 帧率采样：最近 2s 窗口的平均 fps
function updateFps(now) {
  fpsSamples.push(now);
  while (fpsSamples.length > 2 && fpsSamples[0] < now - 2000) {
    fpsSamples.shift();
  }
  if (fpsSamples.length >= 2) {
    fpsAvg =
      ((fpsSamples.length - 1) * 1000) /
      (fpsSamples[fpsSamples.length - 1] - fpsSamples[0]);
  }
}

// 调试钩子（todo 8 QA 用）：粒子统计
window.__particleStats = () => {
  if (!particleSystem) return { petals: 0, stars: 0, petalY0: null };
  return {
    petals: particleSystem.petals,
    stars: particleSystem.stars,
    petalY0: particleSystem.petalY0,
  };
};

// 调试钩子（todo 8 QA 用）：最近 2s 平均 fps
window.__fps = () => +fpsAvg.toFixed(1);

// ==================== 交互与环境动效（todo 9） ====================
// 视差：记录指针归一化偏移（-1..1）
function setPointer(clientX, clientY) {
  mouseNX = (clientX / window.innerWidth) * 2 - 1;
  mouseNY = (clientY / window.innerHeight) * 2 - 1;
}

// 爱心迸发：从触点迸发 16-24 个（reduced-motion 减半 8-12）。
// 粒子世界坐标 y 向上（与 Three.js 一致），初速 2-5（×S 缩放），
// 扇形主要朝上（±51.6°）；池上限 200，超出丢弃最旧。
function burstHearts(clientX, clientY) {
  const S = 0.12 * Math.min(window.innerWidth, window.innerHeight);
  const count = reducedMotion
    ? 8 + Math.floor(Math.random() * 5)
    : 16 + Math.floor(Math.random() * 9);
  const baseY = window.innerHeight - clientY; // 屏幕坐标 → 世界坐标（y 向上）
  for (let i = 0; i < count; i++) {
    const speed =
      (HEART_SPEED_MIN + Math.random() * (HEART_SPEED_MAX - HEART_SPEED_MIN)) * S;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.8;
    hearts.push({
      x: clientX,
      y: baseY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 10 + Math.random() * 8, // 10-18px（心形边长）
      life: 0,
      maxLife: HEART_MAX_LIFE,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
    });
    heartsSpawned++;
  }
  while (hearts.length > HEART_POOL_CAP) hearts.shift();
}

// 32x32 心形精灵：贝塞尔心形路径 + 暖粉→红渐变（仅渲染一次，逐帧 drawImage 复用）
function createHeartSprite() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.translate(16, 18);
  const s = 10;
  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, '#ff9ec3'); // 暖粉
  grad.addColorStop(1, '#d42b4e'); // 红
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0.45 * s);
  ctx.bezierCurveTo(-0.65 * s, -0.05 * s, -0.4 * s, -0.8 * s, 0, -0.45 * s);
  ctx.bezierCurveTo(0.4 * s, -0.8 * s, 0.65 * s, -0.05 * s, 0, 0.45 * s);
  ctx.closePath();
  ctx.fill();
  return c;
}

// 每帧更新+绘制爱心（并入主循环）：
//   vy += gravity*dt（重力 -6×S）、vx/vy *= 摩擦 0.98、life += dt，
//   超 1.2s 移除；alpha = 1 - life/maxLife 渐隐。
function updateHearts(dt) {
  if (!heartsCanvas || !hctx) return;
  const S = 0.12 * Math.min(window.innerWidth, window.innerHeight);
  const g = HEART_GRAVITY * S;
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.vy += g * dt;
    h.vx *= HEART_FRICTION;
    h.vy *= HEART_FRICTION;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.rot += h.rotSpeed * dt;
    h.life += dt;
    if (h.life > h.maxLife) hearts.splice(i, 1);
  }
  hctx.setTransform(heartsDPR, 0, 0, heartsDPR, 0, 0);
  hctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const h of hearts) {
    hctx.save();
    hctx.translate(h.x, window.innerHeight - h.y);
    hctx.rotate(h.rot);
    hctx.scale(h.size / 32, h.size / 32);
    hctx.globalAlpha = Math.max(0, 1 - h.life / h.maxLife);
    hctx.drawImage(heartSprite, -16, -16);
    hctx.restore();
  }
}

// 调试钩子（todo 9 QA 用）
window.__yaw = () => (bouquetGroup ? bouquetGroup.rotation.y : null);
window.__interactStats = () => ({
  heartsSpawned,
  activeHearts: hearts.length,
  heartY0: hearts.length > 0 ? +hearts[0].y.toFixed(3) : null,
});
