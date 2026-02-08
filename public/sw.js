if (!self.define) {
  let e,
    s = {};
  const i = (i, n) => (
    (i = new URL(i + '.js', n).href),
    s[i] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = i), (e.onload = s), document.head.appendChild(e);
        } else (e = i), importScripts(i), s();
      }).then(() => {
        let e = s[i];
        if (!e) throw new Error(`Module ${i} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, c) => {
    const a =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (s[a]) return;
    let t = {};
    const r = (e) => i(e, a),
      o = { module: { uri: a }, exports: t, require: r };
    s[a] = Promise.all(n.map((e) => o[e] || r(e))).then((e) => (c(...e), t));
  };
}
define(['./workbox-c05e7c83'], function (e) {
  'use strict';
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/app-build-manifest.json',
          revision: 'f2c733af02959efb0b7c828642c90410',
        },
        {
          url: '/_next/static/CKCqCAzLQYnr5Y75ilV4V/_buildManifest.js',
          revision: '4665dd29d9868820c735858b5d325875',
        },
        {
          url: '/_next/static/CKCqCAzLQYnr5Y75ilV4V/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/369-2e07117cfffefa55.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/474.064810b5b8e50e1d.js',
          revision: '064810b5b8e50e1d',
        },
        {
          url: '/_next/static/chunks/496.7a95039883589526.js',
          revision: '7a95039883589526',
        },
        {
          url: '/_next/static/chunks/524-b590ee56e557c7d1.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/550-7abb63375538bb74.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/562-d3e2fab51257cbca.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/586-66bde117ee87455a.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/700-5af99574264bba31.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/74-a96f14e3a755a926.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/846-cd13605fd6ffdb5a.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/901-e69b0b4a7717d454.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/906-d7e35d26fd4d947c.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/914.b934f5e42e1a7707.js',
          revision: 'b934f5e42e1a7707',
        },
        {
          url: '/_next/static/chunks/978-b8dba1cb728bb148.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-42f91f7080a15f07.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/admin/page-81186738ebfa7796.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/douban/page-87459b825b5c62ac.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/layout-a9a04175a9384e89.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/live/page-b7c0d4b82d8db1b9.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/login/page-9d6bc6e198c67e73.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/my-watching/page-7181cef70c7562f5.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/page-2df8e869337d94d7.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/play/page-560d23970d65333b.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/register/page-cad90fe8e8456f97.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/search/page-c431c3e938a98090.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/warning/page-fda4f7eed7d41d07.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/app/watch-room/page-b706c6094b63c7d2.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/e54491a5-3b67048033ad4993.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/fac77a46-1ff871bdefec02ac.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/framework-6e06c675866dc992.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/main-94a3a0000002765f.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/main-app-59bde5a5257d90cc.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/pages/_app-0b699500b499d0b7.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/pages/_error-bde6ea195a7ae8b7.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-84aa5c5b768d156e.js',
          revision: 'CKCqCAzLQYnr5Y75ilV4V',
        },
        {
          url: '/_next/static/css/7baf748d92c593da.css',
          revision: '7baf748d92c593da',
        },
        {
          url: '/_next/static/css/7cca8e2c5137bd71.css',
          revision: '7cca8e2c5137bd71',
        },
        {
          url: '/_next/static/media/19cfc7226ec3afaa-s.woff2',
          revision: '9dda5cfc9a46f256d0e131bb535e46f8',
        },
        {
          url: '/_next/static/media/21350d82a1f187e9-s.woff2',
          revision: '4e2553027f1d60eff32898367dd4d541',
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75',
        },
        {
          url: '/_next/static/media/ba9851c3c22cd980-s.woff2',
          revision: '9e494903d6b0ffec1a1e14d34427d44d',
        },
        {
          url: '/_next/static/media/c5fe6dc8356a8c31-s.woff2',
          revision: '027a89e9ab733a145db70f09b8a18b42',
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0',
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de',
        },
        { url: '/favicon.ico', revision: '8b6438cce176a8347c75266ee1dca0df' },
        {
          url: '/icons/icon-192x192.png',
          revision: '2733157c2b6b1e5cb78b0f7511a2f020',
        },
        {
          url: '/icons/icon-256x256.png',
          revision: '0734f95360a6a80e67118f48707d2e9f',
        },
        {
          url: '/icons/icon-384x384.png',
          revision: 'c1d951b68aa2f428874cb74bb63a54d9',
        },
        {
          url: '/icons/icon-512x512.png',
          revision: '46a39578c02859f2e7062d50303b3667',
        },
        { url: '/logo.png', revision: '3707a71de7532bbcfb4e43a2ddf8ced9' },
        { url: '/manifest.json', revision: '62a05d98bce609c8531e1e0145d82001' },
        { url: '/robots.txt', revision: 'e2b2cd8514443456bc6fb9d77b3b1f3e' },
        {
          url: '/screenshot1.png',
          revision: 'd7de3a25686c5b9c9d8c8675bc6109fc',
        },
        {
          url: '/screenshot2.png',
          revision: 'b0b715a3018d2f02aba5d94762473bb6',
        },
        {
          url: '/screenshot3.png',
          revision: '7e454c28e110e291ee12f494fb3cf40c',
        },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: i,
              state: n,
            }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https?.+\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      new e.CacheFirst({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 2592e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js|css)$/,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-css-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https?.+\.(?:woff|woff2|ttf|otf)$/,
      new e.CacheFirst({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET'
    );
});
