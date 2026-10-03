/* Nemara site behaviour: solid nav after the hero, reveal-on-scroll, and the hero scene.

   The hero scene: contour lines (marching squares over slowly drifting 3D noise) for the
   landscape, and on it four animals drawn as meshes of data points — an Asiatic black
   bear, a sika deer, a red-crowned crane and a wolf. On load the points fly in from
   scattered positions and assemble into the animals: fragmented signals becoming
   understood entities. Each animal carries a red signal dot; dashed links between the
   dots read as relationships in an ontology. Static, fully assembled frame when motion is
   reduced; paused off-screen or in a background tab. */
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

  // Seeded random, so the terrain and the meshes are identical on every visit
  function rng(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  /* Silhouettes, side view facing left. w/h is each drawing's box; dot is the red signal;
     delay staggers the assembly. Desktop (d) and phone (m) placements are fractions:
     x of the free area to the right of the headline (d) or of a centred strip (m), y of
     the hero height (d) or of the band above the headline (m), and width (fraction of W
     on desktop, of the strip on phones). */
  var ANIMALS = [
    { name: 'bear', w: 200, h: 120, delay: 0,
      poly: [7,63,10,59,16,57,22,55,26,52,29,47,31,43,33,39,32,34,34,30,38,28,42,29,45,32,46,37,49,38,
        56,35,66,29,80,24,94,22,110,23,126,25,140,28,154,31,166,37,174,46,178,57,178,68,175,77,
        176,86,178,96,180,106,182,112,182,117,164,117,162,113,163,104,160,94,154,88,
        150,90,149,98,148,108,148,113,146,117,130,117,130,112,133,104,134,94,132,88,
        122,87,108,88,96,87,
        94,94,95,104,96,112,96,117,80,117,80,112,81,104,80,95,78,90,
        75,92,74,100,70,108,68,113,66,117,48,117,48,113,52,110,54,102,55,92,54,84,
        50,79,44,76,36,74,27,73,19,72,13,70,9,68,7,66],
      moon: [44,62,52,64,60,68,66,74,63,79,57,74,50,69,44,67], // the chest crescent
      eye: [30, 49], dot: [57, 54],
      d: { x: 0.92, y: 0.42, w: 0.2 }, m: { x: 0.3, y: 1, w: 0.3 } },
    { name: 'deer', w: 175, h: 192, delay: 0.25,
      poly: [22,62,26,58,34,54,40,50,43,45,42,38,34,34,33,32,35,31,42,34,44,26,38,18,37,16,39,16,45,21,48,12,50,8,52,10,51,18,49,28,48,38,48,46,
        50,46,58,42,61,42,58,47,53,51,54,54,60,64,66,74,72,82,90,84,110,85,130,85,148,86,156,90,161,97,165,95,166,100,162,104,163,112,162,120,
        161,130,158,142,159,158,160,174,161,186,161,190,153,190,153,186,153,172,152,158,150,145,148,135,146,128,
        143,135,141,150,141,170,142,186,142,190,134,190,134,186,134,170,134,150,135,136,128,128,
        110,126,92,125,
        88,130,88,150,88,170,89,186,89,190,81,190,81,186,81,170,80,150,80,132,78,130,
        76,135,74,155,72,172,72,186,72,190,64,190,64,186,65,172,66,155,67,136,66,122,64,110,
        60,98,54,86,46,74,40,68,32,68,26,66,22,64,21,63],
      eye: [34, 57], dot: [140, 104],
      d: { x: 0.05, y: 0.21, w: 0.1 }, m: { x: 0.02, y: 1, w: 0.17 } },
    { name: 'wolf', w: 185, h: 126, delay: 0.45,
      poly: [6,50,12,46,22,42,28,38,31,31,35,21,38,20,42,30,46,34,56,36,68,36,90,38,115,40,135,42,148,45,156,50,164,60,169,74,171,88,168,94,164,90,162,76,156,64,152,64,
        154,72,153,86,157,98,156,110,154,120,156,124,144,124,144,120,148,110,148,98,144,88,140,82,
        136,84,133,96,132,108,132,120,132,124,122,124,123,120,125,108,126,96,126,84,
        118,80,104,76,88,79,74,84,
        73,92,73,104,74,116,74,124,64,124,65,120,66,108,66,94,63,92,
        61,98,58,108,55,116,53,121,53,124,43,124,43,120,48,114,51,104,53,94,52,80,
        48,68,42,60,32,58,22,56,14,54,8,53,6,52],
      eye: [24, 44], dot: [80, 50],
      d: { x: 0.36, y: 0.66, w: 0.13 }, m: { x: 0.72, y: 1, w: 0.24 } },
    { name: 'crane', w: 220, h: 102, delay: 0.65,
      poly: [4,78,14,74,20,72,24,71,28,74,40,77,60,80,82,80,
        88,66,96,50,108,34,122,20,138,8,148,2,154,1,151,7,160,5,156,13,166,12,160,20,170,21,162,28,168,32,158,36,152,46,146,56,140,66,132,76,
        136,80,150,82,160,84,166,88,176,90,200,92,214,92,216,95,200,96,176,96,160,96,
        146,98,128,100,110,99,94,95,86,90,78,88,60,88,40,84,28,81,20,80,14,80,6,79],
      eye: null, dot: [21, 75], // the red crown
      d: { x: 0.64, y: 0.09, w: 0.15 }, m: { x: 0.64, y: 0, w: 0.3 } }
  ];
  var LINKS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3]]; // bear–deer, bear–wolf, …

  function inside(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      var xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Points (outline + jittered interior) and links to nearest neighbours, at spacing s
  function buildMesh(a, s, seed) {
    var r = rng(seed), poly = a.poly, pts = [], i, j;
    var step = s * 0.62;
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
    if (a.eye) pts.push({ x: a.eye[0], y: a.eye[1], eye: true });
    pts.forEach(function (p) {
      p.moon = !!a.moon && !p.eye && inside(a.moon, p.x, p.y);
      p.sx = r(); p.sy = r(); p.delay = a.delay + r() * 0.9; p.ph = r() * 6.283;
    });
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

    var W, H, dpr, cell, cols, rows, field, alpha = 1;
    var LEVELS = [];
    for (var lv = -0.62; lv <= 0.62; lv += 0.075) LEVELS.push(+lv.toFixed(3));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cell = W < 700 ? 12 : 15;
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      field = new Float32Array(cols * rows);

      var hostTop = host.getBoundingClientRect().top, wide = W >= 900;
      var h1 = host.querySelector('h1'), eb = host.querySelector('.eyebrow'), hr = null;
      if (h1) { var rg = document.createRange(); rg.selectNodeContents(h1); hr = rg.getBoundingClientRect(); }
      // Desktop: animals share the area to the right of the headline text.
      // Phones/tablets: they share the band between the nav and the headline.
      var L = wide ? Math.max(W * 0.56, hr ? hr.right + 56 : 0) : 0, R = W * 0.985;
      var shrink = wide ? Math.max(0.6, Math.min(1, (R - L) / (W * 0.425))) : 1;
      var strip = Math.min(W - 24, 540), sx0 = (W - strip) / 2;
      var bandTop = 76, bandBottom = eb ? eb.getBoundingClientRect().top - hostTop - 22 : H * 0.3;
      alpha = wide ? 1 : 0.9;
      ANIMALS.forEach(function (a, k) {
        var pl = wide ? a.d : a.m, bw = wide ? pl.w * W * shrink : pl.w * strip, sc = bw / a.w, bh = a.h * sc;
        if (wide) a.box = { x: L + pl.x * (R - L - bw), y: pl.y * H, s: sc };
        else a.box = { x: sx0 + pl.x * strip, y: pl.y ? bandBottom - bh : bandTop, s: sc };
        // keep spacing on screen roughly constant, whatever the animal's size
        a.mesh = buildMesh(a, (wide ? 10.5 : 7.5) / sc, 4271 + k * 97);
      });
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
    function settled(a, el) { return Math.min(1, Math.max(0, (el - a.delay - 1.6) / 1.2)); }

    function drawAnimal(a, t, el) {
      var b = a.box, pts = a.mesh.pts, n = pts.length, P = new Array(n), prog = new Array(n), i;
      for (i = 0; i < n; i++) {
        var q = pts[i], k = ease(Math.min(1, Math.max(0, (el - q.delay) / 1.9)));
        var tx = b.x + q.x * b.s, ty = b.y + q.y * b.s;
        var jx = reduce ? 0 : Math.sin(t / 1400 + q.ph) * 0.6, jy = reduce ? 0 : Math.cos(t / 1700 + q.ph) * 0.6;
        var sx = q.sx * W, sy = q.sy * H;
        P[i] = [sx + (tx - sx) * k + jx, sy + (ty - sy) * k + jy]; prog[i] = k;
      }
      var whole = settled(a, el);
      if (whole > 0) {
        ctx.beginPath();
        for (i = 0; i < a.poly.length; i += 2) {
          var X = b.x + a.poly[i] * b.s, Y = b.y + a.poly[i + 1] * b.s;
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.closePath(); ctx.fillStyle = 'rgba(13,17,12,' + (0.66 * whole) + ')'; ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(233,236,227,' + (0.48 * whole * alpha) + ')'; ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      a.mesh.links.forEach(function (l) {
        if (Math.min(prog[l[0]], prog[l[1]]) < 0.97) return;
        ctx.moveTo(P[l[0]][0], P[l[0]][1]); ctx.lineTo(P[l[1]][0], P[l[1]][1]);
      });
      ctx.strokeStyle = 'rgba(214,224,204,' + (0.15 * alpha) + ')'; ctx.stroke();
      for (i = 0; i < n; i++) {
        var pt = pts[i], tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t / 900 + pt.ph * 3);
        var r = pt.eye ? 1.7 : pt.moon ? 1.6 : pt.edge ? 1.25 : 1;
        ctx.fillStyle = pt.moon ? 'rgba(255,240,214,' + (0.95 * alpha) + ')'
          : pt.eye ? 'rgba(233,236,227,' + alpha + ')'
          : 'rgba(233,236,227,' + ((pt.edge ? 0.9 : 0.42) * tw * alpha) + ')';
        ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r, 0, 6.283); ctx.fill();
      }
    }

    function dotXY(a) { return [a.box.x + a.dot[0] * a.box.s, a.box.y + a.dot[1] * a.box.s]; }

    function drawSignals(t, el) {
      // Dashed links between the animals' signals, with a slow flow along them
      var all = Math.min.apply(null, ANIMALS.map(function (a) { return settled(a, el); }));
      if (all > 0) {
        ctx.save(); ctx.setLineDash([3, 6]); ctx.lineDashOffset = reduce ? 0 : -t / 90;
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(224,98,79,' + (0.34 * all) + ')';
        ctx.beginPath();
        LINKS.forEach(function (l) {
          var A = dotXY(ANIMALS[l[0]]), B = dotXY(ANIMALS[l[1]]);
          ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        });
        ctx.stroke(); ctx.restore();
      }
      ANIMALS.forEach(function (a, k) {
        var w = settled(a, el); if (w <= 0) return;
        var c = dotXY(a), big = W >= 900 ? 26 : 16;
        if (!reduce) for (var ring = 0; ring < 2; ring++) {
          var ph = ((t / 2400) + ring * 0.5 + k * 0.23) % 1;
          ctx.strokeStyle = 'rgba(224,98,79,' + (0.6 * (1 - ph) * w) + ')';
          ctx.beginPath(); ctx.arc(c[0], c[1], 3 + ph * big, 0, 6.283); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(224,98,79,' + w + ')';
        ctx.beginPath(); ctx.arc(c[0], c[1], W >= 900 ? 3.2 : 2.6, 0, 6.283); ctx.fill();
      });
    }

    var t0 = null;
    function draw(t) {
      if (t0 === null) t0 = t;
      var el = reduce ? 99 : (t - t0) / 1000;
      sample(t * 0.000028);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var k = 0; k < LEVELS.length; k++) {
        var L = LEVELS[k];
        if (L > 0.47) { ctx.strokeStyle = 'rgba(224,98,79,' + (0.26 + (L - 0.47) * 1.4) + ')'; ctx.lineWidth = 1.1; }
        else if (k % 4 === 0) { ctx.strokeStyle = 'rgba(214,224,204,0.18)'; ctx.lineWidth = 1.1; }
        else { ctx.strokeStyle = 'rgba(214,224,204,0.085)'; ctx.lineWidth = 1; }
        iso(L);
      }
      ANIMALS.forEach(function (a) { drawAnimal(a, t, el); });
      drawSignals(t, el);
    }

    var running = false, visible = true, last = 0, raf;
    function loop(t) {
      if (!running) return;
      // Smooth while the animals assemble, then a calmer frame rate
      var gap = t0 !== null && t - t0 < 4200 ? 16 : 40;
      if (t - last >= gap) { draw(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    if (reduce) draw(0);
    // Headline size changes once the web font arrives; re-fit the animals then
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
