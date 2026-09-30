import { defineConfig } from 'vite';

// three.js ~600 kB là bình thường cho game 3D chơi offline trong nhà.
export default defineConfig({
  server: { port: 5182, host: true },
  build: { chunkSizeWarningLimit: 1200 },
});
