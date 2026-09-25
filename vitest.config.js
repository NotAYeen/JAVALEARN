import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // El motor (lexer, parser, interprete) es JavaScript puro: no necesita DOM.
    // Los tests de interfaz declaran su propio entorno con el comentario
    // `// @vitest-environment jsdom` en la cabecera del archivo.
  },
});
