import { defineConfig } from 'vite';

export default defineConfig({
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
