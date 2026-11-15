(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const wide = () => matchMedia('(min-width: 60rem)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const MAIL = 'sakshamrathi4@gmail.com';
  const NAV = 40;

  /* ================= spike chart (real data from Spike Book) ================= */
  let spikeData;
  const loadSpikes = () => spikeData || (spikeData = fetch('assets/spikes.json').then((r) => r.json()));
  const NS = 'http://www.w3.org/2000/svg';
  const drawSpikes = async (svg) => {
    const { foods, cats } = await loadSpikes();
    const full = svg.dataset.spikes === 'full';
    const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
    const foot = full ? 30 : 4, BIN = 2.5, MAX = 77.5, bins = MAX / BIN;
    const stacks = Array.from({ length: bins }, () => []);
    foods.forEach((f) => stacks[clamp(Math.floor(f[1] / BIN), 0, bins - 1)].push(f));
    const tallest = Math.max(...stacks.map((s) => s.length));
    const r = Math.min((W / bins / 2) * 0.86, (H - foot - 6) / tallest / 2);
    svg.textContent = '';
    if (full) [0, 25, 50, 75].forEach((v) => {
      const x = (v / MAX) * W;
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', H - foot + 4);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x + 5); t.setAttribute('y', H - 8); t.textContent = v === 75 ? '+75 mg/dL' : '+' + v;
      svg.append(l, t);
    });
    let k = 0;
    stacks.forEach((s, b) => s.forEach((f, i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', ((b + 0.5) * W) / bins);
      c.setAttribute('cy', H - foot - r - i * r * 2);
      c.setAttribute('r', r * 0.84);
      c.style.setProperty('--k', k++);
      c.dataset.n = f[0]; c.dataset.v = f[1]; c.dataset.c = f[2];
      if (!full && f[1] >= 50) c.classList.add('is-hot');
      svg.append(c);
    }));
    if (!full) return;
    const box = svg.closest('.chartbox'), tip = $('[data-tip]', box), catsEl = $('[data-cats]', box);
    const dots = $$('circle', svg);
    const say = (c) => { tip.textContent = c.dataset.n + ': +' + c.dataset.v + ' mg/dL (' + cats[c.dataset.c] + ')'; };
    let pinned = null;
    svg.addEventListener('pointerover', (e) => { if (e.target.tagName === 'circle' && !pinned) say(e.target); });
    svg.addEventListener('click', (e) => {
      if (e.target.tagName !== 'circle') return;
      pinned?.classList.remove('is-on');
      pinned = pinned === e.target ? null : e.target;
      if (pinned) { pinned.classList.add('is-on'); say(pinned); }
    });
    Object.entries(cats).forEach(([key, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        $$('button', catsEl).forEach((x) => x.setAttribute('aria-pressed', x === b && on));
        pinned?.classList.remove('is-on'); pinned = null;
        dots.forEach((d) => { d.classList.toggle('is-dim', on && d.dataset.c !== key); d.classList.toggle('is-hot', on && d.dataset.c === key); });
        if (on) {
          const vals = foods.filter((f) => f[2] === key).map((f) => f[1]);
          tip.textContent = label + ': ' + vals.length + ' foods, from +' + Math.min(...vals) + ' to +' + Math.max(...vals) + ' mg/dL.';
        } else tip.textContent = 'Hover or tap a dot to see the food.';
      });
      catsEl.append(b);
    });
  };
  $$('[data-spikes="mini"]').forEach((s) => drawSpikes(s).catch(() => {}));

  /* ================= files that open ================= */
  let wakeFile = () => {};
  const file = $('#file'), fileBody = $('[data-file]', file);
  const openFile = (id, from) => {
    const tpl = $('#f-' + id);
    if (!tpl || !file.showModal) return;
    fileBody.replaceChildren(tpl.content.cloneNode(true));
    wakeFile(fileBody);
    const chart = $('[data-spikes="full"]', fileBody);
    if (chart) drawSpikes(chart).catch(() => {});
    file.showModal();
    file.scrollTop = 0;
    if (still || !from) return;
    const a = from.getBoundingClientRect(), b = file.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    file.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${Math.max(0.12, a.width / b.width)}) rotate(-8deg)`, opacity: 0.2 },
      { transform: 'none', opacity: 1 },
    ], { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  };
  file.addEventListener('click', (e) => {
    if (e.target === file || e.target.closest('[data-close]')) file.close();
  });
  file.addEventListener('close', () => file.classList.remove('is-full'));

  /* ================= red, yellow, green: the window buttons work ================= */
  const trashN = $('[data-trash-n]');
  const pop = (el, from) => { if (!still) el.animate([{ scale: from, opacity: 0.3 }, { scale: 1, opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }); };
  const syncTrash = () => {
    const n = $$('.win.is-closed').length;
    if (trashN) { trashN.textContent = n; trashN.hidden = !n; }
    onScroll();
  };
  const closeWin = (win) => {
    const name = ($('.win__bar > span', win) || $('.cap', win) || {}).textContent || 'this window';
    win.classList.remove('is-shade', 'is-zoom');
    win.classList.add('is-closed');
    const r = document.createElement('span');
    r.className = 'win__reopen';
    r.append(name.trim() + ' is closed. ');
    const b = document.createElement('b'); b.textContent = 'reopen'; r.append(b);
    win.append(r);
    pop(win, 0.7);
    syncTrash();
  };
  const reopenWin = (win) => {
    win.classList.remove('is-closed');
    $('.win__reopen', win)?.remove();
    pop(win, 0.85);
    syncTrash();
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const closed = e.target.closest('.win.is-closed');
    if (closed) { e.preventDefault(); e.stopPropagation(); if (!(closed._s && closed._s.moved >= 6)) reopenWin(closed); return; }
    const light = e.target.closest('.win__bar > i');
    if (!light || light.closest('.plate')) return;
    e.preventDefault(); e.stopPropagation();
    const bar = light.parentElement, n = [...bar.children].indexOf(light);
    if (bar.closest('.file')) { if (n < 2) file.close(); else file.classList.toggle('is-full'); return; }
    const win = bar.closest('.win');
    if (!win || (win._s && win._s.moved >= 6)) return;
    if (n === 0) closeWin(win);
    else if (n === 1) { win.classList.remove('is-zoom'); win.classList.toggle('is-shade'); }
    else {
      const opens = win.dataset.open ? [win] : $$('[data-open]', win);
      if (opens.length === 1) openFile(opens[0].dataset.open, win);
      else { win.classList.remove('is-shade'); win.classList.toggle('is-zoom'); }
    }
  }, true);
  $('[data-trash]')?.addEventListener('click', (e) => {
    const all = $$('.win.is-closed');
    if (all.length) all.forEach(reopenWin);
    else if (!still) e.currentTarget.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 240 });
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (!t || t.matches('[data-thing]')) return;
    if (t.tagName === 'A' && file.showModal) e.preventDefault();
    openFile(t.dataset.open, t);
  });

  /* ================= the banner: drag, throw, tilt, click to open ================= */
  const stage = $('[data-stage]');
  const things = stage ? $$('[data-thing]', stage) : [];
  if (stage) {
    const tilt = $('[data-tilt]', stage);
    let top = 20;
    if (!fine) { const hint = $('[data-hint]', stage); if (hint) hint.textContent = 'tap a window to open it.'; }
    requestAnimationFrame(() => {
      stage.classList.add('is-dealing', 'is-dealt');
      setTimeout(() => stage.classList.remove('is-dealing'), 1300);
    });
    const put = (el, s) => {
      const b = stage.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      const minX = -el.offsetLeft - b.left + 8 - w * 0.4, maxX = innerWidth - b.left - el.offsetLeft - w * 0.6 - 8;
      const minY = -el.offsetTop - h * 0.2, maxY = b.height - el.offsetTop - h * 0.7;
      if (s.x < minX || s.x > maxX) s.vx = 0;
      if (s.y < minY || s.y > maxY) s.vy = 0;
      s.x = clamp(s.x, minX, maxX); s.y = clamp(s.y, minY, maxY);
      el.style.setProperty('--x', s.x + 'px');
      el.style.setProperty('--y', s.y + 'px');
    };
    const FACES = ['^ ω ^', '(•‿•)', 'ʕ•ᴥ•ʔ', '(ง •̀_•́)ง', '¯\\_(ツ)_/¯', '(¬_¬)', '(╯°□°)╯︵ ┻━┻', '┬─┬ノ( º _ ºノ)', '(づ｡◕‿‿◕｡)づ', '( ˘▽˘)っ♨'];
    const TAGS = {
      blue: [['my name is', 'saksham'], ['i study at', 'ubs, pu'], ['i build with', 'claude code'], ['i write on', 'linkedin']],
      red: [['i am open to', 'internships'], ['i like', 'product'], ['and also', 'marketing']],
    };
    const toy = (el) => {
      if (el.classList.contains('kao')) {
        let f; do { f = FACES[Math.floor(Math.random() * FACES.length)]; } while (f === el.textContent);
        el.textContent = f;
        if (!still) el.animate([{ translate: '0 0' }, { translate: '0 -14px' }, { translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' });
      } else if (el.classList.contains('sticker')) {
        const set = TAGS[el.classList.contains('sticker--red') ? 'red' : 'blue'];
        el._n = ((el._n || 0) + 1) % set.length;
        const swap = () => { $('small', el).textContent = set[el._n][0]; $('b', el).textContent = set[el._n][1]; };
        if (still) { swap(); return; }
        el.animate([{ scale: '1 1' }, { scale: '0 1' }, { scale: '1 1' }], { duration: 300, easing: 'ease-in-out' });
        setTimeout(swap, 150);
      }
    };
    things.forEach((el) => {
      const s = { x: 0, y: 0, vx: 0, vy: 0, id: null, px: 0, py: 0, raf: 0, moved: 0 };
      el._s = s;
      const lean = () => {
        el.style.setProperty('--ty', clamp(s.vx * 0.9, -24, 24) + 'deg');
        el.style.setProperty('--tx', clamp(-s.vy * 0.9, -24, 24) + 'deg');
      };
      const rest = () => { el.style.setProperty('--ty', '0deg'); el.style.setProperty('--tx', '0deg'); };
      el.addEventListener('pointerdown', (e) => {
        el.style.zIndex = ++top;
        s.moved = 0;
        if (!fine && e.pointerType !== 'mouse') return;
        cancelAnimationFrame(s.raf);
        s.id = e.pointerId; s.px = e.clientX; s.py = e.clientY; s.vx = s.vy = 0;
        el.setPointerCapture(e.pointerId);
        el.classList.remove('is-glide');
      });
      el.addEventListener('pointermove', (e) => {
        if (s.id !== e.pointerId) return;
        const dx = e.clientX - s.px, dy = e.clientY - s.py;
        s.moved += Math.abs(dx) + Math.abs(dy);
        if (s.moved < 6) return;
        el.classList.add('is-held');
        s.px = e.clientX; s.py = e.clientY;
        s.x += dx; s.y += dy;
        s.vx = s.vx * 0.6 + dx * 0.4; s.vy = s.vy * 0.6 + dy * 0.4;
        put(el, s);
        if (!still) lean();
      });
      const drop = (e) => {
        if (s.id !== e.pointerId) return;
        s.id = null;
        el.classList.remove('is-held');
        let sp = Math.hypot(s.vx, s.vy);
        if (still || sp < 2) { rest(); return; }
        if (sp > 26) { s.vx *= 26 / sp; s.vy *= 26 / sp; }
        el.classList.add('is-glide');
        const glide = () => {
          s.vx *= 0.92; s.vy *= 0.92;
          s.x += s.vx; s.y += s.vy;
          put(el, s); lean();
          if (Math.hypot(s.vx, s.vy) > 0.4) s.raf = requestAnimationFrame(glide);
          else { el.classList.remove('is-glide'); rest(); }
        };
        s.raf = requestAnimationFrame(glide);
      };
      el.addEventListener('pointerup', drop);
      el.addEventListener('pointercancel', drop);
      el.addEventListener('click', (e) => { if (s.moved >= 6) { e.preventDefault(); return; } toy(el); if (el.dataset.open) { if (el.tagName === 'A' && file.showModal) e.preventDefault(); openFile(el.dataset.open, el); } });
      el.addEventListener('keydown', (e) => {
        const k = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
        if (!k) return;
        e.preventDefault();
        s.x += k[0]; s.y += k[1];
        put(el, s);
      });
    });
    $('[data-tidy]', stage)?.addEventListener('click', () => things.forEach((el) => {
      cancelAnimationFrame(el._s.raf);
      el.classList.remove('is-glide');
      Object.assign(el._s, { x: 0, y: 0, vx: 0, vy: 0 });
      el.style.setProperty('--x', '0px'); el.style.setProperty('--y', '0px');
      el.style.zIndex = '';
    }));
    const hero = stage.closest('.hero');
    if (fine && !still) {
      let frame = 0, ev = null, hot = null;
      const free = (el) => el && el._s.id === null && !el.classList.contains('is-glide');
      const calm = (el) => { if (free(el)) { el.style.setProperty('--tx', '0deg'); el.style.setProperty('--ty', '0deg'); } };
      hero.addEventListener('pointermove', (e) => {
        ev = e;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = stage.getBoundingClientRect();
          tilt.style.setProperty('--mx', clamp(((ev.clientX - r.left) / r.width - 0.5) * 2, -1, 1).toFixed(3));
          tilt.style.setProperty('--my', clamp(((ev.clientY - r.top) / r.height - 0.5) * 2, -1, 1).toFixed(3));
          const el = ev.target.closest ? ev.target.closest('[data-thing]') : null;
          if (hot && hot !== el) calm(hot);
          hot = el;
          if (free(el)) {
            const b = el.getBoundingClientRect();
            el.style.setProperty('--ty', (((ev.clientX - b.left) / b.width - 0.5) * 16).toFixed(1) + 'deg');
            el.style.setProperty('--tx', (-((ev.clientY - b.top) / b.height - 0.5) * 16).toFixed(1) + 'deg');
          }
        });
      });
      hero.addEventListener('pointerleave', () => { calm(hot); hot = null; tilt.style.setProperty('--mx', 0); tilt.style.setProperty('--my', 0); });

      /* a second cursor that wanders the desk and points at things */
      const buddy = $('[data-buddy]', stage);
      if (buddy && wide()) {
        const SAY = { desk: 'built this for my desk', kanban: 'my mac app', covers: 'i design these', spike: '300 foods, checked by hand', golden: '₹30 Cr disbursed', okcredit: '5x in four months', goodspace: '50+ early users', ubs: 'mba, class of 2028', resume: 'one page' };
        const tag = $('b', buddy);
        let last = null;
        const go = () => {
          if (document.hidden || stage.getBoundingClientRect().bottom < 240 || things.some((t) => t._s.id !== null)) return;
          const pool = things.filter((t) => t.dataset.open && t !== last && !t.classList.contains('is-closed'));
          if (!pool.length) return;
          const el = last = pool[Math.floor(Math.random() * pool.length)];
          const b = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
          buddy.style.setProperty('--bx', (b.left - s.left + b.width * 0.55).toFixed(0) + 'px');
          buddy.style.setProperty('--by', (b.top - s.top + b.height * 0.5).toFixed(0) + 'px');
          buddy.classList.add('is-on');
          tag.textContent = 'saksham';
          setTimeout(() => { tag.textContent = SAY[el.dataset.open] || 'saksham'; el.classList.add('is-poked'); }, 1300);
          setTimeout(() => el.classList.remove('is-poked'), 3100);
        };
        setTimeout(go, 2200);
        setInterval(go, 4600);
      }
    }
    const wallBtns = $$('[data-wall] button', hero);
    const setWall = (w) => {
      if (w === 'dots') hero.removeAttribute('data-wall'); else hero.dataset.wall = w;
      wallBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.w === w));
      try { localStorage.setItem('wall', w); } catch (err) { /* private window */ }
    };
    wallBtns.forEach((b) => b.addEventListener('click', () => setWall(b.dataset.w)));
    try { const w = localStorage.getItem('wall'); if (w && wallBtns.some((b) => b.dataset.w === w)) setWall(w); } catch (err) { /* private window */ }
  }

  /* ================= the loan flow, driven by scroll ================= */
  const flow = $('[data-flow]');
  let flowTick = () => {};
  if (flow) {
    const panels = $$('.flow__panels > li', flow), lines = $$('.flow__lines li', flow);
    const desk = $('.flow__desk', flow), sheet = $('[data-sheet]', flow), rail = $('.rail', flow), stops = $$('.rail button', flow);
    const pinned = () => wide() && !still && innerHeight >= 620;
    const span = () => flow.offsetHeight - (innerHeight - NAV);
    let last = -1;
    const draw = (s, p) => {
      rail.style.setProperty('--f', p.toFixed(3));
      if (s === last) return;
      last = s;
      const act = Math.min(s, panels.length - 1);
      panels.forEach((li, i) => { li.classList.toggle('is-active', i === act); li.classList.toggle('is-past', i < act); });
      lines.forEach((li, i) => li.classList.toggle('is-done', i < s));
      stops.forEach((b, i) => { b.classList.toggle('is-done', i < s); b.classList.toggle('is-active', i === s); });
      desk.classList.toggle('is-complete', s >= 5);
      sheet.style.setProperty('--p', s);
    };
    flowTick = () => {
      const on = pinned();
      flow.classList.toggle('is-pinned', on);
      if (!on) { last = -1; sheet.style.removeProperty('--p'); return; }
      const p = clamp((NAV - flow.getBoundingClientRect().top) / span(), 0, 1);
      draw(Math.min(5, Math.floor(p * 6)), p);
    };
    stops.forEach((b, i) => b.addEventListener('click', () => {
      const y = flow.getBoundingClientRect().top + scrollY - NAV + (span() * (i + 0.5)) / 6;
      scrollTo({ top: y, behavior: 'smooth' });
    }));
  }

  /* ================= one scroll loop: progress, parallax, ticker, banner drift ================= */
  const dock = $('[data-dock]'), foot = $('.foot');
  const bar = $('[data-progress]'), pars = $$('[data-par]'), ticker = $('[data-ticker]'), run = ticker && $('.ticker__run', ticker);
  let lastY = scrollY, tx = 0, dir = -1, vel = 0;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar?.style.setProperty('--p', (max > 0 ? y / max : 0).toFixed(4));
    flowTick();
    if (dock) {
      const fr = flow && flow.classList.contains('is-pinned') ? flow.getBoundingClientRect() : null;
      const inFlow = fr && fr.top <= NAV + 1 && fr.bottom >= innerHeight - 1;
      const atEnd = foot && foot.getBoundingClientRect().top < innerHeight - 80;
      dock.classList.toggle('is-up', (y > innerHeight * 0.45 || !!$('.win.is-closed')) && !inFlow && !atEnd);
    }
    if (still) return;
    pars.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      el.style.setProperty('--py', ((r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.par)).toFixed(1) + 'px');
    });
    if (stage && y < innerHeight * 1.2) things.forEach((el, i) => el.style.setProperty('--sc', (y * (0.05 * (i % 4) - 0.1)).toFixed(1) + 'px'));
  };
  let queued = false;
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; onScroll(); }); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  if (run && !still) {
    const loop = () => {
      const y = scrollY, d = y - lastY; lastY = y;
      if (d) dir = d > 0 ? -1 : 1;
      vel = vel * 0.9 + Math.min(60, Math.abs(d)) * 0.1;
      tx += dir * (0.7 + vel * 0.6);
      const half = run.scrollWidth / 2;
      if (tx <= -half) tx += half;
      if (tx > 0) tx -= half;
      run.style.setProperty('--tx', tx.toFixed(1) + 'px');
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ================= reveal on scroll, nav highlight ================= */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-rise]').forEach((el) => io.observe(el));
  const spy = (links, targets) => {
    const o = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach((t) => t && o.observe(t));
  };
  const navLinks = $$('.slab__nav a');
  spy(navLinks, navLinks.map((a) => $(a.getAttribute('href'))));
  if (dock) {
    const items = $$('.macdock__item', dock), dockLinks = items.filter((a) => (a.getAttribute('href') || '').startsWith('#'));
    spy(dockLinks, dockLinks.map((a) => $(a.getAttribute('href'))));
    if (fine && !still) {
      dock.addEventListener('pointermove', (e) => items.forEach((it) => {
        const r = it.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2));
        it.style.setProperty('--m', (1 + 0.5 * Math.max(0, 1 - d / 120)).toFixed(3));
      }));
      dock.addEventListener('pointerleave', () => items.forEach((it) => it.style.removeProperty('--m')));
    }
  }

  /* ================= numbers that count up, widgets that fill in ================= */
  const fillBoxes = (root) => $$('[data-fill]', root).forEach((box) => { if (box.children.length) return; for (let n = 0; n < +box.dataset.fill; n++) { const i = document.createElement('i'); i.style.setProperty('--n', n); box.append(i); } });
  fillBoxes(document);
  const live = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-live'); live.unobserve(e.target); } }), { threshold: 0.4 });
  $$('[data-live]').forEach((el) => live.observe(el));
  const ups = $$('[data-up]');
  const showUp = (el, v) => { el.textContent = (el.dataset.pre || '') + Math.round(v).toLocaleString('en-IN') + (el.dataset.suf || ''); };
  const countUp = (el) => {
    const to = +el.dataset.up, t0 = performance.now();
    const step = (t) => { const k = clamp((t - t0) / 1400, 0, 1); showUp(el, to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  wakeFile = (root) => {
    fillBoxes(root);
    const tiles = $$('.wdg', root), nums = $$('[data-up]', root);
    if (still) { tiles.forEach((t) => t.classList.add('is-live')); return; }
    nums.forEach((el) => showUp(el, 0));
    setTimeout(() => { tiles.forEach((t) => t.classList.add('is-live')); nums.forEach(countUp); }, 380);
  };
  if (!still) {
    const uo = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      uo.unobserve(e.target);
      countUp(e.target);
    }), { threshold: 0.6 });
    ups.forEach((el) => { showUp(el, 0); uo.observe(el); });
  }

  /* ================= OkCredit: count from ₹75L to ₹3.75 Cr ================= */
  const okc = $('[data-okc]');
  if (okc) {
    const out = $('[data-count]', okc);
    const fmt = (v) => (v < 100 ? '₹' + Math.round(v) + 'L' : '₹' + (v / 100).toFixed(2) + ' Cr');
    if (!still) out.textContent = fmt(75);
    new IntersectionObserver((es, o) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      okc.classList.add('is-live');
      if (still) return;
      const t0 = performance.now() + 350, dur = 1900;
      const step = (t) => {
        const k = clamp((t - t0) / dur, 0, 1), ease = 1 - Math.pow(1 - k, 3);
        out.textContent = fmt(75 + 300 * ease);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 }).observe($('.okc__fig', okc));
  }

  /* ================= marketing: reach per LinkedIn post (his own analytics, 13 Nov 2026) ================= */
  const reach = $('[data-reach]');
  if (reach) {
    const posts = [
      ['Flipkart Minutes isn’t chasing more orders with this one. It’s chasing heavier ones.', 2837, 'brand'],
      ['The only case study you need to see why Dunkin’ failed in India.', 2198, 'brand'],
      ['A ₹3 price gap quietly stalled Britannia’s rural growth for two months.', 1509, 'brand'],
      ['I save things on Instagram so I won’t forget them. Then I forget I saved them.', 1338, 'product'],
      ['Flipkart just decided to go after the one habit it’s never owned: food.', 1259, 'brand'],
      ['While quick commerce raced down to 10 minutes, FirstClub deliberately chose 30.', 1254, 'brand'],
      ['Every brand today has funding, a celebrity and a Blinkit listing. None of that is a differentiator anymore.', 1100, 'brand'],
      ['Netflix doesn’t call itself a family. It calls itself a sports team.', 1098, 'other'],
      ['I built my own Kanban board app, because WhatsApp messages to myself weren’t cutting it.', 1077, 'product'],
      ['Craving hit at 4 pm. I opened Blinkit and Amazon Now for nachos.', 1050, 'product'],
      ['Your last UPI payment was probably for coffee, not a TV.', 1033, 'other'],
      ['Not using AI used to get you left behind. Now using it gets you called out.', 795, 'other'],
      ['The dark store stops at the city limits.', 683, 'brand'],
      ['Recruiters are drowning in millions of AI-padded applications.', 662, 'other'],
      ['My first version of this was wrong. It said poha spikes your blood sugar by 90 mg. The real number is 19.', 560, 'product'],
      ['Fast delivery gets you an order. Is the item there when you order?', 509, 'brand'],
      ['Cancelling Netflix takes 2 steps. Cancelling Adobe takes a YouTube tutorial.', 447, 'product'],
      ['Instagram is testing videos up to 90 minutes long.', 434, 'product'],
      ['Copying data between tabs. Filling the same form twice. “Can’t an AI agent just do this?”', 428, 'other'],
      ['My ₹129 cart cost more than a ₹149 one.', 313, 'product'],
    ];
    const list = $('.reach__list', reach), more = $('[data-more]', reach), filters = $$('[data-f]', reach);
    let f = 'all', all = false;
    const draw = () => {
      const rows = posts.filter((p) => f === 'all' || p[2] === f), shown = all ? rows : rows.slice(0, 6);
      list.replaceChildren(...shown.map((p, n) => {
        const li = document.createElement('li');
        li.className = 'win';
        li.style.setProperty('--rot', [-1.2, 0.8, -0.5, 1.1, -0.9, 0.6][n % 6] + 'deg');
        li.innerHTML = '<span class="win__bar"><i></i><i></i><i></i><span>no. ' + (posts.indexOf(p) + 1) + ' of ' + posts.length + '</span><b>x</b></span><span class="reach__hook"></span><span class="reach__bar"><i></i></span><b class="fig"></b>';
        li.children[1].textContent = p[0];
        li.querySelector('.reach__bar i').style.setProperty('--w', (p[1] / posts[0][1]).toFixed(3));
        li.querySelector('.reach__bar i').style.setProperty('--n', n);
        li.children[3].textContent = p[1].toLocaleString('en-IN') + ' views';
        return li;
      }));
      more.hidden = rows.length <= 6;
      more.textContent = all ? 'show fewer' : 'show all ' + rows.length;
      if (list.classList.contains('is-in')) { list.classList.remove('is-in'); requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add('is-in'))); }
    };
    filters.forEach((b) => b.addEventListener('click', () => { f = b.dataset.f; all = false; filters.forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); }));
    more.addEventListener('click', () => { all = !all; draw(); });
    draw();
  }

  /* ================= builds: drag a card into "Ask Saksham about" ================= */
  const kan = $('[data-kan]');
  let approved = false;
  const asked = () => (kan ? $$('[data-col="ask"] .kcard', kan).map((c) => c.dataset.card) : []);
  const mail = () => {
    const a = asked();
    let subject = approved ? 'Approved for interview' : 'Hello from your portfolio';
    if (a.length) subject = (approved ? 'Approved. ' : '') + 'Tell me about ' + a.join(', ');
    $$('[data-mail]').forEach((el) => { el.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject); });
  };
  if (kan) {
    const cols = $$('[data-col]', kan), home = new Map();
    $$('.kcard', kan).forEach((c) => home.set(c, c.parentElement));
    const move = (card, col) => {
      const ask = col.dataset.col === 'ask';
      (ask ? $('.kan__list', col) : home.get(card)).append(card);
      $('[data-ask]', card).textContent = ask ? 'Put it back' : 'Ask about this';
      mail();
    };
    kan.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ask]');
      if (!b) return;
      const card = b.closest('.kcard');
      move(card, card.closest('[data-col="ask"]') ? home.get(card).closest('[data-col]') : $('[data-col="ask"]', kan));
      b.focus();
    });
    if (fine) {
      kan.classList.add('is-fine');
      let d = null;
      const colAt = (x, y) => cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
      kan.addEventListener('pointerdown', (e) => {
        const card = e.target.closest('.kcard');
        if (!card || e.target.closest('a, button[data-ask]') || e.button !== 0) return;
        d = { card, x0: e.clientX, y0: e.clientY, lx: e.clientX, on: false, id: e.pointerId };
      });
      addEventListener('pointermove', (e) => {
        if (!d || e.pointerId !== d.id) return;
        const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        if (!d.on) {
          if (Math.hypot(dx, dy) < 8) return;
          d.on = true; d.card.classList.add('is-drag');
          getSelection()?.removeAllRanges();
        }
        d.card.style.setProperty('--dx', dx + 'px');
        d.card.style.setProperty('--dy', dy + 'px');
        if (!still) d.card.style.setProperty('--ty', clamp((e.clientX - d.lx) * 1.2, -16, 16) + 'deg');
        d.lx = e.clientX;
        const over = colAt(e.clientX, e.clientY);
        cols.forEach((c) => c.classList.toggle('is-over', c === over));
      });
      const end = (e) => {
        if (!d || e.pointerId !== d.id) return;
        const { card, on } = d; d = null;
        cols.forEach((c) => c.classList.remove('is-over'));
        if (!on) return;
        card.classList.remove('is-drag');
        ['--dx', '--dy', '--ty'].forEach((p) => card.style.removeProperty(p));
        const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; card.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => card.removeEventListener('click', eat, { capture: true }), 60);
        const over = colAt(e.clientX, e.clientY);
        if (over && over !== card.closest('[data-col]')) move(card, over);
      };
      addEventListener('pointerup', end);
      addEventListener('pointercancel', end);
      kan.addEventListener('dragstart', (e) => e.preventDefault());
    }
  }
  mail();

  /* ================= the guessing game ================= */
  const game = $('[data-game]');
  if (game) {
    const rounds = [
      { a: ['Tea with biscuits', 55, '☕🍪'], b: ['Pizza', 22.5, '🍕'], note: 'Tea and biscuits beat a pizza by more than double.' },
      { a: ['An apple', 40, '🍎'], b: ['Aloo paratha', 30, '🫓🥔'], note: 'An apple outran an aloo paratha.' },
      { a: ['Day-old white rice', 18, '🍚'], b: ['Ragi roti', 38, '🫓🌾'], note: 'Rice cooked the day before stayed far below ragi roti.' },
      { a: ['Poha', 19, '🍛'], b: ['Overnight oats', 38, '🥣'], note: 'Overnight oats rose twice as far as poha.' },
      { a: ['Mango', 40, '🥭'], b: ['Mango with nuts and seeds', 16, '🥭🥜'], note: 'Same mango, eaten with nuts and seeds: 16 instead of 40.' },
    ];
    const plates = $$('[data-plate]', game), next = $('[data-next]', game), roundEl = $('[data-round]', game), scoreEl = $('[data-score]', game), dots = $$('.game__dots li', game);
    let r = 0, score = 0, open = true;
    const deal = () => {
      open = true;
      plates.forEach((p, i) => {
        const [name, num, pic] = i ? rounds[r].b : rounds[r].a;
        p.classList.remove('is-flipped', 'is-top');
        $('[data-pic]', p).textContent = pic;
        $('[data-name]', p).textContent = name;
        $('[data-bname]', p).textContent = name;
        $('[data-num]', p).textContent = '+' + num;
        $('[data-verdict]', p).textContent = '';
        $('.plate__bar i', p).style.setProperty('--w', Math.min(1, num / 60));
        p.setAttribute('aria-label', name);
      });
      dots.forEach((d, i) => d.classList.toggle('is-now', i === r));
      roundEl.textContent = 'Round ' + (r + 1) + ' of ' + rounds.length;
      next.hidden = true;
    };
    plates.forEach((p, i) => p.addEventListener('click', () => {
      if (!open) return;
      open = false;
      const hi = rounds[r].a[1] > rounds[r].b[1] ? 0 : 1, right = i === hi;
      if (right) score++;
      dots[r].classList.add(right ? 'is-right' : 'is-wrong');
      plates.forEach((q, j) => {
        const [name, num] = j ? rounds[r].b : rounds[r].a;
        q.classList.add('is-flipped');
        q.classList.toggle('is-top', j === hi);
        $('[data-verdict]', q).textContent = j === hi ? 'The bigger spike' : 'The smaller one';
        q.setAttribute('aria-label', name + ', plus ' + num + ' mg/dL');
      });
      const last = r === rounds.length - 1;
      roundEl.textContent = (right ? 'Right. ' : 'Not this time. ') + rounds[r].note;
      scoreEl.textContent = last ? 'You got ' + score + ' of ' + rounds.length + '. All 300 foods are in Spike Book.' : score + ' of ' + (r + 1) + ' so far.';
      next.textContent = last ? 'Play again' : 'Next round';
      next.hidden = false;
    }));
    next.addEventListener('click', () => {
      r = (r + 1) % rounds.length;
      if (r === 0) { score = 0; dots.forEach((d) => d.classList.remove('is-right', 'is-wrong')); }
      scoreEl.textContent = '';
      plates.forEach((p) => p.classList.remove('is-flipped'));
      setTimeout(deal, still ? 0 : 280);
      plates[0].focus();
    });
    deal();
  }


  /* ================= menu bar clock, folder letters, folder stacks ================= */
  const clock = $('[data-clock]');
  if (clock) {
    const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    tick(); setInterval(tick, 20000);
  }
  const GLYPHS = {
    s: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    a: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    k: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    h: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    m: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  };
  $$('[data-pixels]').forEach((box) => {
    const word = [...box.dataset.pixels].filter((c) => GLYPHS[c]);
    box.style.setProperty('--cols', word.length * 6 - 1);
    let n = 0;
    for (let row = 0; row < 7; row++) word.forEach((c, wi) => {
      [...GLYPHS[c][row]].forEach((bit) => { const i = document.createElement('i'); if (bit === '#') { i.className = 'on'; i.style.setProperty('--n', n++); } box.append(i); });
      if (wi < word.length - 1) box.append(document.createElement('i'));
    });
    new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { box.classList.add('is-in'); o.disconnect(); } }), { threshold: 0.3 }).observe(box);
  });
  $$('.folderstack').forEach((st, side) => {
    for (let k = 0; k < 8; k++) [0, 1].forEach((arm) => {
      const f = document.createElement('i');
      f.style.left = (arm ? 10.6 - k * 0.72 : k * 0.72) + 'em';
      f.style.top = k * 2.9 + 'em';
      const hue = side ? 70 + arm * 40 + k * 4 : 280 + arm * 40 + k * 5;
      f.style.background = 'linear-gradient(hsl(' + hue + ' 90% 80%), hsl(' + hue + ' 85% 66%))';
      st.append(f);
    });
  });

  /* ================= teardown: the bill, block by block ================= */
  $$('[data-bill]').forEach((bill) => {
    const panel = bill.closest('.tear__panel'), tip = $('[data-bill-tip]', bill), base = tip.textContent;
    const SAY = {
      milk: 'the milk itself: ₹17 on blinkit, ₹33 on amazon now.',
      delivery: 'delivery: ₹35 on blinkit, ₹30 on amazon now.',
      handling: 'handling: ₹12 on blinkit, waived on amazon now.',
      cart: 'small cart fee: ₹20 on blinkit, none on amazon now.',
    };
    const mark = (k) => {
      $$('[data-k]', panel).forEach((x) => x.classList.toggle('is-on', !!k && x.dataset.k === k));
      bill.classList.toggle('is-dim', !!k);
      tip.textContent = k ? SAY[k] : base;
    };
    panel.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-k]'); if (t) mark(t.dataset.k); });
    panel.addEventListener('pointerout', (e) => { if (!(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-k]'))) mark(); });
    panel.addEventListener('click', (e) => { const t = e.target.closest('[data-k]'); if (t) mark(t.dataset.k); });
    $('[data-bill-again]', bill)?.addEventListener('click', () => { bill.classList.remove('is-live'); void bill.offsetWidth; requestAnimationFrame(() => bill.classList.add('is-live')); });
  });

  /* ================= teardown tabs ================= */
  $$('[data-switch]').forEach((sw) => {
    const tabs = $$('[role="tab"]', sw);
    const pick = (t) => tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls'), sw).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        pick(n); n.focus();
      });
    });
  });

  /* ================= the ending: stamp the PRD ================= */
  const finale = $('[data-finale]');
  if (finale) {
    const btn = $('[data-stamp]', finale);
    $('[data-today]', finale).textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    btn.addEventListener('click', () => {
      if (approved) { location.href = $('[data-mail]', finale).href; return; }
      approved = true;
      finale.classList.add('is-stamped');
      $('[data-decision]', finale).textContent = 'Approved for interview';
      const chip = $('[data-prd-status]');
      if (chip) { chip.textContent = 'Approved'; chip.classList.add('is-ok'); }
      btn.textContent = 'Now email Saksham';
      mail();
    });
  }
})();
