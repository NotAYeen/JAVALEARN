import { defineConfig } from 'vite';

// base: './' genera rutas relativas, de modo que la misma build funciona
// en la raiz del dominio y en un subdirectorio como /javalearn/ de GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
