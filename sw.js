// ECR Rutas - Service Worker
const CACHE_NAME = 'ecr-rutas-v1';
const ASSETS = [
  '/Kilometraje/',
  '/Kilometraje/index.html',
  '/Kilometraje/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Barlow+Condensed:wght@400;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
];

// Instalar: cachear recursos estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets...');
      return cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache parcial:', err));
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache first para assets, network first para Firestore
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firestore y APIs externas: siempre network
  if (url.hostname.includes('firestore') || url.hostname.includes('nominatim') || url.hostname.includes('firebase')) {
    return; // dejar pasar normalmente
  }

  // Assets estáticos: cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback para navegación
        if (e.request.mode === 'navigate') {
          return caches.match('/Kilometraje/index.html');
        }
      });
    })
  );
});
