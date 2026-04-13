'use strict';

// ── ITEM DEFINITIONS ──
const ITEMS = [
  {
    id: 'doubletap',
    name: 'DOUBLE TAP',
    icon: '🧨',
    desc: 'Next live round deals 2 damage instead of 1.',
    use(state, who) {
      state.doubleTap = true;
      log(`${who === 'player' ? 'You' : 'CPU'} primed DOUBLE TAP — next live round deals 2 damage.`, 'gold');
    }
  },
  {
    id: 'spin',
    name: 'SPIN',
    icon: '🔄',
    desc: 'Reshuffles all unspent chambers randomly.',
    use(state, who) {
      spinCylinder(state);
      log(`${who === 'player' ? 'You' : 'CPU'} used SPIN — the cylinder was reshuffled.`, 'gold');
      renderCylinder(state);
    }
  },
  {
    id: 'heal',
    name: 'HEAL',
    icon: '💊',
    desc: 'Restore 1 HP. Rare — only a 20% chance of being granted each round.',
    use(state, who) {
      if (who === 'player') {
        state.playerHP = Math.min(state.maxHP, state.playerHP + 1);
        log('You used HEAL — restored 1 HP.', 'green');
      } else {
        state.enemyHP = Math.min(state.maxHP, state.enemyHP + 1);
        log('CPU used HEAL — restored 1 HP.', 'green');
      }
      renderHP();
    }
  }
];

const ITEM_MAP = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// ── STATE ──
let state = {};

function newGame() {
  const liveCount = Math.floor(Math.random() * 5) + 1;
  state = {
    playerHP: 6, enemyHP: 6, maxHP: 6,
    playerItems: [], enemyItems: [],
    cylinder: buildCylinder(liveCount),
    currentChamber: 0,
    round: 1, playerTurn: true,
    doubleTap: false, busy: false,
    liveCount,
  };
}

function buildCylinder(liveCount) {
  const cyl = Array(6).fill('blank');
  shuffle([0,1,2,3,4,5]).slice(0, liveCount).forEach(p => cyl[p] = 'live');
  return cyl;
}

function spinCylinder(s) {
  const liveN = s.cylinder.filter(c => c === 'live').length;
  const blankN = s.cylinder.filter(c => c === 'blank').length;
  let pool = shuffle([...Array(liveN).fill('live'), ...Array(blankN).fill('blank')]);
  let pi = 0;
  for (let i = 0; i < 6; i++) if (s.cylinder[i] !== 'spent') s.cylinder[i] = pool[pi++];
  const nonSpent = [0,1,2,3,4,5].filter(i => s.cylinder[i] !== 'spent');
  s.currentChamber = nonSpent.length ? nonSpent[Math.floor(Math.random() * nonSpent.length)] : 0;
}

function advanceChamber(s) {
  let next = (s.currentChamber + 1) % 6;
  for (let t = 0; t < 6; t++) { if (s.cylinder[next] !== 'spent') break; next = (next + 1) % 6; }
  s.currentChamber = next;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// Non-heal items pool for normal draws
const COMMON_ITEMS = ['doubletap', 'spin'];

function randomItemId() {
  // 20% chance to get heal, 80% chance for a common item
  if (Math.random() < 0.2) return 'heal';
  return COMMON_ITEMS[Math.floor(Math.random() * COMMON_ITEMS.length)];
}

function grantItems() {
  for (let i = 0; i < 2; i++) {
    if (state.playerItems.length < 4) state.playerItems.push(randomItemId());
    if (state.enemyItems.length < 4) state.enemyItems.push(randomItemId());
  }
  renderItems();
}

// ── DOM ──
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function log(msg, type = '') {
  const el = $('log-text');
  el.textContent = msg;
  el.className = '';
  if (type === 'red') el.classList.add('flash-red');
  if (type === 'green') el.classList.add('flash-green');
  if (type === 'gold') el.classList.add('flash-gold');
}

function renderHP() {
  const pPct = (state.playerHP / state.maxHP) * 100;
  const ePct = (state.enemyHP / state.maxHP) * 100;
  $('player-hp-bar').style.width = pPct + '%';
  $('enemy-hp-bar').style.width = ePct + '%';
  $('player-hp-bar').classList.toggle('low', state.playerHP <= 2);
  $('enemy-hp-bar').classList.toggle('low', state.enemyHP <= 2);
  $('player-hp-num').textContent = state.playerHP;
  $('enemy-hp-num').textContent = state.enemyHP;
}

function renderCylinder(s) {
  const ring = $('chamber-ring');
  ring.innerHTML = '';
  const r = 58;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const div = document.createElement('div');
    div.className = 'chamber';
    div.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    const t = s.cylinder[i];
    // All unspent chambers look identical — player cannot tell live from blank
    if (t === 'spent') div.classList.add('spent');
    else div.classList.add('blank');
    if (i === s.currentChamber && t !== 'spent') div.classList.add('current');
    ring.appendChild(div);
  }
  $('cylinder-label').textContent = `${s.cylinder.filter(c => c !== 'spent').length} remaining`;
  $('round-badge').textContent = `ROUND ${state.round}`;
}

function renderTurn() {
  const isPlayer = state.playerTurn;
  $('turn-text').textContent = isPlayer ? 'YOUR TURN' : "CPU'S TURN";
  $('turn-text').classList.toggle('active-turn', isPlayer);
  $('turn-dot').classList.toggle('active', isPlayer);
  $('actions-section').querySelectorAll('button').forEach(b => { b.disabled = !isPlayer || state.busy; });
}

function renderItems() {
  renderItemGrid('player-items', state.playerItems, 'player');
  renderItemGrid('enemy-items', state.enemyItems, 'enemy');
}

function renderItemGrid(containerId, items, who) {
  const grid = $(containerId);
  grid.innerHTML = '';
  items.forEach((itemId, idx) => {
    const def = ITEM_MAP[itemId];
    if (!def) return;
    const chip = document.createElement('div');
    chip.className = 'item-chip' + (who === 'enemy' ? ' enemy-item' : '');
    chip.innerHTML = `<span>${def.icon}</span><span>${def.name}</span>`;
    if (who === 'player') chip.addEventListener('click', () => { if (!state.busy && state.playerTurn) useItem(idx, 'player'); });
    grid.appendChild(chip);
  });
}

// ── SHOOT ──
function shoot(shooter, target) {
  if (state.busy) return;
  state.busy = true;
  setActionButtons(false);

  const chamber = state.cylinder[state.currentChamber];
  const isLive = chamber === 'live';
  const dmg = (isLive && state.doubleTap) ? 2 : 1;
  state.doubleTap = false;
  state.cylinder[state.currentChamber] = 'spent';

  const cyl = $('cylinder');
  cyl.classList.add('shake');
  setTimeout(() => cyl.classList.remove('shake'), 400);

  setTimeout(() => {
    if (isLive) {
      if (target === 'player') {
        state.playerHP = Math.max(0, state.playerHP - dmg);
        log(`BANG! Live round — you take ${dmg} damage. Turn ends.`, 'red');
      } else {
        state.enemyHP = Math.max(0, state.enemyHP - dmg);
        log(`BANG! Live round — CPU takes ${dmg} damage. Turn ends.`, 'red');
      }
      renderHP();
      advanceChamber(state);
      renderCylinder(state);
      setTimeout(() => {
        if (checkGameOver()) return;
        if (state.cylinder.filter(c => c !== 'spent').length === 0) { newRound(); return; }
        state.playerTurn = !state.playerTurn;
        state.busy = false;
        renderTurn();
        if (!state.playerTurn) cpuTurn();
      }, 700);
    } else {
      if (shooter === target) {
        // shot self with blank → keep turn
        log(`Click. Blank — ${shooter === 'player' ? 'you keep' : 'CPU keeps'} their turn.`, 'green');
        advanceChamber(state);
        renderCylinder(state);
        setTimeout(() => {
          if (state.cylinder.filter(c => c !== 'spent').length === 0) { newRound(); return; }
          state.busy = false;
          if (shooter === 'player') setActionButtons(true);
          else cpuTurn();
        }, 700);
      } else {
        // shot opponent with blank → turn ends
        log(`Click. Blank — nothing happens. ${shooter === 'player' ? "CPU's" : 'your'} turn.`, 'green');
        advanceChamber(state);
        renderCylinder(state);
        setTimeout(() => {
          if (state.cylinder.filter(c => c !== 'spent').length === 0) { newRound(); return; }
          state.playerTurn = !state.playerTurn;
          state.busy = false;
          renderTurn();
          if (!state.playerTurn) cpuTurn();
        }, 700);
      }
    }
  }, 500);
}

function setActionButtons(enabled) {
  $('btn-shoot-self').disabled = !enabled;
  $('btn-shoot-enemy').disabled = !enabled;
}

function checkGameOver() {
  if (state.playerHP <= 0 || state.enemyHP <= 0) { showGameOver(state.enemyHP <= 0); return true; }
  return false;
}

function showGameOver(win) {
  $('over-icon').textContent = win ? '🏆' : '🤣';
  $('over-title').textContent = win ? 'YOU WIN' : 'YOU DIED';
  $('over-title').className = win ? 'win' : 'lose';
  $('over-sub').textContent = win ? 'The cylinder favoured you today.' : 'The cylinder did not favour you.';
  setTimeout(() => showScreen('screen-over'), 400);
}

function newRound() {
  state.round++;
  const liveCount = Math.floor(Math.random() * 5) + 1;
  state.cylinder = buildCylinder(liveCount);
  state.currentChamber = 0;
  state.liveCount = liveCount;
  grantItems();
  log('New round! Cylinder reloaded. Items granted.', 'gold');
  renderCylinder(state);
  showItemPopup(null, `ROUND ${state.round}`, 'New cylinder loaded. 2 items granted each.');
  setTimeout(() => {
    state.busy = false;
    renderTurn();
    if (!state.playerTurn) cpuTurn();
    else setActionButtons(true);
  }, 1600);
}

// ── ITEMS ──
function useItem(idx, who) {
  const items = who === 'player' ? state.playerItems : state.enemyItems;
  const def = ITEM_MAP[items[idx]];
  if (!def) return;
  items.splice(idx, 1);
  renderItems();
  showItemPopup(def.icon, def.name, def.desc);
  def.use(state, who);
  setTimeout(() => { renderCylinder(state); renderTurn(); if (who === 'player') setActionButtons(true); }, 800);
}

function showItemPopup(icon, name, desc) {
  $('popup-icon').textContent = icon || '';
  $('popup-name').textContent = name;
  $('popup-desc').textContent = desc;
  $('item-overlay').classList.remove('hidden');
  setTimeout(() => $('item-overlay').classList.add('hidden'), 1400);
}

// ── CPU AI — pure 50/50 coin flip, no knowledge of cylinder ──
function cpuTurn() {
  if (state.busy) return;
  state.busy = true;
  setActionButtons(false);

  setTimeout(() => {
    // 40% chance to use a random item, chosen blindly
    if (state.enemyItems.length > 0 && Math.random() < 0.4) {
      const idx = Math.floor(Math.random() * state.enemyItems.length);
      const def = ITEM_MAP[state.enemyItems[idx]];
      state.enemyItems.splice(idx, 1);
      renderItems();
      if (def) { showItemPopup(def.icon, def.name, def.desc); def.use(state, 'enemy'); }
    }

    setTimeout(() => {
      // Pure coin flip — CPU has zero knowledge of what's in the cylinder
      state.busy = false;
      if (Math.random() < 0.5) shoot('enemy', 'enemy');
      else shoot('enemy', 'player');
    }, 700);
  }, 500);
}

// ── INIT ──
function startGame() {
  newGame();
  grantItems();
  showScreen('screen-game');
  renderHP();
  renderCylinder(state);
  renderTurn();
  renderItems();
  log(`Cylinder loaded. ${state.liveCount} live round${state.liveCount > 1 ? 's' : ''} hidden inside. Your turn.`);
  setActionButtons(true);
}

$('btn-start').addEventListener('click', startGame);
$('btn-restart').addEventListener('click', startGame);
$('btn-shoot-self').addEventListener('click', () => { if (!state.busy && state.playerTurn) { setActionButtons(false); shoot('player','player'); } });
$('btn-shoot-enemy').addEventListener('click', () => { if (!state.busy && state.playerTurn) { setActionButtons(false); shoot('player','enemy'); } });
