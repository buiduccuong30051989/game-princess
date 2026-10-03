// Tối ưu model cho iPad (ngân sách ≤ 300k tam giác, ≤ 150 draw call / cảnh). Chạy tay, kết quả đã commit:
//   node scripts/optimize-models.mjs            (tất cả)
//   node scripts/optimize-models.mjs elsa lod   (chỉ 1 phần)
//
// 1. elsa: public/models/elsa_anim.glb ← assets-raw/sketchfab/elsa_anim/elsa_anim.glb, CHỈ giữ clip game dùng (ELSA_CLIPS trong
//    src/elsa.ts), bỏ keyframe thừa (resample), bỏ dữ liệu không dùng (prune), texture WebP.
// 2. lod: public/models/lod/p_*.glb (tượng ở Đại sảnh, 11 cái cùng lúc) ← public/models/p_*.glb: texture 512 px WebP
//    (gltf-transform CLI qua `pnpm dlx`, cần mạng lần đầu) rồi giảm lưới còn ~LOD_TRIS tam giác (meshoptimizer, giữ xương).
// 3. cap: mọi texture trong public/models > 1024 px thu về 1024 (CLI resize chỉ thu nhỏ, không phóng to).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, statSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = (p) => join(root, 'public/models', p);
const only = process.argv.slice(2);
const want = (k) => !only.length || only.includes(k);
const LOD_TRIS = 9000;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const tmp = mkdtempSync(join(tmpdir(), 'princess-models-'));
const cli = (...args) => execFileSync('pnpm', ['dlx', '@gltf-transform/cli', ...args], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
const tris = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  return Math.round(t);
};
const mb = (f) => (statSync(f).size / 1e6).toFixed(2) + ' MB';

// ---------------------------------------------------------------- 1. Elsa: chỉ giữ clip đang dùng
if (want('elsa')) {
  const src = join(root, 'assets-raw/sketchfab/elsa_anim/elsa_anim.glb');
  const used = new Set([...readFileSync(join(root, 'src/elsa.ts'), 'utf8').matchAll(/'(level_[a-z0-9_]+)'/g)].map((m) => m[1]));
  const doc = await io.read(src);
  const anims = doc.getRoot().listAnimations();
  for (const a of anims) if (!used.has(a.getName())) a.dispose();
  await doc.transform(resample(), prune(), dedup());
  const t = join(tmp, 'elsa.glb');
  await io.write(t, doc);
  cli('webp', t, M('elsa_anim.glb')); // texture PNG → WebP (Safari iPad đọc được)
  console.log(`elsa_anim.glb: ${anims.length} → ${doc.getRoot().listAnimations().length} clip (${[...used].join(', ')}), ${mb(src)} → ${mb(M('elsa_anim.glb'))}`);
}

// ---------------------------------------------------------------- 2. tượng sảnh: texture 512 WebP + giảm lưới
if (want('lod')) {
  for (const f of readdirSync(M('.')).filter((x) => /^p_.+\.glb$/.test(x) && x !== 'p_elsa_f1.glb')) {
    const a = join(tmp, `a_${f}`), b = join(tmp, `b_${f}`);
    cli('resize', M(f), a, '--width', '512', '--height', '512');
    cli('webp', a, b);
    const doc = await io.read(b);
    const before = tris(doc);
    if (before > LOD_TRIS) {
      await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: LOD_TRIS / before, error: 0.01, lockBorder: false }));
    }
    await doc.transform(prune(), dedup());
    await io.write(M(`lod/${f}`), doc);
    console.log(`lod/${f}: ${before} → ${tris(doc)} tam giác, ${mb(M(`lod/${f}`))}`);
  }
}

// ---------------------------------------------------------------- 3. texture ≤ 1024 px
if (want('cap')) {
  const files = [];
  const walk = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) walk(p); else if (x.endsWith('.glb')) files.push(p); } };
  walk(M('.'));
  for (const f of files) {
    const doc = await io.read(f);
    const big = doc.getRoot().listTextures().some((t) => { const s = t.getSize(); return s && (s[0] > 1024 || s[1] > 1024); });
    if (!big) continue;
    const out = join(tmp, 'cap.glb');
    cli('resize', f, out, '--width', '1024', '--height', '1024');
    copyFileSync(out, f);
    console.log(`${f.replace(root + '/', '')}: texture thu về ≤ 1024 px`);
  }
}
