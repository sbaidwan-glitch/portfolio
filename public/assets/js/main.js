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

  /* slideshow: without JS the first slide stays put and the dots do nothing */
  document.querySelectorAll('[data-slideshow]').forEach(box => {
    const slides = [...box.querySelectorAll('.slide')];
    const dots = [...box.querySelectorAll('.dot')];
    if (slides.length < 2 || dots.length !== slides.length) return;

    let i = 0, timer = null;

    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        const v = s.querySelector('video');
        if (!v) return;
        if (k === i && !reduceMotion) v.play().catch(() => {});
        else v.pause();
      });
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-selected', String(k === i));
      });
    };

    /* a slide carrying a clip holds the reel rather than rotating away
       mid-play; the dots still move the visitor on */
    const advance = () => { if (!slides[i].querySelector('video')) show(i + 1); };

    const start = () => {
      if (reduceMotion) return;
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

    show(0);
    start();
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
