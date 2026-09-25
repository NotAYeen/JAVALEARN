import { montar } from './App.js';

function iniciar() {
  const raiz = document.getElementById('vista-mision');
  if (!raiz) return;

  montar({
    raiz,
    botonTema: document.getElementById('btn-tema'),
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* Sin service worker la app sigue funcionando, solo pierde el modo sin conexion. */
      });
    });
  }
}

iniciar();
