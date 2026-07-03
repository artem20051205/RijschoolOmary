// ===== i18n =====
const LANG_KEY = 'omary-lang';

function detectInitialLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && window.TRANSLATIONS[saved]) return saved;
  const browserLangs = (navigator.languages || [navigator.language || 'nl']).map((l) => l.slice(0, 2).toLowerCase());
  const found = browserLangs.find((l) => window.TRANSLATIONS[l]);
  return found || 'nl';
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function t(key) {
  const dict = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS.nl;
  return getPath(dict, key) ?? getPath(window.TRANSLATIONS.nl, key) ?? key;
}

let currentLang = detectInitialLang();

function applyLanguage(lang) {
  if (!window.TRANSLATIONS[lang]) lang = 'nl';
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);

  const meta = window.LANGUAGES.find((l) => l.code === lang) || window.LANGUAGES[0];
  document.documentElement.lang = lang;
  document.documentElement.dir = meta.dir;
  document.body.classList.toggle('rtl', meta.dir === 'rtl');

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

  const navLinksEl = document.getElementById('navLinks');
  if (navLinksEl) navLinksEl.setAttribute('aria-label', t('aria.mainNav'));
  const navToggleEl = document.getElementById('navToggle');
  if (navToggleEl) navToggleEl.setAttribute('aria-label', t('aria.openMenu'));
  const brandHomeEl = document.getElementById('brandHome');
  if (brandHomeEl) brandHomeEl.setAttribute('aria-label', t('aria.brandHome'));
  const fabEl = document.getElementById('fabWhatsapp');
  if (fabEl) fabEl.setAttribute('aria-label', t('aria.whatsapp'));
  const langBtnEl = document.getElementById('langBtn');
  if (langBtnEl) langBtnEl.setAttribute('aria-label', t('aria.langSwitch'));

  const langBtnLabel = document.getElementById('langBtnLabel');
  if (langBtnLabel) langBtnLabel.textContent = lang.toUpperCase();

  document.querySelectorAll('#langMenu li').forEach((li) => {
    li.setAttribute('aria-selected', String(li.dataset.lang === lang));
  });
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

function openLangMenu() {
  langSwitch.classList.add('open');
  langBtn.setAttribute('aria-expanded', 'true');
}
function closeLangMenu() {
  langSwitch.classList.remove('open');
  langBtn.setAttribute('aria-expanded', 'false');
}
langBtn.addEventListener('click', () => {
  langSwitch.classList.contains('open') ? closeLangMenu() : openLangMenu();
});
document.addEventListener('click', (e) => {
  if (!langSwitch.contains(e.target)) closeLangMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLangMenu();
});

buildLangMenu();
applyLanguage(currentLang);

// ===== Sticky nav shadow =====
const navPill = document.getElementById('navPill');
const onScroll = () => {
  navPill.classList.toggle('scrolled', window.scrollY > 10);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Mobile menu =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ===== Scrollspy =====
const spyLinks = new Map(
  [...navLinks.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a])
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
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

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
    // No backend available (e.g. static hosting): open the visitor's e-mail client instead
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
