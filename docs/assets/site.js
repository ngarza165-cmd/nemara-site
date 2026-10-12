/* Nemara site behaviour: solid nav after the hero, reveal-on-scroll, and the hero's
   moving topographic background — contour lines drawn by marching squares over slowly
   drifting 3D noise. Neutral colours only: no red markers or concentric rings anywhere
   (they read as targets). Static frame when motion is reduced; paused when off-screen or
   in a background tab. */
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
    if (canvas && canvas.getContext) contours(canvas, hero);
  });

  function contours(canvas, host) {
    var ctx = canvas.getContext('2d');

    // Improved Perlin noise with a fixed seed, so the terrain is the same on every visit
    var perm = new Uint8Array(512), p = [], seed = 1913;
    for (var i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      var j = seed % (i + 1), t = p[i]; p[i] = p[j]; p[j] = t;
    }
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

    var W, H, dpr, cell, cols, rows, field;
    var LEVELS = [];
    for (var lv = -0.62; lv <= 0.62; lv += 0.075) LEVELS.push(+lv.toFixed(3));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cell = W < 700 ? 12 : 15;
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      field = new Float32Array(cols * rows);
    }

    function sample(z) {
      var sc = 1 / 260;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = c * cell * sc, y = r * cell * sc;
        field[r * cols + c] = 0.68 * noise(x, y, z) + 0.32 * noise(x * 2.3 + 11, y * 2.3 - 7, z * 1.4);
      }
    }

    function iso(level) {
      ctx.beginPath();
      for (var r = 0; r < rows - 1; r++) for (var c = 0; c < cols - 1; c++) {
        var a = field[r * cols + c], b = field[r * cols + c + 1],
            d = field[(r + 1) * cols + c], e = field[(r + 1) * cols + c + 1];
        var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (e > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var x = c * cell, y = r * cell;
        var top = [x + cell * (level - a) / (b - a), y],
            right = [x + cell, y + cell * (level - b) / (e - b)],
            bottom = [x + cell * (level - d) / (e - d), y + cell],
            left = [x, y + cell * (level - a) / (d - a)];
        var segs;
        switch (idx) {
          case 1: case 14: segs = [left, bottom]; break;
          case 2: case 13: segs = [bottom, right]; break;
          case 3: case 12: segs = [left, right]; break;
          case 4: case 11: segs = [top, right]; break;
          case 6: case 9: segs = [top, bottom]; break;
          case 7: case 8: segs = [left, top]; break;
          case 5: segs = [left, top, bottom, right]; break;
          case 10: segs = [left, bottom, top, right]; break;
        }
        for (var s = 0; s < segs.length; s += 2) {
          ctx.moveTo(segs[s][0], segs[s][1]); ctx.lineTo(segs[s + 1][0], segs[s + 1][1]);
        }
      }
      ctx.stroke();
    }

    function draw(t) {
      sample(t * 0.000028);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (var k = 0; k < LEVELS.length; k++) {
        ctx.strokeStyle = k % 4 === 0 ? 'rgba(214,224,204,0.17)' : 'rgba(214,224,204,0.08)';
        iso(LEVELS[k]);
      }
    }

    var running = false, visible = true, last = 0, raf;
    function loop(t) {
      if (!running) return;
      if (t - last > 40) { draw(t); last = t; }
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
