// ===== V2-specific strings (everything else reuses /translations.js) =====
const V2_EXTRA = {
  nl: { drag: 'Sleep of scroll', v1: 'Klassieke versie', prev: 'Vorige pakketten', next: 'Volgende pakketten', openMenu: 'Menu openen', closeMenu: 'Menu sluiten' },
  en: { drag: 'Drag or scroll', v1: 'Classic version', prev: 'Previous packages', next: 'Next packages', openMenu: 'Open menu', closeMenu: 'Close menu' },
  ru: { drag: 'Листайте', v1: 'Классическая версия', prev: 'Предыдущие пакеты', next: 'Следующие пакеты', openMenu: 'Открыть меню', closeMenu: 'Закрыть меню' },
  fa: { drag: 'بکشید یا اسکرول کنید', v1: 'نسخه کلاسیک', prev: 'بسته‌های قبلی', next: 'بسته‌های بعدی', openMenu: 'باز کردن منو', closeMenu: 'بستن منو' },
};

// ===== i18n =====
const LANG_KEY = 'omary-lang';

function detectInitialLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && window.TRANSLATIONS[saved]) return saved;
  const browserLangs = (navigator.languages || [navigator.language || 'nl']).map((l) => l.slice(0, 2).toLowerCase());
  return browserLangs.find((l) => window.TRANSLATIONS[l]) || 'nl';
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

let currentLang = detectInitialLang();

function t(key) {
  if (key.startsWith('v2.')) {
    const k = key.slice(3);
    return (V2_EXTRA[currentLang] && V2_EXTRA[currentLang][k]) ?? V2_EXTRA.nl[k] ?? key;
  }
  const dict = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS.nl;
  return getPath(dict, key) ?? getPath(window.TRANSLATIONS.nl, key) ?? key;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ===== Marquee =====
function buildMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const items = [
    t('hero.badge'),
    t('langs.nl'), t('langs.en'), t('langs.fa'), t('langs.ru'),
    t('contact.hours'),
    t('contact.area'),
  ];
  const group = items.map((i) => `<span>${escapeHtml(i)}</span>`).join('<i>•</i>') + '<i>•</i>';
  track.innerHTML = `<div class="mq-group">${group}</div><div class="mq-group">${group}</div>`;
}

function applyLanguage(lang) {
  if (!window.TRANSLATIONS[lang]) lang = 'nl';
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);

  const meta = window.LANGUAGES.find((l) => l.code === lang) || window.LANGUAGES[0];
  document.documentElement.lang = lang;
  document.documentElement.dir = meta.dir;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = t(el.getAttribute('data-i18n'));
    if (value !== undefined) el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const value = t(el.getAttribute('data-i18n-html'));
    if (value !== undefined) el.innerHTML = value;
  });

  document.title = t('meta.title');
  const metaDesc = document.getElementById('metaDescription');
  if (metaDesc) metaDesc.setAttribute('content', t('meta.description'));

  const brandHome = document.getElementById('brandHome');
  if (brandHome) brandHome.setAttribute('aria-label', t('aria.brandHome'));
  const fab = document.getElementById('fabWhatsapp');
  if (fab) fab.setAttribute('aria-label', t('aria.whatsapp'));
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.setAttribute('aria-label', t('aria.langSwitch'));
  const burger = document.getElementById('burger');
  if (burger) burger.setAttribute('aria-label', burger.getAttribute('aria-expanded') === 'true' ? t('v2.closeMenu') : t('v2.openMenu'));
  const railPrev = document.getElementById('railPrev');
  if (railPrev) railPrev.setAttribute('aria-label', t('v2.prev'));
  const railNext = document.getElementById('railNext');
  if (railNext) railNext.setAttribute('aria-label', t('v2.next'));

  const label = document.getElementById('langBtnLabel');
  if (label) label.textContent = lang.toUpperCase();
  document.querySelectorAll('#langMenu li').forEach((li) => {
    li.setAttribute('aria-selected', String(li.dataset.lang === lang));
  });

  buildMarquee();
}

function buildLangMenu() {
  const menu = document.getElementById('langMenu');
  menu.innerHTML = '';
  window.LANGUAGES.forEach((l) => {
    const li = document.createElement('li');
    li.dataset.lang = l.code;
    li.setAttribute('role', 'option');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = l.native;
    btn.addEventListener('click', () => {
      applyLanguage(l.code);
      closeLangMenu();
    });
    li.appendChild(btn);
    menu.appendChild(li);
  });
}

const langSwitch = document.getElementById('langSwitch');
const langBtn = document.getElementById('langBtn');

function closeLangMenu() {
  langSwitch.classList.remove('open');
  langBtn.setAttribute('aria-expanded', 'false');
}
langBtn.addEventListener('click', () => {
  const opening = !langSwitch.classList.contains('open');
  langSwitch.classList.toggle('open', opening);
  langBtn.setAttribute('aria-expanded', String(opening));
});
document.addEventListener('click', (e) => {
  if (!langSwitch.contains(e.target)) closeLangMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLangMenu();
    closeMenu();
  }
});

buildLangMenu();
applyLanguage(currentLang);

// ===== Topbar & scroll progress =====
const topbar = document.getElementById('topbar');
const progress = document.getElementById('progress');
const onScroll = () => {
  topbar.classList.toggle('scrolled', window.scrollY > 10);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Fullscreen menu =====
const burger = document.getElementById('burger');
const menuOverlay = document.getElementById('menuOverlay');

function closeMenu() {
  menuOverlay.classList.remove('open');
  menuOverlay.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', t('v2.openMenu'));
  document.body.style.overflow = '';
}
burger.addEventListener('click', () => {
  const opening = !menuOverlay.classList.contains('open');
  if (opening) {
    menuOverlay.classList.add('open');
    menuOverlay.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', t('v2.closeMenu'));
    document.body.style.overflow = 'hidden';
  } else {
    closeMenu();
  }
});
menuOverlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

// ===== Scrollspy =====
const spyLinks = new Map(
  [...document.querySelectorAll('.topbar-links a')].map((a) => [a.getAttribute('href').slice(1), a])
);
const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        spyLinks.forEach((a) => a.classList.remove('active'));
        const link = spyLinks.get(entry.target.id);
        if (link) link.classList.add('active');
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
document.querySelectorAll('main section[id]').forEach((s) => spyObserver.observe(s));

// ===== Reveal on scroll =====
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);
document.querySelectorAll('.rv').forEach((el) => revealObserver.observe(el));

// ===== Animated counters =====
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reducedMotion) {
        el.textContent = target;
        return;
      }
      const dur = 900;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },
  { threshold: 0.4 }
);
document.querySelectorAll('.stat-num').forEach((el) => counterObserver.observe(el));

// ===== Pricing rail navigation =====
const rail = document.getElementById('rail');
const step = () => {
  const card = rail.querySelector('.pkg');
  return card ? card.offsetWidth + 14 : 320;
};
const railSign = () => (document.documentElement.dir === 'rtl' ? -1 : 1);
// Plain scrollBy: the rail's CSS scroll-behavior handles the smoothness
document.getElementById('railPrev').addEventListener('click', () => {
  rail.scrollBy({ left: -step() * railSign() });
});
document.getElementById('railNext').addEventListener('click', () => {
  rail.scrollBy({ left: step() * railSign() });
});

// ===== Contact form =====
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('formStatus');

const setStatus = (text, kind) => {
  statusEl.textContent = text;
  statusEl.className = kind || '';
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.naam || !data.email || !data.telefoon) {
    setStatus(t('contact.errMissing'), 'err');
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = t('contact.submitting');
  setStatus('', '');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, lang: currentLang }),
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.ok) {
      form.reset();
      setStatus(t('contact.statusOk'), 'ok');
    } else if (res.status === 429) {
      setStatus(t('contact.errRateLimit'), 'err');
    } else if (res.status === 400) {
      setStatus(t('contact.errValidation'), 'err');
    } else {
      setStatus(t('contact.errGeneric'), 'err');
    }
  } catch {
    // Static hosting fallback: open the visitor's e-mail client
    const body = [
      `Naam: ${data.naam}`,
      `E-mail: ${data.email}`,
      `Telefoon: ${data.telefoon}`,
      `Type les: ${data.typeLes || ''}`,
      '',
      data.bericht || '',
    ].join('\n');
    window.location.href =
      `mailto:mnomary@hotmail.com?subject=${encodeURIComponent(data.onderwerp || 'Contact via website')}` +
      `&body=${encodeURIComponent(body)}`;
    setStatus(t('contact.statusMailFallback'), 'ok');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();
