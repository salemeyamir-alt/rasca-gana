/* app.js — arranque de la app, theming global, PIN de administrador, pantalla de inicio/screensaver y navegacion */

const ScratchTheme = (function () {
  function ensureGoogleFont(fontDef) {
    if (!fontDef || !fontDef.google) return;
    const id = `google-font-${fontDef.google.replace(/[^a-zA-Z0-9]/g, '')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontDef.google}&display=swap`;
    document.head.appendChild(link);
  }

  function apply(branding) {
    const root = document.documentElement.style;
    root.setProperty('--color-secondary', branding.secondaryColor);
    root.setProperty('--color-accent', branding.accentColor);
    root.setProperty('--color-button-text', branding.buttonTextColor);
    root.setProperty('--color-background', branding.backgroundColor);
    root.setProperty('--color-card', branding.cardColor);
    root.setProperty('--color-text', branding.textColor);
    root.setProperty('--color-title', branding.titleColor);
    root.setProperty('--color-popup', branding.popupColor);
    root.setProperty('--color-popup-text', branding.popupTextColor);
    root.setProperty('--logo-width', `${branding.logoWidth || 160}px`);
    root.setProperty('--start-logo-width', `${branding.startLogoWidth || 260}px`);
    root.setProperty('--start-btn-size', `${branding.startButtonSize || 18}px`);

    const fontOptions = window.ScratchStorage ? window.ScratchStorage.FONT_OPTIONS : null;
    const fontKey = fontOptions && fontOptions[branding.fontFamily] ? branding.fontFamily : 'default';
    if (fontOptions) {
      const fontDef = fontOptions[fontKey];
      ensureGoogleFont(fontDef);
      root.setProperty('--font-family', fontDef.stack);
    }

    document.body.style.backgroundImage = branding.background ? `url("${branding.background}")` : '';

    const logo = document.getElementById('app-logo');
    const title = document.getElementById('app-title');
    const startLogo = document.getElementById('start-logo');
    const startTitle = document.getElementById('start-title');
    title.textContent = branding.title || '';
    startTitle.textContent = branding.title || '';

    if (branding.logo) {
      logo.src = branding.logo;
      logo.style.display = '';
      title.classList.add('visually-hidden');
      startLogo.src = branding.logo;
      startLogo.style.display = '';
      startTitle.classList.add('visually-hidden');
    } else {
      logo.style.display = 'none';
      title.classList.remove('visually-hidden');
      startLogo.style.display = 'none';
      startTitle.classList.remove('visually-hidden');
    }

    document.getElementById('start-btn').textContent = branding.startButtonText || 'RASCA Y GANA';
    document.getElementById('pin-title').textContent = branding.adminAccessTitle || 'Acceso de administrador';
  }
  return { apply };
})();

window.ScratchTheme = ScratchTheme;

(function () {
  let config = null;
  let currentScreen = 'start';
  let idleTimer = null;
  let lastActivity = Date.now();

  function showScreen(name) {
    currentScreen = name;
    document.getElementById('start-screen').classList.toggle('hidden', name !== 'start');
    document.getElementById('game-screen').classList.toggle('hidden', name !== 'game');
    document.getElementById('admin-screen').classList.toggle('hidden', name !== 'admin');
    document.getElementById('app-header').classList.toggle('hidden', name === 'admin' || name === 'start');
  }

  function markActivity() {
    lastActivity = Date.now();
  }

  function checkIdle() {
    if (currentScreen !== 'game') return;
    const timeoutSeconds = config ? config.idleTimeoutSeconds : 0;
    if (!timeoutSeconds || timeoutSeconds <= 0) return;
    if (Date.now() - lastActivity >= timeoutSeconds * 1000) {
      showScreen('start');
    }
  }

  function startIdleWatcher() {
    ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      document.addEventListener(evt, markActivity, { passive: true });
    });
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(checkIdle, 2000);
  }

  function openAdmin() {
    const overlay = document.getElementById('pin-overlay');
    const input = document.getElementById('pin-input');
    const error = document.getElementById('pin-error');
    input.value = '';
    error.textContent = '';
    overlay.classList.remove('hidden');
    input.focus();

    function submit() {
      if (input.value === config.adminPin) {
        overlay.classList.add('hidden');
        showScreen('admin');
        ScratchAdmin.render(config, { onSave: handleAdminSave, onCancel: handleAdminCancel });
      } else {
        error.textContent = 'PIN incorrecto';
        input.value = '';
        input.focus();
      }
    }

    document.getElementById('pin-submit-btn').onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    document.getElementById('pin-cancel-btn').onclick = () => overlay.classList.add('hidden');
  }

  function handleAdminSave(newConfig, opts) {
    config = newConfig;
    ScratchTheme.apply(config.branding);
    if (!opts || !opts.keepOpen) {
      markActivity();
      showScreen('game');
      ScratchGame.render(config);
    }
  }

  function handleAdminCancel() {
    config = ScratchStorage.loadConfig();
    ScratchTheme.apply(config.branding);
    markActivity();
    showScreen('game');
    ScratchGame.render(config);
  }

  function init() {
    config = ScratchStorage.loadConfig();
    ScratchTheme.apply(config.branding);
    showScreen('start');

    document.getElementById('start-btn').addEventListener('click', () => {
      markActivity();
      showScreen('game');
      // el tablero se arma recien al mostrar la pantalla de juego: si se
      // arma mientras #game-screen esta oculto (display:none), el canvas
      // mide 0x0 y la capa de "rascar" no se pinta.
      ScratchGame.render(config);
    });
    document.getElementById('settings-btn').addEventListener('click', openAdmin);
    document.getElementById('result-close-btn').addEventListener('click', () => ScratchGame.hideResultModal());
    document.getElementById('result-play-again-btn').addEventListener('click', () => {
      ScratchGame.hideResultModal();
      ScratchGame.newRound();
    });

    startIdleWatcher();
  }

  document.addEventListener('DOMContentLoaded', init);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.error('No se pudo registrar el service worker', err);
      });
    });
  }
})();
