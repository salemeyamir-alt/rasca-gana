/* storage.js — persistencia de la configuracion del cliente (localStorage) */

const STORAGE_KEY = 'scratchAppConfig_v1';

// fuentes del sistema: no requieren internet
// fuentes google: se descargan la primera vez (y quedan cacheadas por el service worker)
const FONT_OPTIONS = {
  default: { label: 'Predeterminada (sistema)', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  rounded: { label: 'Redondeada (sistema)', stack: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif" },
  elegant: { label: 'Elegante (sistema)', stack: "Georgia, 'Times New Roman', serif" },
  impact: { label: 'Impacto (sistema)', stack: "Impact, 'Arial Black', 'Segoe UI', sans-serif" },
  mono: { label: 'Monoespaciada (sistema)', stack: "'Courier New', ui-monospace, SFMono-Regular, monospace" },
  poppins: { label: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins:wght@400;600;800' },
  montserrat: { label: 'Montserrat', stack: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;600;800' },
  roboto: { label: 'Roboto', stack: "'Roboto', sans-serif", google: 'Roboto:wght@400;500;700' },
  nunito: { label: 'Nunito', stack: "'Nunito', sans-serif", google: 'Nunito:wght@400;700;800' },
  oswald: { label: 'Oswald', stack: "'Oswald', sans-serif", google: 'Oswald:wght@400;600;700' },
  bebas: { label: 'Bebas Neue', stack: "'Bebas Neue', cursive", google: 'Bebas+Neue' },
  anton: { label: 'Anton', stack: "'Anton', sans-serif", google: 'Anton' },
  playfair: { label: 'Playfair Display', stack: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;700;800' },
  pacifico: { label: 'Pacifico', stack: "'Pacifico', cursive", google: 'Pacifico' },
  bangers: { label: 'Bangers', stack: "'Bangers', cursive", google: 'Bangers' }
};

const DEFAULT_CONFIG = {
  template: 'triple', // 'triple' | 'single'
  adminPin: '1234',
  idleTimeoutSeconds: 60, // 0 = desactivado. Tiempo sin uso para mostrar la pantalla de inicio como protector
  branding: {
    title: 'FAST CASH',
    titleColor: '#ffd700', // color del titulo (independiente del color de texto general)
    logo: null, // dataURL (PNG, preserva transparencia)
    logoWidth: 160, // px, ancho mostrado en el encabezado
    startLogoWidth: 260, // px, ancho del logo en la pantalla de inicio/screensaver (independiente del encabezado)
    startButtonSize: 18, // px, tamano de fuente base del boton de inicio/screensaver
    background: null, // dataURL
    backgroundColor: '#000000', // color solido cuando no hay imagen de fondo
    cardColor: '#ffffff', // fondo de la tarjeta/tablero de juego
    secondaryColor: '#ffd700', // superficie de rascar (moneda)
    cellTextColor: '#ffffff', // color del texto "RASCA" sobre la superficie
    accentColor: '#ffd700', // fondo de los botones
    buttonTextColor: '#111111', // texto de los botones
    textColor: '#ffffff', // texto general
    fontFamily: 'default',
    popupColor: '#000000', // fondo de las ventanas emergentes (premio y acceso admin)
    popupTextColor: '#ffffff', // texto de las ventanas emergentes
    newCardButtonText: 'Nueva tarjeta',
    startButtonText: 'RASCA Y GANA',
    resultWinTitle: '¡FELICIDADES!',
    resultLoseTitle: 'SIGUE INTENTANDO',
    resultLoseMessage: 'Esta vez no hubo premio.',
    adminAccessTitle: 'Acceso de administrador'
  },
  prizes: [
    { id: 'p1', label: 'Premio 1', weight: 6, isWinning: true, photo: null },
    { id: 'p2', label: 'Premio 2', weight: 3, isWinning: true, photo: null },
    { id: 'p3', label: 'Premio mayor', weight: 1, isWinning: true, photo: null },
    { id: 'p4', label: 'SIN PREMIO', weight: 20, isWinning: false, photo: null }
  ]
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/** Combina un objeto de configuracion (parseado de localStorage o importado de un archivo) con los valores por defecto. */
function mergeWithDefaults(parsed) {
  const base = cloneDefault();
  const merged = {
    ...base,
    ...parsed,
    branding: { ...base.branding, ...(parsed && parsed.branding ? parsed.branding : {}) }
  };
  if (merged.template !== 'triple' && merged.template !== 'single') merged.template = 'triple';
  if (!FONT_OPTIONS[merged.branding.fontFamily]) merged.branding.fontFamily = 'default';
  if (!Array.isArray(merged.prizes) || merged.prizes.length === 0) merged.prizes = base.prizes;
  return merged;
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (e) {
    console.error('Config invalida, usando default', e);
    return cloneDefault();
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function resetConfig() {
  const fresh = cloneDefault();
  saveConfig(fresh);
  return fresh;
}

/**
 * Redimensiona y comprime una imagen subida por el usuario antes de
 * guardarla como dataURL (evita que el localStorage crezca sin control).
 * format 'png' preserva transparencia (logos); 'jpeg' pesa menos (fotos/fondos).
 */
function compressImage(file, maxDim = 512, quality = 0.85, format = 'jpeg') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

window.ScratchStorage = {
  loadConfig,
  saveConfig,
  resetConfig,
  cloneDefault,
  mergeWithDefaults,
  compressImage,
  FONT_OPTIONS
};
