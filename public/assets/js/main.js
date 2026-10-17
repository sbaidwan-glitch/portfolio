(() => {
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const links = [...document.querySelectorAll('.nav-links a')];

  /* every section, not just the linked ones, so a section without a nav
     entry still clears the highlight rather than leaving the one above lit */
  const sections = [...document.querySelectorAll('section[id]')];

  const bg = document.querySelector('.bg');
  const sceneMarkers = [...document.querySelectorAll('[data-bg]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setActive = () => {
    const mark = window.scrollY + window.innerHeight * 0.35;
    let current = null;
    for (const s of sections) {
      if (s.getBoundingClientRect().top + window.scrollY <= mark) current = s;
    }
    for (const l of links) {
      l.classList.toggle('active', current !== null && l.getAttribute('href') === '#' + current.id);
    }
  };

  /* background scene: whichever marked card crosses the middle of the
     viewport owns it, and everything else falls back to the gears */
  const setScene = () => {
    if (!bg) return;
    const line = window.innerHeight * 0.5;
    let name = 'gears';
    for (const el of sceneMarkers) {
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom >= line) { name = el.dataset.bg; break; }
    }
    if (bg.dataset.scene !== name) bg.dataset.scene = name;
  };

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    setActive();
    setScene();
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

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
