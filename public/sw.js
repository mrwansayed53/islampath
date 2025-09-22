// Service Worker for background audio support
const CACHE_NAME = 'quran-audio-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Service Worker: Cache failed', err))
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle audio files specially
  if (event.request.url.includes('.mp3') || event.request.url.includes('audio')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response since it can only be consumed once
          const responseClone = response.clone();

          // Cache successful audio responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Try to serve from cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Handle background sync for audio playback
self.addEventListener('sync', event => {
  if (event.tag === 'background-audio') {
    console.log('Service Worker: Background audio sync');
    // Handle background audio synchronization if needed
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'AUDIO_COMMAND') {
    console.log('Service Worker: Audio command received', event.data.command);
    // Handle audio commands if needed
  }
});

// Background fetch for large audio files
self.addEventListener('backgroundfetch', event => {
  if (event.tag === 'audio-download') {
    console.log('Service Worker: Background fetch for audio');
    // Handle background audio downloads
  }
});

// Push notifications for audio status (if needed in future)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'audio-notification') {
      const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'audio-notification',
        silent: true // Keep notifications silent for audio
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    }
  }
});