(() => {
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const links = [...document.querySelectorAll('.nav-links a')];

  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  const reveals = [...document.querySelectorAll('.reveal')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reveal: driven by scroll position, so fast scrolling / anchor jumps
     can never leave content stranded at opacity 0 (an IntersectionObserver
     coalesces callbacks and can miss sections during fast programmatic scroll) */
  const revealPass = () => {
    const vh = window.innerHeight;
    for (const el of reveals) {
      if (el.classList.contains('in')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('in');
    }
  };

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

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    revealPass();
    setActive();
  };

  let ticking = false;
  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  };

  if (reduceMotion) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
  }
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

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
