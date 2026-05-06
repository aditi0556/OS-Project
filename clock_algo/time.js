const timeState = {
  memoryFrames: [],
  pointer: 0,
  hits: 0,
  misses: 0,
  history: [],
  lastMessage: 'Create frames and enter a page sequence to begin.'
};

function initVortexBackground() {
  const canvas = document.getElementById('vortex-canvas');
  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let particles = [];
  const hues = [
    { h: 240, spread: 25 },
    { h: 262, spread: 22 },
    { h: 192, spread: 18 }
  ];

  function minHalf() {
    return Math.min(width, height) * 0.5;
  }

  class Particle {
    constructor(boot) {
      const hueDefinition = hues[Math.floor(Math.random() * hues.length)];
      this.hue = hueDefinition.h + (Math.random() - 0.5) * hueDefinition.spread;
      this.saturation = 70 + Math.random() * 20;
      this.lightness = 55 + Math.random() * 25;
      this.angle = Math.random() * Math.PI * 2;
      this.radius = boot ? Math.random() * minHalf() : 1;
      this.velocityAngle = 0.0018 + Math.random() * 0.004;
      this.velocityRadius = (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.55);
      this.size = 0.4 + Math.random() * 1.5;
      this.life = 0;
      this.maxLife = 110 + Math.random() * 210;
    }

    step() {
      this.angle += this.velocityAngle;
      this.radius += this.velocityRadius * 0.38;
      this.life += 1;

      if (this.radius < 1 || this.radius > minHalf() || this.life > this.maxLife) {
        Object.assign(this, new Particle(false));
      }
    }

    paint() {
      const progress = this.life / this.maxLife;
      const alpha = progress < 0.12
        ? progress / 0.12
        : progress > 0.8
          ? (1 - progress) / 0.2
          : 1;

      const x = width / 2 + Math.cos(this.angle) * this.radius;
      const y = height / 2 + Math.sin(this.angle) * this.radius;

      context.beginPath();
      context.arc(x, y, this.size, 0, Math.PI * 2);
      context.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${(alpha * 0.65).toFixed(2)})`;
      context.fill();
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function populate() {
    particles = Array.from({ length: 400 }, () => new Particle(true));
  }

  function draw() {
    context.fillStyle = 'rgba(6, 6, 8, 0.17)';
    context.fillRect(0, 0, width, height);

    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, minHalf() * 0.55);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
    gradient.addColorStop(1, 'transparent');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.step();
      particle.paint();
    });

    window.requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    populate();
  });

  resize();
  populate();
  draw();
}

function initScrollHeader() {
  const header = document.querySelector('.ps-header');
  if (!header) {
    return;
  }

  function syncHeader() {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }

  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateSummary() {
  const container = document.getElementById('simulation-summary');
  const total = timeState.hits + timeState.misses;
  const hitRatio = total ? (timeState.hits / total).toFixed(2) : '0.00';

  container.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Clock Pointer</span>
      <span class="summary-value">${timeState.memoryFrames.length ? timeState.pointer : '-'}</span>
      <p class="summary-note">Current frame index under inspection.</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Page Hits</span>
      <span class="summary-value">${timeState.hits}</span>
      <p class="summary-note">Pages already found in memory.</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Page Misses</span>
      <span class="summary-value">${timeState.misses}</span>
      <p class="summary-note">Pages that required loading or replacement.</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Hit Ratio</span>
      <span class="summary-value">${hitRatio}</span>
      <p class="summary-note">Calculated as hits / total references.</p>
    </div>
  `;
}

function updateStatus(type = 'neutral') {
  const statusPanel = document.getElementById('simulation-status');
  const statusClass = type === 'safe'
    ? 'status-safe'
    : type === 'unsafe'
      ? 'status-unsafe'
      : 'status-neutral';

  statusPanel.className = `status-banner ${statusClass}`;
  statusPanel.innerHTML = `
    <div class="status-title">Clock Algorithm State</div>
    <p>${escapeHtml(timeState.lastMessage)}</p>
  `;
}

function renderFrames() {
  const container = document.getElementById('frame-container');

  if (!timeState.memoryFrames.length) {
    container.innerHTML = '<div class="frame-card empty-state"><p>No frames created yet.</p></div>';
    return;
  }

  container.innerHTML = timeState.memoryFrames.map((frame, index) => `
    <div class="frame-card ${timeState.pointer === index ? 'active-pointer' : ''}">
      <div class="frame-title">
        <span class="frame-index">Frame ${index}</span>
        ${timeState.pointer === index ? '<span class="pointer-chip">Pointer</span>' : ''}
      </div>
      <div class="frame-page">${frame.pageId === null ? 'Empty' : `Page ${escapeHtml(frame.pageId)}`}</div>
      <div class="frame-meta">Reference bit: ${frame.referenced ? '1' : '0'}</div>
    </div>
  `).join('');
}

function renderTable() {
  const tableHead = document.getElementById('frame-table-head');
  const tableBody = document.getElementById('frame-table-body');

  if (!timeState.memoryFrames.length) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="1">Create frames to generate the frame table.</td></tr>';
    return;
  }

  const frameHeaders = timeState.memoryFrames.map((_, index) => `
    <th>Frame ${index}</th>
    <th>Ref ${index}</th>
  `).join('');

  tableHead.innerHTML = `
    <tr>
      <th>Step</th>
      <th>Page</th>
      <th>Status</th>
      <th>Pointer</th>
      ${frameHeaders}
    </tr>
  `;

  if (!timeState.history.length) {
    tableBody.innerHTML = `<tr><td colspan="${4 + timeState.memoryFrames.length * 2}">No replacements processed yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = timeState.history.map((entry) => {
    const cells = entry.frames.map((frame) => `
      <td>${frame.pageId === null ? 'Empty' : escapeHtml(frame.pageId)}</td>
      <td>${frame.referenced ? '1' : '0'}</td>
    `).join('');

    return `
      <tr>
        <td>${entry.step}</td>
        <td>${escapeHtml(entry.page)}</td>
        <td class="${entry.status === 'Hit' ? 'table-hit' : 'table-miss'}">${entry.status}</td>
        <td>${entry.pointer}</td>
        ${cells}
      </tr>
    `;
  }).join('');
}

function renderExplanation() {
  const panel = document.getElementById('algorithm-explanation');
  const total = timeState.hits + timeState.misses;
  const missRatio = total ? (timeState.misses / total).toFixed(2) : '0.00';

  panel.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Algorithm</span>
      <span class="summary-value">Clock / Second Chance</span>
      <p class="summary-note">The pointer rotates through frames and clears reference bits before choosing a victim page.</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Latest Result</span>
      <span class="summary-value">${escapeHtml(timeState.lastMessage)}</span>
      <p class="summary-note">Each row stores the state of every frame immediately after a page request is processed.</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Miss Ratio</span>
      <span class="summary-value">${missRatio}</span>
      <p class="summary-note">A higher miss ratio means the reference string is causing more replacements.</p>
    </div>
  `;
}

function renderAll(statusType = 'neutral') {
  updateSummary();
  updateStatus(statusType);
  renderFrames();
  renderTable();
  renderExplanation();
}

function resetStateForSimulation(frameCount) {
  timeState.pointer = 0;
  timeState.hits = 0;
  timeState.misses = 0;
  timeState.history = [];
  timeState.memoryFrames = Array.from({ length: frameCount }, () => ({
    pageId: null,
    referenced: false
  }));
}

function createFrames() {
  const frameCount = Number.parseInt(document.getElementById('frame-count').value, 10);

  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    timeState.lastMessage = 'Enter a valid frame count greater than 0.';
    renderAll('unsafe');
    return;
  }

  resetStateForSimulation(frameCount);
  timeState.lastMessage = `Created ${frameCount} memory frames.`;
  renderAll('safe');
}

function parseSequence() {
  const rawValue = document.getElementById('page-reference').value.trim();
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .map((value) => Number(value));
}

function recordHistory(step, pageId, status) {
  timeState.history.push({
    step,
    page: pageId,
    status,
    pointer: timeState.pointer,
    frames: timeState.memoryFrames.map((frame) => ({
      pageId: frame.pageId,
      referenced: frame.referenced
    }))
  });
}

function simulateClock() {
  if (!timeState.memoryFrames.length) {
    timeState.lastMessage = 'Create frames before running the simulation.';
    renderAll('unsafe');
    return;
  }

  const sequence = parseSequence();
  if (!sequence.length || sequence.some((value) => Number.isNaN(value))) {
    timeState.lastMessage = 'Enter a valid comma-separated page reference sequence.';
    renderAll('unsafe');
    return;
  }

  const frameCount = timeState.memoryFrames.length;
  resetStateForSimulation(frameCount);

  sequence.forEach((pageId, index) => {
    const hitIndex = timeState.memoryFrames.findIndex((frame) => frame.pageId === pageId);

    if (hitIndex !== -1) {
      timeState.memoryFrames[hitIndex].referenced = true;
      timeState.hits += 1;
      timeState.lastMessage = `Page ${pageId} was found in memory.`;
      recordHistory(index + 1, pageId, 'Hit');
      return;
    }

    timeState.misses += 1;
    let replaced = false;

    while (!replaced) {
      const currentFrame = timeState.memoryFrames[timeState.pointer];

      if (currentFrame.pageId === null) {
        currentFrame.pageId = pageId;
        currentFrame.referenced = true;
        timeState.pointer = (timeState.pointer + 1) % timeState.memoryFrames.length;
        replaced = true;
      } else if (!currentFrame.referenced) {
        currentFrame.pageId = pageId;
        currentFrame.referenced = true;
        timeState.pointer = (timeState.pointer + 1) % timeState.memoryFrames.length;
        replaced = true;
      } else {
        currentFrame.referenced = false;
        timeState.pointer = (timeState.pointer + 1) % timeState.memoryFrames.length;
      }
    }

    timeState.lastMessage = `Page ${pageId} caused a miss and was placed using the clock pointer.`;
    recordHistory(index + 1, pageId, 'Miss');
  });

  const total = timeState.hits + timeState.misses;
  const hitRatio = total ? (timeState.hits / total).toFixed(2) : '0.00';
  timeState.lastMessage = `Simulation complete. Hits: ${timeState.hits}, misses: ${timeState.misses}, hit ratio: ${hitRatio}.`;
  renderAll('safe');
}

function resetSimulation() {
  document.getElementById('frame-count').value = '';
  document.getElementById('page-reference').value = '';
  timeState.memoryFrames = [];
  timeState.pointer = 0;
  timeState.hits = 0;
  timeState.misses = 0;
  timeState.history = [];
  timeState.lastMessage = 'Simulation reset. Create frames and enter a page sequence to begin again.';
  renderAll('neutral');
}

document.addEventListener('DOMContentLoaded', () => {
  initVortexBackground();
  initScrollHeader();
  renderAll();

  document.getElementById('create-frames-btn').addEventListener('click', createFrames);
  document.getElementById('simulate-btn').addEventListener('click', simulateClock);
  document.getElementById('reset-btn').addEventListener('click', resetSimulation);
});
