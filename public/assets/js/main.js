(() => {
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const links = [...document.querySelectorAll('.nav-links a')];

  /* every section, not just the linked ones, so a section without a nav
     entry still clears the highlight rather than leaving the one above lit */
  const sections = [...document.querySelectorAll('section[id]')];

  /* the section links only light up on the homepage, where those sections live */
  const onHome = location.pathname === '/' || location.pathname === '/index.html';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setActive = () => {
    const mark = window.scrollY + window.innerHeight * 0.35;
    let current = null;
    for (const s of sections) {
      if (s.getBoundingClientRect().top + window.scrollY <= mark) current = s;
    }
    for (const l of links) {
      l.classList.toggle('active', onHome && current !== null && l.getAttribute('href').endsWith('#' + current.id));
    }
  };

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    setActive();
  };

  let ticking = false;
  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  };

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  window.addEventListener('load', requestTick);
  onScroll();

  /* mobile menu */
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }));
  }

  /* slideshow: without JS the first slide stays put and the dots do nothing.
     data-static marks a reel that should not rotate on a timer, because the
     thing it holds is meant to be read rather than glanced at */
  document.querySelectorAll('[data-slideshow]').forEach(box => {
    const slides = [...box.querySelectorAll('.slide')];
    const dots = [...box.querySelectorAll('.dot')];
    if (slides.length < 2 || dots.length !== slides.length) return;

    const auto = !box.hasAttribute('data-static');
    let i = 0, timer = null;

    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        /* a faded-out slide is still hit-testable and still in the tab order,
           so take it out of both rather than leave an invisible target */
        s.toggleAttribute('inert', k !== i);
        const v = s.querySelector('video');
        if (!v) return;
        if (k === i && !reduceMotion) v.play().catch(() => {});
        else v.pause();
      });
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-selected', String(k === i));
      });
      /* a reel whose caption sits under the frame rather than on the slide */
      const cap = box.querySelector('.slide-caption');
      if (cap) cap.textContent = slides[i].dataset.caption || '';
    };

    /* a slide carrying a clip holds the reel rather than rotating away
       mid-play; the dots still move the visitor on */
    const advance = () => { if (!slides[i].querySelector('video')) show(i + 1); };

    const start = () => {
      if (reduceMotion || !auto) return;
      stop();
      timer = setInterval(advance, 4200);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    dots.forEach((d, k) => d.addEventListener('click', () => { show(k); start(); }));
    box.addEventListener('mouseenter', stop);
    box.addEventListener('mouseleave', start);
    box.addEventListener('focusin', stop);
    box.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    /* swipe. a drag shorter than the threshold, or one that is mostly vertical,
       is left to the page; a real horizontal drag moves the reel and swallows
       the click it would otherwise fire on a slide link */
    const SWIPE = 40;
    let x0 = 0, y0 = 0, dragging = false, ate = false;
    box.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });
    box.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return;
      ate = true;
      setTimeout(() => { ate = false; }, 350);
      show(i + (dx < 0 ? 1 : -1));
      start();
    }, { passive: true });
    box.addEventListener('click', e => {
      if (!ate) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    show(0);
    start();
  });

  /* project-page clips. Each runs only while it is on screen, which stops
     three of them from loading at once behind a visitor who is still reading
     the top of the page, and each carries its own stop control. */
  const clips = [...document.querySelectorAll('[data-clip]')];
  if (clips.length) {
    const sync = (clip, playing) => {
      const btn = clip.querySelector('.clip-toggle');
      if (!btn) return;
      btn.dataset.state = playing ? 'playing' : 'paused';
      btn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    };

    clips.forEach(clip => {
      const v = clip.querySelector('video');
      const btn = clip.querySelector('.clip-toggle');
      if (!v) return;

      /* a clip that starts itself is exactly what reduced motion is asking us
         not to do, so leave it parked on its poster */
      if (reduceMotion) v.autoplay = false;

      if (btn) btn.addEventListener('click', () => {
        if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
      });
      /* the browser can pause a clip too, so read the state back off the
         element rather than assuming the button is the only way in */
      v.addEventListener('play', () => sync(clip, true));
      v.addEventListener('pause', () => sync(clip, false));
      sync(clip, !v.paused);
    });

    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const v = e.target.querySelector('video');
        if (!v || !v.autoplay) continue;
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    }, { rootMargin: '150px' });
    clips.forEach(c => io.observe(c));

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      clips.forEach(c => {
        const v = c.querySelector('video');
        if (v) v.pause();
      });
    });
  }

  /* project galleries: the thumbnails are small on purpose, so a click opens
     the picture full size. <dialog> gives the Esc key, the focus trap and the
     backdrop for free; the close button is for anyone who does not know Esc. */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbCap = lightbox.querySelector('.lightbox-cap');
    const lbClose = lightbox.querySelector('.lightbox-close');

    document.querySelectorAll('.gal-open').forEach(btn => {
      btn.addEventListener('click', () => {
        lbImg.src = btn.dataset.full;
        lbImg.alt = btn.dataset.alt || '';
        lbCap.textContent = btn.dataset.caption || '';
        lbCap.hidden = !btn.dataset.caption;
        lightbox.showModal();
      });
    });

    if (lbClose) lbClose.addEventListener('click', () => lightbox.close());
    /* a click on the backdrop reports the dialog itself, not its contents */
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
  }

  /* theme. Dark is the default; a tiny inline script in each page's <head>
     applies a saved choice before first paint, so this only handles clicks. */
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeButtons = [...document.querySelectorAll('.theme-toggle')];
  const syncTheme = () => {
    const light = root.dataset.theme === 'light';
    themeButtons.forEach(b => b.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme'));
    if (themeMeta) themeMeta.setAttribute('content', light ? '#eef2f4' : '#0b1a28');
  };
  themeButtons.forEach(b => b.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* private mode: the choice just isn't remembered */ }
    syncTheme();
  }));
  syncTheme();

  /* live wind panel. Current wind in Claremont from Open-Meteo drives the
     vane and the cup anemometer; a visitor can take over with the cursor
     (or a finger on the panel), and it settles back to the real wind. */
  const wind = document.getElementById('wind');
  if (wind) {
    const API = 'https://api.open-meteo.com/v1/forecast?latitude=34.0967&longitude=-117.7198'
      + '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph&timezone=America%2FLos_Angeles';
    const CACHE_KEY = 'wind:v1';
    const CACHE_MS = 10 * 60 * 1000;
    const REFRESH_MS = 15 * 60 * 1000;
    const POINTS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const norm = d => ((d % 360) + 360) % 360;
    const compass = d => POINTS[Math.round(norm(d) / 22.5) % 16];
    const shortest = d => ((d % 360) + 540) % 360 - 180;

    const hero = wind.closest('.hero') || wind;
    const vaneG = wind.querySelector('[data-wind-vane]');
    const cupsG = wind.querySelector('[data-wind-cups]');
    const vaneTitle = wind.querySelector('.wind-vane title');
    const out = {
      status: wind.querySelector('[data-wind-status]'),
      dir: wind.querySelector('[data-wind-dir]'),
      speed: wind.querySelector('[data-wind-speed]'),
      gust: wind.querySelector('[data-wind-gust]'),
      note: wind.querySelector('[data-wind-note]')
    };
    const canHover = window.matchMedia('(hover: hover)').matches;
    const steerHint = canHover ? 'Move your cursor over the panel to steer it.' : 'Drag across the panel to steer it.';

    let live = null;           // { dir, speed, gust, time, at }
    let mode = 'loading';      // loading | live | offline | cursor
    let target = 225, angle = 225, vel = 0;
    let cupAngle = 0, cupRps = 0.35, cursorRps = 0, cursorUntil = 0;
    let nextFlutter = 0, prevPt = null;

    const setMode = m => {
      mode = m;
      wind.dataset.state = m;
      out.status.textContent = { loading: 'Loading', live: 'Live', offline: 'Offline', cursor: 'You’re steering' }[m];
    };

    const showReadings = () => {
      if (live) {
        out.dir.textContent = `${compass(live.dir)} ${Math.round(norm(live.dir))}°`;
        out.speed.textContent = `${Math.round(live.speed)} mph`;
        out.gust.textContent = `${Math.round(live.gust)} mph`;
        const m = /T(\d{2}):(\d{2})/.exec(live.time || '');
        let when = '';
        if (m) {
          const h = +m[1];
          when = `Updated ${(h % 12) || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'} Pacific. `;
        }
        out.note.textContent = when + steerHint;
        if (vaneTitle) vaneTitle.textContent = `Weathervane showing wind from the ${compass(live.dir)}, ${Math.round(live.speed)} miles per hour`;
      } else {
        out.dir.textContent = out.speed.textContent = out.gust.textContent = '—';
        out.note.textContent = (mode === 'offline' ? 'Live wind data isn’t available right now. ' : '') + steerHint;
      }
    };

    const accept = data => {
      live = data;
      if (mode !== 'cursor') { setMode('live'); target = live.dir; }
      showReadings();
      if (reduceMotion) render();
    };

    const readCache = () => {
      try {
        const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (c && Date.now() - c.at < CACHE_MS) return c;
      } catch (e) { /* storage blocked or junk: just fetch */ }
      return null;
    };

    let fetching = false;
    const fetchWind = async () => {
      if (fetching) return;
      const cached = readCache();
      if (cached) { accept(cached); return; }
      fetching = true;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const res = await fetch(API, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cur = (await res.json()).current || {};
        const data = {
          dir: Number(cur.wind_direction_10m),
          speed: Number(cur.wind_speed_10m),
          gust: Number(cur.wind_gusts_10m),
          time: String(cur.time || ''),
          at: Date.now()
        };
        if (![data.dir, data.speed, data.gust].every(Number.isFinite)) throw new Error('bad payload');
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* fine without a cache */ }
        accept(data);
      } catch (e) {
        /* keep the last good reading if there is one; otherwise say so */
        if (!live && mode !== 'cursor') setMode('offline');
        if (!live) showReadings();
      } finally {
        clearTimeout(timer);
        fetching = false;
      }
    };

    /* steering */
    let settleTimer = 0;
    const steer = e => {
      if (e.pointerType === 'touch' && !wind.contains(e.target)) return;
      const r = wind.querySelector('.wind-vane').getBoundingClientRect();
      if (!r.width) return;
      target = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
      const now = performance.now();
      if (prevPt) {
        const dt = Math.max(16, now - prevPt.t);
        const v = Math.hypot(e.clientX - prevPt.x, e.clientY - prevPt.y) / dt;
        cursorRps = Math.min(5, Math.max(cursorRps, v * 2.5));
      }
      prevPt = { x: e.clientX, y: e.clientY, t: now };
      cursorUntil = now + 2500;
      if (mode !== 'cursor') setMode('cursor');
      if (reduceMotion) {
        /* no animation loop runs, so settle back on a timer instead */
        render();
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          setMode(live ? 'live' : 'offline');
          showReadings();
          if (live) target = live.dir;
          render();
        }, 2500);
      }
    };
    hero.addEventListener('pointermove', steer, { passive: true });
    hero.addEventListener('pointerleave', () => { prevPt = null; });

    const render = () => {
      if (reduceMotion) angle = target;
      vaneG.setAttribute('transform', `rotate(${angle.toFixed(2)} 120 120)`);
      cupsG.setAttribute('transform', `rotate(${cupAngle.toFixed(2)} 60 60)`);
    };

    /* the loop runs only while the panel is on screen and the tab is visible */
    let raf = 0, last = 0, onScreen = true;
    const tick = now => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;

      if (mode === 'cursor' && now > cursorUntil) {
        setMode(live ? 'live' : 'offline');
        showReadings();
        if (live) target = live.dir;
      }
      if (mode !== 'cursor' && now > nextFlutter) {
        if (live) {
          /* small swings around the reported direction, wider when gusty */
          const spread = Math.min(22, 4 + Math.max(0, live.gust - live.speed) * 1.5);
          target = live.dir + (Math.random() - 0.5) * spread;
          nextFlutter = now + 900 + Math.random() * 900;
        } else {
          target = 225 + (Math.random() - 0.5) * 24;
          nextFlutter = now + 2200;
        }
      }

      /* a damped spring, so the vane overshoots and settles like a real one */
      const diff = shortest(target - angle);
      vel += (diff * 18 - vel * 6) * dt;
      angle += vel * dt;

      cursorRps *= Math.pow(0.35, dt);
      const want = mode === 'cursor' ? Math.max(0.35, cursorRps)
        : live ? Math.min(4, live.speed * 0.12) : 0.35;
      cupRps += (want - cupRps) * Math.min(1, dt * 2);
      cupAngle = (cupAngle - cupRps * 360 * dt) % 360;   /* counterclockwise: cup backs lead */

      render();
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (reduceMotion || raf || document.hidden || !onScreen) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const halt = () => { cancelAnimationFrame(raf); raf = 0; };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        onScreen ? run() : halt();
      }).observe(wind);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { halt(); return; }
      run();
      if (!live || Date.now() - live.at > REFRESH_MS) fetchWind();
    });
    setInterval(() => { if (!document.hidden) fetchWind(); }, REFRESH_MS);

    setMode('loading');
    showReadings();
    render();
    run();
    fetchWind();
  }

  /* card clips that autoplay (muted, looping) stay parked on their poster
     for anyone who has asked for reduced motion */
  if (reduceMotion) {
    document.querySelectorAll('video[autoplay]').forEach(v => { v.autoplay = false; v.pause(); });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
