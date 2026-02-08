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
    const t =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (s[t]) return;
    let a = {};
    const f = (e) => i(e, t),
      r = { module: { uri: t }, exports: a, require: f };
    s[t] = Promise.all(n.map((e) => r[e] || f(e))).then((e) => (c(...e), a));
  };
}
define(['./workbox-43a22c09'], function (e) {
  'use strict';
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/app-build-manifest.json',
          revision: 'bd79d5bf2507ddcf4a451268a1a49467',
        },
        {
          url: '/_next/static/chunks/369-8de932cf5e88c6c2.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/474.f6cd560d4726bd2c.js',
          revision: 'f6cd560d4726bd2c',
        },
        {
          url: '/_next/static/chunks/48-3cdd8ae5f831756f.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/496.dd41a98b8dccf8bb.js',
          revision: 'dd41a98b8dccf8bb',
        },
        {
          url: '/_next/static/chunks/524-0e88401afec566de.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/550-15ebf6de1ef542ba.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/572-03031e4f7564d4fd.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/586-d9b6a60759a1c2bb.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/700-6fad5bec28bc53cb.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/717-0f883cba90c1be77.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/846-d04f6079ab2828ce.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/906-612d9cfcdc0279ee.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/914.cdb3b34f6f4a559f.js',
          revision: 'cdb3b34f6f4a559f',
        },
        {
          url: '/_next/static/chunks/978-6bf411c513990b9d.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-d556f46ecc23e5ef.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/admin/page-d7471cb184c109af.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/douban/page-1a7c17e6327be518.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/layout-43dc7d534c341013.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/live/page-98d19137911bfce0.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/login/page-afd839860badd0f6.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/my-watching/page-eace387ab4933dcf.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/page-d138248a66ae7e89.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/play/page-087cf6d3b86ef63b.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/register/page-45cf0c78258cf208.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/search/page-57cb133dd66e0104.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/warning/page-b40f2194e822b2aa.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/app/watch-room/page-e9930ff81735e600.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/e54491a5-fe3d579049a9437e.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/fac77a46-68f62579a009b7c9.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/framework-ded83d71b51ce901.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/main-a95d241d44e42571.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/main-app-444b74fa23e72be8.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/pages/_app-5bd6ce59efec828b.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/pages/_error-7477a43b02b054d8.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-a12eb7f52021fe56.js',
          revision: 'fWwn62ICqJBp0i46-0C6g',
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
          url: '/_next/static/fWwn62ICqJBp0i46-0C6g/_buildManifest.js',
          revision: 'd2359ce5bfffeb7d4c6eebde7c5c5c95',
        },
        {
          url: '/_next/static/fWwn62ICqJBp0i46-0C6g/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
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
