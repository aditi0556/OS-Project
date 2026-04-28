// Helper functions
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ================= PRODUCER CONSUMER =================
let pcState = { running: false, buffer: [], empty: 0, full: 0, mutex: false, startTime: 0 };
let pcProduced = 0, pcConsumed = 0;

function updatePcUI() {
  let size = parseInt(document.getElementById('pc-buffer-size').value);
  let container = document.getElementById('pc-buffer');
  container.innerHTML = '';
  for (let i = 0; i < size; i++) {
    let cell = document.createElement('div');
    cell.className = 'buffer-cell';
    if (i < pcState.buffer.length) {
      cell.textContent = pcState.buffer[i];
      cell.classList.add('full');
    }
    container.appendChild(cell);
  }
  document.getElementById('pc-empty-val').innerText = pcState.empty;
  document.getElementById('pc-full-val').innerText = pcState.full;
  document.getElementById('pc-prod-count').innerText = pcProduced;
  document.getElementById('pc-cons-count').innerText = pcConsumed;
  let throughput = 0;
  if (pcState.running && Date.now() - pcState.startTime > 0)
    throughput = ((pcProduced + pcConsumed) / ((Date.now() - pcState.startTime) / 1000)).toFixed(1);
  document.getElementById('pc-throughput').innerText = throughput;
}

function addPcLog(msg, type) {
  let log = document.getElementById('pc-log');
  let d = document.createElement('div');
  d.className = `log-entry ${type}`;
  d.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

async function producerLoop(id, minT, maxT) {
  while (pcState.running) {
    let el = document.getElementById(`pc-prod-${id}`);
    el?.classList.remove('active', 'waiting');
    await sleep(randomBetween(minT, maxT));
    if (!pcState.running) break;
    el?.classList.add('waiting');
    while (pcState.empty <= 0 && pcState.running) await sleep(60);
    if (!pcState.running) break;
    pcState.empty--;
    while (pcState.mutex && pcState.running) await sleep(40);
    if (!pcState.running) { pcState.empty++; break; }
    pcState.mutex = true;
    el?.classList.remove('waiting');
    el?.classList.add('active');
    let item = Math.floor(Math.random() * 100);
    pcState.buffer.push(item);
    pcProduced++;
    addPcLog(`Producer ${id} produced ${item}`, 'success');
    updatePcUI();
    await sleep(200);
    el?.classList.remove('active');
    pcState.mutex = false;
    pcState.full++;
    updatePcUI();
  }
  if (document.getElementById(`pc-prod-${id}`)) document.getElementById(`pc-prod-${id}`).style.opacity = '0.5';
}

async function consumerLoop(id, minT, maxT) {
  while (pcState.running) {
    let el = document.getElementById(`pc-cons-${id}`);
    el?.classList.remove('active', 'waiting');
    await sleep(randomBetween(minT, maxT));
    if (!pcState.running) break;
    el?.classList.add('waiting');
    while (pcState.full <= 0 && pcState.running) await sleep(60);
    if (!pcState.running) break;
    pcState.full--;
    while (pcState.mutex && pcState.running) await sleep(40);
    if (!pcState.running) { pcState.full++; break; }
    pcState.mutex = true;
    el?.classList.remove('waiting');
    el?.classList.add('active');
    let val = pcState.buffer.shift();
    pcConsumed++;
    addPcLog(`Consumer ${id} consumed ${val}`, 'success');
    updatePcUI();
    await sleep(200);
    el?.classList.remove('active');
    pcState.mutex = false;
    pcState.empty++;
    updatePcUI();
  }
  if (document.getElementById(`pc-cons-${id}`)) document.getElementById(`pc-cons-${id}`).style.opacity = '0.5';
}

function renderPcAgents(p, c) {
  let prodDiv = document.getElementById('pc-producers-list');
  prodDiv.innerHTML = '';
  let consDiv = document.getElementById('pc-consumers-list');
  consDiv.innerHTML = '';
  for (let i = 0; i < p; i++) {
    let d = document.createElement('div');
    d.className = 'agent-badge';
    d.id = `pc-prod-${i}`;
    d.textContent = `P${i}`;
    prodDiv.appendChild(d);
  }
  for (let i = 0; i < c; i++) {
    let d = document.createElement('div');
    d.className = 'agent-badge consumer';
    d.id = `pc-cons-${i}`;
    d.textContent = `C${i}`;
    consDiv.appendChild(d);
  }
}

function resetPC() {
  pcState.running = false;
  let sz = parseInt(document.getElementById('pc-buffer-size').value);
  pcState.buffer = [];
  pcState.empty = sz;
  pcState.full = 0;
  pcState.mutex = false;
  pcProduced = 0;
  pcConsumed = 0;
  let p = parseInt(document.getElementById('pc-producers-count').value);
  let c = parseInt(document.getElementById('pc-consumers-count').value);
  renderPcAgents(p, c);
  updatePcUI();
  document.getElementById('pc-start-btn').disabled = false;
  document.getElementById('pc-stop-btn').disabled = true;
  document.getElementById('pc-log').innerHTML = '';
  addPcLog('Simulation reset', 'info');
}

function startPC() {
  if (pcState.running) return;
  pcState.running = true;
  pcState.startTime = Date.now();
  let sz = parseInt(document.getElementById('pc-buffer-size').value);
  pcState.empty = sz;
  pcState.full = 0;
  pcState.buffer = [];
  pcState.mutex = false;
  pcProduced = 0;
  pcConsumed = 0;
  let p = parseInt(document.getElementById('pc-producers-count').value);
  let c = parseInt(document.getElementById('pc-consumers-count').value);
  let prodMin = parseInt(document.getElementById('pc-prod-min').value);
  let prodMax = parseInt(document.getElementById('pc-prod-max').value);
  let consMin = parseInt(document.getElementById('pc-cons-min').value);
  let consMax = parseInt(document.getElementById('pc-cons-max').value);
  renderPcAgents(p, c);
  updatePcUI();
  for (let i = 0; i < p; i++) producerLoop(i, prodMin, prodMax);
  for (let i = 0; i < c; i++) consumerLoop(i, consMin, consMax);
  document.getElementById('pc-start-btn').disabled = true;
  document.getElementById('pc-stop-btn').disabled = false;
  addPcLog('Simulation started (metrics active)', 'success');
}

function stopPC() {
  pcState.running = false;
  document.getElementById('pc-start-btn').disabled = false;
  document.getElementById('pc-stop-btn').disabled = true;
  addPcLog('Stopped', 'warning');
}

// ================= READERS WRITERS =================
let rwState = { running: false, readCount: 0, writeActive: false, mutex: false, resourceBusy: false, queue: [], totalReads: 0, totalWrites: 0 };

function updateRwUI() {
  document.getElementById('rw-reader-count').innerText = `Readers: ${rwState.readCount}`;
  document.getElementById('rw-writer-status').innerHTML = `Writer active: ${rwState.writeActive ? 'Yes' : 'No'}`;
  let res = document.getElementById('rw-resource-state');
  let statusSpan = document.getElementById('rw-status-text');
  if (rwState.writeActive) {
    statusSpan.innerText = '✍️ WRITING';
    res.style.border = '2px solid #ef4444';
  } else if (rwState.readCount > 0) {
    statusSpan.innerText = '📖 READING';
    res.style.border = '2px solid #6366f1';
  } else {
    statusSpan.innerText = '⏳ IDLE';
    res.style.border = '1px solid var(--border)';
  }
  document.getElementById('rw-total-reads').innerText = rwState.totalReads;
  document.getElementById('rw-total-writes').innerText = rwState.totalWrites;
  document.getElementById('rw-fairness').innerText = rwState.queue.length;
}

function renderRwAgents(rd, wr) {
  let rdDiv = document.getElementById('rw-readers-list');
  rdDiv.innerHTML = '';
  let wrDiv = document.getElementById('rw-writers-list');
  wrDiv.innerHTML = '';
  for (let i = 0; i < rd; i++) {
    let d = document.createElement('div');
    d.className = 'agent-badge';
    d.id = `rw-reader-${i}`;
    d.textContent = `R${i}`;
    rdDiv.appendChild(d);
  }
  for (let i = 0; i < wr; i++) {
    let d = document.createElement('div');
    d.className = 'agent-badge';
    d.id = `rw-writer-${i}`;
    d.textContent = `W${i}`;
    wrDiv.appendChild(d);
  }
}

function addRwLog(msg, type) {
  let log = document.getElementById('rw-log');
  let d = document.createElement('div');
  d.className = `log-entry ${type}`;
  d.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

async function readerTask(id, minT, maxT, priority) {
  while (rwState.running) {
    await sleep(randomBetween(minT, maxT));
    if (!rwState.running) break;
    let el = document.getElementById(`rw-reader-${id}`);
    el?.classList.add('waiting');
    if (priority === 'fair') {
      rwState.queue.push({ type: 'reader', id });
      while (rwState.queue[0]?.id !== id && rwState.running) await sleep(50);
    }
    if (priority === 'writers') while (rwState.writeActive && rwState.running) await sleep(50);
    else while (rwState.writeActive && rwState.running) await sleep(50);
    while (rwState.mutex && rwState.running) await sleep(30);
    rwState.mutex = true;
    rwState.readCount++;
    if (rwState.readCount === 1) {
      while (rwState.resourceBusy && rwState.running) await sleep(50);
      rwState.resourceBusy = true;
    }
    rwState.mutex = false;
    if (priority === 'fair') rwState.queue.shift();
    el?.classList.remove('waiting');
    el?.classList.add('active');
    updateRwUI();
    addRwLog(`Reader ${id} started reading`, 'success');
    await sleep(randomBetween(minT, maxT));
    el?.classList.remove('active');
    rwState.mutex = true;
    rwState.readCount--;
    rwState.totalReads++;
    if (rwState.readCount === 0) rwState.resourceBusy = false;
    rwState.mutex = false;
    updateRwUI();
    addRwLog(`Reader ${id} finished`, 'info');
  }
}

async function writerTask(id, minT, maxT, priority) {
  while (rwState.running) {
    await sleep(randomBetween(minT, maxT));
    if (!rwState.running) break;
    let el = document.getElementById(`rw-writer-${id}`);
    el?.classList.add('waiting');
    if (priority === 'fair') {
      rwState.queue.push({ type: 'writer', id });
      while (rwState.queue[0]?.id !== id && rwState.running) await sleep(50);
    }
    while ((rwState.readCount > 0 || rwState.resourceBusy) && rwState.running) await sleep(50);
    while (rwState.resourceBusy && rwState.running) await sleep(50);
    rwState.resourceBusy = true;
    rwState.writeActive = true;
    updateRwUI();
    if (priority === 'fair') rwState.queue.shift();
    el?.classList.remove('waiting');
    el?.classList.add('active');
    addRwLog(`Writer ${id} is WRITING`, 'warning');
    await sleep(randomBetween(minT, maxT));
    el?.classList.remove('active');
    rwState.writeActive = false;
    rwState.resourceBusy = false;
    rwState.totalWrites++;
    updateRwUI();
    addRwLog(`Writer ${id} finished`, 'info');
  }
}

function resetRW() {
  rwState.running = false;
  rwState.readCount = 0;
  rwState.writeActive = false;
  rwState.mutex = false;
  rwState.resourceBusy = false;
  rwState.queue = [];
  rwState.totalReads = 0;
  rwState.totalWrites = 0;
  let rd = parseInt(document.getElementById('rw-readers-count').value);
  let wr = parseInt(document.getElementById('rw-writers-count').value);
  renderRwAgents(rd, wr);
  updateRwUI();
  document.getElementById('rw-start-btn').disabled = false;
  document.getElementById('rw-stop-btn').disabled = true;
  document.getElementById('rw-log').innerHTML = '';
  addRwLog('Reset', 'info');
}

function startRW() {
  if (rwState.running) return;
  rwState.running = true;
  rwState.readCount = 0;
  rwState.writeActive = false;
  rwState.queue = [];
  rwState.totalReads = 0;
  rwState.totalWrites = 0;
  let rd = parseInt(document.getElementById('rw-readers-count').value);
  let wr = parseInt(document.getElementById('rw-writers-count').value);
  let rmin = parseInt(document.getElementById('rw-read-min').value);
  let rmax = parseInt(document.getElementById('rw-read-max').value);
  let wmin = parseInt(document.getElementById('rw-write-min').value);
  let wmax = parseInt(document.getElementById('rw-write-max').value);
  let prio = document.getElementById('rw-priority').value;
  renderRwAgents(rd, wr);
  updateRwUI();
  for (let i = 0; i < rd; i++) readerTask(i, rmin, rmax, prio);
  for (let i = 0; i < wr; i++) writerTask(i, wmin, wmax, prio);
  document.getElementById('rw-start-btn').disabled = true;
  document.getElementById('rw-stop-btn').disabled = false;
  addRwLog('Readers-Writers started', 'success');
}

function stopRW() {
  rwState.running = false;
  document.getElementById('rw-start-btn').disabled = false;
  document.getElementById('rw-stop-btn').disabled = true;
  addRwLog('Stopped', 'warning');
}

// ================= DINING PHILOSOPHERS =================
let dpState = { running: false, forks: {}, meals: 0, deadlockFlag: false };

function dpLog(msg, type) {
  let log = document.getElementById('dp-log');
  let d = document.createElement('div');
  d.className = `log-entry ${type}`;
  d.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function renderDiningTable(N) {
  let container = document.getElementById('dp-visual');
  container.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e1e2a;padding:20px;border-radius:100px;">🍽️</div>';
  let radius = 140;
  for (let i = 0; i < N; i++) {
    let angle = (i * 360 / N) * Math.PI / 180;
    let x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    let phil = document.createElement('div');
    phil.className = 'philosopher';
    phil.id = `dp-phil-${i}`;
    phil.textContent = `P${i}`;
    phil.style.left = `calc(50% + ${x}px)`;
    phil.style.top = `calc(50% + ${y}px)`;
    container.appendChild(phil);
    let forkAngle = angle + 0.3;
    let fx = Math.cos(forkAngle) * (radius - 40), fy = Math.sin(forkAngle) * (radius - 40);
    let fork = document.createElement('div');
    fork.className = 'fork';
    fork.id = `dp-fork-${i}`;
    fork.style.left = `calc(50% + ${fx}px)`;
    fork.style.top = `calc(50% + ${fy}px)`;
    fork.style.transform = `translate(-50%,-50%) rotate(${forkAngle + Math.PI / 2}rad)`;
    container.appendChild(fork);
  }
  let statusDiv = document.getElementById('dp-status-list');
  statusDiv.innerHTML = '';
  for (let i = 0; i < N; i++) {
    let span = document.createElement('div');
    span.className = 'glass-card';
    span.style.padding = '6px 12px';
    span.innerHTML = `P${i}: <span id="dp-state-${i}">💭 Thinking</span>`;
    statusDiv.appendChild(span);
  }
}

async function takeFork(id, philId) {
  let forkDiv = document.getElementById(`dp-fork-${id}`);
  while (dpState.forks[id] !== undefined && dpState.running) await sleep(40);
  if (!dpState.running) return false;
  dpState.forks[id] = philId;
  forkDiv.classList.add('used');
  return true;
}

async function releaseFork(id) {
  let forkDiv = document.getElementById(`dp-fork-${id}`);
  if (dpState.forks[id] !== undefined) {
    delete dpState.forks[id];
    forkDiv.classList.remove('used');
  }
}

function checkDeadlock(N) {
  let allForksTaken = true;
  for (let i = 0; i < N; i++) if (dpState.forks[i] === undefined) allForksTaken = false;
  if (allForksTaken && Object.keys(dpState.forks).length === N) {
    dpState.deadlockFlag = true;
    document.getElementById('dp-deadlock').innerHTML = '⚠️ Deadlock!';
    dpLog('⚠️ DEADLOCK DETECTED! All forks held, no progress.', 'error');
    return true;
  }
  return false;
}

async function philosopherLife(idx, N, thinkMin, thinkMax, eatMin, eatMax, strategy) {
  while (dpState.running) {
    let philDiv = document.getElementById(`dp-phil-${idx}`);
    let stateSpan = document.getElementById(`dp-state-${idx}`);
    philDiv.classList.remove('eating', 'waiting');
    philDiv.classList.add('thinking');
    stateSpan.innerText = '💭 Thinking';
    await sleep(randomBetween(thinkMin, thinkMax));
    if (!dpState.running) break;
    philDiv.classList.remove('thinking');
    philDiv.classList.add('waiting');
    stateSpan.innerText = '🍽️ Hungry';
    let left = idx, right = (idx + 1) % N;
    if (strategy === 'asymmetric' && idx % 2 === 1) [left, right] = [right, left];
    if (strategy === 'arbitrator') { if (left > right) [left, right] = [right, left]; }
    if (await takeFork(left, idx)) {
      if (await takeFork(right, idx)) {
        philDiv.classList.remove('waiting');
        philDiv.classList.add('eating');
        stateSpan.innerText = '🍴 Eating';
        dpLog(`Philosopher ${idx} started eating`, 'success');
        await sleep(randomBetween(eatMin, eatMax));
        dpState.meals++;
        document.getElementById('dp-meals').innerText = dpState.meals;
        await releaseFork(right);
        await releaseFork(left);
        dpLog(`Philosopher ${idx} finished`, 'info');
      } else {
        await releaseFork(left);
        await sleep(150);
      }
    }
    if (checkDeadlock(N)) break;
  }
}

function resetDP() {
  dpState.running = false;
  dpState.forks = {};
  dpState.meals = 0;
  dpState.deadlockFlag = false;
  let N = parseInt(document.getElementById('dp-count').value);
  renderDiningTable(N);
  document.getElementById('dp-meals').innerText = '0';
  document.getElementById('dp-deadlock').innerHTML = '✅ No';
  document.getElementById('dp-start-btn').disabled = false;
  document.getElementById('dp-stop-btn').disabled = true;
  document.getElementById('dp-log').innerHTML = '';
  dpLog('Reset', 'info');
}

function startDP() {
  if (dpState.running) return;
  dpState.running = true;
  dpState.forks = {};
  dpState.meals = 0;
  dpState.deadlockFlag = false;
  let N = parseInt(document.getElementById('dp-count').value);
  let thinkMin = parseInt(document.getElementById('dp-think-min').value);
  let thinkMax = parseInt(document.getElementById('dp-think-max').value);
  let eatMin = parseInt(document.getElementById('dp-eat-min').value);
  let eatMax = parseInt(document.getElementById('dp-eat-max').value);
  let strategy = document.getElementById('dp-strategy').value;
  renderDiningTable(N);
  for (let i = 0; i < N; i++) {
    philosopherLife(i, N, thinkMin, thinkMax, eatMin, eatMax, strategy);
  }
  document.getElementById('dp-start-btn').disabled = true;
  document.getElementById('dp-stop-btn').disabled = false;
  dpLog('Dining philosophers started', 'success');
}

function stopDP() {
  dpState.running = false;
  document.getElementById('dp-start-btn').disabled = false;
  document.getElementById('dp-stop-btn').disabled = true;
  dpLog('Stopped', 'warning');
}

// ================= INITIALIZATION & EVENT BINDINGS =================
document.addEventListener('DOMContentLoaded', () => {
  // Producer‑Consumer
  document.getElementById('pc-start-btn').onclick = startPC;
  document.getElementById('pc-stop-btn').onclick = stopPC;
  document.getElementById('pc-reset-btn').onclick = resetPC;
  document.getElementById('pc-preset-high').onclick = () => {
    document.getElementById('pc-buffer-size').value = 3;
    document.getElementById('pc-producers-count').value = 4;
    document.getElementById('pc-consumers-count').value = 4;
    resetPC();
    addPcLog('High contention preset loaded', 'info');
  };
  resetPC();

  // Readers‑Writers
  document.getElementById('rw-start-btn').onclick = startRW;
  document.getElementById('rw-stop-btn').onclick = stopRW;
  document.getElementById('rw-reset-btn').onclick = resetRW;
  document.getElementById('rw-preset-reader').onclick = () => {
    document.getElementById('rw-readers-count').value = 7;
    document.getElementById('rw-writers-count').value = 2;
    resetRW();
    addRwLog('Reader‑heavy preset applied', 'info');
  };
  resetRW();

  // Dining Philosophers
  document.getElementById('dp-start-btn').onclick = startDP;
  document.getElementById('dp-stop-btn').onclick = stopDP;
  document.getElementById('dp-reset-btn').onclick = resetDP;
  document.getElementById('dp-preset-deadlock').onclick = () => {
    document.getElementById('dp-count').value = 5;
    document.getElementById('dp-strategy').value = 'arbitrator';
    resetDP();
    dpLog('Deadlock‑prone preset (Resource hierarchy)', 'warning');
  };
  resetDP();

  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      if (target === 'producer') document.getElementById('producer-pane').classList.add('active');
      if (target === 'reader') document.getElementById('reader-pane').classList.add('active');
      if (target === 'dinner') document.getElementById('dinner-pane').classList.add('active');
    });
  });
});