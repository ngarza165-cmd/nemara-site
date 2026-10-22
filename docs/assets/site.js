/* Nemara site behaviour: solid nav after the hero, reveal-on-scroll, and the hero's
   background — a mountain range drawn as fine parallel ridge lines in perspective, like a
   precision terrain profile, at night under a faint field of stars. The view pans sideways
   very slowly, so nearer ridges drift faster than the far skyline (natural parallax).
   Back-to-front drawing with each ridge filled in the sky colour gives hidden-line
   occlusion. Neutral colours only: no red markers or concentric rings anywhere (they read
   as targets). Static frame when motion is reduced; paused off-screen or in a background tab. */
(function () {
  document.documentElement.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.nav'), hero = document.querySelector('.hero');
    function onScroll() {
      var edge = hero ? hero.offsetHeight - 80 : 40;
      nav.classList.toggle('solid', window.scrollY > edge);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (e) { e.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function (e) { io.observe(e); });
    }

    var canvas = document.querySelector('.hero canvas');
    if (canvas && canvas.getContext) terrain(canvas, hero);
  });

  // Seeded random, so the stars and the range are identical on every visit
  function rng(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function terrain(canvas, host) {
    var ctx = canvas.getContext('2d');
    var NIGHT = '#0D110C';

    // Improved Perlin noise
    var perm = new Uint8Array(512), p = [], rand = rng(1913);
    for (var i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(h, x, y, z) {
      h &= 15; var u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }
    function noise(x, y, z) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      var u = fade(x), v = fade(y), w = fade(z);
      var A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z,
          B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
      function l(a, b, t) { return a + t * (b - a); }
      return l(l(l(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
                 l(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
               l(l(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
                 l(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
    function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

    // Smooth layered noise: rounded ranges and calm valleys, like ink-wash mountains
    function elevation(x, z) {
      var n = 0.62 * noise(x * 0.36, z * 0.36, 0.37) + 0.28 * noise(x * 0.78 + 9, z * 0.78 - 4, 1.7)
            + 0.1 * noise(x * 1.6 - 3, z * 1.6 + 6, 2.9);
      var e = n + 0.16;
      return e > 0 ? 1.7 * Math.pow(e, 1.45) : 0;
    }

    var W, H, dpr, F, horizon, camH, stars = [];
    var Z_NEAR = 1, Z_FAR = 15, DZ = 0.36;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      F = H;
      horizon = H * (W >= 900 ? 0.42 : 0.3);
      camH = (H - horizon) * Z_NEAR / F; // nearest ridge sits at the bottom edge
      var r = rng(7), n = Math.round(W * horizon / 2600);
      stars = [];
      for (var k = 0; k < n; k++) {
        var b = r();
        stars.push({ x: r() * W, y: Math.pow(r(), 1.3) * horizon * 1.02,
          s: b > 0.93 ? 1.1 : 0.5 + r() * 0.45, a: b > 0.93 ? 0.6 : 0.12 + r() * 0.32, ph: r() * 6.283 });
      }
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, W, H);

      // Stars, very faint, with the slightest shimmer
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s], a = st.a * (reduce ? 1 : 0.85 + 0.15 * Math.sin(t / 2600 + st.ph));
        ctx.fillStyle = 'rgba(233,236,227,' + a + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, 6.283); ctx.fill();
      }
      // A thin band of haze along the horizon
      var g = ctx.createLinearGradient(0, horizon - 70, 0, horizon + 30);
      g.addColorStop(0, 'rgba(60,91,73,0)'); g.addColorStop(0.75, 'rgba(60,91,73,0.13)'); g.addColorStop(1, 'rgba(60,91,73,0)');
      ctx.fillStyle = g; ctx.fillRect(0, horizon - 70, W, 100);

      // Ridges, far to near; each filled in the sky colour so nearer ranges hide farther ones
      var camX = reduce ? 0 : t * 0.00008, step = W >= 900 ? 5 : 4;
      var lines = Math.round((Z_FAR - Z_NEAR) / DZ);
      for (var k = lines; k >= 0; k--) {
        var zr = Z_NEAR + k * DZ, scale = F / zr;
        var base = horizon + camH * scale;
        // a flat valley in front, foothills in the middle, a tall skyline at the back
        var zc = Math.min(zr, 10.5), amp = 0.021 * zc * zc; // capped: no lone peaks in the sky
        var ys = [];
        for (var sx = -step; sx <= W + step; sx += step) {
          ys.push(base - elevation((sx - W * 0.5) / scale + camX, zr) * amp * scale);
        }
        // fill below the crest in the sky colour (hides farther ridges), then draw the crest
        ctx.beginPath(); ctx.moveTo(-step, ys[0]);
        for (var q = 1; q < ys.length; q++) ctx.lineTo(-step + q * step, ys[q]);
        ctx.lineTo(W + step, H + 2); ctx.lineTo(-step, H + 2); ctx.closePath();
        ctx.fillStyle = NIGHT; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-step, ys[0]);
        for (q = 1; q < ys.length; q++) ctx.lineTo(-step + q * step, ys[q]);
        var near = 1 - (zr - Z_NEAR) / (Z_FAR - Z_NEAR);
        var alpha = (0.07 + 0.3 * Math.pow(near, 1.4)) * smooth(Z_FAR, Z_FAR - 2.5, zr);
        ctx.strokeStyle = 'rgba(214,224,204,' + alpha + ')';
        ctx.lineWidth = near > 0.85 ? 1.15 : 1;
        ctx.stroke();
      }
    }

    var running = false, visible = true, last = 0, raf;
    function loop(t) {
      if (!running) return;
      if (t - last >= 33) { draw(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize(); draw(performance.now());
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { resize(); draw(performance.now()); }, 120);
    });
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(host);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  }
})();
