self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(
                [
                    '/css/mobile.css',
                    '/css/leaflet.css',
                    '/css/leaflet.fullscreen.css',
                    '/js/leaflet.js',
                    '/js/Leaflet.fullscreen.min.js',
                    '/js/L.Terminator.js',
                    '/js/mobile.js',
                    '/js/rbush.js',
                    '/js/leaflet.canvas-markers.js',
                    '/js/pwa.js',
                    '/js/init_plot.js',
                    '/img/markers/antenna-green.png',
                    '/img/markers/balloon-blue.png',
                    '/img/markers/balloon-cyan.png',
                    '/img/markers/balloon-green.png',
                    '/img/markers/balloon-orange.png',
                    '/img/markers/balloon-purple.png',
                    '/img/markers/balloon-red.png',
                    '/img/markers/balloon-yellow.png',
                    '/img/markers/car-blue.png',
                    '/img/markers/car-green.png',
                    '/img/markers/car-red.png',
                    '/img/markers/car-yellow.png',
                    '/img/markers/parachute-yellow.png',
                    '/img/markers/parachute-blue.png',
                    '/img/markers/parachute-cyan.png',
                    '/img/markers/parachute-green.png',
                    '/img/markers/parachute-orange.png',
                    '/img/markers/parachute-purple.png',
                    '/img/markers/parachute-red.png',
                    '/img/markers/payload-blue.png',
                    '/img/markers/payload-cyan.png',
                    '/img/markers/payload-green.png',
                    '/img/markers/payload-not-recovered.png',
                    '/img/markers/payload-orange.png',
                    '/img/markers/payload-purple.png',
                    '/img/markers/payload-recovered.png',
                    '/img/markers/payload-red.png',
                    '/img/markers/payload-yellow.png',
                    '/img/markers/target-blue.png',
                    '/img/markers/target-cyan.png',
                    '/img/markers/target-green.png',
                    '/img/markers/target-orange.png',
                    '/img/markers/target-purple.png',
                    '/img/markers/target-red.png',
                    '/img/markers/target-yellow.png',
                    '/img/markers/shadow.png',
                    '/img/markers/balloon-pop.png',
                    '/img/hab-spinner.gif',
                    '/img/marker-you.gif',
                    '/img/sondehub_logo.gif',
                    '/favicon.ico',
                    '/font/HabitatFont.woff',
                    '/font/Roboto-regular.woff',
                    '/index.html'
                ]
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        }),
    );
});