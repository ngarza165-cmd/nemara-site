/* Nemara site behaviour: solid nav after the hero, reveal-on-scroll, and the hero scene.

   The hero scene: contour lines (marching squares over slowly drifting 3D noise) for the
   landscape, and above it a red-crowned crane drawn as a fine mesh of data points. On load
   the points drift in from scattered positions and assemble into the bird — fragmented
   signals becoming one understood entity — which then glides very slowly. Deliberately
   no red markers or concentric rings anywhere: they read as targets. Static, fully
   assembled frame when motion is reduced; paused off-screen or in a background tab. */
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
    if (canvas && canvas.getContext) scene(canvas, hero);
  });

  // Seeded random, so the terrain and the mesh are identical on every visit
  function rng(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  // Red-crowned crane in flight, side view facing left, in a 230 x 104 box
  var CRANE = { w: 230, h: 104, poly: [
    2,80,12,77,18,74,22,72.5,27,73.5,31,75.5,42,77.5,56,79,70,80,80,80,
    84,74,88,64,94,53,101,43,110,33,120,24,131,16,142,9,152,4,
    158,2,156,8,166,5,162,12,172,10,166,17,176,17,169,23,177,25,169,29,174,33,
    165,35,161,40,156,41,152,47,147,48,143,54,138,55,134,62,129,63,126,70,121,72,118,78,
    128,81,142,83,154,85,162,86,168,88,172,92,180,92,196,93,212,94,220,93,226,95,220,97,212,97.5,196,97,180,96.5,170,97,
    158,99,142,101,124,101.5,108,100,96,96.5,88,92,80,88.5,66,87.5,52,86.5,40,84.5,31,82,24,81.5,16,81,8,81,3,81] };

  function inside(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      var xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Points (outline + jittered interior) linked to their nearest neighbours, at spacing s
  function buildMesh(a, s) {
    var r = rng(4271), poly = a.poly, pts = [], i, j;
    var step = s * 0.6;
    for (i = 0; i < poly.length; i += 2) {
      var x0 = poly[i], y0 = poly[i + 1], x1 = poly[(i + 2) % poly.length], y1 = poly[(i + 3) % poly.length];
      var n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
      for (j = 0; j < n; j++) pts.push({ x: x0 + (x1 - x0) * j / n, y: y0 + (y1 - y0) * j / n, edge: true });
    }
    for (var gx = 0; gx < a.w; gx += s) for (var gy = 0; gy < a.h; gy += s) {
      var x = gx + (r() - 0.5) * s * 0.9, y = gy + (r() - 0.5) * s * 0.9;
      if (!inside(poly, x, y)) continue;
      var near = false;
      for (j = 0; j < pts.length && !near; j++) if (pts[j].edge && Math.hypot(pts[j].x - x, pts[j].y - y) < s * 0.45) near = true;
      if (!near) pts.push({ x: x, y: y, edge: false });
    }
    pts.forEach(function (p) { p.sx = r(); p.sy = r(); p.delay = r() * 1.1; p.ph = r() * 6.283; });
    var links = [], seen = {}, lim = s * 1.75;
    pts.forEach(function (p, ia) {
      var near = [];
      pts.forEach(function (q, ib) { if (ia !== ib) near.push([Math.hypot(p.x - q.x, p.y - q.y), ib]); });
      near.sort(function (u, v) { return u[0] - v[0]; });
      for (var k = 0; k < 3 && k < near.length; k++) {
        var ib = near[k][1], key = ia < ib ? ia + '-' + ib : ib + '-' + ia;
        if (near[k][0] >= lim || seen[key]) continue;
        var q = pts[ib];
        if (inside(poly, (p.x + q.x) / 2, (p.y + q.y) / 2) || (p.edge && q.edge)) { seen[key] = 1; links.push([ia, ib]); }
      }
    });
    return { pts: pts, links: links };
  }

  function scene(canvas, host) {
    var ctx = canvas.getContext('2d');

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

    var W, H, dpr, cell, cols, rows, field, box, mesh;
    var LEVELS = [];
    for (var lv = -0.62; lv <= 0.62; lv += 0.075) LEVELS.push(+lv.toFixed(3));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cell = W < 700 ? 12 : 15;
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      field = new Float32Array(cols * rows);

      var hostTop = host.getBoundingClientRect().top, sc, bw;
      if (W >= 900) {
        // Desktop: in the open space to the right of the headline text
        var h1 = host.querySelector('h1'), L = W * 0.56;
        if (h1) { var rg = document.createRange(); rg.selectNodeContents(h1); L = Math.max(L, rg.getBoundingClientRect().right + 56); }
        var R = W * 0.97;
        bw = Math.min(W * 0.15, R - L); sc = bw / CRANE.w;
        box = { x: L + 0.62 * (R - L - bw), y: H * 0.26, s: sc };
      } else {
        // Phones and tablets: in the band between the nav and the headline
        var eb = host.querySelector('.eyebrow'), strip = Math.min(W - 24, 540);
        var top = 76, bottom = eb ? eb.getBoundingClientRect().top - hostTop - 22 : H * 0.3;
        bw = strip * 0.42; sc = bw / CRANE.w;
        box = { x: (W - strip) / 2 + strip * 0.52, y: top + Math.max(0, (bottom - top - CRANE.h * sc) * 0.45), s: sc };
      }
      mesh = buildMesh(CRANE, (W >= 900 ? 8 : 6.5) / sc); // spacing on screen in px
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

    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    function drawCrane(t, el) {
      var pts = mesh.pts, n = pts.length, P = new Array(n), prog = new Array(n), i;
      // A slow glide once assembled: a few pixels of drift and lift
      var gx = reduce ? 0 : Math.sin(t / 7000) * 7, gy = reduce ? 0 : Math.sin(t / 4600) * 4;
      var bx = box.x + gx, by = box.y + gy, s = box.s;
      for (i = 0; i < n; i++) {
        var q = pts[i], k = ease(Math.min(1, Math.max(0, (el - q.delay) / 2.4)));
        var tx = bx + q.x * s, ty = by + q.y * s;
        var sx = q.sx * W, sy = q.sy * H;
        P[i] = [sx + (tx - sx) * k, sy + (ty - sy) * k]; prog[i] = k;
      }
      var whole = Math.min(1, Math.max(0, (el - 2.2) / 1.4));
      if (whole > 0) {
        ctx.beginPath();
        for (i = 0; i < CRANE.poly.length; i += 2) {
          var X = bx + CRANE.poly[i] * s, Y = by + CRANE.poly[i + 1] * s;
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.closePath(); ctx.fillStyle = 'rgba(13,17,12,' + (0.55 * whole) + ')'; ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 0.9;
        ctx.strokeStyle = 'rgba(233,236,227,' + (0.42 * whole) + ')'; ctx.stroke();
      }
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      mesh.links.forEach(function (l) {
        if (Math.min(prog[l[0]], prog[l[1]]) < 0.97) return;
        ctx.moveTo(P[l[0]][0], P[l[0]][1]); ctx.lineTo(P[l[1]][0], P[l[1]][1]);
      });
      ctx.strokeStyle = 'rgba(214,224,204,0.16)'; ctx.stroke();
      for (i = 0; i < n; i++) {
        var pt = pts[i], tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t / 1100 + pt.ph * 3);
        ctx.fillStyle = 'rgba(233,236,227,' + ((pt.edge ? 0.85 : 0.4) * tw) + ')';
        ctx.beginPath(); ctx.arc(P[i][0], P[i][1], pt.edge ? 1 : 0.8, 0, 6.283); ctx.fill();
      }
    }

    var t0 = null;
    function draw(t) {
      if (t0 === null) t0 = t;
      var el = reduce ? 99 : (t - t0) / 1000;
      sample(t * 0.000028);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (var k = 0; k < LEVELS.length; k++) {
        ctx.strokeStyle = k % 4 === 0 ? 'rgba(214,224,204,0.17)' : 'rgba(214,224,204,0.08)';
        iso(LEVELS[k]);
      }
      drawCrane(t, el);
    }

    var running = false, visible = true, last = 0, raf;
    function loop(t) {
      if (!running) return;
      // Smooth while the crane assembles, then a calmer frame rate
      var gap = t0 !== null && t - t0 < 4200 ? 16 : 40;
      if (t - last >= gap) { draw(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    if (reduce) draw(0);
    // Headline size changes once the web font arrives; re-fit the crane then
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); if (reduce) draw(0); });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { resize(); if (reduce || !running) draw(performance.now()); }, 120);
    });
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(host);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  }
})();
