/* templates.js — logica de las 3 mecanicas de juego (plantillas) */

const TEMPLATE_META = {
  triple: {
    label: 'Triple (estilo maquinita)',
    description: 'El jugador rasca 3 casillas en columna. Si las 3 coinciden en el icono de premio, gana ese premio.'
  },
  single: {
    label: 'Tarjeta unica',
    description: 'El jugador rasca una sola zona grande y se revela directamente si gano y que premio obtuvo.'
  }
};

// simbolos usados solo si el cliente no configuro ningun premio (caso limite)
const FILLER_ICONS = ['🍒', '🔔', '⭐', '🍀', '7️⃣', '💎', '🍋', '🍇'];

// icono generico usado cuando un premio (ganador o de relleno) no tiene foto propia cargada
const PRIZE_FALLBACK_ICON = '🎁';

function randomFiller() {
  return FILLER_ICONS[Math.floor(Math.random() * FILLER_ICONS.length)];
}

/** Foto/icono/nombre a mostrar en una casilla para un premio dado (o null si no hay premios configurados). */
function symbolFromPrize(prize, prizeId) {
  if (!prize) return { icon: randomFiller(), photo: null, label: null, prizeId };
  return {
    icon: prize.photo ? null : PRIZE_FALLBACK_ICON,
    photo: prize.photo || null,
    label: prize.photo ? null : prize.label,
    prizeId
  };
}

function pickRandomPrize(pool) {
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Devuelve hasta `count` premios distintos entre si tomados al azar de pool (sin repetir mientras alcance). */
function pickDistinctPrizes(pool, count) {
  const list = (pool || []).slice();
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const picked = list.slice(0, count);
  while (picked.length < count) picked.push(pickRandomPrize(pool)); // pool mas chico que count: se repite lo que haga falta
  return picked;
}

/**
 * Eleccion ponderada del resultado de la ronda entre TODOS los premios (ganadores y "sin premio").
 * `excludeId` evita repetir el mismo premio GANADOR de la ronda anterior de forma consecutiva
 * (si al excluirlo no queda nada disponible, se ignora la exclusion y se permite repetir).
 */
function pickOutcome(prizes, excludeId) {
  const weightOf = (p) => (excludeId && p.id === excludeId ? 0 : Math.max(0, p.weight));
  let total = prizes.reduce((s, p) => s + weightOf(p), 0);
  if (total <= 0) {
    total = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
    if (total <= 0) return prizes[0];
    let r = Math.random() * total;
    for (const p of prizes) {
      r -= Math.max(0, p.weight);
      if (r <= 0) return p;
    }
    return prizes[prizes.length - 1];
  }
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= weightOf(p);
    if (r <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

/** Construye las 3 casillas de la plantilla "triple". */
function buildTripleBoard(outcome, prizes) {
  if (outcome.isWinning) {
    return [symbolFromPrize(outcome, outcome.id), symbolFromPrize(outcome, outcome.id), symbolFromPrize(outcome, outcome.id)];
  }
  // las casillas de relleno muestran foto/nombre de premios configurados
  // (nunca otorgan premio: prizeId queda en null). Si hay 3 premios o mas
  // configurados se eligen 3 distintos entre si, para que se vean
  // combinaciones variadas en vez de repetir siempre el mismo; con menos
  // premios configurados se reintenta hasta 5 veces para evitar que los 3
  // salgan identicos (mas claro que "perdiste").
  const pool = prizes || [];
  if (pool.length >= 3) {
    const [pa, pb, pc] = pickDistinctPrizes(pool, 3);
    return [symbolFromPrize(pa, null), symbolFromPrize(pb, null), symbolFromPrize(pc, null)];
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const pa = pickRandomPrize(pool);
    const pb = pickRandomPrize(pool);
    const pc = pickRandomPrize(pool);
    if (!(pa === pb && pb === pc)) {
      return [symbolFromPrize(pa, null), symbolFromPrize(pb, null), symbolFromPrize(pc, null)];
    }
  }
  const pa = pickRandomPrize(pool);
  return [symbolFromPrize(pa, null), symbolFromPrize(pa, null), symbolFromPrize(pa, null)];
}

/** Construye la tarjeta unica: una sola celda con el resultado final. */
function buildSingleBoard(outcome) {
  return [
    {
      icon: outcome.isWinning ? PRIZE_FALLBACK_ICON : '❌',
      prizeId: outcome.isWinning ? outcome.id : null,
      label: outcome.isWinning ? outcome.label : (outcome.label || 'SIGUE INTENTANDO')
    }
  ];
}

function buildBoard(templateKey, outcome, prizes) {
  if (templateKey === 'triple') return buildTripleBoard(outcome, prizes);
  return buildSingleBoard(outcome);
}

/** Dado el tablero final y la lista de premios, determina si hubo victoria y con que premio (para triple). */
function evaluateBoard(templateKey, board, prizes) {
  if (templateKey === 'single') {
    const cell = board[0];
    const prize = prizes.find((p) => p.id === cell.prizeId);
    return prize ? { won: true, prize } : { won: false, prize: null };
  }
  const counts = {};
  board.forEach((c) => {
    if (c.prizeId) counts[c.prizeId] = (counts[c.prizeId] || 0) + 1;
  });
  const winningId = Object.keys(counts).find((id) => counts[id] >= 3);
  if (winningId) {
    const prize = prizes.find((p) => p.id === winningId);
    if (prize) return { won: true, prize };
  }
  return { won: false, prize: null };
}

window.ScratchTemplates = { TEMPLATE_META, FILLER_ICONS, pickOutcome, buildBoard, evaluateBoard };
