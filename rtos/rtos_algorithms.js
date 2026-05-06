'use strict';


//implicit deadline 
const ALGO_META = {
  edf: { label: 'EDF',  sub: 'Earliest Deadline First',  icon: 'fas fa-hourglass-half'   },
};

const TASK_COLORS = ['#6366f1','#22d3ee','#f59e0b','#ec4899','#10b981','#f97316'];

const DEFAULT_TASKS = [
  { id: 1, name: 'T1', period: 4,  burst: 1 },
  { id: 2, name: 'T2', period: 6,  burst: 2 },
  { id: 3, name: 'T3', period: 12, burst: 3 },
];

let selectedAlgo = 'edf';
let tasks        = [];
let totalTime    = 24;
let result       = null;
let currentStep  = 0;
let animInterval = null;
let animSpeed    = 600;

document.addEventListener('DOMContentLoaded', () => {
  buildAlgoTabs();
  loadDefaultTasks();
  bindEvents();
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

function loadDefaultTasks() {
  tasks = DEFAULT_TASKS.map((t, i) => ({ ...t, color: TASK_COLORS[i] }));
  renderTaskTable();
}

function bindEvents() {
  document.getElementById('runBtn').addEventListener('click', () => {
    resetState();
    animInterval = setInterval(stepOnce, animSpeed);
  });
  document.getElementById('stepBtn').addEventListener('click', stepOnce);
  document.getElementById('resetBtn').addEventListener('click', resetState);
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('totalTime').addEventListener('change', resetState);
  document.getElementById('speed').addEventListener('change', e => {
    animSpeed = parseInt(e.target.value);
    if (animInterval) { clearInterval(animInterval); animInterval = setInterval(stepOnce, animSpeed); }
  });
}

function addTask() {
  if (tasks.length >= 6) return;
  const id = tasks.length + 1;
  tasks.push({
    id,
    name:   'T' + id,
    period: 8,
    burst:  2,
    color:  TASK_COLORS[tasks.length]
  });
  renderTaskTable();
  resetState();
}

function removeTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  tasks.forEach((t, i) => { t.id = i + 1; t.name = 'T' + (i + 1); t.color = TASK_COLORS[i]; });
  renderTaskTable();
  resetState();
}

function renderTaskTable() {
  const tbody = document.getElementById('taskTableBody');
  tbody.innerHTML = tasks.map(t => `
    <tr>
      <td>
        <span class="task-dot" style="background:${t.color}"></span>
        <input type="text" class="task-input task-input--name" value="${t.name}"
          onchange="updateTask(${t.id},'name',this.value)">
      </td>
      <td><input type="number" class="task-input" min="1" max="50" value="${t.period}"
        onchange="updateTask(${t.id},'period',+this.value)"></td>
      <td><input type="number" class="task-input" min="1" max="20" value="${t.burst}"
        onchange="updateTask(${t.id},'burst',+this.value)"></td>
      <td>
        <button type="button" class="del-btn" onclick="removeTask(${t.id})" ${tasks.length <= 1 ? 'disabled' : ''}>
          <i class="fas fa-xmark"></i>
        </button>
      </td>
    </tr>`).join('');
}

function updateTask(id, field, value) {
  const task = tasks.find(t => t.id === id);
  if (task) { task[field] = value; resetState(); }
}

function readInputs() {
  totalTime = Math.max(4, parseInt(document.getElementById('totalTime').value) || 24);
  animSpeed = parseInt(document.getElementById('speed').value);
}

function resetState() {
  clearInterval(animInterval);
  animInterval = null;
  readInputs();
  result      = RTOSAlgorithms[selectedAlgo](tasks, totalTime);
  currentStep = 0;
  renderAll();
}

function stepOnce() {
  if (!result || currentStep >= result.timeline.length) {
    clearInterval(animInterval);
    animInterval = null;
    return;
  }
  currentStep++;
  renderAll();
  if (currentStep >= result.timeline.length) {
    clearInterval(animInterval);
    animInterval = null;
  }
}

function renderAll() {
  renderBadge();
  renderGantt();
  renderReadyQueue();
  renderStats();
  renderUtilization();
}

function renderBadge() {
  const badge = document.getElementById('stepBadge');
  if (!result || currentStep === 0) {
    badge.className   = 'step-badge step-badge--idle';
    badge.textContent = 'Ready';
    return;
  }
  const s = result.timeline[currentStep - 1];
  if (s.deadlineMissed) {
    badge.className   = 'step-badge step-badge--fault';
    badge.textContent = `t=${s.time} — Deadline Missed!`;
  } else if (s.idle) {
    badge.className   = 'step-badge step-badge--idle';
    badge.textContent = `t=${s.time} — CPU Idle`;
  } else {
    badge.className   = 'step-badge step-badge--hit';
    badge.textContent = `t=${s.time} — Running ${s.task}`;
  }
}

function renderGantt() {
  const container = document.getElementById('ganttChart');
  if (!result) { container.innerHTML = ''; return; }

  const visible = result.timeline.slice(0, Math.max(currentStep, 1));
  const visLen  = currentStep === 0 ? result.timeline.length : currentStep;

  // Build per-task rows
  const rows = tasks.map(task => {
    const cells = result.timeline.map((s, i) => {
      const active  = i < visLen;
      const running = active && s.task === task.name;
      const current = i === currentStep - 1;

      // deadline markers
      const isDeadline = (i > 0) && (i % task.period === 0);

      return { running, active, current, isDeadline, missed: active && s.deadlineMissed && running };
    });
    return { task, cells };
  });

  // Time axis
  const timeAxis = Array.from({ length: result.timeline.length }, (_, i) => i);

  container.innerHTML = `
    <div class="gantt-wrap">
      <div class="gantt-rows">
        ${rows.map(({ task, cells }) => `
          <div class="gantt-row">
            <div class="gantt-label">
              <span class="task-dot" style="background:${task.color}"></span>
              ${task.name}
            </div>
            <div class="gantt-cells">
              ${cells.map((c, i) => `
                <div class="gantt-cell
                  ${c.running  ? 'gc-run'   : ''}
                  ${c.active && !c.running ? 'gc-idle' : ''}
                  ${c.current  ? 'gc-curr'  : ''}
                  ${c.missed   ? 'gc-miss'  : ''}
                  ${!c.active  ? 'gc-future': ''}"
                  style="${c.running ? `background:${task.color}22; border-color:${task.color}` : ''}"
                  title="t=${i} ${c.running ? '▶ '+task.name : 'idle'}">
                  ${c.running ? '<span class="gc-dot" style="background:'+task.color+'"></span>' : ''}
                  ${c.isDeadline ? '<span class="gc-deadline" title="Deadline">▼</span>' : ''}
                </div>`).join('')}
            </div>
          </div>`).join('')}
        <div class="gantt-row gantt-row--axis">
          <div class="gantt-label">t</div>
          <div class="gantt-cells">
            ${timeAxis.map(i => `
              <div class="gantt-cell gc-axis ${i === currentStep - 1 ? 'gc-curr' : ''}">
                ${i % 4 === 0 ? i : ''}
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  // scroll current cell into view
  const curr = container.querySelector('.gc-curr');
  if (curr) curr.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

function renderReadyQueue() {
  const el = document.getElementById('readyQueue');
  if (!result || currentStep === 0) {
    el.innerHTML = '<p class="vis-empty">Start simulation to see ready queue</p>';
    return;
  }
  const s = result.timeline[currentStep - 1];
  if (!s.readyQueue || s.readyQueue.length === 0) {
    el.innerHTML = '<p class="vis-empty">No tasks ready — CPU idle</p>';
    return;
  }

  el.innerHTML = s.readyQueue.map((r, i) => {
    const task  = tasks.find(t => t.name === r.name);
    const color = task ? task.color : '#6366f1';
    const isRunning = i === 0;
    const detail = `deadline: ${r.deadline}`
    return `
      <div class="rq-item ${isRunning ? 'rq-item--running' : ''}">
        <span class="task-dot" style="background:${color}"></span>
        <span class="rq-name">${r.name}</span>
        <span class="rq-detail">${detail}</span>
        <span class="rq-rem">${r.remaining} left</span>
        ${isRunning ? '<span class="rq-badge">Running</span>' : `<span class="rq-rank">#${i + 1}</span>`}
      </div>`;
  }).join('');
}

function renderStats() {
  const step = currentStep;
  if (!result) return;

  const slice  = result.timeline.slice(0, step);
  const busy   = slice.filter(s => !s.idle).length;
  const idle   = slice.filter(s => s.idle).length;
  const missed = slice.filter(s => s.deadlineMissed).length;
  const cpu    = step > 0 ? Math.round((busy / step) * 100) : 0;

  document.getElementById('statTime').textContent    = step;
  document.getElementById('statTotal').textContent   = totalTime;
  document.getElementById('statBusy').textContent    = `${busy} (${cpu}%)`;
  document.getElementById('statIdle').textContent    = idle;
  document.getElementById('statMissed').textContent  = missed;
  document.getElementById('statTasks').textContent   = tasks.length;
}

function renderUtilization() {
  if (!result) return;
  const sched = result.schedulable || result;
  const u     = result.utilization ?? sched.utilization;
  const pct   = Math.round((u || 0) * 100);
  const bar   = document.getElementById('utilBar');
  const label = document.getElementById('utilLabel');
  const note  = document.getElementById('utilNote');

  bar.style.width = Math.min(pct, 100) + '%';
  bar.style.background = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--indigo)';
  label.textContent = pct + '%';
}