'use strict';

const ALGO_META = {
  fifo:    { label: 'FIFO',    sub: 'First In, First Out',        icon: 'fas fa-clock-rotate-left' },
  lru:     { label: 'LRU',     sub: 'Least Recently Used',        icon: 'fas fa-arrow-rotate-left' },
  lfu:     { label: 'LFU',     sub: 'Least Frequently Used',      icon: 'fas fa-chart-bar'         },
  optimal: { label: 'Optimal', sub: 'Best possible replacement',  icon: 'fas fa-bullseye'          },
  random:  { label: 'Random',  sub: 'Random eviction',            icon: 'fas fa-shuffle'           },
};

let selectedAlgo = 'fifo';
let refString    = [];
let frameCount   = 3;
let result       = null;
let currentStep  = 0;
let animInterval = null;
let animSpeed    = 750;

document.addEventListener('DOMContentLoaded', () => {
  buildAlgoTabs();

  document.getElementById('runBtn').addEventListener('click', () => {
    resetState();
    animInterval = setInterval(stepOnce, animSpeed);
  });

  document.getElementById('stepBtn').addEventListener('click', stepOnce);

  document.getElementById('resetBtn').addEventListener('click', resetState);

  document.getElementById('speed').addEventListener('change', e => {
    animSpeed = parseInt(e.target.value);
    if (animInterval) {
      clearInterval(animInterval);
      animInterval = setInterval(stepOnce, animSpeed);
    }
  });

  resetState();
});

function buildAlgoTabs() {
  const container = document.getElementById('algoSelector');
  container.innerHTML = '';

  Object.entries(ALGO_META).forEach(([key, meta]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'algo-tab' + (key === selectedAlgo ? ' algo-tab--active' : '');
    btn.dataset.algo = key;
    btn.innerHTML = `<i class="${meta.icon}"></i><span>${meta.label}</span>`;
    btn.addEventListener('click', () => {
      selectedAlgo = key;
      document.querySelectorAll('.algo-tab').forEach(b =>
        b.classList.toggle('algo-tab--active', b.dataset.algo === key)
      );
      document.getElementById('algoTitle').textContent = meta.label;
      document.getElementById('algoSub').textContent   = meta.sub;
      document.getElementById('algoIcon').className    = meta.icon;
      resetState();
    });
    container.appendChild(btn);
  });
}

function readInputs() {
  refString  = document.getElementById('referenceString').value
    .split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
  frameCount = Math.max(1, parseInt(document.getElementById('frameCount').value) || 3);
  animSpeed  = parseInt(document.getElementById('speed').value);
}

function resetState() {
  clearInterval(animInterval);
  animInterval = null;
  readInputs();
  result      = algorithms[selectedAlgo](refString, frameCount);
  currentStep = 0;
  renderAll();
}

function stepOnce() {
  if (!result || currentStep >= result.history.length) {
    clearInterval(animInterval);
    animInterval = null;
    return;
  }
  currentStep++;
  renderAll();
  if (currentStep >= result.history.length) {
    clearInterval(animInterval);
    animInterval = null;
  }
}

function renderAll() {
  renderRefString();
  renderBadge();
  renderFrameSlots();
  renderTimeline();
  renderStats();
}

function renderRefString() {
  document.getElementById('refStringDisplay').innerHTML = refString.map((p, i) => {
    const cls = i === currentStep - 1 ? 'ref-item ref-current'
              : i < currentStep - 1   ? 'ref-item ref-past'
              : 'ref-item';
    return `<div class="${cls}">${p}</div>`;
  }).join('');
}

function renderBadge() {
  const badge = document.getElementById('stepBadge');
  if (currentStep === 0 || !result) {
    badge.className   = 'step-badge step-badge--idle';
    badge.textContent = 'Ready';
    return;
  }
  const s = result.history[currentStep - 1];
  badge.className   = 'step-badge ' + (s.fault ? 'step-badge--fault' : 'step-badge--hit');
  badge.textContent = s.fault ? `Page ${s.page} → FAULT` : `Page ${s.page} → HIT`;
}

function renderFrameSlots() {
  const snap = (currentStep > 0 && result)
    ? result.history[currentStep - 1].memory
    : Array(frameCount).fill(-1);

  document.getElementById('frameList').innerHTML = snap.map((p, i) => `
    <div class="frame-slot ${p === -1 ? 'frame-slot--empty' : 'frame-slot--filled'}">
      <span class="frame-slot__label">F${i}</span>
      <span class="frame-slot__val">${p === -1 ? '—' : p}</span>
    </div>`).join('');
}

function renderTimeline() {
  if (!result || !result.history.length) return;

  const thead = document.getElementById('timelineHead');
  const tbody = document.getElementById('timelineBody');

  thead.innerHTML = `<tr>
    <th class="tl-frame-label">Frame</th>
    ${result.history.map(s => `<th class="tl-col-head${s.fault ? ' tl-col-fault' : ' tl-col-hit'}">${s.page}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = Array.from({ length: frameCount }, (_, fi) => `
    <tr>
      <td class="tl-frame-label">F${fi}</td>
      ${result.history.map((s, si) => {
        const val  = s.memory[fi];
        const show = si < currentStep;
        const active = si === currentStep - 1;
        const bg = s.fault ? 'tl-fault' : 'tl-hit';
        return `<td class="tl-cell ${bg}${show ? ' tl-visible' : ''}${active ? ' tl-active' : ''}">
          ${show && val !== -1 ? val : ''}
        </td>`;
      }).join('')}
    </tr>`).join('');

  const activeCell = tbody.querySelector('.tl-active');
  if (activeCell) activeCell.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function renderStats() {
  const step   = currentStep;
  const faults = result ? result.history.slice(0, step).filter(s => s.fault).length : 0;
  const hits   = step - faults;
  const fPct   = step > 0 ? Math.round((faults / step) * 100) : 0;
  const hPct   = step > 0 ? Math.round((hits   / step) * 100) : 0;

  document.getElementById('statRefs').textContent   = step;
  document.getElementById('statTotal').textContent  = refString.length;
  document.getElementById('statFaults').textContent = `${faults} (${fPct}%)`;
  document.getElementById('statHits').textContent   = `${hits} (${hPct}%)`;
}