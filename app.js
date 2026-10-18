/* صدى | SADA — presentation engine + scene controllers. No network, no dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const stage = $('#stage');
  const scenes = $$('.scene');
  const html = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches || html.classList.contains('reduced');
  const ar = n => n.toLocaleString('ar-SA');

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  /* ---------- per-scene timers (cleared on leave/restart) ---------- */
  let timers = [], rafs = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; rafs.forEach(cancelAnimationFrame); rafs = []; };
  const svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  /* ======================================================================
     Scene controllers: init (once), enter, step(n), leave
     ====================================================================== */
  const C = {};

  /* ---- 1. Hook: word-by-word reveal ---- */
  C.hook = {
    init(sc) {
      const q = $('#hookQ1', sc);
      const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const s = document.createElement('span'); s.className = 'word'; s.textContent = w; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else walk(n);
      });
      walk(q);
    },
    enter(sc) {
      const words = $$('.word', sc);
      words.forEach(w => { w.style.transitionDelay = '0s'; w.style.opacity = ''; });
      sc.classList.remove('active'); void sc.offsetWidth; sc.classList.add('active');
      words.forEach((w, i) => (w.style.transitionDelay = reduced() ? '0s' : `${0.25 + i * 0.11}s`));
    }
  };

  /* ---- 2. Feed: vertical video swipe + X comment flood → freeze ---- */
  const REELS = [
    { k: 'news', badge: 'عاجل', bc: '#E5484D', t: 'موجز الأخبار: أبرز أحداث اليوم في دقيقة', ch: 'قناة إخبارية', m: ['٢٤ ألف', '١٫٢ ألف', '٣٤٠'] },
    { k: 'sport', badge: 'رياضة', bc: '#22A06B', t: 'ملخص أهداف الجولة… أي هدف الأجمل؟', ch: 'قناة رياضية', m: ['٨٧ ألف', '٥٫٤ ألف', '١٫١ ألف'] },
    { k: 'talk', badge: 'لقاء خاص', bc: '#3B82F6', t: 'ضيف الحلقة يتحدث عن بداياته', ch: 'برنامج حواري', m: ['١٣ ألف', '٩٠٠', '٢١٠'] },
    { k: 'pod', badge: 'بودكاست', bc: '#8B5CF6', t: 'حلقة جديدة: كيف تغيّرت عادات المشاهدة؟', ch: 'بودكاست', m: ['٦ آلاف', '٤٣٠', '٩٥'] },
    { k: 'event', badge: 'تغطية', bc: '#F59E0B', t: 'لحظات من فعالية وطنية كبرى', ch: 'قناة عامة', m: ['٤١ ألف', '٢٫٨ ألف', '٦٠٠'] },
    { k: 'crowd', badge: 'تقرير', bc: '#06B6D4', t: 'مشاهد من التغطية الميدانية', ch: 'قناة إخبارية', m: ['١٩ ألف', '١٫٥ ألف', '٢٨٠'] },
    { k: 'news', badge: 'مباشر', bc: '#E5484D', t: 'نشرة المساء: ملفات اليوم', ch: 'قناة إخبارية', m: ['٣١ ألف', '٢ ألف', '٤٧٠'] }
  ];
  const ART = {
    news: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b78"/><stop offset="1" stop-color="#0a0f2e"/></linearGradient></defs><rect width="400" height="800" fill="url(#gn)"/><g opacity=".25" fill="#fff">${Array.from({length:8},(_,i)=>`<rect x="${i*52}" y="120" width="40" height="230" rx="4"/>`).join('')}</g><circle cx="200" cy="360" r="70" fill="#2c3a8a"/><rect x="120" y="420" width="160" height="200" rx="60" fill="#2c3a8a"/><rect x="0" y="560" width="400" height="240" fill="#0d1440"/><rect x="40" y="540" width="320" height="30" rx="6" fill="#3fd0e8" opacity=".4"/></svg>`,
    sport: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><rect width="400" height="800" fill="#0f5132"/>${Array.from({length:8},(_,i)=>`<rect y="${i*100}" width="400" height="50" fill="#13663f"/>`).join('')}<circle cx="200" cy="400" r="90" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/><line x1="0" y1="400" x2="400" y2="400" stroke="#fff" stroke-width="4" opacity=".6"/><circle cx="250" cy="330" r="22" fill="#fff"/><path d="M250 308l8 14-8 8-8-8z" fill="#222"/></svg>`,
    talk: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><rect width="400" height="800" fill="#1b1f3b"/><circle cx="200" cy="200" r="260" fill="#3b82f6" opacity=".18"/><circle cx="120" cy="360" r="46" fill="#cfd6ff" opacity=".5"/><rect x="72" y="410" width="96" height="150" rx="40" fill="#cfd6ff" opacity=".4"/><circle cx="285" cy="360" r="46" fill="#cfd6ff" opacity=".5"/><rect x="237" y="410" width="96" height="150" rx="40" fill="#cfd6ff" opacity=".4"/><rect x="40" y="560" width="320" height="18" rx="9" fill="#fff" opacity=".2"/></svg>`,
    pod: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><rect width="400" height="800" fill="#24124a"/><circle cx="200" cy="330" r="190" fill="#8b5cf6" opacity=".2"/><rect x="160" y="200" width="80" height="170" rx="40" fill="#e9e2ff"/><path d="M130 320a70 70 0 0 0 140 0" fill="none" stroke="#e9e2ff" stroke-width="10"/><rect x="195" y="390" width="10" height="70" fill="#e9e2ff"/><rect x="150" y="460" width="100" height="10" rx="5" fill="#e9e2ff"/>${Array.from({length:14},(_,i)=>`<rect x="${60+i*21}" y="${560-((i*37)%60)}" width="10" height="${30+((i*37)%60)*2}" rx="5" fill="#8b5cf6" opacity=".7"/>`).join('')}</svg>`,
    event: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><rect width="400" height="800" fill="#120c2e"/><path d="M60 0L140 520H-20z" fill="#f59e0b" opacity=".25"/><path d="M340 0L420 520H260z" fill="#3fd0e8" opacity=".22"/><path d="M200 0L280 520H120z" fill="#fff" opacity=".12"/><rect x="0" y="500" width="400" height="300" fill="#0a0720"/>${Array.from({length:40},(_,i)=>`<circle cx="${(i*53)%400}" cy="${560+((i*29)%160)}" r="14" fill="#2a2150"/>`).join('')}</svg>`,
    crowd: `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><rect width="400" height="800" fill="#0b3b4a"/><rect y="0" width="400" height="330" fill="#7cc8d8" opacity=".35"/>${Array.from({length:160},(_,i)=>`<circle cx="${(i*47)%400}" cy="${340+((i*31)%420)}" r="7" fill="#fff" opacity="${0.35+((i*13)%50)/100}"/>`).join('')}</svg>`
  };
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>'
  };
  const COMMENTS = [
    ['p', 'تغطية ممتازة وسريعة 👏'], ['n', 'الصوت ضعيف في البث اليوم'], ['q', 'متى تُعاد الحلقة؟'], ['p', 'أفضل برنامج هذا الموسم'],
    ['n', 'الإعلانات كثيرة جدًا'], ['q', 'وين أقدر أشوف الحلقة كاملة؟'], ['p', 'شكرًا على النقل المباشر'], ['m', 'رأيي مختلف، التحليل كان سطحي'],
    ['q', 'هل في ترجمة للحلقة؟'], ['p', 'المذيع رائع 🔥'], ['n', 'المقطع مقصوص بشكل غريب'], ['m', 'نبي تغطية أكثر للدوري'],
    ['p', 'محتوى يستاهل المتابعة'], ['q', 'ليش ما نزل المقطع على يوتيوب؟'], ['n', 'التوقيت غير مناسب أبدًا'], ['p', 'فخورين بهالمستوى 🇸🇦'],
    ['m', 'نفس الخبر منشور في ثلاث حسابات'], ['q', 'كم مدة البرنامج؟'], ['p', 'أخيرًا بودكاست بهالجودة'], ['n', 'ما وصلني إشعار البث'],
    ['p', 'التقرير الميداني ممتاز'], ['q', 'من هو ضيف الحلقة الجاية؟'], ['m', 'العنوان ما يعكس المحتوى'], ['p', 'رجعتوا لنا ذكريات جميلة'],
    ['n', 'الجودة تتقطع'], ['q', 'هل فيه نسخة صوتية؟'], ['p', 'استمروا 💚'], ['m', 'أتمنى تكون المقاطع أقصر']
  ];
  const SNT = { p: '#22A06B', n: '#E5484D', q: '#3B82F6', m: '#F59E0B' };
  const AV = ['#7c8cff', '#ff9f7c', '#5fd1b3', '#f7c85f', '#c78bff', '#6fb7ff'];

  C.feed = {
    init(sc) {
      $('#reelTrack').innerHTML = REELS.map((r, i) => `
        <div class="reel" style="top:${i * 100}%">
          <div class="art">${ART[r.k]}</div><div class="bar"></div>
          <div class="lower"><b style="background:${r.bc}">${r.badge}</b><p>${r.t}</p><small>${r.ch} · محتوى توضيحي</small></div>
          <div class="rail"><div>${ICON.heart}${r.m[0]}</div><div>${ICON.chat}${r.m[2]}</div><div>${ICON.eye}${r.m[1]}</div></div>
          <div class="prog"></div>
        </div>`).join('');
      $$('[data-act]', sc).forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        if (b.dataset.act === 'replay') { clearTimers(); this.reset(sc); this.run(sc); }
        else this.freeze(sc, true);
      }));
    },
    reset(sc) {
      sc.classList.remove('frozen');
      $('#reelTrack').style.transform = 'translateY(0)';
      $$('.reel', sc).forEach(r => r.classList.remove('playing'));
      $('#xLayer').innerHTML = '';
      $$('.counter-pill', sc).forEach(p => p.classList.remove('in'));
    },
    card(i) {
      const [s, txt] = COMMENTS[i % COMMENTS.length];
      const el = document.createElement('div');
      el.className = 'xcard' + (i % 3 === 1 ? ' dark' : '');
      const left = i % 2 === 0;
      const x = left ? 50 + Math.random() * 600 : 1240 + Math.random() * 230;
      const y = 110 + Math.random() * 760;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.transform += ` rotate(${(Math.random() - .5) * 6}deg)`;
      const likes = Math.floor(Math.random() * 900) + 3;
      el.innerHTML = `<span class="snt" style="background:${SNT[s]}"></span>
        <header><i style="background:${AV[i % AV.length]}"></i><b>مستخدم ${ar(i + 1)}</b><span>· الآن</span></header>
        ${txt}<footer><span>♡ ${likes}</span><span>↻ ${Math.floor(likes / 7)}</span><span>💬 ${Math.floor(likes / 12)}</span></footer>`;
      $('#xLayer').appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); el.style.transform = `rotate(${(Math.random() - .5) * 5}deg)`; }));
    },
    run(sc) {
      if (reduced()) { for (let i = 0; i < 16; i++) this.card(i); $$('.counter-pill', sc).forEach(p => p.classList.add('in')); return this.freeze(sc); }
      const reels = $$('.reel', sc), track = $('#reelTrack'), hint = $('#swipeHint');
      const swipeAt = [0, 1500, 2700, 3700, 4500, 5150, 5700];
      swipeAt.forEach((t, i) => later(() => {
        track.style.transitionDuration = i > 3 ? '.35s' : '.55s';
        track.style.transform = `translateY(-${i * 100}%)`;
        reels.forEach(r => r.classList.remove('playing')); reels[i].classList.add('playing');
        if (i) { hint.classList.remove('go'); void hint.offsetWidth; hint.classList.add('go'); }
      }, t));
      let t = 2400, gap = 420;
      for (let i = 0; i < 34; i++) { later(() => this.card(i), t); t += gap; gap = Math.max(95, gap * 0.9); }
      later(() => $('#cp1').classList.add('in'), 3600);
      later(() => $('#cp2').classList.add('in'), 5200);
      later(() => this.freeze(sc), 10200);
    },
    freeze(sc, fill) {
      if (fill && $$('.xcard').length < 16) for (let i = $$('.xcard').length; i < 18; i++) this.card(i);
      clearTimers(); sc.classList.add('frozen'); C.feed.frozen = true;
    },
    enter(sc) { this.reset(sc); this.run(sc); },
    step(sc, s) { if (s >= 1) this.freeze(sc, true); else if (sc.classList.contains('frozen') && s === 0) { /* stay frozen when stepping back */ } }
  };

  /* ---- 3. Tree: SBA ecosystem from backend/sba_channels.py ---- */
  const CHANNELS = [
    { key: 'sba', name: 'حساب الهيئة', p: ['yt', 'x'] },
    { key: 'saudiya', name: 'السعودية', p: ['yt', 'x', 'ig'] },
    { key: 'ekhbariya', name: 'الإخبارية', p: ['yt', 'x'] },
    { key: 'sbc', name: 'SBC', p: ['yt', 'x', 'ig'] },
    { key: 'riyadiya', name: 'الرياضية', p: ['yt', 'x'] },
    { key: 'quran_tv', name: 'القرآن الكريم', p: ['yt'] },
    { key: 'sunnah_tv', name: 'السنة النبوية', p: ['yt'] },
    { key: 'thikrayat', name: 'ذكريات', p: ['yt'] },
    { key: 'quran_radio', name: 'إذاعة القرآن', p: ['yt'] }
  ];
  const PCLS = { yt: 'live', x: 'part', ig: 'pend' };
  const PGLYPH = {
    yt: '<path d="M-11 -7h22a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-22a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" opacity=".9"/><path d="M-3 -4l7 4-7 4z" fill="#0F1E5F"/>',
    x: '<text x="0" y="1" font-size="20" font-weight="700" font-family="Play" text-anchor="middle" dominant-baseline="central">X</text>',
    ig: '<rect x="-10" y="-10" width="20" height="20" rx="6" fill="none" stroke="#F8F8F8" stroke-width="2.4"/><circle r="4.5" fill="none" stroke="#F8F8F8" stroke-width="2.4"/>'
  };
  const tryImg = (src, ok) => { const im = new Image(); im.onload = () => ok(im); im.src = src; };

  C.tree = {
    init(sc) {
      const root = $('#tree', sc);
      root.innerHTML = `<defs><linearGradient id="rootGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3196"/><stop offset="1" stop-color="#0b175a"/></linearGradient>
        <radialGradient id="rg"><stop offset="0" stop-color="#3FD0E8" stop-opacity=".35"/><stop offset="1" stop-color="#3FD0E8" stop-opacity="0"/></radialGradient></defs>`;
      const cam = svg('g', { class: 'cam' }, root);
      const L = [svg('g', {}, cam), svg('g', {}, cam), svg('g', {}, cam), svg('g', {}, cam)];   // links per level
      const N = [svg('g', {}, cam), svg('g', {}, cam), svg('g', {}, cam), svg('g', {}, cam), svg('g', {}, cam)]; // nodes per level
      this.L = L; this.N = N; this.cam = cam;
      const link = (lv, x1, y1, x2, y2, cls) => {
        const my = (y1 + y2) / 2;
        return svg('path', { class: `tlink ${cls || ''}`, d: `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`, 'data-lv': lv }, L[lv - 1]);
      };
      // root
      const R = { x: 960, y: 200 };
      svg('circle', { cx: R.x, cy: R.y, r: 230, fill: 'url(#rg)' }, N[0]);
      const node = (parent, x, y, cls, lv, delay) => svg('g', { class: `${cls} tnode`, 'data-lv': lv, style: `transition-delay:${delay}ms` }, svg('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, parent));
      const rg = svg('g', { class: 'tn root tnode on' }, svg('g', { transform: `translate(${R.x} ${R.y})` }, N[0]));
      svg('rect', { x: -190, y: -52, width: 380, height: 104, rx: 22 }, rg);
      const rt = svg('text', { 'font-size': 30 }, rg); rt.textContent = 'هيئة الإذاعة والتلفزيون';
      tryImg('assets/logos/sba.png', im => { rt.remove(); svg('image', { href: im.src, x: -170, y: -40, width: 340, height: 80, preserveAspectRatio: 'xMidYMid meet' }, rg); });
      // channels (RTL: first on the right)
      CHANNELS.forEach((c, i) => {
        const cx = 1780 - i * 205, cy = 380;
        link(1, R.x, R.y + 52, cx, cy - 32);
        const g = node(N[1], cx, cy, 'tn', 1, i * 70);
        svg('rect', { x: -86, y: -32, width: 172, height: 64, rx: 16 }, g);
        const t = svg('text', { 'font-size': 22 }, g); t.textContent = c.name;
        tryImg(`assets/logos/channels/${c.key}.png`, im => { t.remove(); svg('image', { href: im.src, x: -74, y: -26, width: 148, height: 52, preserveAspectRatio: 'xMidYMid meet' }, g); });
        // platform chips
        c.p.forEach((p, j) => {
          const px = cx + (j - (c.p.length - 1) / 2) * 58, py = 520;
          link(2, cx, cy + 32, px, py - 24);
          const pg = node(N[2], px, py, `pchip ${PCLS[p]}`, 2, (i * 3 + j) * 35);
          svg('circle', { r: 24 }, pg); pg.insertAdjacentHTML('beforeend', PGLYPH[p]);
          // content tiles
          for (let k = 0; k < 3; k++) {
            const tx = px + (k - 1) * 18, ty = 640;
            link(3, px, py + 24, tx, ty - 12, 'l3');
            const tg = node(N[3], tx, ty, '', 3, Math.random() * 600);
            svg('rect', { class: 'ctile', x: -7, y: -12, width: 14, height: 24, rx: 3 }, tg);
            // interactions
            for (let d = 0; d < 9; d++) {
              const dx = tx + (Math.random() - .5) * 46, dy = 700 + Math.random() * 200;
              if (d < 2) link(4, tx, ty + 12, dx, dy, 'l4');
              const col = ['#8DE88A', '#3FD0E8', '#F8F8F8', '#FF6B7A', '#FFC857'][Math.floor(Math.random() * 5)];
              const dg = node(N[4], dx, dy, '', 4, Math.random() * 1400);
              svg('circle', { class: 'idot', r: (1.6 + Math.random() * 2.6).toFixed(1), fill: col, opacity: (0.45 + Math.random() * .5).toFixed(2) }, dg);
            }
          }
        });
      });
      // dash lengths for draw-on
      requestAnimationFrame(() => $$('.tlink', root).forEach(p => p.style.setProperty('--len', Math.ceil(p.getTotalLength()))));
    },
    step(sc, s) {
      const lv = Math.min(s, 4);
      $$('[data-lv]', $('#tree', sc)).forEach(e => e.classList.toggle('on', +e.dataset.lv <= lv));
      $$('.tree-level-tag .tag', sc).forEach(t => t.classList.toggle('cur', +t.dataset.lv === lv));
      const cams = ['translate(0px,170px) scale(1.28)', 'translate(0px,60px) scale(1.08)', 'translate(0px,20px) scale(1)', 'scale(.97)', 'scale(.97)', 'scale(.97)'];
      this.cam.style.transform = cams[s];
      this.cam.style.filter = s >= 5 ? 'blur(2px)' : '';
    },
    enter(sc) { this.step(sc, State.step); }
  };

  /* ---- 4. Reveal: chaos converges into SADA ---- */
  C.reveal = {
    init() { this.ctx = $('#revealCanvas').getContext('2d'); },
    enter(sc) {
      sc.classList.remove('lit', 'up');
      const ctx = this.ctx, W = 1920, H = 1080, cx = 960, cy = 245;
      const cols = ['#8DE88A', '#3FD0E8', '#F8F8F8', '#3B82F6', '#FFC857', '#FF6B7A'];
      const P = Array.from({ length: 460 }, (_, i) => {
        const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 120;
        return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6,
          tx: cx + Math.cos(a) * r * 1.6, ty: cy + Math.sin(a) * r * .55, a, r, s: 1 + Math.random() * 2.6, c: cols[i % cols.length] };
      });
      const t0 = performance.now();
      if (reduced()) { sc.classList.add('lit'); this.draw(P, 1, 0); return; }
      const loop = now => {
        const t = (now - t0) / 1000;
        const k = Math.min(1, Math.max(0, (t - 1.1) / 1.8)), e = 1 - Math.pow(1 - k, 3);
        if (t > 2.6 && !sc.classList.contains('lit')) sc.classList.add('lit');
        P.forEach(p => {
          if (k === 0) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
          else { p.a += 0.0025; const tx = cx + Math.cos(p.a) * p.r * 1.6, ty = cy + Math.sin(p.a) * p.r * .55; p.x += (tx - p.x) * (0.04 + e * .1); p.y += (ty - p.y) * (0.04 + e * .1); }
        });
        this.draw(P, e, t);
        rafs.push(requestAnimationFrame(loop));
      };
      rafs.push(requestAnimationFrame(loop));
    },
    draw(P, e, t) {
      const ctx = this.ctx; ctx.clearRect(0, 0, 1920, 1080);
      P.forEach(p => { ctx.globalAlpha = 0.85 - e * 0.55; ctx.fillStyle = e > .6 ? (p.c === '#FF6B7A' || p.c === '#FFC857' ? '#3FD0E8' : p.c) : p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
    },
    step(sc, s) { sc.classList.toggle('up', s >= 1); if (s >= 1) sc.classList.add('lit'); }
  };

  /* ---- 5. Data: counters ---- */
  C.data = {
    enter(sc) {
      $$('[data-count]', sc).forEach(el => {
        const to = +el.dataset.count, plus = el.dataset.plus ? '+' : '';
        const fmt = v => Math.round(v).toLocaleString('en-US') + plus;
        if (reduced()) { el.textContent = fmt(to); return; }
        const t0 = performance.now(), d = 1800;
        const tick = now => { const k = Math.min(1, (now - t0) / d); el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))); if (k < 1) rafs.push(requestAnimationFrame(tick)); };
        el.textContent = fmt(0); rafs.push(requestAnimationFrame(tick));
      });
    }
  };

  /* ---- 6. Agent 1: real best-time heatmap (data/best_times.js, exported from Sada's analytics API) ---- */
  const DAYS = [['sun', 'الأحد'], ['mon', 'الاثنين'], ['tue', 'الثلاثاء'], ['wed', 'الأربعاء'], ['thu', 'الخميس'], ['fri', 'الجمعة'], ['sat', 'السبت']];
  const MIN_N = 10; // cells with fewer posts are shown as "not enough data", never coloured
  C.a1 = {
    init() {
      const bt = window.SADA_BEST_TIMES || { cells: [] };
      this.map = new Map(bt.cells.map(([d, h, v, n]) => [`${d}-${h}`, { v, n }]));
      const ok = bt.cells.filter(c => c[3] >= MIN_N).sort((a, b) => b[2] - a[2]);
      this.top = ok.slice(0, 2).map(c => `${c[0]}-${c[1]}`);
      const best = ok[0];
      const h = $('#heat'); let s = '';
      DAYS.forEach(([k, d]) => { s += `<div class="hl">${d}</div>`; for (let c = 0; c < 24; c++) s += `<div class="c" data-k="${k}-${c}"></div>`; });
      s += '<div></div>' + Array.from({ length: 24 }, (_, c) => `<div class="hx">${c % 3 === 0 ? c : ''}</div>`).join('');
      h.innerHTML = s;
      if (best) {
        const dn = DAYS.find(d => d[0] === best[0])[1];
        $('#heatTop').innerHTML = `الأعلى: <b style="color:var(--green)">${dn} ${best[1]}:00 ← ${best[2].toFixed(1)}× المعتاد</b> <span class="en" style="color:var(--muted);font-size:17px">(median, n=${best[3]})</span>`;
      }
    },
    colour(v) { const t = Math.max(0, Math.min(1, (Math.log2(v) + 1) / 3.6)); return `rgba(141,232,138,${(0.05 + t * 0.85).toFixed(2)})`; },
    enter(sc) {
      const cells = $$('#heat .c'); $('#heatTop').style.opacity = 0;
      cells.forEach(c => { c.classList.remove('hot', 'na'); c.style.background = 'rgba(141,232,138,.05)'; });
      const paint = c => { const m = this.map.get(c.dataset.k); if (!m || m.n < MIN_N) c.classList.add('na'); else c.style.background = this.colour(m.v); };
      const settle = () => { cells.forEach(c => c.classList.toggle('hot', this.top.includes(c.dataset.k))); $('#heatTop').style.opacity = 1; };
      if (reduced()) { cells.forEach(paint); return settle(); }
      cells.forEach(c => { const col = +c.dataset.k.split('-')[1]; later(() => paint(c), 300 + (23 - col) * 45 + Math.random() * 120); });
      later(settle, 1900);
    }
  };

  /* ---- 8. Agent 3: draw lines ---- */
  C.a3 = { enter(sc) { const b = $('.bars', sc); b.classList.remove('on'); if (reduced()) b.classList.add('on'); else later(() => b.classList.add('on'), 250); } };

  /* ---- 8b. Agent 07: audience — real comments sorted into intent buckets (counts from Sada's audience view) ---- */
  const AUD_B = [
    ['event', 'تفاعل مع الحدث نفسه', 1991, '#B9A6FF'], ['other', 'أخرى', 284, 'rgba(248,248,248,.55)'],
    ['crit', 'انتقاد وملاحظات', 109, 'var(--red)'], ['praise', 'إشادة وثناء', 78, 'var(--green)'],
    ['q', 'أسئلة واستفسارات', 44, 'var(--amber)'], ['req', 'طلبات واقتراحات', 34, 'var(--cyan)']
  ];
  const AUD_C = [
    { t: '«حفظ الله المملكة حكومةً وأرضًا وشعبًا»', s: 'قناة الإخبارية · يوتيوب', m: 'محايد', b: 'event' },
    { t: '«صوتها قوي فعلًا»', s: 'قناة SBC · إنستغرام', m: 'إيجابي', b: 'praise' },
    { t: '«عندما ينعدم المحتوى وتتصدر هؤلاء…»', s: 'قناة SBC · يوتيوب', m: 'سلبي', b: 'crit' },
    { t: '«في رمضان الجاي أي جزء من بابا فرحان تعرضون؟»', s: 'قناة ذكريات · يوتيوب', m: 'محايد', b: 'q' },
    { t: '«ياليت لو يطرحون أسئلة عن البنوك الربوية…»', s: 'قناة السعودية · إنستغرام', m: 'محايد', b: 'req' }
  ];
  C.aud = {
    init(sc) {
      const total = AUD_B.reduce((a, b) => a + b[2], 0);
      $('#audBuckets', sc).insertAdjacentHTML('beforeend', AUD_B.map(([k, l, n, c]) => {
        const p = Math.round(n / total * 100);
        return `<div class="ab" data-b="${k}" style="--bc:${c}"><span class="t">${l}</span><span class="bt"><i style="--w:${Math.max(1.5, n / total * 100)}%"></i></span><span class="v"><b data-to="${n}">0</b> · ${p}%</span></div>`;
      }).join(''));
    },
    show(sc, i) {
      const c = AUD_C[i % AUD_C.length], box = $('#audCmt', sc), b = AUD_B.find(x => x[0] === c.b);
      box.className = 'aud-cmt'; void box.offsetWidth;
      $('p', box).textContent = c.t; $('small', box).textContent = c.s;
      $('.aud-cls', box).innerHTML = `<span class="tag">المشاعر: ${c.m}</span><span class="tag" style="--bc:${b[3]}">${b[1]}</span>`;
      box.classList.add('in');
      if (reduced()) { box.classList.add('cls'); return; }
      later(() => box.classList.add('cls'), 700);
      later(() => {
        box.classList.add('fly');
        const row = $(`.ab[data-b="${c.b}"]`, sc); row.classList.remove('ping'); void row.offsetWidth; row.classList.add('ping');
      }, 1900);
      later(() => this.show(sc, i + 1), 2500);
    },
    enter(sc) {
      const nums = $$('.ab b', sc), bars = $$('.ab i', sc);
      bars.forEach(b => b.classList.remove('on'));
      const fmt = v => Math.round(v).toLocaleString('en-US');
      if (reduced()) { nums.forEach(n => (n.textContent = fmt(+n.dataset.to))); bars.forEach(b => b.classList.add('on')); }
      else {
        later(() => bars.forEach(b => b.classList.add('on')), 200);
        this.count(nums, el => +el.dataset.to, 4200);
      }
      this.show(sc, 0);
    },
    count(els, to, d) {
      const fmt = v => Math.round(v).toLocaleString('en-US'), t0 = performance.now();
      const tick = now => { const k = Math.max(0, Math.min(1, (now - t0) / d)), e = 1 - Math.pow(1 - k, 3); els.forEach(el => (el.textContent = fmt(to(el) * e))); if (k < 1) rafs.push(requestAnimationFrame(tick)); };
      els.forEach(el => (el.textContent = '0')); rafs.push(requestAnimationFrame(tick));
    },
    step(sc, s) {
      if (s !== 1) return;
      const els = $$('[data-count]', sc);
      if (reduced()) els.forEach(el => (el.textContent = (+el.dataset.count).toLocaleString('en-US')));
      else this.count(els, el => +el.dataset.count, 1600);
    }
  };

  /* ---- 9. Agent 4: broadcast signal + scanning spike detector ---- */
  C.a4 = {
    init() {
      const g = $('#sigSvg'); const n = 120; const pts = []; let seed = 7;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < n; i++) {
        const x = 900 - i * (900 / (n - 1));
        let v = 95 + (rnd() - .5) * 26 + Math.sin(i / 6) * 6;
        if (i >= 52 && i <= 64) v -= Math.sin(((i - 52) / 12) * Math.PI) * 78;
        pts.push(`${x.toFixed(1)},${v.toFixed(1)}`);
      }
      g.innerHTML = `<line x1="0" y1="96" x2="900" y2="96" stroke="rgba(248,248,248,.25)" stroke-dasharray="6 6"/>
        <text x="895" y="122" fill="rgba(248,248,248,.5)" font-size="15" text-anchor="start">الخط الأساسي</text>
        <polyline class="drawline" points="${pts.join(' ')}" fill="none" stroke="#B9A6FF" stroke-width="3.5" stroke-linejoin="round"/>
        <circle id="spikeDot" cx="450" cy="18" r="0" fill="#8DE88A"/>`;
    },
    enter(sc) {
      const line = $('#sigSvg .drawline'), scan = $('#scan'), dot = $('#spikeDot'), seg = $('#hitSeg');
      line.classList.remove('on'); seg.classList.remove('hit'); dot.setAttribute('r', 0);
      scan.style.transition = 'none'; scan.style.left = 'calc(100% - 26px)'; scan.style.opacity = 0;
      const done = () => { seg.classList.add('hit'); dot.setAttribute('r', 9); };
      if (reduced()) { line.classList.add('on'); return done(); }
      later(() => { line.classList.add('on'); scan.style.opacity = 1; scan.style.transition = 'left 2.2s linear'; scan.style.left = '50%'; }, 150);
      later(() => { done(); scan.style.opacity = 0; }, 2450);
    }
  };

  /* ---- 10. Integration diagram (relationships verified in code) ---- */
  C.integ = {
    init(sc) {
      const s = $('#integ', sc);
      const box = (x, y, w, h, label, sub, cls, step) => {
        const g = svg('g', { class: `ib ${cls || ''}`, transform: `translate(${x} ${y})`, 'data-st': step }, s);
        svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14 }, g);
        const t = svg('text', { y: sub ? -11 : 0, 'font-size': 21, 'font-weight': 700 }, g); t.textContent = label;
        if (sub) { const u = svg('text', { class: 'sub', y: 15 }, g); u.textContent = sub; }
        return { x, y, w, h };
      };
      const ln = (a, b, cls, step, flow) => {
        const x1 = a.x - a.w / 2, x2 = b.x + b.w / 2, mx = (x1 + x2) / 2;
        svg('path', { class: `il ${cls} ${flow ? 'flow' : ''}`, d: `M${x1} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${x2} ${b.y}`, 'data-st': step }, s);
      };
      const lines = svg('g', {}, s); // keep links under boxes
      const srcs = [['YouTube Data API', 'رسمي · 9 قنوات'], ['X API v2', 'حسابات متحقق منها'], ['Instagram Graph API', 'قيد الإعداد'], ['بيانات مفتوحة', 'حج 1445 · بودكاست']]
        .map((v, i) => box(1610, 140 + i * 95, 270, 74, v[0], v[1], '', 0));
      const col = box(1255, 282, 270, 110, 'وكيل جمع البيانات', 'كل 30 دقيقة · ضمن الحصة', 'ag', 0);
      const db = box(900, 200, 270, 110, 'قاعدة بيانات موحّدة', 'Postgres / SQLite', 'db', 0);
      const store = box(900, 420, 270, 80, 'مخزن الأنماط', 'Pattern store', 'db', 1);
      const mock = box(900, 575, 270, 64, 'إشارة بث تجريبية', 'broadcast_mock', '', 1);
      const ag = [['تحليل السلوك', 1, 'core'], ['تحسين المحتوى', 1, 'core'], ['التشخيص والتوصيات', 1, 'core'], ['رصد لحظات البث · محاكاة', 1, 'core'],
        ['التنبؤ والرائج', 1, ''], ['التنبيهات (ارتفاع/انخفاض)', 1, ''], ['تحليل الجمهور', 1, '']]
        .map((v, i) => box(520, 50 + i * 82, 320, 62, v[0], '', `ag ${v[2]}`, 1));
      const ui = box(120, 300, 210, 300, 'الواجهة الموحّدة', 'FastAPI + React', 'ui', 2);
      s.appendChild(lines); s.insertBefore(lines, s.firstChild);
      const into = el => { lines.appendChild(s.lastChild); };
      srcs.forEach(a => { ln(a, col, 'data', 0, true); into(); });
      ln(col, db, 'data', 0, true); into();
      [0, 1, 2, 4, 5, 6].forEach(i => { ln(db, ag[i], 'data', 1); into(); });
      ln(mock, ag[3], 'ui', 1); into();
      // Behavior writes the store; Optimizer + Diagnostic call load_store()
      ln(store, ag[0], 'call', 1, true); into();
      ln(store, ag[1], 'call', 1, true); into();
      ln(store, ag[2], 'call', 1, true); into();
      ag.forEach(a => { ln(a, ui, 'data', 2); into(); });
      // alerts → diagnosis happens through the UI (click an alert)
      const a5 = ag[5], a2 = ag[2];
      svg('path', { class: 'il ui flow', d: `M${a5.x - 160} ${a5.y} C${a5.x - 230} ${a5.y} ${a2.x - 230} ${a2.y} ${a2.x - 160} ${a2.y}`, 'data-st': 2 }, lines);
      this.s = s;
    },
    step(sc, st) { $$('[data-st]', this.s).forEach(e => { e.style.transition = 'opacity .7s'; e.style.opacity = +e.dataset.st <= st ? 1 : 0; }); },
    enter(sc) { this.step(sc, State.step); }
  };

  /* ---- 11. Prototype journey ---- */
  C.proto = {
    init(sc) { $$('.shot img', sc).forEach(im => { im.onerror = () => im.parentElement.classList.add('missing'); if (im.complete && !im.naturalWidth) im.parentElement.classList.add('missing'); }); },
    step(sc, s) {
      $$('.shot', sc).forEach((e, i) => e.classList.toggle('on', i === s));
      $$('.jstep', sc).forEach((e, i) => { e.classList.toggle('cur', i === s); e.classList.toggle('past', i < s); });
    },
    enter(sc) { this.step(sc, State.step); }
  };

  /* ---- 12. Scale rings ---- */
  C.scale = { step(sc, s) { $$('[data-ring]', sc).forEach(r => r.classList.toggle('on', +r.dataset.ring <= s)); }, enter(sc) { this.step(sc, State.step); } };

  /* ======================================================================
     Engine
     ====================================================================== */
  const State = { idx: 0, step: 0, started: 0, sceneStart: 0 };
  const maxStep = sc => +(sc.dataset.steps || 0);
  const ctl = sc => C[sc.dataset.id] || {};
  scenes.forEach(sc => ctl(sc).init && ctl(sc).init(sc));

  const prog = $('#progress');
  prog.innerHTML = scenes.map(sc => `<i class="${sc.dataset.appendix ? 'apx' : ''}"></i>`).join('');

  function applySteps(sc, s) {
    $$('[data-step]', sc).forEach(e => e.classList.toggle('on', +e.dataset.step <= s));
    ctl(sc).step && ctl(sc).step(sc, s);
  }

  function show(idx, step = 0, restart = true) {
    idx = Math.max(0, Math.min(scenes.length - 1, idx));
    const prev = scenes[State.idx], sc = scenes[idx];
    if (prev !== sc || restart) { clearTimers(); ctl(prev).leave && ctl(prev).leave(prev); }
    if (prev !== sc) { prev.classList.remove('active'); }
    State.idx = idx; State.step = step; State.sceneStart = performance.now();
    sc.classList.add('active');
    applySteps(sc, step);
    if (restart) ctl(sc).enter && ctl(sc).enter(sc);
    if (step) applySteps(sc, step);
    $$('i', prog).forEach((d, i) => { d.classList.toggle('now', i === idx); d.classList.toggle('done', i < idx); });
    try { history.replaceState(null, '', `#${idx + 1}`); } catch (e) { /* sandboxed viewer */ }
    renderNotes(); hud();
  }

  function next() {
    if (!State.started) State.started = performance.now();
    const sc = scenes[State.idx];
    if (State.step < maxStep(sc)) { State.step++; applySteps(sc, State.step); hud(); renderNotes(); }
    else if (State.idx < scenes.length - 1) show(State.idx + 1, 0);
  }
  function prev() {
    const sc = scenes[State.idx];
    if (State.step > 0) { State.step--; applySteps(sc, State.step); hud(); }
    else if (State.idx > 0) { const p = scenes[State.idx - 1]; show(State.idx - 1, maxStep(p)); }
  }

  /* ---------- HUD (timer) & notes ---------- */
  const hudEl = $('#hud'), notesEl = $('#notes');
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function hud() {
    if (!hudEl.classList.contains('show')) return;
    const sc = scenes[State.idx], now = performance.now();
    const total = State.started ? now - State.started : 0;
    const budget = scenes.slice(0, State.idx + 1).reduce((a, s) => a + (+s.dataset.target || 0), 0);
    const se = now - State.sceneStart, tgt = (+sc.dataset.target || 0) * 1000;
    hudEl.innerHTML = `Total <b class="${total > 300000 ? 'over' : ''}">${mmss(total)}</b> / 5:00 · Plan by end of scene ${mmss(budget * 1000)}<br>Scene ${State.idx + 1}/${scenes.length} · step ${State.step}/${maxStep(sc)} · <span class="${tgt && se > tgt ? 'over' : ''}">${mmss(se)}</span> / ${mmss(tgt)}`;
  }
  setInterval(hud, 500);
  function renderNotes() { const n = $('.notes', scenes[State.idx]); notesEl.innerHTML = n ? `${State.idx + 1}. ${n.innerHTML}` : ''; }

  /* ---------- input ---------- */
  const toggleFS = () => (document.fullscreenElement ? document.exitFullscreen() : html.requestFullscreen()).catch(() => {});
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // RTL deck: the left arrow moves forward (reading direction), the right arrow moves back.
    if (['ArrowLeft', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowRight', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(scenes.findIndex(s => s.dataset.id === 'close'));
    else if (k === 'r' || k === 'R') show(State.idx, 0, true);
    else if (k === 'f' || k === 'F') toggleFS();
    else if (k === 't' || k === 'T') { hudEl.classList.toggle('show'); hud(); }
    else if (k === 'n' || k === 'N') notesEl.classList.toggle('show');
    else if (k === 'm' || k === 'M') { html.classList.toggle('reduced'); show(State.idx, State.step, true); }
    else if (k === '?' || k === 'h' || k === 'H') $('#help').classList.toggle('show');
    else if (k === 'Escape') { $('#help').classList.remove('show'); notesEl.classList.remove('show'); }
    else if (/^[1-9]$/.test(k)) show(+k - 1);
  });
  $('#help').addEventListener('click', () => $('#help').classList.remove('show'));
  $$('#nav button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = b.dataset.nav; a === 'next' ? next() : a === 'prev' ? prev() : toggleFS(); }));
  // clicks on the stage advance (except on controls)
  stage.addEventListener('click', e => { if (!e.target.closest('button')) next(); });

  /* ---------- preload every image so nothing pops in mid-talk ---------- */
  const imgs = new Set($$('img').map(i => i.getAttribute('src')));
  imgs.forEach(src => { const im = new Image(); im.src = src; });

  const start = Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1);
  scenes.forEach(s => s.classList.remove('active'));
  State.idx = start;
  show(start, 0);
  window.SADA = { show, next, prev, State };
})();
