// PHÒNG ANNA: Sân hè lâu đài Arendelle. Sân lát đá màu kẹo, huy hiệu hoa nghệ tây giữa sân, lan can đá thấp nhìn ra
// vịnh hẹp (fjord) xanh biếc: núi đỉnh tuyết, lâu đài Arendelle mái xanh ngọc trên đảo, làng nhỏ, thuyền buồm, hải âu.
// Hai bên là nhà gỗ kiểu Na Uy sơn màu (hoạ tiết rosemaling), cờ đuôi nheo, cờ huy hiệu, đèn đường. Bên phải có quầy
// sô-cô-la + bánh sinh nhật + bóng bay; bên trái là Olaf với đám mây tuyết riêng trên đầu, quanh sân có người tuyết tí hon.
// Băng tan → tuyết đọng trên sân tan dần, hoa nở, thuyền chạy, người tuyết tí hon ra chơi nhiều hơn; tỉnh → pháo hoa.
import * as THREE from 'three';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, skyDome, floor, flowerPot, glow, bunting, bob, shadows, mix, css, painting,
} from '../room/kit.ts';

const PAL = { primary: 0xc026d3, secondary: 0x0ea5e9, accent: 0xffc933, light: 0xeaf6ff, dark: 0x3b0764 };
const TEAL = 0x1fae8f;      // mái đồng xanh của Arendelle
const GREEN = 0x22c55e;
const RAIL_Z = -4.7;        // lan can sau
const RAIL_H = 0.72;
const WATER_Y = -0.45;

// ---------------------------------------------------------------- texture riêng
/** Sân lát đá cuội màu kẹo. */
function cobbleTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e9d6f2'; g.fillRect(0, 0, w, h);
    const cols = ['#ffe3ef', '#fff1d6', '#e6ecff', '#f7dcff', '#fde8d8', '#e2f6ee'];
    const n = 8, s = w / n;
    for (let r = 0; r < n; r++) {
      for (let c = -1; c <= n; c++) {
        const off = (r % 2) * s / 2;
        const i = (r * 5 + c * 3 + 64) % cols.length;
        g.fillStyle = cols[i];
        g.beginPath(); g.roundRect(c * s + off + 4, r * s + 4, s - 8, s - 8, 18); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath(); g.ellipse(c * s + off + s * 0.38, r * s + s * 0.32, s * 0.18, s * 0.08, -0.3, 0, Math.PI * 2); g.fill();
      }
    }
  }, repeat);
}

/** Hoa nghệ tây (crocus) – biểu tượng Arendelle. Vẽ tại (x,y), cỡ s. */
function drawCrocus(g: CanvasRenderingContext2D, x: number, y: number, s: number, petal: string, leaf: string): void {
  g.fillStyle = leaf;
  for (const a of [-0.9, 0.9, -0.45, 0.45]) {
    g.save(); g.translate(x, y + s * 0.2); g.rotate(a);
    g.beginPath(); g.ellipse(0, s * 0.45, s * 0.1, s * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.fillStyle = petal;
  for (const a of [-0.55, 0, 0.55]) {
    g.save(); g.translate(x, y + s * 0.15); g.rotate(a);
    g.beginPath(); g.ellipse(0, -s * 0.35, s * 0.16, s * 0.4, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

/** Mặt tiền nhà gỗ Na Uy: tường màu, dải hoạ tiết rosemaling, cửa sổ khung trắng + cửa chớp, bồn hoa, cửa vòm. */
function facadeTex(wallC: number, trimC: number, shutterC: number): THREE.CanvasTexture {
  return canvasTex(256, 336, (g, w, h) => {
    g.fillStyle = css(wallC); g.fillRect(0, 0, w, h);
    // ván gỗ dọc
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h);
    // dải rosemaling giữa 2 tầng
    g.fillStyle = css(trimC); g.fillRect(0, h * 0.47, w, 22);
    for (let x = 12; x < w; x += 34) {
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, h * 0.47 + 11, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = css(PAL.accent); g.beginPath(); g.arc(x + 17, h * 0.47 + 11, 4, 0, Math.PI * 2); g.fill();
    }
    // cửa sổ 2 tầng
    const win = (cx: number, cy: number) => {
      g.fillStyle = css(shutterC);
      g.fillRect(cx - 34, cy - 30, 14, 60); g.fillRect(cx + 20, cy - 30, 14, 60);
      g.fillStyle = '#fffaf2'; g.fillRect(cx - 21, cy - 31, 42, 62);
      g.fillStyle = '#7fd0ff'; g.fillRect(cx - 16, cy - 26, 32, 52);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(cx - 13, cy - 23, 8, 20);
      g.fillStyle = '#fffaf2'; g.fillRect(cx - 2, cy - 26, 4, 52); g.fillRect(cx - 16, cy - 2, 32, 4);
      // bồn hoa
      g.fillStyle = css(mix(shutterC, 0x000000, 0.1)); g.fillRect(cx - 26, cy + 30, 52, 12);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ['#ff4fa3', '#ffd23f', '#ff7a45', '#b35cff', '#ffffff'][i];
        g.beginPath(); g.arc(cx - 20 + i * 10, cy + 28, 6, 0, Math.PI * 2); g.fill();
      }
    };
    win(w * 0.27, h * 0.22); win(w * 0.73, h * 0.22);
    win(w * 0.22, h * 0.7);
    // cửa ra vào vòm
    const dx = w * 0.7, dw = 60, dh = 100, dy = h - dh;
    g.fillStyle = '#fffaf2'; g.beginPath(); g.roundRect(dx - dw / 2 - 5, dy - 5, dw + 10, dh + 5, [34, 34, 0, 0]); g.fill();
    g.fillStyle = css(TEAL); g.beginPath(); g.roundRect(dx - dw / 2, dy, dw, dh, [30, 30, 0, 0]); g.fill();
    drawCrocus(g, dx, dy + 40, 30, css(PAL.primary), '#fffaf2');
    g.fillStyle = css(PAL.accent); g.beginPath(); g.arc(dx + 18, dy + 62, 4, 0, Math.PI * 2); g.fill();
  });
}

/** Huy hiệu giữa sân: vòng rosemaling xanh lá–hồng tím quanh hoa nghệ tây vàng. */
function medallionTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = css(PAL.primary); g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff1f8'; g.beginPath(); g.arc(c, c, c - 22, 0, Math.PI * 2); g.fill();
    // vòng lá cuộn
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.save(); g.translate(c + Math.cos(a) * (c - 62), c + Math.sin(a) * (c - 62)); g.rotate(a + Math.PI / 2);
      g.fillStyle = css(GREEN); g.beginPath(); g.ellipse(-14, 0, 26, 10, 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = i % 2 ? css(PAL.secondary) : '#ff5fa2';
      g.beginPath(); g.arc(14, 0, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = css(PAL.accent); g.beginPath(); g.arc(14, 0, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.fillStyle = css(TEAL); g.beginPath(); g.arc(c, c, c * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8fff7'; g.beginPath(); g.arc(c, c, c * 0.46, 0, Math.PI * 2); g.fill();
    drawCrocus(g, c, c + 10, 140, css(PAL.accent), css(GREEN));
  });
}

/** Mặt nước vịnh: xanh biếc + gợn sóng sáng (lặp, cuộn offset trong ambient). */
function waterTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2aa9f0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = (i * 71) % w, y = (i * 43) % h, l = 14 + (i % 4) * 8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke();
    }
    g.fillStyle = 'rgba(20,110,200,0.25)';
    for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse((i * 97) % w, (i * 59) % h, 30, 6, 0, 0, Math.PI * 2); g.fill(); }
  }, [14, 10]);
}

/** Cờ dọc huy hiệu Arendelle (nền hồng tím, hoa nghệ tây vàng, đuôi chẻ). */
function bannerTex(): THREE.CanvasTexture {
  return canvasTex(128, 320, (g, w, h) => {
    g.fillStyle = css(PAL.primary);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w / 2, h - 40); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = css(PAL.accent); g.fillRect(0, 10, w, 8); g.fillRect(0, h - 70, w, 6);
    drawCrocus(g, w / 2, 120, 90, css(PAL.accent), css(GREEN));
  });
}

/** Mái hiên sọc hồng tím – kem. */
function stripeTex(): THREE.CanvasTexture {
  return canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff4e0' : css(PAL.primary); g.fillRect(i * w / 8, 0, w / 8, h); }
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 0, w, 14);
  });
}

// ---------------------------------------------------------------- đồ vật
/** Nhà gỗ Na Uy: thân hộp (mặt tiền +z có texture), mái dốc 2 mái, hồi tam giác, ống khói. Đáy y=0, tâm đáy ở gốc. */
function norwegianHouse(w: number, h: number, d: number, wallC: number, roofC: number, trimC: number, shutterC: number): THREE.Group {
  const g = new THREE.Group();
  const side = mat(wallC, { rough: 0.8 });
  const front = texMat(facadeTex(wallC, trimC, shutterC), { rough: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, side]);
  body.position.y = h / 2;
  g.add(body);
  const rh = w * 0.42;
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rh); tri.lineTo(-w / 2, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }), mat(mix(wallC, 0xffffff, 0.15), { rough: 0.8 }));
  gable.position.set(0, h, -d / 2);
  g.add(gable);
  // cửa sổ tròn trên hồi
  const round = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), mat(0x7fd0ff, { rough: 0.2 }));
  round.position.set(0, h + rh * 0.4, d / 2 + 0.01);
  const roundRim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), mat(0xfffaf2));
  roundRim.position.copy(round.position);
  g.add(round, roundRim);
  const slope = Math.atan2(rh, w / 2);
  const len = Math.hypot(rh, w / 2) + 0.35;
  const roofM = mat(roofC, { rough: 0.55 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, d + 0.4), roofM);
    p.position.set(s * (w / 4 + 0.05), h + rh / 2 + 0.06, 0);
    p.rotation.z = -s * slope;
    p.castShadow = true;
    g.add(p);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, d + 0.45, 8), mat(PAL.accent, { rough: 0.4 }));
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = h + rh + 0.1;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), mat(0xf2b8a0, { rough: 0.8 }));
  chimney.position.set(w * 0.22, h + rh * 0.75, -d * 0.2);
  // mái hiên nhỏ trên cửa
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.45), roofM);
  hood.position.set(w * 0.2, 1.72, d / 2 + 0.2);
  hood.rotation.x = 0.25;
  g.add(ridge, chimney, hood);
  shadows(g, true, true);
  return g;
}

/** Người tuyết tí hon (snowgie). Đáy y=0, cao ~0.34. */
function snowgie(): THREE.Group {
  const g = new THREE.Group();
  const snow = mat(0xeef6ff, { rough: 0.6, emissive: 0x9fc9ff, ei: 0.12 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), snow);
  body.position.y = 0.11;
  body.scale.y = 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), snow);
  head.position.y = 0.27;
  const eyeM = mat(0x1b1b3a, { rough: 0.3 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeM);
    eye.position.set(s * 0.035, 0.29, 0.078);
    g.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.07, 6), mat(0xff8a1f, { rough: 0.5 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.27, 0.11);
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 4), mat(0x8a5427));
  hair.position.set(0, 0.39, 0);
  hair.rotation.z = 0.3;
  g.add(body, head, nose, hair);
  shadows(g);
  return g;
}

/** Thuyền buồm nhỏ. Mũi hướng +x. Đáy thân ở y=0. */
function sailboat(hullC: number, sailC: number): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 14, 1, false, 0, Math.PI), mat(hullC, { rough: 0.6, side: THREE.DoubleSide }));
  hull.rotation.z = -Math.PI / 2;   // nửa trụ nằm ngang, bụng thuyền quay xuống
  hull.scale.set(1, 1, 0.8);
  hull.position.y = 0.4;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.62), mat(0xf6c27a, { rough: 0.7 }));
  deck.position.y = 0.4;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.6, 6), mat(0xc47a3f));
  mast.position.set(0.1, 1.7, 0);
  const tri = new THREE.Shape();
  tri.moveTo(0, 0); tri.lineTo(1.1, 0); tri.lineTo(0, 2.1); tri.lineTo(0, 0);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(tri), mat(sailC, { rough: 0.9, side: THREE.DoubleSide }));
  sail.position.set(0.15, 0.6, 0);
  const jib = new THREE.Mesh(new THREE.ShapeGeometry(tri), mat(0xfff6e6, { rough: 0.9, side: THREE.DoubleSide }));
  jib.scale.set(-0.7, 0.8, 1);
  jib.position.set(0.05, 0.62, 0.02);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.2), mat(PAL.primary, { side: THREE.DoubleSide }));
  flag.position.set(0.28, 2.95, 0);
  g.add(hull, deck, mast, sail, jib, flag);
  return g;
}

/** Lâu đài Arendelle nhìn xa: tường kem hồng, mái đồng xanh ngọc, chóp vàng, trên đảo nhỏ. Đáy y=0. */
function arendelleCastle(): THREE.Group {
  const g = new THREE.Group();
  const wallM = mat(0xffe0d2, { rough: 0.8 });
  const roofM = mat(TEAL, { rough: 0.5 });
  const goldM = mat(PAL.accent, { rough: 0.35, emissive: 0x7a5200, ei: 0.25 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 28), mat(0x5ccf7f, { rough: 1 }));
  island.position.y = -0.3;
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 5), mat(0xf6cbb8, { rough: 0.85 }));
  base.position.y = 0.8;
  const keep = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4, 3), wallM);
  keep.position.y = 3.6;
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 3.2, 4), roofM);
  keepRoof.rotation.y = Math.PI / 4;
  keepRoof.position.y = 7.2;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 6), goldM);
  spire.position.y = 9.4;
  g.add(island, base, keep, keepRoof, spire);
  for (const [x, z, h, r] of [[-3.6, 1.4, 5.4, 0.8], [3.6, 1.4, 5.4, 0.8], [-2.2, -1.6, 6.4, 0.7], [2.4, -1.4, 6.8, 0.7], [0, 2.1, 4.2, 0.55]] as const) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 14), wallM);
    tw.position.set(x, h / 2 + 0.8, z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 3, 14), roofM);
    cap.position.set(x, h + 0.8 + r * 1.5, z);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 6), goldM);
    tip.position.set(x, h + 0.8 + r * 3 + 0.3, z);
    g.add(tw, cap, tip);
  }
  // cửa sổ vàng ấm trên tháp chính
  const winM = glowMat(0xffe7a0);
  for (const x of [-0.9, 0, 0.9]) {
    const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), winM);
    wdw.position.set(x, 4.2, 1.51);
    g.add(wdw);
  }
  return g;
}

/** Núi có đỉnh tuyết. Đáy y=0. */
function mountain(r: number, h: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat(color, { rough: 1, flat: true }));
  body.position.y = h / 2;
  const capH = h * 0.3;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3 + 0.05, capH, 7), mat(0xf4f8ff, { rough: 0.9, flat: true }));
  cap.position.y = h - capH / 2 + 0.02;
  g.add(body, cap);
  return g;
}

/** Lan can đá thấp: bệ + trụ tiện (InstancedMesh) + tay vịn + cột trụ có quả cầu. Chạy dọc trục x, tâm ở gốc. */
function balustrade(len: number): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0xfbe9dc, { rough: 0.7 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.42), stone);
  plinth.position.y = 0.07;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.4), stone);
  rail.position.y = RAIL_H;
  g.add(plinth, rail);
  const prof = [[0.0, 0], [0.07, 0], [0.07, 0.04], [0.05, 0.1], [0.09, 0.22], [0.1, 0.3], [0.06, 0.42], [0.045, 0.5], [0.07, 0.52], [0.0, 0.52]].map(([x, y]) => new THREE.Vector2(x, y));
  const n = Math.floor(len / 0.28);
  const bal = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 10), stone, n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    d.position.set(-len / 2 + 0.14 + i * 0.28, 0.14, 0);
    d.updateMatrix();
    bal.setMatrixAt(i, d.matrix);
  }
  bal.castShadow = true;
  g.add(bal);
  const postM = mat(0xf6d7e8, { rough: 0.6 });
  const ballM = mat(PAL.primary, { rough: 0.4 });
  for (let i = 0; i <= 4; i++) {
    const x = -len / 2 + (i / 4) * len;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, RAIL_H + 0.2, 0.5), postM);
    post.position.set(x, (RAIL_H + 0.2) / 2, 0);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), ballM);
    ball.position.set(x, RAIL_H + 0.36, 0);
    g.add(post, ball);
  }
  shadows(g, true, true);
  return g;
}

/** Cột đèn đường xanh ngọc, lồng đèn vàng (userData.bulb để sáng dần). Đáy y=0. */
function lampPost(): THREE.Group {
  const g = new THREE.Group();
  const pm = mat(TEAL, { rough: 0.45 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.6, 10), pm);
  pole.position.y = 1.3;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 12), pm);
  foot.position.y = 0.1;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.42, 6, 1, true), mat(PAL.accent, { rough: 0.4, side: THREE.DoubleSide }));
  cage.position.y = 2.82;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), glowMat(0xfff0b0));
  bulb.position.y = 2.82;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 6), pm);
  top.position.y = 3.18;
  const halo = glow(0xffe08a, 1.2, 0.3);
  halo.position.y = 2.82;
  g.add(pole, foot, cage, bulb, top, halo);
  g.userData.halo = halo;
  shadows(g);
  return g;
}

/** Quầy sô-cô-la: bệ quầy, mái hiên sọc, bánh sinh nhật 3 tầng, thanh sô-cô-la, cốc ca cao, biển 🍫. Mặt quầy hướng +z. */
function chocolateStall(): THREE.Group {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.75), mat(PAL.primary, { rough: 0.6 }));
  counter.position.y = 0.475;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.08, 0.85), mat(0xfff2dc, { rough: 0.5 }));
  top.position.y = 0.99;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.1, 0.77), mat(PAL.accent, { rough: 0.4 }));
  trim.position.y = 0.2;
  g.add(counter, top, trim);
  const postM = mat(0xfff2dc, { rough: 0.6 });
  for (const x of [-0.95, 0.95]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), postM);
    p.position.set(x, 1.2, -0.3);
    g.add(p);
  }
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), texMat(stripeTex(), { rough: 0.8, side: THREE.DoubleSide }));
  awning.position.set(0, 2.3, 0.05);
  awning.rotation.x = -1.05;
  awning.castShadow = true;
  g.add(awning);
  // diềm lượn sóng
  const scal = new THREE.InstancedMesh(new THREE.CircleGeometry(0.15, 12, 0, Math.PI), mat(PAL.primary, { side: THREE.DoubleSide }), 8);
  const d = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    d.position.set(-1.05 + i * 0.3, 2.06, 0.5);
    d.rotation.set(0, 0, Math.PI);
    d.updateMatrix();
    scal.setMatrixAt(i, d.matrix);
  }
  g.add(scal);
  // bánh sinh nhật 3 tầng (Frozen Fever): hồng, xanh bạc hà, vàng kem + hoa hướng dương
  const tiers: [number, number][] = [[0.3, 0xffc4e1], [0.22, 0xb9f2d6], [0.15, 0xfff1b8]];
  let y = 1.03;
  for (const [r, c] of tiers) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.18, 24), mat(c, { rough: 0.6 }));
    tier.position.set(-0.45, y + 0.09, 0.05);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 24), mat(0xffffff, { rough: 0.6 }));
    band.rotation.x = Math.PI / 2;
    band.position.set(-0.45, y + 0.02, 0.05);
    g.add(tier, band);
    y += 0.18;
  }
  const sunflower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), mat(0xffc933, { rough: 0.5 }));
  sunflower.position.set(-0.45, y + 0.03, 0.05);
  const sfMid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), mat(0xb5652d));
  sfMid.position.set(-0.45, y + 0.04, 0.05);
  g.add(sunflower, sfMid);
  // thanh sô-cô-la bọc giấy vàng
  const chocM = mat(0x8a4a24, { rough: 0.5 });
  const foilM = mat(PAL.accent, { rough: 0.3, emissive: 0x7a5200, ei: 0.2 });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.14), chocM);
    bar.position.set(0.2 + (i % 2) * 0.32, 1.06 + Math.floor(i / 2) * 0.055, 0.12 - Math.floor(i / 2) * 0.03);
    bar.rotation.y = (i - 1.5) * 0.12;
    const foil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, 0.145), foilM);
    foil.position.copy(bar.position);
    foil.position.x += 0.08;
    foil.rotation.y = bar.rotation.y;
    g.add(bar, foil);
  }
  // cốc ca cao
  for (const [x, c] of [[0.78, TEAL], [0.62, PAL.secondary]] as const) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 12), mat(c, { rough: 0.4 }));
    cup.position.set(x, 1.1, -0.12);
    const froth = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), mat(0xfff0dc, { rough: 0.8 }));
    froth.rotation.x = -Math.PI / 2;
    froth.position.set(x, 1.172, -0.12);
    g.add(cup, froth);
  }
  const sign = painting(0.7, 0.45, '🍫', 0xfff2dc, PAL.accent);
  sign.position.set(0, 2.75, -0.28);
  g.add(sign);
  shadows(g);
  return g;
}

/** Hải âu hình chữ V (userData.wings). */
function gull(): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0xffffff, { rough: 0.7 });
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.16), m);
    w.position.x = s * 0.35;
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m);
  body.scale.z = 2;
  g.add(body);
  g.userData.wings = wings;
  return g;
}

interface Hopper { obj: THREE.Object3D; x: number; z: number; phase: number; speed: number; roam: number; order: number }
interface Boat { obj: THREE.Object3D; speed: number; min: number; max: number; phase: number }
interface Flurry { pts: THREE.Points; pos: Float32Array; vel: Float32Array; cx: number; cy: number; cz: number }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;

  // ---------------------------------------------- trời, nắng, mây
  const sky = skyDome(0x3fa9ff, 0xe3f6ff, 80);
  sky.position.set(0, -14, -10);
  root.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), glowMat(0xffe27a));
  sun.position.set(14, 16, -55);
  const sunGlow = glow(0xfff0a8, 14, 0.55);
  sunGlow.position.copy(sun.position);
  root.add(sun, sunGlow);
  const clouds: THREE.Object3D[] = [];
  const cloudM = glowMat(0xf7fbff);
  const puffGeo = new THREE.SphereGeometry(1, 12, 8);
  for (const [x, y, z, s] of [[-12, 12, -48, 2.2], [4, 14, -52, 2.6], [20, 11, -46, 2]] as const) {
    const cl = new THREE.Group();
    for (const [dx, dy, r] of [[0, 0, 1], [1.1, -0.2, 0.75], [-1.1, -0.25, 0.7], [0.4, 0.5, 0.7]] as const) {
      const p = new THREE.Mesh(puffGeo, cloudM);
      p.scale.setScalar(r);
      p.position.set(dx, dy, 0);
      cl.add(p);
    }
    cl.position.set(x, y, z);
    cl.scale.setScalar(s);
    root.add(cl);
    clouds.push(cl);
  }
  ctx.state.clouds = clouds;

  // ---------------------------------------------- vịnh, núi, lâu đài, làng
  const wTex = waterTex();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshStandardMaterial({ map: wTex, roughness: 0.25, metalness: 0 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER_Y, -64);
  root.add(water);
  ctx.state.waterTex = wTex;
  for (const [x, z, r, h, c] of [
    [-30, -70, 16, 26, 0x46b979], [-10, -78, 18, 30, 0x5cc98f], [14, -74, 17, 28, 0x46b979], [34, -66, 15, 22, 0x5cc98f],
    [-20, -90, 20, 34, 0x9fb3ec], [24, -92, 22, 36, 0xa9b8f0], [0, -96, 20, 32, 0xb3c0f2],
  ] as const) {
    const m = mountain(r, h, c);
    m.position.set(x, WATER_Y, z);
    root.add(m);
  }
  // bờ xanh hai bên vịnh
  for (const [x, z, sx] of [[-26, -34, 16], [28, -38, 18]] as const) {
    const shore = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5ccf7f, { rough: 1 }));
    shore.scale.set(sx, 3.5, 14);
    shore.position.set(x, WATER_Y - 0.2, z);
    root.add(shore);
  }
  const castle = arendelleCastle();
  castle.position.set(9, WATER_Y, -34);
  castle.rotation.y = -0.35;
  castle.scale.setScalar(1.05);
  root.add(castle);
  // làng nhỏ bên bờ trái (thân + mái instanced, nhiều màu)
  const houseN = 10;
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { rough: 0.8 }), houseN);
  const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 0.7, 4), mat(0xffffff, { rough: 0.6 }), houseN);
  const hc = [0xff9ec7, 0xffd76a, 0x8fd0ff, 0x9fe8c8, 0xffb38a, 0xd9b3ff];
  const rc = [TEAL, 0xb5179e, 0xe0453a, TEAL, 0x2f6fd6];
  const d = new THREE.Object3D();
  for (let i = 0; i < houseN; i++) {
    const x = -20 + i * 1.7 + (i % 2) * 0.3, z = -30 - (i % 3) * 1.6, hh = 1.2 + (i % 3) * 0.4;
    d.position.set(x, WATER_Y + 1.5 + hh / 2, z);
    d.rotation.set(0, (i % 2) * 0.2, 0);
    d.scale.set(1.2, hh, 1.1);
    d.updateMatrix();
    bodies.setMatrixAt(i, d.matrix);
    bodies.setColorAt(i, new THREE.Color(hc[i % hc.length]));
    d.position.y = WATER_Y + 1.5 + hh + 0.35;
    d.rotation.set(0, Math.PI / 4 + (i % 2) * 0.2, 0);
    d.scale.set(1.1, 1, 1.1);
    d.updateMatrix();
    roofs.setMatrixAt(i, d.matrix);
    roofs.setColorAt(i, new THREE.Color(rc[i % rc.length]));
  }
  const villageHill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6fd66a, { rough: 1 }));
  villageHill.scale.set(12, 1.6, 5);
  villageHill.position.set(-12, WATER_Y, -31);
  root.add(villageHill, bodies, roofs);
  // thuyền buồm
  const boats: Boat[] = [];
  for (const [x, z, hull, sail, sp] of [[-6, -20, PAL.primary, 0xfff6e6, 0.5], [5, -26, PAL.secondary, 0xffd6ec, 0.35], [-14, -40, TEAL, 0xfff1b8, 0.25]] as const) {
    const b = sailboat(hull, sail);
    b.position.set(x, WATER_Y - 0.15, z);
    b.scale.setScalar(z < -30 ? 1.3 : 1.0);
    root.add(b);
    boats.push({ obj: b, speed: sp, min: -18, max: 18, phase: x });
  }
  ctx.state.boats = boats;
  const gulls: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const gl = gull();
    root.add(gl);
    gulls.push(gl);
  }
  ctx.state.gulls = gulls;

  // ---------------------------------------------- sân lát đá + huy hiệu + mép sân
  const court = floor(20, 16, texMat(cobbleTex([6, 5]), { rough: 0.85 }));
  court.position.z = RAIL_Z + 8;
  root.add(court);
  const medal = new THREE.Mesh(new THREE.CircleGeometry(1, 64), texMat(medallionTex(), { rough: 0.9 }));
  medal.rotation.x = -Math.PI / 2;
  medal.scale.set(3.1, 2.4, 1);
  medal.position.set(0, 0.012, 0.5);
  medal.receiveShadow = true;
  root.add(medal);
  const quay = new THREE.Mesh(new THREE.BoxGeometry(20, -WATER_Y + 0.3, 0.4), mat(0xf3d2c2, { rough: 0.9 }));
  quay.position.set(0, (WATER_Y - 0.3) / 2, RAIL_Z - 0.2);
  root.add(quay);
  const rail = balustrade(12.8);
  rail.position.set(0, 0, RAIL_Z);
  root.add(rail);
  // chậu hoa trên đầu lan can
  const pots: THREE.Object3D[] = [];
  for (const x of [-3.2, 3.2]) {
    const p = flowerPot(PAL.secondary, [0xff4fa3, 0xffd23f, 0xb35cff, 0xffffff]);
    p.position.set(x, RAIL_H + 0.06, RAIL_Z);
    p.scale.setScalar(1.3);
    root.add(p);
    pots.push(p);
  }

  // ---------------------------------------------- nhà gỗ Na Uy hai bên
  const houses: [number, number, number, number, number, number, number][] = [
    // x, z, wall, roof, trim, shutter, w
    [-8.1, -4.3, 0xff9ec7, TEAL, 0x2fae8f, 0xffffff, 3.4],
    [-8.6, -0.6, 0x9fe8c8, 0xb5179e, 0xff5fa2, PAL.secondary, 3.2],
    [8.1, -4.3, 0xffd76a, 0xb5179e, PAL.primary, TEAL, 3.4],
    [8.6, -0.6, 0x8fd0ff, TEAL, 0xff5fa2, 0xffffff, 3.2],
  ];
  const bTex = bannerTex();
  const banners: THREE.Object3D[] = [];
  houses.forEach(([x, z, wallC, roofC, trimC, shC, w], i) => {
    const hs = norwegianHouse(w, 4.2, 2.6, wallC, roofC, trimC, shC);
    hs.position.set(x, 0, z);
    hs.rotation.y = Math.atan2(-x, 2.6 - z);   // mặt tiền quay về giữa sân, hơi hướng camera
    root.add(hs);
    // cờ dọc huy hiệu treo trên mặt tiền 2 nhà phía sau (gốc ở mép trên → đung đưa như cờ treo)
    if (i % 2 === 0) {
      const bn = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), texMat(bTex, { rough: 0.9, side: THREE.DoubleSide }));
      bn.geometry.translate(0, -0.7, 0);
      bn.position.set(0, 4.05, 1.36);   // giữa 2 cửa sổ tầng trên
      hs.add(bn);
      banners.push(bn);
    }
  });
  ctx.state.banners = banners;
  // dây cờ đuôi nheo
  const flagCols = [PAL.primary, PAL.secondary, GREEN, PAL.accent, 0xff5fa2];
  const strands = [
    bunting(new THREE.Vector3(-6.4, 4.1, -3.4), new THREE.Vector3(6.4, 4.1, -3.4), flagCols, 0.7, 14),
    bunting(new THREE.Vector3(-6.4, 3.9, -3.6), new THREE.Vector3(-6.9, 3.9, 0.6), flagCols, 0.4, 5),
    bunting(new THREE.Vector3(6.4, 3.9, -3.6), new THREE.Vector3(6.9, 3.9, 0.6), flagCols, 0.4, 5),
  ];
  for (const s of strands) root.add(s);
  ctx.state.strands = strands;
  // đèn đường
  const lamps: THREE.Object3D[] = [];
  for (const x of [-4.6, 4.6]) {
    const l = lampPost();
    l.position.set(x, 0, RAIL_Z + 0.5);
    root.add(l);
    lamps.push(l);
  }
  ctx.state.lamps = lamps;

  // ---------------------------------------------- bên phải: quầy sô-cô-la + bóng bay
  const stall = chocolateStall();
  stall.position.set(4.9, 0, -1.9);
  stall.rotation.y = -0.55;
  root.add(stall);
  const warm = new THREE.PointLight(0xffc27a, 4, 6, 1.6);
  warm.position.set(4.4, 2.2, -0.8);
  root.add(warm);
  const balloons: THREE.Object3D[] = [];
  for (const [dx, h, c] of [[0, 3.2, 0xff4fa3], [0.35, 3.45, PAL.secondary], [-0.3, 3.55, GREEN], [0.15, 3.8, PAL.accent]] as const) {
    const bl = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), mat(c, { rough: 0.25 }));
    ball.scale.y = 1.15;
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, h - 1.0, 4), mat(0xffffff));
    str.position.y = -(h - 1.0) / 2 - 0.28;
    bl.add(ball, str);
    bl.position.set(6.0 + dx, h, -0.9 + dx * 0.4);
    root.add(bl);
    balloons.push(bl);
  }
  ctx.state.balloons = balloons;

  // ---------------------------------------------- bên trái: Olaf + đám mây tuyết riêng của Olaf
  try {
    const olaf = await ctx.model('olaf.glb', { height: 1.15 });
    const og = new THREE.Group();
    og.add(olaf);
    og.position.set(-4.3, 0, -1.8);
    og.rotation.y = 0.45;
    root.add(og);
    ctx.state.olaf = og;
  } catch (e) { console.warn('olaf', e); }
  const flurryCloud = new THREE.Group();
  for (const [dx, dy, r] of [[0, 0, 0.3], [0.28, -0.05, 0.22], [-0.27, -0.04, 0.22], [0.1, 0.14, 0.2]] as const) {
    const p = new THREE.Mesh(puffGeo, mat(0xf2f8ff, { rough: 0.9, emissive: 0xcfe6ff, ei: 0.25 }));
    p.scale.setScalar(r);
    p.position.set(dx, dy, 0);
    flurryCloud.add(p);
  }
  flurryCloud.position.set(-4.3, 1.75, -1.8);
  root.add(flurryCloud);
  ctx.state.flurryCloud = flurryCloud;
  const fN = 26;
  const fPos = new Float32Array(fN * 3);
  const fVel = new Float32Array(fN);
  for (let i = 0; i < fN; i++) {
    fPos[i * 3] = -4.3 + (Math.random() - 0.5) * 0.6;
    fPos[i * 3 + 1] = 0.9 + Math.random() * 0.8;
    fPos[i * 3 + 2] = -1.8 + (Math.random() - 0.5) * 0.4;
    fVel[i] = 0.35 + Math.random() * 0.3;
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const flakeTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(210,235,255,0.9)'); gr.addColorStop(1, 'rgba(180,220,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const flurry = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: 0x9fd0ff, size: 0.09, map: flakeTex, transparent: true, depthWrite: false }));
  flurry.frustumCulled = false;
  root.add(flurry);
  ctx.state.flurry = { pts: flurry, pos: fPos, vel: fVel, cx: -4.3, cy: 1.72, cz: -1.8 } satisfies Flurry;

  // ---------------------------------------------- người tuyết tí hon (snowgies): ra chơi nhiều dần theo băng tan
  const hoppers: Hopper[] = [];
  const spots: [number, number][] = [[-3.6, 1.6], [3.7, 1.3], [-5.2, 0.4], [2.6, -3.6], [-2.4, -3.8], [5.4, 0.9], [-3.3, -2.8]];
  spots.forEach(([x, z], i) => {
    const s = snowgie();
    s.position.set(x, 0, z);
    s.scale.setScalar(1.25);
    root.add(s);
    hoppers.push({ obj: s, x, z, phase: i * 1.3, speed: 2.4 + (i % 3) * 0.5, roam: 0.35 + (i % 2) * 0.2, order: i });
  });
  ctx.state.hoppers = hoppers;

  // ---------------------------------------------- tuyết đọng trên sân (tan theo băng) + bồn hoa Kenney nở dần
  const moundN = 16;
  const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf1f7ff, { rough: 0.8, emissive: 0xb8d8ff, ei: 0.1 }), moundN);
  const moundBase: [number, number, number][] = [];
  for (let i = 0; i < moundN; i++) {
    const side = i % 2 ? 1 : -1;
    moundBase.push([side * (3.4 + (i * 0.37) % 2.6), -4.1 + ((i * 1.7) % 6.2), 0.25 + (i % 3) * 0.12]);
  }
  mounds.receiveShadow = true;
  root.add(mounds);
  ctx.state.mounds = { mesh: mounds, base: moundBase };
  const flowers: THREE.Object3D[] = [];
  const fSpots: [string, number, number][] = [
    ['flower_redA.glb', -5.6, -3.2], ['flower_yellowA.glb', -5.3, -2.6], ['flower_purpleA.glb', -5.8, -2.2],
    ['flower_yellowA.glb', 3.4, -3.9], ['flower_redA.glb', 3.0, -4.0], ['flower_purpleA.glb', -3.0, -4.05], ['flower_redA.glb', -3.5, -3.95],
    ['flower_purpleA.glb', 6.2, 1.4], ['flower_yellowA.glb', -6.3, 1.6], ['flower_redA.glb', -5.9, 1.9],
  ];
  await Promise.all(fSpots.map(async ([name, x, z], i) => {
    try {
      const f = await ctx.model(name, { height: 0.42 });
      const fg = new THREE.Group();
      fg.add(f);
      fg.position.set(x, 0, z);
      fg.rotation.y = i * 1.3;
      root.add(fg);
      flowers.push(fg);
    } catch (e) { console.warn('anna flower', e); }
  }));
  ctx.state.flowers = flowers;
  ctx.state.nextFirework = 0;
}

// tái dùng mỗi frame (ambient không tạo object mới)
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const at = new THREE.Vector3();
const FIREWORK = [0xc026d3, 0x0a84ff, 0xf0a500, 0x16a34a, 0xe11d74];

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time;
  const melt = ctx.melt;
  const st = ctx.state;

  // mặt nước gợn (chảy nhanh dần khi tan băng)
  const wt = st.waterTex as THREE.Texture | undefined;
  if (wt) { wt.offset.x += dt * (0.004 + 0.01 * melt); wt.offset.y = Math.sin(t * 0.3) * 0.02; }

  // thuyền: đóng băng thì đứng yên, tan dần thì chạy
  (st.boats as Boat[] | undefined)?.forEach((b) => {
    b.obj.position.x += dt * b.speed * (0.1 + 0.9 * melt);
    if (b.obj.position.x > b.max) b.obj.position.x = b.min;
    b.obj.rotation.z = Math.sin(t * 1.2 + b.phase) * 0.04;
    b.obj.rotation.x = Math.sin(t * 0.9 + b.phase) * 0.03;
  });
  // hải âu bay vòng trên vịnh
  (st.gulls as THREE.Object3D[] | undefined)?.forEach((g, i) => {
    const a = t * (0.25 + i * 0.07) + i * 2.1;
    g.position.set(Math.cos(a) * (8 + i * 3), 7 + i * 1.2 + Math.sin(a * 2) * 0.4, -22 - i * 5 + Math.sin(a) * 4);
    g.rotation.y = -a;
    const w = g.userData.wings as THREE.Object3D[];
    const f = Math.sin(t * 6 + i) * 0.35;
    w[0].rotation.z = f; w[1].rotation.z = -f;
  });
  (st.clouds as THREE.Object3D[] | undefined)?.forEach((c, i) => {
    c.position.x += dt * (0.2 + i * 0.05);
    if (c.position.x > 34) c.position.x = -34;
  });

  // cờ, dây cờ, bóng bay đung đưa
  (st.banners as THREE.Object3D[] | undefined)?.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.4 + i) * 0.05; b.rotation.x = Math.sin(t * 1.1 + i) * 0.08; });
  (st.strands as THREE.Object3D[] | undefined)?.forEach((s, k) => s.children.forEach((f, i) => { f.rotation.x = Math.sin(t * 2.2 + i * 0.6 + k) * 0.22; }));
  (st.balloons as THREE.Object3D[] | undefined)?.forEach((b, i) => { bob(b, t, 0.08, 1.1, i * 1.7); b.rotation.z = Math.sin(t * 0.8 + i) * 0.08; });
  (st.lamps as THREE.Object3D[] | undefined)?.forEach((l, i) => {
    (l.userData.halo as THREE.Sprite).material.opacity = 0.2 + 0.35 * melt + Math.sin(t * 2 + i) * 0.04;
  });

  // Olaf lắc lư vui vẻ + mây tuyết riêng
  const olaf = st.olaf as THREE.Object3D | undefined;
  if (olaf) {
    const joy = 0.3 + 0.7 * melt;
    olaf.rotation.z = Math.sin(t * 1.8) * 0.05 * joy;
    olaf.position.y = Math.max(0, Math.sin(t * 3.2)) * (ctx.awake ? 0.08 : 0.02);
  }
  const cloud = st.flurryCloud as THREE.Object3D | undefined;
  if (cloud) { bob(cloud, t, 0.05, 1.3); cloud.rotation.y = Math.sin(t * 0.5) * 0.3; }
  const fl = st.flurry as Flurry | undefined;
  if (fl) {
    for (let i = 0; i < fl.vel.length; i++) {
      const k = i * 3;
      fl.pos[k + 1] -= fl.vel[i] * dt;
      fl.pos[k] += Math.sin(t * 2 + i) * dt * 0.08;
      if (fl.pos[k + 1] < 0.85) {
        fl.pos[k] = fl.cx + (Math.random() - 0.5) * 0.6;
        fl.pos[k + 1] = fl.cy - 0.1;
        fl.pos[k + 2] = fl.cz + (Math.random() - 0.5) * 0.4;
      }
    }
    (fl.pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  // người tuyết tí hon: 2 bạn lúc đầu, thêm dần theo băng tan; tỉnh thì cả 7 nhảy tưng bừng
  const shownHop = ctx.awake ? 7 : 2 + Math.round(melt * 4);
  (st.hoppers as Hopper[] | undefined)?.forEach((h) => {
    h.obj.visible = h.order < shownHop;
    if (!h.obj.visible) return;
    const hop = Math.abs(Math.sin(t * h.speed + h.phase));
    const roam = ctx.awake ? h.roam * 1.6 : h.roam;
    h.obj.position.set(h.x + Math.sin(t * 0.6 + h.phase) * roam, hop * (ctx.awake ? 0.22 : 0.12), h.z + Math.cos(t * 0.5 + h.phase) * roam * 0.5);
    h.obj.rotation.y = Math.sin(t * 0.6 + h.phase) * 0.8;
    h.obj.scale.set(1.25 * (1 + (1 - hop) * 0.08), 1.25 * (1 - (1 - hop) * 0.1), 1.25);
  });

  // tuyết đọng tan dần
  const md = st.mounds as { mesh: THREE.InstancedMesh; base: [number, number, number][] } | undefined;
  if (md) {
    const left = Math.max(0, 1 - melt * 1.15);
    md.mesh.visible = left > 0.01;
    if (md.mesh.visible) {
      md.base.forEach(([x, z, r], i) => {
        tmpP.set(x, 0, z);
        tmpS.set(r * 1.6, r * 0.55 * left, r * 1.2).multiplyScalar(0.4 + 0.6 * left);
        md.mesh.setMatrixAt(i, tmpM.compose(tmpP, tmpQ.identity(), tmpS));
      });
      md.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  // hoa nở theo băng tan
  const bloomS = 0.35 + 0.65 * melt;
  (st.flowers as THREE.Object3D[] | undefined)?.forEach((f, i) => {
    f.scale.setScalar(bloomS * (1 + Math.sin(t * 2 + i) * 0.03));
    f.rotation.z = Math.sin(t * 1.5 + i) * 0.05 * melt;
  });

  // nắng lấp lánh trên mặt nước
  if (Math.random() < 0.06 + 0.12 * melt) {
    at.set((Math.random() - 0.5) * 16, WATER_Y + 0.1, -9 - Math.random() * 10);
    ctx.magic.twinkle(at, Math.random() < 0.5 ? 0x0a84ff : 0xf0a500, 1, 0.3, 0.45);
  }
  // tỉnh: pháo hoa trên vịnh
  if (ctx.awake && t > (st.nextFirework as number)) {
    st.nextFirework = t + 1.2 + Math.random() * 1.2;
    at.set((Math.random() - 0.5) * 18, 7 + Math.random() * 3, -18 - Math.random() * 6);
    ctx.magic.burst(at, 50, FIREWORK[Math.floor(Math.random() * FIREWORK.length)], 3.2, 0.9, 1.6, -1.2, 0.2);
  }
}

const room: RoomDef = {
  id: 'anna',
  name: 'Sân hè của Anna',
  emoji: '⛄',
  princessModel: 'p_anna.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'kẹo', emoji: '🍬', name: 'cái kẹo', fill: { index: 0, distractors: ['h', 'l'] } },
    { word: 'kem', emoji: '🍦', name: 'cây kem', fill: { index: 0, distractors: ['v', 'p'] } },
    { word: 'tuyết', emoji: '❄️', name: 'bông tuyết' },
    { word: 'mũ', emoji: '👒', name: 'cái mũ', fill: { index: 0, distractors: ['n', 'p'] } },
    { word: 'khăn', emoji: '🧣', name: 'cái khăn' },
    { word: 'nơ', emoji: '🎀', name: 'cái nơ', fill: { index: 0, distractors: ['p', 'g'] } },
    { word: 'bánh', emoji: '🍪', name: 'cái bánh' },
  ],
  count: { emoji: '⛄', audio: 'anna_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0xc026d3, 0x0a84ff],
  audio: { name: 'anna_name', intro: 'anna_intro', thanks: 'anna_thanks' },
};

export default room;
