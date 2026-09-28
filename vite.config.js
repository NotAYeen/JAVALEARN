import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el sitio se sirve desde https://<usuario>.github.io/javalearn/
  // y una ruta absoluta (/assets/...) apuntaría a la raiz del dominio y daria 404.
  base: './',
  build: {
    outDir: '.',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'assets/[name].js',
        format: 'iife',
        name: 'JavaApp'
      }
    }
  },
  worker: {
    format: 'iife',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/java-worker.js'
      }
    }
  }
});
