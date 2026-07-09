/* game.js — controlador de la pantalla de juego */

const ScratchGame = (function () {
  let config = null;
  let board = [];
  let revealedFlags = [];
  let cells = [];
  let roundFinished = false;
  let lastWinningPrizeId = null; // evita que el mismo premio ganador salga 2 veces seguidas

  function render(cfg) {
    config = cfg;
    const root = document.getElementById('game-screen');
    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'game-wrap';
    wrap.innerHTML = `
      <div class="board-area board-${config.template}" id="board-area"></div>
      <div class="game-actions">
        <button class="btn btn-primary" id="new-card-btn">${escapeHtml(config.branding.newCardButtonText || 'Nueva tarjeta')}</button>
      </div>
    `;
    root.appendChild(wrap);

    document.getElementById('new-card-btn').addEventListener('click', startNewRound);

    startNewRound();
  }

  // en la plantilla "triple" las 3 celdas se apilan verticalmente: si su
  // tamano solo se calcula en base al ancho (vw), en pantallas bajas y
  // angostas la columna termina mas alta que la pantalla y obliga a hacer
  // scroll. Por eso el ancho de la celda tambien se limita segun el alto
  // real disponible (pantalla - encabezado - boton - paddings/gaps).
  function fitTripleBoard() {
    if (!config || config.template !== 'triple') return;
    const header = document.getElementById('app-header');
    const wrap = document.querySelector('#game-screen .game-wrap');
    const boardArea = document.getElementById('board-area');
    const actions = wrap && wrap.querySelector('.game-actions');
    if (!wrap || !boardArea || !actions) return;

    // #game-screen no esta limitado por el viewport (por diseno, para
    // permitir scroll cuando haga falta), asi que su altura no sirve como
    // presupuesto: usamos el alto real de pantalla menos el encabezado.
    const headerHeight = (header && !header.classList.contains('hidden'))
      ? header.getBoundingClientRect().height
      : 0;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const available = viewportHeight - headerHeight;

    const wrapStyle = getComputedStyle(wrap);
    const wrapPad = parseFloat(wrapStyle.paddingTop) + parseFloat(wrapStyle.paddingBottom);
    const wrapGap = parseFloat(wrapStyle.rowGap) || 0;

    const boardStyle = getComputedStyle(boardArea);
    const boardPadV = parseFloat(boardStyle.paddingTop) + parseFloat(boardStyle.paddingBottom);
    const boardPadH = parseFloat(boardStyle.paddingLeft) + parseFloat(boardStyle.paddingRight);
    const cellGaps = (parseFloat(boardStyle.rowGap) || 0) * 2; // 2 huecos entre 3 celdas

    const actionsHeight = actions.getBoundingClientRect().height;
    const safety = 8; // margen para evitar 1px de desborde por redondeo

    const availableForCells = available - wrapPad - wrapGap - boardPadV - cellGaps - actionsHeight - safety;
    const maxCellByHeight = availableForCells / 3;

    const vw = window.innerWidth;
    let widthCap;
    if (vw >= 900) widthCap = 260;
    else if (vw >= 640) widthCap = Math.min(vw * 0.4, 260);
    else widthCap = Math.min(vw * 0.62, 240);
    const maxCellByWidth = widthCap - boardPadH;

    const cellSize = Math.max(56, Math.min(maxCellByWidth, maxCellByHeight));
    boardArea.style.width = `${cellSize + boardPadH}px`;
  }

  window.addEventListener('resize', fitTripleBoard);

  function startNewRound() {
    roundFinished = false;
    const outcome = ScratchTemplates.pickOutcome(config.prizes, lastWinningPrizeId);
    // el numero de "probabilidad" de un premio es la cantidad de veces que
    // todavia se puede ganar: se descuenta al dejarlo salir (aunque el
    // jugador no termine de rasparlo) y, en 0, deja de poder salir hasta
    // que alguien le suba la cantidad de nuevo desde el panel admin.
    if (outcome.isWinning) {
      outcome.weight = Math.max(0, (Number(outcome.weight) || 0) - 1);
      ScratchStorage.saveConfig(config);
    }
    // solo se recuerda el ultimo premio GANADOR (no "sin premio", que debe
    // poder repetirse libremente) para no dejarlo salir 2 veces seguidas
    lastWinningPrizeId = outcome.isWinning ? outcome.id : null;
    board = ScratchTemplates.buildBoard(config.template, outcome, config.prizes);
    revealedFlags = board.map(() => false);
    cells = [];

    const boardArea = document.getElementById('board-area');
    boardArea.innerHTML = '';
    boardArea.style.width = '';

    board.forEach((cellData, index) => {
      const prize = cellData.prizeId ? config.prizes.find((p) => p.id === cellData.prizeId) : null;
      const photo = cellData.photo || (prize && prize.photo) || null;
      const label = cellData.label || (prize && prize.label) || '';
      const cellEl = document.createElement('div');
      cellEl.className = 'scratch-cell';
      cellEl.innerHTML = `
        <div class="cell-content">
          ${photo
            ? `<img class="cell-photo" src="${photo}" alt="${escapeHtml(label)}">`
            : `<span class="cell-icon">${cellData.icon || ''}</span>`}
          ${cellData.label ? `<span class="cell-label">${escapeHtml(cellData.label)}</span>` : ''}
        </div>
        <canvas class="cell-canvas"></canvas>
      `;
      boardArea.appendChild(cellEl);

      const canvas = cellEl.querySelector('canvas');
      const fontOptions = window.ScratchStorage ? window.ScratchStorage.FONT_OPTIONS : null;
      const fontKey = fontOptions && fontOptions[config.branding.fontFamily] ? config.branding.fontFamily : 'default';
      const fontStack = fontOptions ? fontOptions[fontKey].stack : 'sans-serif';
      const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

      // esperar a que el layout tenga tamano real y la tipografia este cargada antes de pintar el canvas
      requestAnimationFrame(() => {
        fontsReady.then(() => {
          const cell = new ScratchCell(canvas, {
            threshold: 0.55,
            brushSize: Math.max(14, canvas.getBoundingClientRect().width * 0.12),
            coverColor: config.branding.secondaryColor || '#c9c9d6',
            textColor: config.branding.cellTextColor || '#ffffff',
            fontFamily: fontStack,
            onRevealed: () => onCellRevealed(index)
          });
          cells.push(cell);
        });
      });
    });

    fitTripleBoard();
  }

  function onCellRevealed(index) {
    if (roundFinished) return;
    revealedFlags[index] = true;

    const revealedCells = board.filter((c, i) => revealedFlags[i]);
    const result = ScratchTemplates.evaluateBoard(config.template, revealedCells, config.prizes);

    if (result.won) {
      finishRound(true, result.prize);
    } else if (revealedFlags.every(Boolean)) {
      finishRound(false, null);
    }
  }

  function finishRound(won, prize) {
    roundFinished = true;
    cells.forEach((c) => c.reveal());
    showResultModal(won, prize);
  }

  function showResultModal(won, prize) {
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-message');
    const photo = document.getElementById('result-photo');

    modal.classList.toggle('win', won);
    modal.classList.toggle('lose', !won);
    title.textContent = won
      ? (config.branding.resultWinTitle || '¡FELICIDADES!')
      : (config.branding.resultLoseTitle || 'SIGUE INTENTANDO');
    msg.textContent = won ? prize.label : (config.branding.resultLoseMessage || 'Esta vez no hubo premio.');

    if (won && prize.photo) {
      photo.src = prize.photo;
      photo.style.display = '';
    } else {
      photo.removeAttribute('src');
      photo.style.display = 'none';
    }

    modal.classList.add('visible');
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function hideResultModal() {
    document.getElementById('result-modal').classList.remove('visible');
  }

  return { render, hideResultModal, newRound: () => startNewRound() };
})();

window.ScratchGame = ScratchGame;
