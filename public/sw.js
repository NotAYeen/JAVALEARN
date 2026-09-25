/*
 * Service worker de JavaLearn.
 *
 * Estrategia: "app shell" precacheado + cache en tiempo de ejecucion con
 * stale-while-revalidate para los recursos con hash que genera Vite.
 *
 * No usamos una lista de archivos precacheados generada en el build a proposito:
 * con nombres con hash esa lista se desactualiza en cuanto el bundle cambia.
 * Cachear "lo que ya se pidio" es mas simple y no puede quedar obsoleto.
 */

const VERSION = 'javalearn-v1';
const CACHE = VERSION;

const SHELL = ['./', './index.html', './css/style.css', './manifest.webmanifest'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      // addAll es atomico: si un recurso falla, no se instala nada a medias.
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, cache como recurso (permite empezar sin conexion).
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Recursos con hash: cache primero y revalidar en segundo plano.
  evento.respondWith(
    caches.match(peticion).then((cacheada) => {
      const red = fetch(peticion)
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => cacheada);

      return cacheada || red;
    }),
  );
});
