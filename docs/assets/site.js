/* Nemara site behaviour: solid nav after the hero, reveal-on-scroll, and the hero scene.

   The hero scene: contour lines (marching squares over slowly drifting 3D noise) for the
   landscape, and on it an Asiatic black bear — Japan's "moon bear" — drawn as a mesh of
   data points. On load the points fly in from scattered positions and assemble into the
   animal: fragmented signals becoming one understood entity. A pulse at the neck reads as
   a collar fix; the pale points on the chest are the crescent the species is named for.
   Static, fully assembled frame when motion is reduced; paused off-screen or in a
   background tab. */
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

  // Seeded random, so the terrain and the bear's mesh are identical on every visit
  function rng(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  // Bear silhouette, side view facing left, in a 200 x 125 box (ground at y = 117)
  var BEAR = [7,63,10,59,16,57,22,55,26,52,29,47,31,43,33,39,32,34,34,30,38,28,42,29,45,32,46,37,49,38,
    56,35,66,29,80,24,94,22,110,23,126,25,140,28,154,31,166,37,174,46,178,57,178,68,175,77,
    176,86,178,96,180,106,182,112,182,117,164,117,162,113,163,104,160,94,154,88,
    150,90,149,98,148,108,148,113,146,117,130,117,130,112,133,104,134,94,132,88,
    122,87,108,88,96,87,
    94,94,95,104,96,112,96,117,80,117,80,112,81,104,80,95,78,90,
    75,92,74,100,70,108,68,113,66,117,48,117,48,113,52,110,54,102,55,92,54,84,
    50,79,44,76,36,74,27,73,19,72,13,70,9,68,7,66];
  var MOON = [44,62,52,64,60,68,66,74,63,79,57,74,50,69,44,67]; // chest crescent
  var COLLAR = [57, 54]; // on the neck, where a GPS collar sits

  function inside(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      var xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  function buildMesh() {
    var r = rng(4271), pts = [], i, j;
    // Outline points, evenly spaced along the silhouette
    for (i = 0; i < BEAR.length; i += 2) {
      var x0 = BEAR[i], y0 = BEAR[i + 1], x1 = BEAR[(i + 2) % BEAR.length], y1 = BEAR[(i + 3) % BEAR.length];
      var len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 4.2));
      for (j = 0; j < n; j++) pts.push({ x: x0 + (x1 - x0) * j / n, y: y0 + (y1 - y0) * j / n, edge: true });
    }
    // Interior points on a jittered grid
    var s = 6.4;
    for (var gx = 0; gx < 200; gx += s) for (var gy = 15; gy < 120; gy += s) {
      var x = gx + (r() - 0.5) * s * 0.9, y = gy + (r() - 0.5) * s * 0.9;
      if (inside(BEAR, x, y)) {
        var near = false;
        for (j = 0; j < pts.length && !near; j++) if (pts[j].edge && Math.hypot(pts[j].x - x, pts[j].y - y) < 3) near = true;
        if (!near) pts.push({ x: x, y: y, edge: false });
      }
    }
    pts.push({ x: 30, y: 49, eye: true }); // eye
    pts.forEach(function (p) {
      p.moon = !p.eye && inside(MOON, p.x, p.y);
      p.sx = r(); p.sy = r(); p.delay = r() * 0.9; p.ph = r() * 6.283;
    });
    // Link each point to its three nearest neighbours
    var links = [], seen = {};
    pts.forEach(function (p, a) {
      var near = [];
      pts.forEach(function (q, b) { if (a !== b) near.push([Math.hypot(p.x - q.x, p.y - q.y), b]); });
      near.sort(function (u, v) { return u[0] - v[0]; });
      for (var k = 0; k < 3; k++) {
        var b = near[k][1], key = a < b ? a + '-' + b : b + '-' + a;
        if (near[k][0] < 11 && !seen[key]) {
          // keep links inside the body (no bridging across the gaps between legs)
          var mx = (p.x + pts[b].x) / 2, my = (p.y + pts[b].y) / 2;
          if (inside(BEAR, mx, my) || p.edge && pts[b].edge) { seen[key] = 1; links.push([a, b]); }
        }
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

    var W, H, dpr, cell, cols, rows, field, box;
    var mesh = buildMesh();
    var LEVELS = [];
    for (var lv = -0.62; lv <= 0.62; lv += 0.075) LEVELS.push(+lv.toFixed(3));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cell = W < 700 ? 12 : 15;
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      field = new Float32Array(cols * rows);
      // Wide screens: the bear stands on the right, facing the headline.
      // Narrow screens: it sits in the band above the headline.
      var sc;
      if (W >= 900) {
        sc = Math.min(W * 0.4, 700) / 200;
        box = { x: W * 0.99 - 200 * sc, y: H * 0.47 - 66 * sc, s: sc, a: 1 };
        // Never let the bear overlap the headline: step aside and shrink if it is wide
        var h1 = host.querySelector('h1');
        if (h1) {
          // measure the text itself, not the block (which can span the full column)
          var rg = document.createRange(); rg.selectNodeContents(h1);
          var hr = rg.getBoundingClientRect(), hostTop = host.getBoundingClientRect().top;
          var free = W * 0.99 - (hr.right + 48);
          var top = hr.top - hostTop, bottom = hr.bottom - hostTop;
          if (box.x < hr.right + 48 && box.y + 117 * sc > top && box.y < bottom) {
            sc = Math.max(free, 300) / 200;
            box = { x: W * 0.99 - 200 * sc, y: H * 0.47 - 66 * sc, s: sc, a: 1 };
          }
        }
      } else {
        sc = Math.min(W * 0.74, 440) / 200;
        box = { x: (W - 200 * sc) / 2 + W * 0.04, y: 74, s: sc, a: 0.85 };
      }
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

    function drawBear(t, t0) {
      var b = box, pts = mesh.pts, el = reduce ? 99 : (t - t0) / 1000;
      // Screen position of each point: flies in from scattered start, then breathes gently
      var P = new Array(pts.length), prog = new Array(pts.length);
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i], k = ease(Math.min(1, Math.max(0, (el - q.delay) / 1.9)));
        var tx = b.x + q.x * b.s, ty = b.y + q.y * b.s;
        var bx = reduce ? 0 : Math.sin(t / 1400 + q.ph) * 0.7, by = reduce ? 0 : Math.cos(t / 1700 + q.ph) * 0.7;
        var sx = q.sx * W, sy = q.sy * H;
        P[i] = [sx + (tx - sx) * k + bx, sy + (ty - sy) * k + by]; prog[i] = k;
      }
      var whole = Math.min(1, Math.max(0, (el - 1.6) / 1.2));
      // A soft shadow of the silhouette so the animal reads against the contours
      if (whole > 0) {
        ctx.beginPath();
        for (i = 0; i < BEAR.length; i += 2) {
          var X = b.x + BEAR[i] * b.s, Y = b.y + BEAR[i + 1] * b.s;
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.closePath(); ctx.fillStyle = 'rgba(13,17,12,' + (0.66 * whole) + ')'; ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 1.3;
        ctx.strokeStyle = 'rgba(233,236,227,' + (0.5 * whole * b.a) + ')'; ctx.stroke();
      }
      // Links
      ctx.lineWidth = 1;
      ctx.beginPath();
      mesh.links.forEach(function (l) {
        var m = Math.min(prog[l[0]], prog[l[1]]);
        if (m < 0.97) return;
        ctx.moveTo(P[l[0]][0], P[l[0]][1]); ctx.lineTo(P[l[1]][0], P[l[1]][1]);
      });
      ctx.strokeStyle = 'rgba(214,224,204,' + (0.15 * b.a) + ')'; ctx.stroke();
      // Points
      for (i = 0; i < pts.length; i++) {
        var pt = pts[i], tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t / 900 + pt.ph * 3);
        var r = pt.eye ? 1.9 : pt.moon ? 1.8 : pt.edge ? 1.35 : 1.05;
        ctx.fillStyle = pt.moon ? 'rgba(255,240,214,' + (0.95 * b.a) + ')'
          : pt.eye ? 'rgba(233,236,227,' + b.a + ')'
          : 'rgba(233,236,227,' + ((pt.edge ? 0.9 : 0.42) * tw * b.a) + ')';
        ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r * Math.max(1, b.s / 3.2), 0, 6.283); ctx.fill();
      }
      // Collar signal
      if (whole > 0) {
        var cx = b.x + COLLAR[0] * b.s, cy = b.y + COLLAR[1] * b.s;
        if (!reduce) for (var ring = 0; ring < 2; ring++) {
          var ph = ((t / 2400) + ring * 0.5) % 1;
          ctx.strokeStyle = 'rgba(224,98,79,' + (0.6 * (1 - ph) * whole) + ')';
          ctx.beginPath(); ctx.arc(cx, cy, 4 + ph * 34, 0, 6.283); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(224,98,79,' + whole + ')';
        ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, 6.283); ctx.fill();
      }
    }

    var t0 = null;
    function draw(t) {
      if (t0 === null) t0 = t;
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
      drawBear(t, t0);
    }

    var running = false, visible = true, last = 0, raf;
    function loop(t) {
      if (!running) return;
      // Smooth while the bear assembles, then a calmer frame rate
      var gap = t0 !== null && t - t0 < 3500 ? 16 : 40;
      if (t - last >= gap) { draw(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    if (reduce) { draw(0); }
    // Headline width changes once the web font arrives; re-fit the bear then
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
