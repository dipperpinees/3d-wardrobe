import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import './style.css';
import './mobile.css';

const paths = {
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  vase: '<path d="M9 3h6l-1 5c0 3 5 5 4 9l-1 4H7l-1-4c-1-4 4-6 4-9Z"/><path d="M9 3h6"/>',
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8Zm0 10 9-5M12 13 3 8m9 5v9M7 5.8l9 5"/>',
  front: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 15h16M12 3v18M4 9h8m0-2h8m-8 11h4"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M10 7v6m-3-3h6"/>',
  ruler: '<path d="m3 17 14-14 4 4L7 21Zm11-11 2 2m-5 1 2 2m-5 1 2 2m-5 1 2 2"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1.5 8M4 4v6h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  open: '<path d="M5 3h14v18H5Zm0 0 9 3v12l-9 3M11 11v2m6-10v18"/>',
  expand: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sliders: '<path d="M4 6h5m4 0h7M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  chevron: '<path d="m6 14 6-6 6 6"/>',
};
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[el.dataset.icon]}</svg>`; });

const $ = id => document.getElementById(id);
const state = { wood: 'walnut', depth: .24, lights: true, decor: true, open: false, dimensions: false, scrollMode: 'rotate' };
const trim = { width: 1.37, frontOverhang: .05 };
const compactLayout = window.matchMedia('(max-width: 900px), (max-height: 500px) and (max-width: 1100px)');
let renderer, scene, camera, controls, cabinet, decorations, dimensionGroup, lightsGroup;
let doors = [], drawers = [], woodMaterials = [], ledMaterials = [], frameRequested = false;
let cameraMotion = null, openAmount = 0, lastTime = 0, toastTimeout;
const woods = {
  walnut: { name: 'Gỗ óc chó', base: [94, 65, 45], dark: '#35281e' },
  oak: { name: 'Gỗ sồi tự nhiên', base: [181, 144, 96], dark: '#8f714a' },
  smoked: { name: 'Gỗ sồi hun khói', base: [105, 98, 80], dark: '#403f34' },
};
const metal = new THREE.MeshStandardMaterial({ color: '#b9a16c', metalness: .8, roughness: .31 });
const black = new THREE.MeshStandardMaterial({ color: '#3b3730', metalness: .4, roughness: .4 });
const ceramic = new THREE.MeshStandardMaterial({ color: '#dbd6c1', roughness: .78 });
const paper = new THREE.MeshStandardMaterial({ color: '#e1dccb', roughness: .87 });
const bookGreen = new THREE.MeshStandardMaterial({ color: '#6d7762', roughness: .85 });
const glass = new THREE.MeshPhysicalMaterial({ color: '#f8f4dd', metalness: 0, roughness: .08, transmission: .93, thickness: .008, ior: 1.5, transparent: true, opacity: 1 });

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 3600);
}
function mulberry(seed) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function woodTexture(type, horizontal = false) {
  const random = mulberry(318), canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 1024;
  const ctx = canvas.getContext('2d'), base = woods[type].base;
  ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 1900; i++) {
    const x = random() * 512, width = random() * 1.1 + .25, delta = (random() - .5) * 42;
    ctx.strokeStyle = `rgba(${base.map(c => Math.max(0, Math.min(255, c + delta))).join(',')},${.12 + random() * .28})`;
    ctx.lineWidth = width; ctx.beginPath();
    const sway = 3 + random() * 12, phase = random() * 6.28;
    for (let y = 0; y <= 1024; y += 10) {
      const xx = x + Math.sin(y / 190 + phase) * sway + Math.sin(y / 380 + phase) * 5;
      if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const cx = random() * 512, cy = random() * 1024;
    for (let j = 1; j < 18; j++) {
      ctx.strokeStyle = `rgba(37,23,11,${.045 - j * .0016})`; ctx.lineWidth = .65;
      ctx.beginPath(); ctx.ellipse(cx, cy, j * 2.1, j * 11, .04, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (horizontal) { texture.center.set(.5, .5); texture.rotation = Math.PI / 2; }
  return texture;
}
function makeWood(horizontal = false, darken = 1) {
  const mat = new THREE.MeshStandardMaterial({ map: woodTexture(state.wood, horizontal), color: new THREE.Color(darken, darken, darken), roughness: .46 });
  mat.userData.horizontal = horizontal;
  woodMaterials.push(mat); return mat;
}
function mesh(geometry, material, x, y, z, parent = cabinet) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(w, h, d, x, y, z, mat, parent = cabinet, bevel = .0015) {
  return mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(bevel, w / 4, h / 4, d / 4)), mat, x, y, z, parent);
}
function cylinder(rt, rb, h, x, y, z, mat, parent = cabinet, segments = 24) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), mat, x, y, z, parent);
}
function lathe(points, mat, parent, x = 0, y = 0, z = 0) {
  return mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), 40), mat, x, y, z, parent);
}
function handle(x, y, z, parent, vertical = true) {
  box(vertical ? .007 : .085, vertical ? .095 : .007, .009, x, y, z + .015, metal, parent, .002);
  [-1, 1].forEach(s => box(.006, .006, .018, x + (vertical ? 0 : .034 * s), y + (vertical ? .037 * s : 0), z + .005, metal, parent));
}
function led(x, y, width) {
  const m = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffd590', emissiveIntensity: state.lights ? 2.8 : 0, roughness: .4 });
  ledMaterials.push(m); box(width, .004, .006, x, y, -state.depth / 2 + .055, m);
  const light = new THREE.PointLight('#ffd7a0', state.lights ? .24 : 0, .67, 1.4);
  light.position.set(x, y - .045, -.02); lightsGroup.add(light);
}
function makeBottle(x, y, z, color = '#303c21', scale = 1, parent = decorations, name = 'RÉSERVE') {
  const group = new THREE.Group(); parent.add(group); group.position.set(x, y, z); group.scale.setScalar(scale);
  const bottleMat = new THREE.MeshPhysicalMaterial({ color, roughness: .23, metalness: .1, clearcoat: 1, clearcoatRoughness: .16 });
  lathe([[0, 0], [.027, 0], [.032, .006], [.032, .165], [.031, .18], [.027, .194], [.014, .218], [.012, .228], [.012, .282], [.014, .284], [.014, .297], [0, .297]], bottleMat, group);
  cylinder(.0135, .0135, .042, 0, .27, 0, new THREE.MeshStandardMaterial({ color: color === '#563025' ? '#ae9573' : '#302a23', roughness: .45, metalness: .2 }), group);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6dfc9'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#827657'; ctx.strokeRect(18, 16, 220, 224); ctx.textAlign = 'center';
  ctx.fillStyle = '#655a40'; ctx.font = '20px Georgia'; ctx.fillText('M · 1997', 128, 58);
  ctx.font = '29px Georgia'; ctx.fillText(name, 128, 141); ctx.font = '13px serif'; ctx.fillText('VIN DE FRANCE', 128, 186);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const label = mesh(new THREE.CylinderGeometry(.0324, .0324, .086, 48, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: .8 }), 0, .109, 0, group);
  label.rotation.y = Math.PI; return group;
}
function wineGlass(x, y, z, upsideDown = false) {
  const group = new THREE.Group(); decorations.add(group); group.position.set(x, y, z);
  if (upsideDown) group.rotation.z = Math.PI;
  cylinder(.029, .03, .003, 0, .002, 0, glass, group, 32);
  cylinder(.003, .003, .08, 0, .043, 0, glass, group, 16);
  lathe([[.003, .083], [.017, .087], [.032, .104], [.037, .135], [.035, .16], [.029, .183], [.028, .183], [.034, .159], [.036, .135], [.031, .105], [.016, .089], [.003, .085]], glass, group);
}
function vase(x, y, z) {
  const group = new THREE.Group(); decorations.add(group); group.position.set(x, y, z);
  lathe([[0, 0], [.059, 0], [.067, .025], [.075, .09], [.071, .145], [.05, .18], [.028, .197], [.025, .235], [.028, .24], [.023, .24], [.021, .202], [.046, .18]], ceramic, group);
  const stemMat = new THREE.MeshStandardMaterial({ color: '#7b7852', roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#8c9271', roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const top = new THREE.Vector3((i - 1.4) * .043, .45 + (i % 2) * .09, Math.sin(i) * .025);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, .15, 0), new THREE.Vector3(top.x * .3, .34, top.z), top);
    mesh(new THREE.TubeGeometry(curve, 15, .0011, 5, false), stemMat, 0, 0, 0, group);
    for (let j = 0; j < 5; j++) {
      const p = curve.getPoint(.42 + j * .12);
      for (const sign of [-1, 1]) {
        const leaf = mesh(new THREE.SphereGeometry(1, 10, 6), leafMat, p.x + sign * .014, p.y + .008, p.z, group);
        leaf.scale.set(.019, .008, .003); leaf.rotation.z = sign * .6;
      }
    }
  }
}
function buildDecor() {
  const back = -state.depth / 2 + .11;
  // Bottles lie across the width so full-size bottles fit the 24 cm-deep body.
  for (let row = 0; row < 3; row++) {
    [-.04, .04].forEach(z => box(.58, .008, .012, -.318, .819 + row * .071, z, black, decorations));
  }
  for (let i = 0; i < 5; i++) {
    const bottle = makeBottle(-.59 + (i % 2) * .29, .851 + Math.floor(i / 2) * .071, 0, i % 2 ? '#563025' : '#303c21', .87);
    bottle.rotation.z = -Math.PI / 2;
  }
  // Glasses and a small serving tray.
  cylinder(.118, .118, .012, -.34, 1.181, .035, metal, decorations, 48);
  wineGlass(-.385, 1.188, .055); wineGlass(-.295, 1.188, .005);
  makeBottle(-.53, 1.175, back, '#6b6437', .79, decorations, 'BLANC');
  // Bottles in the high left niche, with breathing room above.
  makeBottle(-.52, 1.469, back, '#303c21', 1.08);
  makeBottle(-.42, 1.469, back + .02, '#563025', .97);
  makeBottle(-.31, 1.469, back, '#3a4228', 1.03);
  box(.105, .008, .1, -.19, 1.473, .03, metal, decorations);
  wineGlass(-.19, 1.477, .03);
  // The upper-right niche: books and a ceramic bowl.
  box(.17, .023, .17, .2, 1.707, back, paper, decorations);
  box(.18, .019, .15, .205, 1.729, back, bookGreen, decorations);
  lathe([[0, 0], [.033, 0], [.058, .026], [.067, .049], [.062, .049], [.053, .027], [.03, .005], [0, .005]], ceramic, decorations, .46, 1.695, .015);
  // Hanging stemware, visible below the upper-right shelf.
  for (let i = 0; i < 4; i++) {
    box(.09, .006, .011, .09 + i * .137, 1.669, .085, metal, decorations);
    wineGlass(.09 + i * .137, 1.655, .08, true);
  }
  // Small right-hand wine compartments.
  makeBottle(.075, .8, back, '#563025', .98);
  makeBottle(.161, .8, back + .03, '#303c21', .94);
  makeBottle(.09, 1.169, back, '#373d26', .87);
  // Tall right niche: a framed print, ceramic vase, olive sprigs.
  const frameMat = new THREE.MeshStandardMaterial({ color: '#d5c5a3', roughness: .65 });
  box(.253, .38, .015, .455, 1.045, -state.depth / 2 + .028, frameMat, decorations);
  box(.23, .355, .002, .455, 1.045, -state.depth / 2 + .038, paper, decorations);
  const artMat = new THREE.MeshStandardMaterial({ color: '#9c9f7a', roughness: 1 });
  const art = mesh(new THREE.CircleGeometry(.072, 48), artMat, .455, 1.08, -state.depth / 2 + .04, decorations);
  art.scale.y = 1.27;
  vase(.442, .798, .025);
}
function disposeGroup(group) {
  if (!group) return;
  const mats = new Set(), geometries = new Set();
  group.traverse(obj => { if (obj.isMesh || obj.isLine || obj.isSprite) { if (obj.geometry) geometries.add(obj.geometry); const list = Array.isArray(obj.material) ? obj.material : [obj.material]; list.forEach(m => { if (m) mats.add(m); }); } });
  geometries.forEach(g => g.dispose());
  mats.forEach(m => { if (![metal, black, ceramic, paper, bookGreen, glass].includes(m)) { m.map?.dispose(); m.dispose(); } });
  group.removeFromParent();
}
function buildCabinet() {
  disposeGroup(cabinet); disposeGroup(dimensionGroup);
  cabinet = new THREE.Group(); cabinet.name = 'MOC_Tu_ruou_129'; scene.add(cabinet);
  decorations = new THREE.Group(); decorations.name = 'Trang_tri'; cabinet.add(decorations);
  lightsGroup = new THREE.Group(); cabinet.add(lightsGroup);
  woodMaterials = []; ledMaterials = []; doors = []; drawers = [];
  const v = makeWood(), h = makeWood(true), back = makeWood(false, .86), d = state.depth, t = .018;
  const frontZ = d / 2 + .004;
  // Feet, plinth, body and countertop. Total external height is exactly 1.97 m.
  [-.545, .545].forEach(x => [-d / 2 + .065, d / 2 - .065].forEach(z => {
    box(.039, .08, .039, x, .04, z, v);
    box(.04, .009, .04, x, .0045, z, metal);
  }));
  box(1.25, .065, d - .015, 0, .1125, 0, h);
  box(1.29, t, d, 0, .154, 0, h);
  box(t, .607, d, -.636, .4665, 0, v); box(t, .607, d, .636, .4665, 0, v);
  // Projecting mid-height cornice: 4 cm past each side and 5 cm at the front.
  box(trim.width, .032, d + trim.frontOverhang, 0, .782, trim.frontOverhang / 2, h, cabinet, .004);
  box(1.33, .01, d + .025, 0, .761, .0125, h, cabinet, .002);
  box(1.253, .607, .008, 0, .4665, -d / 2 + .004, back);
  [-.18, .23].forEach(x => box(t, .607, d - .016, x, .4665, 0, v));
  // Interior side shelves, visible when the two outer doors swing open.
  box(.438, t, d - .035, -.408, .455, -.005, h);
  box(.379, t, d - .035, .4385, .455, -.005, h);
  const hingeLeft = new THREE.Group(); hingeLeft.position.set(-.626, .458, frontZ); cabinet.add(hingeLeft);
  box(.435, .588, .021, .2175, 0, 0, v, hingeLeft, .002);
  handle(.397, .025, .012, hingeLeft); doors.push({ group: hingeLeft, sign: -1 });
  const hingeRight = new THREE.Group(); hingeRight.position.set(.626, .458, frontZ); cabinet.add(hingeRight);
  box(.384, .588, .021, -.192, 0, 0, v, hingeRight, .002);
  handle(-.347, .025, .012, hingeRight); doors.push({ group: hingeRight, sign: 1 });
  // The upper central drawer is shallow; the lower central drawer is deep.
  [{ y: .661, height: .181 }, { y: .363, height: .4 }].forEach(({ y, height }) => {
    const group = new THREE.Group(); group.position.set(.025, y, 0); cabinet.add(group);
    box(.391, height, .021, 0, 0, frontZ, h, group, .002);
    handle(0, .011, frontZ + .012, group, false);
    const trayH = height - .035, trayD = d - .048;
    box(.355, .012, trayD, 0, -height / 2 + .02, -.005, h, group);
    [-.1775, .1775].forEach(x => box(.012, trayH, trayD, x, 0, -.005, v, group));
    box(.355, trayH, .012, 0, 0, -d / 2 + .025, v, group);
    drawers.push(group);
  });
  // Upper open display, aligned to the hand-drawn asymmetric grid.
  box(t, 1.14, d, -.636, 1.368, 0, v); box(t, 1.14, d, .636, 1.368, 0, v);
  // Matching two-step top cornice, keeping the original total height of 197 cm.
  box(trim.width, .032, d + trim.frontOverhang, 0, 1.954, trim.frontOverhang / 2, h, cabinet, .004);
  box(1.33, .012, d + .025, 0, 1.932, .0125, h, cabinet, .002);
  box(1.254, 1.14, .008, 0, 1.368, -d / 2 + .004, back);
  box(t, 1.14, d - .012, 0, 1.368, .003, v);
  [1.166, 1.46].forEach(y => box(.618, t, d - .01, -.318, y, .005, h));
  [1.46, 1.686].forEach(y => box(.618, t, d - .01, .318, y, .005, h));
  box(t, .653, d - .01, .233, 1.1255, .005, v);
  box(.215, t, d - .01, .1165, 1.16, .005, h);
  // Concealed lighting channels along the back of the display.
  led(-.316, 1.922, .573); led(.316, 1.922, .573);
  led(-.316, 1.442, .573); led(-.316, 1.148, .573);
  led(.316, 1.668, .573); led(.316, 1.442, .573);
  buildDecor(); decorations.visible = state.decor;
  buildDimensions(); applyOpening(); requestRender();
}
function textSprite(text, position) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f6ed'; ctx.beginPath(); ctx.roundRect(90, 20, 332, 88, 16); ctx.fill();
  ctx.fillStyle = '#465d3f'; ctx.font = '500 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(.55, .1375, 1); sprite.position.copy(position); dimensionGroup.add(sprite);
}
function buildDimensions() {
  dimensionGroup = new THREE.Group(); scene.add(dimensionGroup); dimensionGroup.visible = state.dimensions;
  const mat = new THREE.LineBasicMaterial({ color: '#718168', transparent: true, opacity: .75, depthTest: false });
  function line(points) { dimensionGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), mat)); }
  const z = state.depth / 2 + .08, halfWidth = trim.width / 2;
  line([[-halfWidth, 2.018, z], [-halfWidth, 2.1, z], [halfWidth, 2.1, z], [halfWidth, 2.018, z]]);
  [-halfWidth, halfWidth].forEach(x => line([[x - .018, 2.08, z], [x + .018, 2.12, z]]));
  textSprite('137 cm', new THREE.Vector3(0, 2.11, z));
  line([[-.72, 0, z], [-.82, 0, z], [-.82, 1.97, z], [-.72, 1.97, z]]);
  [0, 1.97].forEach(y => line([[-.84, y - .02, z], [-.80, y + .02, z]]));
  textSprite('197 cm', new THREE.Vector3(-.83, .985, z));
  const frontEdge = state.depth / 2 + trim.frontOverhang;
  line([[.72, .02, -state.depth / 2], [.83, .02, -state.depth / 2], [.83, .02, frontEdge], [.72, .02, frontEdge]]);
  textSprite(`${Math.round((state.depth + trim.frontOverhang) * 100)} cm`, new THREE.Vector3(.86, .08, .025));
}
function applyOpening() {
  doors.forEach(({ group, sign }) => group.rotation.y = sign * openAmount * Math.PI * .48);
  drawers.forEach((group, i) => group.position.z = openAmount * state.depth * (i === 0 ? .73 : .59));
}
function handleWheel(event) {
  // Capture before OrbitControls so horizontal trackpad deltas are not discarded.
  event.preventDefault(); event.stopImmediatePropagation();
  cameraMotion = null;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? renderer.domElement.clientHeight : 1;
  const dx = event.deltaX * unit, dy = event.deltaY * unit;
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.ctrlKey || event.metaKey || state.scrollMode === 'zoom') {
    // Browsers represent a touchpad pinch as a Ctrl+wheel gesture.
    const delta = dy || dx;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * Math.exp(THREE.MathUtils.clamp(delta, -160, 160) * .006), controls.minDistance, controls.maxDistance);
  } else {
    spherical.theta -= dx * .006;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * .0045, controls.minPolarAngle, controls.maxPolarAngle);
  }
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update(); requestRender();
}
function requestRender() {
  if (!frameRequested) { frameRequested = true; requestAnimationFrame(render); }
}
function render(time) {
  frameRequested = false;
  const dt = Math.min((time - lastTime) / 1000 || .016, .05); lastTime = time;
  let animate = false;
  const targetOpen = state.open ? 1 : 0;
  if (Math.abs(openAmount - targetOpen) > .001) { openAmount = THREE.MathUtils.damp(openAmount, targetOpen, 6, dt); applyOpening(); animate = true; }
  else if (openAmount !== targetOpen) { openAmount = targetOpen; applyOpening(); }
  if (cameraMotion) {
    const p = Math.min((time - cameraMotion.start) / 900, 1), ease = 1 - (1 - p) ** 3;
    camera.position.lerpVectors(cameraMotion.from, cameraMotion.to, ease);
    controls.target.lerpVectors(cameraMotion.targetFrom, cameraMotion.targetTo, ease);
    if (p === 1) cameraMotion = null; else animate = true;
  }
  controls.update(); renderer.render(scene, camera);
  if (animate) requestRender();
}
function fitDistance(aspect) {
  const halfFov = THREE.MathUtils.degToRad(33 / 2);
  return Math.max(2.2 / (2 * Math.tan(halfFov)), 1.7 / (2 * Math.tan(halfFov) * aspect)) * 1.04;
}
function setView(view = 'perspective') {
  const aspect = camera.aspect, extra = aspect < .9 ? 1.23 : 1;
  const presets = {
    perspective: { p: [2.1 * extra, 1.83, 4.35 * extra], t: [0, 1.06, 0] },
    front: { p: [0, 1.06, 4.75 * extra], t: [0, 1.06, 0] },
    detail: { p: [1.45, 1.45, 2.42], t: [.03, .89, .05] },
  };
  const preset = presets[view];
  if (compactLayout.matches) {
    const target = new THREE.Vector3(...preset.t);
    const direction = new THREE.Vector3(...preset.p).sub(target).normalize();
    const distance = fitDistance(aspect) * (view === 'detail' ? .68 : 1);
    preset.p = direction.multiplyScalar(distance).add(target).toArray();
  }
  cameraMotion = { from: camera.position.clone(), to: new THREE.Vector3(...preset.p), targetFrom: controls.target.clone(), targetTo: new THREE.Vector3(...preset.t), start: performance.now() };
  document.querySelectorAll('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  requestRender();
}
function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
function init() {
  const container = $('canvas-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactLayout.matches ? 1.5 : 2)); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Tủ rượu gỗ có tán nóc và giữa, tổng thể 137 × 197 cm, thân rộng 129 cm; vuốt hai ngón để xoay ngang dọc, chụm hai ngón để thu phóng');
  renderer.domElement.tabIndex = 0;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e8e0'); scene.fog = new THREE.Fog('#e9e8e0', 9, 18);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .04).texture; scene.environmentIntensity = .4; room.dispose(); pmrem.dispose();
  camera = new THREE.PerspectiveCamera(33, 1, .04, 35); camera.position.set(2.1, 1.83, 4.35);
  controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1.06, 0);
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.rotateSpeed = .75; controls.zoomSpeed = .8;
  controls.enableDamping = true; controls.dampingFactor = .09; controls.minDistance = 1.7; controls.maxDistance = 7.8;
  controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI / 2 + .025; controls.maxTargetRadius = 1.5;
  controls.addEventListener('change', requestRender); controls.addEventListener('start', () => { cameraMotion = null; });
  renderer.domElement.addEventListener('wheel', handleWheel, { capture: true, passive: false });
  renderer.domElement.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '0') { setView(); return; }
    const zoom = ['+', '=', '-'].includes(event.key);
    const oldMode = state.scrollMode; if (zoom) state.scrollMode = 'zoom';
    handleWheel({ preventDefault() {}, stopImmediatePropagation() {}, deltaMode: 0, deltaX: event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0, deltaY: event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : event.key === '-' ? 20 : zoom ? -20 : 0 });
    state.scrollMode = oldMode;
  });
  scene.add(new THREE.HemisphereLight('#fff9e8', '#827f6e', 1.5));
  const sun = new THREE.DirectionalLight('#fff5df', 3); sun.position.set(-3, 5, 4); sun.castShadow = true;
  const shadowSize = compactLayout.matches ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.camera.left = -2.7; sun.shadow.camera.right = 2.7; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -2.7;
  sun.shadow.normalBias = .008; sun.shadow.bias = -.00015; sun.shadow.radius = 4; scene.add(sun);
  const fill = new THREE.DirectionalLight('#edf3ed', 1.1); fill.position.set(3, 3, 0); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#ddded3', roughness: .92 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.001; floor.receiveShadow = true; scene.add(floor);
  // A soft contact shadow grounds the cabinet without an artificial pedestal.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 5, 128, 128, 128); gradient.addColorStop(0, 'rgba(44,37,22,.28)'); gradient.addColorStop(.55, 'rgba(44,37,22,.1)'); gradient.addColorStop(1, 'rgba(44,37,22,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(0, .001, .04); scene.add(contact);
  buildCabinet();
  let lastFit = null, wasCompact = null;
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    cameraMotion = null;
    const compact = compactLayout.matches, nextFit = compact ? fitDistance(w / h) : Math.hypot(2.1, .77, 4.35);
    // Preserve the user's orbit and relative zoom through resize and orientation changes.
    if (lastFit !== null) camera.position.sub(controls.target).multiplyScalar(nextFit / lastFit).add(controls.target);
    else if (compact) camera.position.sub(controls.target).setLength(nextFit).add(controls.target);
    if (wasCompact !== compact) renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.5 : 2));
    lastFit = nextFit; wasCompact = compact;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); controls.update(); requestRender();
    renderer.domElement.setAttribute('aria-label', compact ? 'Mô hình tủ rượu; kéo một ngón để xoay, chụm hai ngón để thu phóng' : 'Mô hình tủ rượu; vuốt hai ngón trên touchpad để xoay ngang dọc, chụm để thu phóng');
  };
  new ResizeObserver(resize).observe(container); resize();
  requestRender(); requestAnimationFrame(() => $('loading').classList.add('hidden'));
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); notify('Kết nối đồ họa bị gián đoạn. Vui lòng tải lại trang.'); });
  // Small public snapshot helps inspect actual model geometry without touching the render loop.
  window.cabinetDesign = { get state() { return { ...state }; }, get model() { return cabinet; }, get renderer() { return renderer; } };
}

try { init(); } catch (error) { console.error('Không thể khởi tạo mô hình:', error); $('loading').classList.add('hidden'); $('render-error').hidden = false; }

document.querySelectorAll('[data-wood]').forEach(btn => btn.addEventListener('click', () => {
  state.wood = btn.dataset.wood;
  document.querySelectorAll('[data-wood]').forEach(el => { el.classList.toggle('selected', el === btn); el.setAttribute('aria-pressed', String(el === btn)); });
  if (renderer) woodMaterials.forEach(mat => { mat.map.dispose(); mat.map = woodTexture(state.wood, mat.userData.horizontal); mat.needsUpdate = true; });
  $('finish-label').textContent = `${woods[state.wood].name} · Tay nắm đồng xước`; updateMobileSummary(); if (renderer) requestRender();
}));
$('depth').addEventListener('change', event => { state.depth = Number(event.target.value) / 100; $('depth-caption').textContent = Number(event.target.value) + trim.frontOverhang * 100; updateMobileSummary(); if (renderer) buildCabinet(); });
$('light-toggle').addEventListener('change', event => {
  state.lights = event.target.checked;
  ledMaterials.forEach(mat => { mat.emissiveIntensity = state.lights ? 2.8 : 0; }); lightsGroup?.children.forEach(light => light.intensity = state.lights ? .24 : 0); if (renderer) requestRender();
});
$('decor-toggle').addEventListener('change', event => { state.decor = event.target.checked; if (decorations) { decorations.visible = state.decor; requestRender(); } });
document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => { if (camera) setView(btn.dataset.view); }));
document.querySelectorAll('[data-scroll-mode]').forEach(btn => btn.addEventListener('click', () => {
  state.scrollMode = btn.dataset.scrollMode;
  document.querySelectorAll('[data-scroll-mode]').forEach(el => { el.classList.toggle('active', el === btn); el.setAttribute('aria-pressed', String(el === btn)); });
  $('gesture-hint').innerHTML = state.scrollMode === 'rotate' ? 'Vuốt 2 ngón để xoay <b>·</b> Chụm để thu phóng' : 'Vuốt để thu phóng <b>·</b> Kéo để xoay tủ';
}));
$('reset-view').addEventListener('click', () => { if (camera) setView(); });
$('zoom-in').addEventListener('click', () => { if (camera) { cameraMotion = null; camera.position.sub(controls.target).multiplyScalar(.86).add(controls.target); controls.update(); requestRender(); } });
$('zoom-out').addEventListener('click', () => { if (camera) { cameraMotion = null; camera.position.sub(controls.target).multiplyScalar(1.16).add(controls.target); controls.update(); requestRender(); } });
$('dimensions-toggle').addEventListener('click', event => { state.dimensions = !state.dimensions; event.currentTarget.setAttribute('aria-pressed', String(state.dimensions)); if (dimensionGroup) { dimensionGroup.visible = state.dimensions; requestRender(); } });
$('storage-toggle').addEventListener('click', event => {
  state.open = !state.open; event.currentTarget.setAttribute('aria-pressed', String(state.open));
  event.currentTarget.querySelector('span').textContent = state.open ? 'Đóng cánh & ngăn kéo' : 'Mở cánh & ngăn kéo'; if (renderer) requestRender();
});
for (const type of ['design', 'structure']) $(type + '-tab').addEventListener('click', () => {
  for (const name of ['design', 'structure']) { $(name + '-tab').classList.toggle('active', type === name); $(name + '-tab').setAttribute('aria-selected', String(type === name)); $(name + '-panel').hidden = type !== name; }
});
document.querySelector('.tabs').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const target = (event.key === 'Home' || (event.key !== 'End' && document.activeElement.id === 'structure-tab')) ? $('design-tab') : $('structure-tab'); target.click(); target.focus(); } });
$('reference-open').addEventListener('click', () => $('reference-dialog').showModal());
$('reference-close').addEventListener('click', () => $('reference-dialog').close());
$('reference-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.currentTarget.close(); } });
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.viewer').requestFullscreen(); } catch { notify('Trình duyệt chưa cho phép toàn màn hình.'); }
});
$('save-image').addEventListener('click', () => {
  if (!renderer) { notify('Mô hình chưa sẵn sàng.'); return; }
  renderer.render(scene, camera); renderer.domElement.toBlob(blob => { if (blob) { download(blob, `MOC-tu-ruou-129-${state.wood}.png`); notify('Đã lưu ảnh thiết kế hiện tại.'); } else notify('Không thể lưu ảnh. Vui lòng thử lại.'); }, 'image/png');
});
$('export-glb').addEventListener('click', async event => {
  if (!cabinet) { notify('Mô hình chưa sẵn sàng.'); return; }
  const btn = event.currentTarget; btn.disabled = true;
  try {
    // Export the current material, depth, decorations and door positions in meters.
    const data = await new GLTFExporter().parseAsync(cabinet, { binary: true, onlyVisible: true });
    download(new Blob([data], { type: 'model/gltf-binary' }), 'MOC-tu-ruou-129.glb'); notify('Đã xuất mô hình 3D theo cấu hình hiện tại.');
  } catch (error) { console.error(error); notify('Chưa thể xuất mô hình. Vui lòng thử lại.'); } finally { btn.disabled = false; }
});

function updateMobileSummary() {
  const name = woods[state.wood].name.replace('Gỗ ', '');
  $('mobile-summary').textContent = `${name[0].toLocaleUpperCase('vi') + name.slice(1)} · Sâu thân ${Math.round(state.depth * 100)} cm`;
}
function setMobileSettings(open, restoreFocus = false) {
  const expanded = open && compactLayout.matches;
  document.querySelector('.sidebar').classList.toggle('sheet-open', expanded);
  $('mobile-settings-toggle').setAttribute('aria-expanded', String(expanded));
  $('sheet-action-label').textContent = expanded ? 'Đóng' : 'Mở';
  $('sheet-scrim').hidden = !expanded;
  document.querySelector('.viewer').inert = expanded;
  $('settings-content').inert = compactLayout.matches && !expanded;
  if (restoreFocus && compactLayout.matches) $('mobile-settings-toggle').focus({ preventScroll: true });
}
$('mobile-settings-toggle').addEventListener('click', () => setMobileSettings($('mobile-settings-toggle').getAttribute('aria-expanded') !== 'true'));
$('sheet-scrim').addEventListener('click', () => setMobileSettings(false, true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('reference-dialog').open) setMobileSettings(false, true); });
compactLayout.addEventListener('change', () => setMobileSettings(false));
setMobileSettings(false);
