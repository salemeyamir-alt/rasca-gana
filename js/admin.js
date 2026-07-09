/* admin.js — panel de administracion in-app (plantilla, marca, premios, ajustes) */

const ScratchAdmin = (function () {
  let draft = null;
  let onSave = null;
  let onCancel = null;
  let uid = 0;

  function newId() {
    uid += 1;
    return `prize_${Date.now()}_${uid}`;
  }

  function render(config, callbacks) {
    draft = JSON.parse(JSON.stringify(config));
    onSave = callbacks.onSave;
    onCancel = callbacks.onCancel;

    const root = document.getElementById('admin-screen');
    root.innerHTML = `
      <div class="admin-header">
        <h2>⚙ Configuracion</h2>
        <button class="btn btn-ghost" id="admin-cancel-btn">Cerrar</button>
      </div>
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="template">🎯 Plantilla</button>
        <button class="tab-btn" data-tab="branding">🎨 Diseno</button>
        <button class="tab-btn" data-tab="texts">🔤 Textos</button>
        <button class="tab-btn" data-tab="prizes">🏆 Premios</button>
        <button class="tab-btn" data-tab="settings">🔧 Ajustes</button>
      </div>
      <div class="admin-body">
        <div class="admin-tab-panel active" id="tab-template"></div>
        <div class="admin-tab-panel" id="tab-branding"></div>
        <div class="admin-tab-panel" id="tab-texts"></div>
        <div class="admin-tab-panel" id="tab-prizes"></div>
        <div class="admin-tab-panel" id="tab-settings"></div>
      </div>
      <div class="admin-footer">
        <button class="btn btn-primary" id="admin-save-btn">Guardar cambios</button>
        <button class="btn btn-ghost" id="admin-reset-btn">Restaurar valores por defecto</button>
      </div>
    `;

    renderTemplateTab();
    renderBrandingTab();
    renderTextsTab();
    renderPrizesTab();
    renderSettingsTab();
    bindTabs();
    bindFooter();
  }

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  function bindFooter() {
    document.getElementById('admin-cancel-btn').addEventListener('click', () => onCancel && onCancel());
    document.getElementById('admin-save-btn').addEventListener('click', handleSave);
    document.getElementById('admin-reset-btn').addEventListener('click', () => {
      if (!confirm('Esto borrara toda la personalizacion (logo, colores, premios) y volvera a los valores de fabrica. Continuar?')) return;
      const fresh = ScratchStorage.resetConfig();
      render(fresh, { onSave, onCancel });
      onSave && onSave(fresh, { keepOpen: true });
    });
  }

  function handleSave() {
    if (!draft.prizes.length) {
      alert('Debe existir al menos un premio (puede ser "Sin premio").');
      return;
    }
    const totalWeight = draft.prizes.reduce((s, p) => s + Number(p.weight || 0), 0);
    if (totalWeight <= 0) {
      alert('La suma de probabilidades de los premios debe ser mayor a 0.');
      return;
    }
    ScratchStorage.saveConfig(draft);
    onSave && onSave(draft, { keepOpen: false });
  }

  // ---------- Tab: Plantilla ----------
  function renderTemplateTab() {
    const el = document.getElementById('tab-template');
    const cards = Object.entries(ScratchTemplates.TEMPLATE_META)
      .map(([key, meta]) => `
        <label class="template-card ${draft.template === key ? 'selected' : ''}">
          <input type="radio" name="template" value="${key}" ${draft.template === key ? 'checked' : ''}>
          <strong>${meta.label}</strong>
          <p>${meta.description}</p>
        </label>
      `)
      .join('');
    el.innerHTML = `<p class="tab-hint">Elige la mecanica de juego para este cliente. Los premios y el diseno se conservan al cambiar de plantilla.</p><div class="template-list">${cards}</div>`;

    el.querySelectorAll('input[name="template"]').forEach((input) => {
      input.addEventListener('change', () => {
        draft.template = input.value;
        el.querySelectorAll('.template-card').forEach((c) => c.classList.remove('selected'));
        input.closest('.template-card').classList.add('selected');
      });
    });
  }

  // ---------- Tab: Diseno ----------
  function renderBrandingTab() {
    const el = document.getElementById('tab-branding');
    const b = draft.branding;
    const systemFonts = Object.entries(ScratchStorage.FONT_OPTIONS).filter(([, f]) => !f.google);
    const googleFonts = Object.entries(ScratchStorage.FONT_OPTIONS).filter(([, f]) => f.google);
    const optionsHtml = (list) => list.map(([key, font]) => `<option value="${key}" ${b.fontFamily === key ? 'selected' : ''}>${font.label}</option>`).join('');

    el.innerHTML = `
      <div class="admin-card">
        <div class="field-group">
          <label>Titulo</label>
          <input type="text" id="f-title" value="${escapeAttr(b.title)}" maxlength="40">
          <p class="field-note">Se muestra en el encabezado solo si no subes un logo.</p>
        </div>
        <div class="field-group">
          <label>Logo</label>
          <div class="upload-row">
            <img id="logo-preview" class="preview-img preview-img-wide" src="${b.logo || ''}" style="${b.logo ? '' : 'display:none;'}">
            <input type="file" id="f-logo" accept="image/*">
          </div>
          <p class="field-note">Recomendado: formato horizontal 600x200px, PNG con fondo transparente.</p>
        </div>
        <div class="field-group">
          <label>Tamano del logo <span id="logo-width-value">${b.logoWidth}px</span></label>
          <input type="range" id="f-logo-width" min="60" max="320" step="10" value="${b.logoWidth}">
        </div>
        <div class="field-group">
          <label>Tamano del logo en pantalla de inicio <span id="start-logo-width-value">${b.startLogoWidth}px</span></label>
          <input type="range" id="f-start-logo-width" min="100" max="420" step="10" value="${b.startLogoWidth}">
        </div>
        <div class="field-group">
          <label>Tamano del boton de inicio <span id="start-btn-size-value">${b.startButtonSize}px</span></label>
          <input type="range" id="f-start-btn-size" min="14" max="28" step="1" value="${b.startButtonSize}">
          <p class="field-note">Aplica al boton de la pantalla de inicio y del protector de pantalla.</p>
        </div>
        <div class="field-group">
          <label>Imagen de fondo</label>
          <div class="upload-row">
            <img id="bg-preview" class="preview-img" src="${b.background || ''}" style="${b.background ? '' : 'display:none;'}">
            <input type="file" id="f-bg" accept="image/*">
          </div>
          <p class="field-note">Recomendado: 1080x1920px (formato vertical), PNG o JPG.</p>
        </div>
      </div>
      <div class="admin-card">
        <div class="field-group">
          <label>Tipografia</label>
          <select id="f-font" class="field-select">
            <optgroup label="Del sistema (sin internet)">${optionsHtml(systemFonts)}</optgroup>
            <optgroup label="Google Fonts (requiere internet la primera vez)">${optionsHtml(googleFonts)}</optgroup>
          </select>
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Colores generales</label>
        <div class="color-row">
          <div class="field-group">
            <label>Titulo</label>
            <input type="color" id="f-titlecolor" value="${b.titleColor}">
          </div>
          <div class="field-group">
            <label>Texto</label>
            <input type="color" id="f-text" value="${b.textColor}">
          </div>
          <div class="field-group">
            <label>Fondo (sin imagen)</label>
            <input type="color" id="f-bgcolor" value="${b.backgroundColor}">
          </div>
        </div>
        <div class="color-row">
          <div class="field-group">
            <label>Fondo de tarjeta</label>
            <input type="color" id="f-card" value="${b.cardColor}">
          </div>
          <div class="field-group">
            <label>Superficie a rascar</label>
            <input type="color" id="f-secondary" value="${b.secondaryColor}">
          </div>
          <div class="field-group">
            <label>Texto "RASCA"</label>
            <input type="color" id="f-celltext" value="${b.cellTextColor}">
          </div>
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Colores de botones</label>
        <div class="color-row">
          <div class="field-group">
            <label>Fondo de boton</label>
            <input type="color" id="f-accent" value="${b.accentColor}">
          </div>
          <div class="field-group">
            <label>Texto de boton</label>
            <input type="color" id="f-btntext" value="${b.buttonTextColor}">
          </div>
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Ventanas emergentes</label>
        <p class="field-note">Aplica a la ventana de premio y a la de acceso de administrador.</p>
        <div class="color-row">
          <div class="field-group">
            <label>Fondo</label>
            <input type="color" id="f-popupcolor" value="${b.popupColor}">
          </div>
          <div class="field-group">
            <label>Texto</label>
            <input type="color" id="f-popuptext" value="${b.popupTextColor}">
          </div>
        </div>
      </div>
    `;

    el.querySelector('#f-title').addEventListener('input', (e) => { draft.branding.title = e.target.value; livePreview(); });
    el.querySelector('#f-font').addEventListener('change', (e) => { draft.branding.fontFamily = e.target.value; livePreview(); });
    el.querySelector('#f-titlecolor').addEventListener('input', (e) => { draft.branding.titleColor = e.target.value; livePreview(); });
    el.querySelector('#f-text').addEventListener('input', (e) => { draft.branding.textColor = e.target.value; livePreview(); });
    el.querySelector('#f-bgcolor').addEventListener('input', (e) => { draft.branding.backgroundColor = e.target.value; livePreview(); });
    el.querySelector('#f-card').addEventListener('input', (e) => { draft.branding.cardColor = e.target.value; livePreview(); });
    el.querySelector('#f-secondary').addEventListener('input', (e) => { draft.branding.secondaryColor = e.target.value; livePreview(); });
    el.querySelector('#f-celltext').addEventListener('input', (e) => { draft.branding.cellTextColor = e.target.value; livePreview(); });
    el.querySelector('#f-accent').addEventListener('input', (e) => { draft.branding.accentColor = e.target.value; livePreview(); });
    el.querySelector('#f-btntext').addEventListener('input', (e) => { draft.branding.buttonTextColor = e.target.value; livePreview(); });
    el.querySelector('#f-popupcolor').addEventListener('input', (e) => { draft.branding.popupColor = e.target.value; livePreview(); });
    el.querySelector('#f-popuptext').addEventListener('input', (e) => { draft.branding.popupTextColor = e.target.value; livePreview(); });

    el.querySelector('#f-logo-width').addEventListener('input', (e) => {
      draft.branding.logoWidth = Number(e.target.value);
      el.querySelector('#logo-width-value').textContent = `${draft.branding.logoWidth}px`;
      livePreview();
    });

    el.querySelector('#f-start-logo-width').addEventListener('input', (e) => {
      draft.branding.startLogoWidth = Number(e.target.value);
      el.querySelector('#start-logo-width-value').textContent = `${draft.branding.startLogoWidth}px`;
      livePreview();
    });

    el.querySelector('#f-start-btn-size').addEventListener('input', (e) => {
      draft.branding.startButtonSize = Number(e.target.value);
      el.querySelector('#start-btn-size-value').textContent = `${draft.branding.startButtonSize}px`;
      livePreview();
    });

    el.querySelector('#f-logo').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await ScratchStorage.compressImage(file, 640, 0.92, 'png');
      draft.branding.logo = dataUrl;
      const preview = el.querySelector('#logo-preview');
      preview.src = dataUrl;
      preview.style.display = '';
      livePreview();
    });

    el.querySelector('#f-bg').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await ScratchStorage.compressImage(file, 1000, 0.8, 'jpeg');
      draft.branding.background = dataUrl;
      const preview = el.querySelector('#bg-preview');
      preview.src = dataUrl;
      preview.style.display = '';
      livePreview();
    });
  }

  function livePreview() {
    if (window.ScratchTheme) window.ScratchTheme.apply(draft.branding);
  }

  // ---------- Tab: Textos ----------
  function renderTextsTab() {
    const el = document.getElementById('tab-texts');
    const b = draft.branding;
    el.innerHTML = `
      <div class="admin-card">
        <label class="section-label">Pantalla de inicio y juego</label>
        <div class="field-group">
          <label>Texto del boton de inicio</label>
          <input type="text" id="f-startbtn" value="${escapeAttr(b.startButtonText)}" maxlength="30">
        </div>
        <div class="field-group">
          <label>Texto del boton "Nueva tarjeta"</label>
          <input type="text" id="f-newcardbtn" value="${escapeAttr(b.newCardButtonText)}" maxlength="30">
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Ventana de premio</label>
        <div class="field-group">
          <label>Titulo al ganar</label>
          <input type="text" id="f-wintitle" value="${escapeAttr(b.resultWinTitle)}" maxlength="40">
        </div>
        <div class="field-group">
          <label>Titulo al perder</label>
          <input type="text" id="f-losetitle" value="${escapeAttr(b.resultLoseTitle)}" maxlength="40">
        </div>
        <div class="field-group">
          <label>Mensaje al perder</label>
          <input type="text" id="f-losemsg" value="${escapeAttr(b.resultLoseMessage)}" maxlength="80">
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Acceso de administrador</label>
        <div class="field-group">
          <label>Titulo de la ventana de acceso</label>
          <input type="text" id="f-admintitle" value="${escapeAttr(b.adminAccessTitle)}" maxlength="40">
        </div>
      </div>
    `;

    el.querySelector('#f-startbtn').addEventListener('input', (e) => { draft.branding.startButtonText = e.target.value; });
    el.querySelector('#f-newcardbtn').addEventListener('input', (e) => { draft.branding.newCardButtonText = e.target.value; });
    el.querySelector('#f-wintitle').addEventListener('input', (e) => { draft.branding.resultWinTitle = e.target.value; });
    el.querySelector('#f-losetitle').addEventListener('input', (e) => { draft.branding.resultLoseTitle = e.target.value; });
    el.querySelector('#f-losemsg').addEventListener('input', (e) => { draft.branding.resultLoseMessage = e.target.value; });
    el.querySelector('#f-admintitle').addEventListener('input', (e) => { draft.branding.adminAccessTitle = e.target.value; });
  }

  // ---------- Tab: Premios ----------
  function renderPrizesTab() {
    const el = document.getElementById('tab-prizes');
    el.innerHTML = `
      <p class="tab-hint">El numero de cada premio (marcado "Es premio") es la cantidad de veces que todavia se puede ganar: baja 1 cada vez que sale y en 0 deja de salir, hasta que le subas la cantidad de nuevo aqui. La fila "sin premio" no se agota: su numero es su peso relativo frente al resto. Foto recomendada: cuadrada, 400x400px.</p>
      <div id="prize-rows"></div>
      <button class="btn btn-ghost" id="add-prize-btn">+ Agregar premio</button>
    `;
    renderPrizeRows();
    el.querySelector('#add-prize-btn').addEventListener('click', () => {
      draft.prizes.push({ id: newId(), label: 'NUEVO PREMIO', weight: 1, isWinning: true, photo: null });
      renderPrizeRows();
    });
  }

  function renderPrizeRows() {
    const container = document.getElementById('prize-rows');
    container.innerHTML = draft.prizes
      .map((p, i) => `
        <div class="prize-row" data-idx="${i}">
          <div class="prize-row-main">
            <input type="text" class="prize-label" value="${escapeAttr(p.label)}" placeholder="Nombre del premio" title="Nombre">
            <input type="number" class="prize-weight" value="${p.weight}" min="0" title="${p.isWinning ? 'Veces que todavia se puede ganar' : 'Peso relativo (no se agota)'}">
            <button class="btn btn-danger prize-remove" title="Eliminar">✕</button>
          </div>
          <p class="field-note prize-weight-hint">${p.isWinning ? (Number(p.weight) > 0 ? `Quedan ${p.weight} por ganar.` : 'Agotado: no puede volver a salir hasta que subas la cantidad.') : 'Peso relativo (no se agota).'}</p>
          <div class="prize-row-extra">
            <label class="prize-photo-upload">
              ${p.photo ? `<img class="prize-photo-preview" src="${p.photo}">` : '<span class="prize-photo-placeholder">📷</span>'}
              <span>Subir foto</span>
              <input type="file" accept="image/*" class="prize-photo-input" hidden>
            </label>
            <label class="prize-winning"><input type="checkbox" class="prize-iswinning" ${p.isWinning ? 'checked' : ''}> Es premio</label>
          </div>
        </div>
      `)
      .join('');

    container.querySelectorAll('.prize-row').forEach((row) => {
      const idx = Number(row.dataset.idx);
      row.querySelector('.prize-label').addEventListener('input', (e) => { draft.prizes[idx].label = e.target.value; });
      row.querySelector('.prize-weight').addEventListener('input', (e) => {
        const p = draft.prizes[idx];
        p.weight = Math.max(0, Number(e.target.value) || 0);
        const hint = row.querySelector('.prize-weight-hint');
        hint.textContent = p.isWinning
          ? (p.weight > 0 ? `Quedan ${p.weight} por ganar.` : 'Agotado: no puede volver a salir hasta que subas la cantidad.')
          : 'Peso relativo (no se agota).';
      });
      row.querySelector('.prize-iswinning').addEventListener('change', (e) => {
        draft.prizes[idx].isWinning = e.target.checked;
        renderPrizeRows();
      });
      row.querySelector('.prize-remove').addEventListener('click', () => {
        if (draft.prizes.length <= 1) { alert('Debe quedar al menos un premio en la lista.'); return; }
        draft.prizes.splice(idx, 1);
        renderPrizeRows();
      });
      row.querySelector('.prize-photo-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await ScratchStorage.compressImage(file, 500, 0.85);
        draft.prizes[idx].photo = dataUrl;
        renderPrizeRows();
      });
    });
  }

  // ---------- Tab: Ajustes ----------
  function renderSettingsTab() {
    const el = document.getElementById('tab-settings');
    el.innerHTML = `
      <div class="admin-card">
        <div class="field-group">
          <label>PIN de administrador</label>
          <input type="text" id="f-pin" value="${escapeAttr(draft.adminPin)}" maxlength="8" inputmode="numeric">
          <p class="field-note">Se pedira este PIN para volver a entrar a este panel.</p>
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Pantalla de inicio / protector de pantalla</label>
        <div class="field-group">
          <label>Mostrar la pantalla de inicio tras (segundos de inactividad)</label>
          <input type="number" id="f-idle" value="${draft.idleTimeoutSeconds}" min="0" step="5">
          <p class="field-note">Usa 0 para desactivar el protector de pantalla y dejar el juego siempre activo.</p>
        </div>
      </div>
      <div class="admin-card">
        <label class="section-label">Exportar / importar plantilla</label>
        <p class="field-note">Guarda toda esta personalizacion (diseno, plantilla y premios) en un archivo para respaldarla o pasarla a otro dispositivo.</p>
        <div class="export-import-row">
          <button class="btn btn-ghost" id="export-btn">⬇ Exportar plantilla</button>
          <label class="btn btn-ghost file-btn">
            ⬆ Importar plantilla
            <input type="file" id="import-input" accept="application/json,.json" hidden>
          </label>
        </div>
      </div>
    `;
    el.querySelector('#f-pin').addEventListener('input', (e) => { draft.adminPin = e.target.value || '1234'; });
    el.querySelector('#f-idle').addEventListener('input', (e) => { draft.idleTimeoutSeconds = Math.max(0, Number(e.target.value) || 0); });
    el.querySelector('#export-btn').addEventListener('click', handleExport);
    el.querySelector('#import-input').addEventListener('change', handleImport);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (draft.branding.title || 'scratch-card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    a.download = `${safeName || 'scratch-card'}-plantilla.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const merged = ScratchStorage.mergeWithDefaults(parsed);
        render(merged, { onSave, onCancel });
        alert('Plantilla importada. Revisa los cambios y presiona "Guardar cambios" para aplicarlos.');
      } catch (err) {
        alert('El archivo no es una plantilla valida.');
      }
    };
    reader.readAsText(file);
  }

  function escapeAttr(str) {
    return String(str ?? '').replace(/"/g, '&quot;');
  }

  return { render };
})();

window.ScratchAdmin = ScratchAdmin;
