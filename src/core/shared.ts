// Sổ tài nguyên GPU DÙNG CHUNG giữa các màn (cache): disposeTree bỏ qua chúng.
// Chỉ phụ thuộc three → kit.ts (file phòng chạy được trong node) import được.
import type * as THREE from 'three';

export const sharedTextures = new WeakSet<THREE.Texture>();
export const sharedMaterials = new WeakSet<THREE.Material>();
export const sharedGeometries = new WeakSet<THREE.BufferGeometry>();

export function markSharedTexture<T extends THREE.Texture>(t: T): T { sharedTextures.add(t); return t; }
export function markSharedMaterial<T extends THREE.Material>(m: T): T { sharedMaterials.add(m); return m; }
