/* ═══════════════════════════════════════════════════════════
   CMA SIMULATOR — cma.js
   OSEmulator — Contiguous Memory Allocation
═══════════════════════════════════════════════════════════ */

/* ─── PROCESS COLOURS (purple palette) ─── */
const PROC_COLORS = [
  '#6d28d9','#7c3aed','#8b5cf6','#9333ea','#a855f7',
  '#5b21b6','#4c1d95','#7e22ce','#6b21a8','#581c87',
  '#3b0764','#4a044e'
];

/* ─── STRATEGY DEFINITIONS ─── */
const STRATEGIES = [
  {
    name: 'first',
    display: 'First Fit',
    info: 'First Fit searches from the beginning of memory and allocates the first free block that is large enough to accommodate the process.\n\nIt is the fastest strategy — it stops as soon as a suitable block is found.\n\nAdvantage: Fast allocation.\nDisadvantage: Fragments tend to accumulate at the beginning of memory over time.'
  },
  {
    name: 'next',
    display: 'Next Fit',
    info: 'Next Fit starts searching from the position where the last allocation ended, wrapping around to the beginning if necessary.\n\nIt behaves like a circular scan through free memory blocks.\n\nAdvantage: Distributes allocations more evenly.\nDisadvantage: May be slower than First Fit for some patterns.'
  },
  {
    name: 'best',
    display: 'Best Fit',
    info: 'Best Fit searches all free blocks and selects the smallest one that is still large enough for the process.\n\nThis minimises wasted space in the chosen block.\n\nAdvantage: Minimises fragmentation per allocation.\nDisadvantage: Slowest; creates many tiny unusable fragments over time.'
  },
  {
    name: 'worst',
    display: 'Worst Fit',
    info: 'Worst Fit always allocates from the largest available free block.\n\nThe idea is that a large leftover fragment is more useful than a tiny one.\n\nAdvantage: Leftover chunks are larger and may fit future processes.\nDisadvantage: Quickly exhausts large blocks; generally poor memory utilisation.'
  }
];

/* ═══════════════════════════════════════════════════════════
   MEMORY MODEL CLASS
═══════════════════════════════════════════════════════════ */
class MemoryBlock {
  constructor() {
    this.totalSize = 0;
    this.segments = [];
    this.currentStrategy = 'first';
    this.freeBlocks = [];
    this.lastAllocationEnd = 0;
    this.blockPositions = new Map(); // start -> blockIndex
    this.blockRanges    = new Map(); // blockIndex -> {start, end}
  }

  initializeFreeBlocks(blocks) {
    this.freeBlocks = blocks.slice().sort((a, b) => a.start - b.start);
    this.segments   = [];
    this.lastAllocationEnd = 0;
    this.blockPositions.clear();
    this.blockRanges.clear();
    blocks.forEach((block, index) => {
      this.blockPositions.set(block.start, index);
      this.blockRanges.set(index, { start: block.start, end: block.start + block.size });
    });
  }

  allocate(size) {
    let position = null;
    let selectedBlock = null;
    switch (this.currentStrategy) {
      case 'first': [position, selectedBlock] = this.findFirstFit(size);  break;
      case 'next':  [position, selectedBlock] = this.findNextFit(size);   break;
      case 'best':  [position, selectedBlock] = this.findBestFit(size);   break;
      case 'worst': [position, selectedBlock] = this.findWorstFit(size);  break;
    }
    if (position === null || !selectedBlock) return null;

    // resolve block index
    let blockNumber = null;
    for (const [index, range] of this.blockRanges) {
      if (position >= range.start && position < range.end) { blockNumber = index; break; }
    }

    const remainingSize = selectedBlock.size - size;
    const process = {
      id: Math.random().toString(36).substr(2, 9),
      size,
      start: position,
      actualBlock: blockNumber
    };

    const bi = this.freeBlocks.indexOf(selectedBlock);
    if (bi !== -1) this.freeBlocks.splice(bi, 1);

    if (remainingSize > 0) {
      const newBlock = { id: selectedBlock.id, size: remainingSize, start: position + size };
      this.blockPositions.set(newBlock.start, blockNumber);
      this.freeBlocks.push(newBlock);
      this.freeBlocks.sort((a, b) => a.start - b.start);
    }

    this.segments.push(process);
    this.segments.sort((a, b) => a.start - b.start);
    return process;
  }

  findFirstFit(size) {
    for (const block of this.freeBlocks) {
      if (!this.isBlockOccupied(block) && block.size >= size) return [block.start, block];
    }
    return [null, null];
  }

  findNextFit(size) {
    let si = this.freeBlocks.findIndex(b => b.start >= this.lastAllocationEnd);
    if (si === -1) si = 0;
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[(si + i) % this.freeBlocks.length];
      if (!this.isBlockOccupied(block) && block.size >= size) {
        this.lastAllocationEnd = block.start + size;
        return [block.start, block];
      }
    }
    return [null, null];
  }

  findBestFit(size) {
    let best = null, diff = Infinity;
    for (const block of this.freeBlocks) {
      if (!this.isBlockOccupied(block) && block.size >= size) {
        const d = block.size - size;
        if (d < diff) { diff = d; best = block; }
      }
    }
    return best ? [best.start, best] : [null, null];
  }

  findWorstFit(size) {
    let worst = null, diff = -1;
    for (const block of this.freeBlocks) {
      if (!this.isBlockOccupied(block) && block.size >= size) {
        const d = block.size - size;
        if (d > diff) { diff = d; worst = block; }
      }
    }
    return worst ? [worst.start, worst] : [null, null];
  }

  isBlockOccupied(block) {
    return this.segments.some(seg =>
      (seg.start >= block.start && seg.start < block.start + block.size) ||
      (seg.start + seg.size > block.start && seg.start + seg.size <= block.start + block.size)
    );
  }

  deallocate(processId) {
    const index = this.segments.findIndex(s => s.id === processId);
    if (index !== -1) { this.segments.splice(index, 1); return true; }
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   GLOBALS
═══════════════════════════════════════════════════════════ */
const memory          = new MemoryBlock();
const waitingProcesses = [];
let simulationSpeed   = 1100;
let isSimulationRunning = false;
let initialBlockDefs  = []; // kept for reset

/* ═══════════════════════════════════════════════════════════
   SPEED CONTROL
═══════════════════════════════════════════════════════════ */
function addSpeedControl() {
  const mount = document.getElementById('speedControlMount');
  if (!mount) return;
  mount.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'speed-control';

  const lbl = document.createElement('label');
  lbl.textContent = 'Animation Speed';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min  = '100';
  slider.max  = '2000';
  slider.value = '1000';
  slider.step  = '100';

  const val = document.createElement('span');
  val.textContent = '1.0×';

  slider.addEventListener('input', function () {
    const v = parseInt(this.value);
    simulationSpeed = 2100 - v;
    const mult = (v - 100) / 1900 * 9.9 + 0.1;
    val.textContent = mult.toFixed(1) + '×';
    const pct = ((v - 100) / 1900) * 100;
    this.style.setProperty('--pct', pct + '%');
  });

  // set initial visual
  slider.style.setProperty('--pct', '48.4%');
  simulationSpeed = 1100;

  wrap.appendChild(lbl);
  wrap.appendChild(slider);
  wrap.appendChild(val);
  mount.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════
   BLOCK SETUP
═══════════════════════════════════════════════════════════ */
function initializeMemoryBlocks() {
  const blockCount = parseInt(document.getElementById('blockCount').value) || 3;
  const container  = document.getElementById('blockSizesContainer');
  const blockSetup = document.querySelector('.block-setup');

  // remove old init button
  blockSetup.querySelectorAll('.initialize-memory-btn').forEach(b => b.remove());

  container.innerHTML = '';

  const defaults = [100,200,150,80,120,90,160,110];
  for (let i = 0; i < blockCount; i++) {
    const div = document.createElement('div');
    div.className = 'block-size-input';
    div.innerHTML = `<label>Block ${i} (MB)</label><input type="number" id="block${i}" min="1" value="${defaults[i] || 100}">`;
    container.appendChild(div);

    const inp = div.querySelector('input');
    inp.addEventListener('keypress', function (e) {
      if (e.key !== 'Enter') return;
      const next = document.getElementById(`block${i + 1}`);
      next ? (next.focus(), next.select()) : setupMemoryBlocks();
    });
    inp.addEventListener('focus', function () { this.select(); });
  }

  const initBtn = document.createElement('button');
  initBtn.textContent = 'Initialize Memory';
  initBtn.className   = 'initialize-memory-btn';
  initBtn.onclick     = setupMemoryBlocks;
  blockSetup.appendChild(initBtn);

  document.getElementById('block0')?.focus();
}

function setupMemoryBlocks() {
  const inputs = document.querySelectorAll('.block-size-input input');
  if (!inputs.length) { alert('Please set blocks first.'); return; }

  let pos = 0;
  const blocks = Array.from(inputs).map((inp, i) => {
    const size = Math.max(1, parseInt(inp.value) || 100);
    inp.value = size;
    const b = { id: `block${i}`, size, start: pos };
    pos += size;
    return b;
  });

  initialBlockDefs = blocks.map(b => ({ ...b }));
  memory.totalSize = pos;
  memory.initializeFreeBlocks(blocks.map(b => ({ ...b })));

  visualizeMemoryBlocks();

  // show process panel
  const processSetup = document.getElementById('processSetup');
  if (processSetup) {
    processSetup.style.display = '';
    document.getElementById('processCount')?.focus();
  }

  // show strategy panel and build it
  const stratPanel = document.getElementById('strategyPanel');
  if (stratPanel) {
    stratPanel.style.display = '';
    buildStrategyPanel();
  }
}

/* ═══════════════════════════════════════════════════════════
   PROCESS SETUP
═══════════════════════════════════════════════════════════ */
function generateProcessInputs() {
  const count     = Math.min(12, Math.max(1, parseInt(document.getElementById('processCount').value) || 3));
  const container = document.getElementById('processSizesContainer');
  container.innerHTML = '';

  const defaults = [50,80,30,120,60,40,90,70,55,100,45,65];
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'process-size-input';
    div.innerHTML = `<label>Process ${i + 1} (MB)</label><input type="number" id="process${i}" min="1" value="${defaults[i] || 50}">`;
    container.appendChild(div);

    const inp = div.querySelector('input');
    inp.addEventListener('keypress', function (e) {
      if (e.key !== 'Enter') return;
      const next = document.getElementById(`process${i + 1}`);
      if (next) { next.focus(); next.select(); }
      else document.querySelector('.strategy-container button:not(.info-button)')?.focus();
    });
    inp.addEventListener('focus', function () { this.select(); });
  }

  document.getElementById('process0')?.focus();
}

/* ═══════════════════════════════════════════════════════════
   STRATEGY PANEL
═══════════════════════════════════════════════════════════ */
function buildStrategyPanel() {
  const grid = document.getElementById('strategyGrid');
  const actionRow = document.getElementById('actionRow');
  grid.innerHTML = '';
  actionRow.innerHTML = '';

  STRATEGIES.forEach(strat => {
    const container = document.createElement('div');
    container.className = 'strategy-container';

    const btn = document.createElement('button');
    btn.textContent = strat.display;
    btn.setAttribute('tabindex', '0');
    if (strat.name === memory.currentStrategy) btn.classList.add('active');

    btn.onclick = () => setAllocationStrategy(strat.name);

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const all = Array.from(document.querySelectorAll('.strategy-container button:not(.info-button)'));
        const idx = all.indexOf(this);
        const next = e.key === 'ArrowRight'
          ? (idx + 1) % all.length
          : (idx - 1 + all.length) % all.length;
        all[next].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setAllocationStrategy(strat.name);
        allocateAllProcesses();
      }
    });

    const infoBtn = document.createElement('button');
    infoBtn.className = 'info-button';
    infoBtn.textContent = 'i';
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      showStrategyInfo(strat.display, strat.info);
    };

    container.appendChild(btn);
    container.appendChild(infoBtn);
    grid.appendChild(container);
  });

  // Allocate button
  const allocBtn = document.createElement('button');
  allocBtn.id = 'allocateButton';
  allocBtn.className = 'btn btn-purple';
  allocBtn.textContent = '▶ Allocate Processes';
  allocBtn.onclick = allocateAllProcesses;

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.id = 'stopButton';
  stopBtn.className = 'btn btn-orange';
  stopBtn.textContent = '⏹ Stop';
  stopBtn.onclick = stopSimulation;

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.id = 'resetButton';
  resetBtn.className = 'btn btn-red';
  resetBtn.textContent = '↺ Reset Memory';
  resetBtn.onclick = resetMemory;

  actionRow.appendChild(allocBtn);
  actionRow.appendChild(stopBtn);
  actionRow.appendChild(resetBtn);
}

function setAllocationStrategy(stratName) {
  memory.currentStrategy = stratName;
  document.querySelectorAll('.strategy-container button:not(.info-button)').forEach(btn => {
    const matches = STRATEGIES.find(s => s.name === stratName)?.display;
    btn.classList.toggle('active', btn.textContent === matches);
  });
}

/* ═══════════════════════════════════════════════════════════
   VISUALIZE MEMORY BLOCKS (static render)
═══════════════════════════════════════════════════════════ */
function visualizeMemoryBlocks() {
  const memoryBlock = document.getElementById('memoryBlock');
  const memLabels   = document.getElementById('memLabels');
  memoryBlock.innerHTML = '';
  if (memLabels) memLabels.innerHTML = '';

  if (!memory.freeBlocks.length && !memory.segments.length) {
    memoryBlock.innerHTML = '<div class="empty-strip"><span>Memory not initialized</span></div>';
    return;
  }

  // Build label row
  const origBlocks = initialBlockDefs.length ? initialBlockDefs : memory.freeBlocks;
  const total = origBlocks.reduce((t, b) => t + b.size, 0);

  if (memLabels) {
    origBlocks.forEach((def, idx) => {
      const range    = memory.blockRanges.get(idx);
      const blockSize = range ? (range.end - range.start) : def.size;
      const used     = memory.segments.filter(s => s.actualBlock === idx).reduce((t, s) => t + s.size, 0);
      const free     = blockSize - used;
      const wPct     = (def.size / total) * 100;

      const lbl = document.createElement('div');
      lbl.className  = 'mem-label-item';
      lbl.style.width = wPct + '%';
      lbl.textContent = `B${idx} · ${free}MB free`;
      memLabels.appendChild(lbl);
    });
  }

  // Build blocks wrapper
  const gap = 6;
  const wrapper = document.createElement('div');
  wrapper.className = 'blocks-wrapper';

  origBlocks.forEach((def, idx) => {
    const wPct = (def.size / total) * 100;

    const blockEl = document.createElement('div');
    blockEl.className = 'memory-block-segment';
    blockEl.setAttribute('data-block-index', idx);
    blockEl.style.width = wPct + '%';

    // render any processes inside this block
    const range = memory.blockRanges.get(idx);
    if (range) {
      const blockSize = range.end - range.start;
      memory.segments
        .filter(s => s.actualBlock === idx)
        .forEach(proc => {
          const relStart  = proc.start - range.start;
          const leftPct   = (relStart / blockSize) * 100;
          const widthPct  = (proc.size  / blockSize) * 100;

          const ps = document.createElement('div');
          ps.className = 'process-segment';
          ps.style.left            = leftPct + '%';
          ps.style.width           = widthPct + '%';
          ps.style.backgroundColor = PROC_COLORS[(proc.processNumber - 1) % PROC_COLORS.length];
          ps.innerHTML = `P${proc.processNumber} (${proc.size}MB)`;
          ps.onclick   = () => deallocateProcess(proc.id);
          blockEl.appendChild(ps);
        });
    }

    wrapper.appendChild(blockEl);
  });

  memoryBlock.appendChild(wrapper);
}

/* ═══════════════════════════════════════════════════════════
   MAIN ALLOCATION LOOP
═══════════════════════════════════════════════════════════ */
async function allocateAllProcesses() {
  if (isSimulationRunning) return;

  const inputs = document.querySelectorAll('.process-size-input input');
  if (!inputs.length) { alert('Please set up processes first.'); return; }
  if (!initialBlockDefs.length) { alert('Please initialize memory first.'); return; }

  isSimulationRunning = true;

  // reset to initial state
  memory.segments = [];
  memory.lastAllocationEnd = 0;
  memory.initializeFreeBlocks(initialBlockDefs.map(b => ({ ...b })));
  waitingProcesses.length = 0;

  visualizeMemoryBlocks();

  // clear tables / waiting
  const tablesSection = document.getElementById('allocationTables');
  if (tablesSection) tablesSection.innerHTML = '';
  const processList = document.getElementById('processList');
  if (processList) processList.innerHTML = '';

  const sizes = Array.from(inputs).map(i => parseInt(i.value));

  // status bar
  const statusBar = document.getElementById('statusBar');

  // pointer
  const memoryBlock = document.getElementById('memoryBlock');
  const pointer = document.createElement('div');
  pointer.className = 'scan-pointer';
  pointer.style.left = '0px';
  memoryBlock.appendChild(pointer);

  for (let i = 0; i < sizes.length; i++) {
    if (!isSimulationRunning) break;

    const size = sizes[i];
    if (isNaN(size) || size <= 0) {
      alert(`Please enter a valid size for Process ${i + 1}!`);
      break;
    }

    statusBar.style.color = '#bb99ff';
    statusBar.textContent = `Scanning for P${i + 1} (${size} MB)…`;
    pointer.className = 'scan-pointer';

    const [position, selectedBlock] = await animateBlockFinding(size, pointer);

    if (position !== null && selectedBlock) {
      const blockNum = memory.blockPositions.get(selectedBlock.start);
      statusBar.style.color = '#22c55e';
      statusBar.textContent = `Block ${blockNum} selected for P${i + 1} (${size} MB)`;
      await delay(simulationSpeed * 0.4);

      const allocated = memory.allocate(size);
      if (allocated) {
        allocated.processNumber = i + 1;
        await animateAllocation(allocated, i + 1);
      }
    } else {
      waitingProcesses.push({ id: i + 1, processNumber: i + 1, size });
      statusBar.style.color = '#f59e0b';
      statusBar.textContent = `No suitable block for P${i + 1} (${size} MB)`;
      await delay(simulationSpeed);
    }
  }

  pointer.remove();
  statusBar.textContent = '';

  updateWaitingProcessesList();
  displayAllocationTables();

  isSimulationRunning = false;
}

/* ═══════════════════════════════════════════════════════════
   ANIMATE BLOCK FINDING (scan pointer)
═══════════════════════════════════════════════════════════ */
async function animateBlockFinding(size, pointer) {
  const memoryBlock  = document.getElementById('memoryBlock');
  const blocks       = memoryBlock.querySelectorAll('.memory-block-segment');
  let position       = null;
  let selectedBlock  = null;

  pointer.className  = 'scan-pointer';

  const moveTo = async (blockEl) => {
    if (!blockEl) return;
    const parentRect = memoryBlock.getBoundingClientRect();
    const blockRect  = blockEl.getBoundingClientRect();
    const x = blockRect.left + blockRect.width * 0.88 - parentRect.left;
    pointer.style.left = x + 'px';
    await delay(simulationSpeed * 0.75);
  };

  const getBlockEl = (start) => {
    const idx = memory.blockPositions.get(start);
    return memoryBlock.querySelector(`.memory-block-segment[data-block-index="${idx}"]`);
  };

  switch (memory.currentStrategy) {

    case 'first':
      for (const block of memory.freeBlocks) {
        if (!isSimulationRunning) break;
        await moveTo(getBlockEl(block.start));
        if (!memory.isBlockOccupied(block) && block.size >= size) {
          position = block.start; selectedBlock = block;
          pointer.className = 'scan-pointer found';
          await delay(simulationSpeed * 0.5);
          break;
        }
      }
      break;

    case 'next': {
      let si = memory.freeBlocks.findIndex(b => b.start >= memory.lastAllocationEnd);
      if (si === -1) si = 0;
      for (let i = 0; i < memory.freeBlocks.length; i++) {
        if (!isSimulationRunning) break;
        const block = memory.freeBlocks[(si + i) % memory.freeBlocks.length];
        await moveTo(getBlockEl(block.start));
        if (!memory.isBlockOccupied(block) && block.size >= size) {
          position = block.start; selectedBlock = block;
          memory.lastAllocationEnd = block.start;
          pointer.className = 'scan-pointer found';
          await delay(simulationSpeed * 0.5);
          break;
        }
      }
      break;
    }

    case 'best': {
      let bestDiff = Infinity;
      for (const block of memory.freeBlocks) {
        if (!isSimulationRunning) break;
        await moveTo(getBlockEl(block.start));
        if (!memory.isBlockOccupied(block) && block.size >= size) {
          const d = block.size - size;
          if (d < bestDiff) { bestDiff = d; position = block.start; selectedBlock = block; }
        }
      }
      if (selectedBlock) {
        await moveTo(getBlockEl(selectedBlock.start));
        pointer.className = 'scan-pointer found';
        await delay(simulationSpeed * 0.5);
      }
      break;
    }

    case 'worst': {
      let worstDiff = -1;
      for (const block of memory.freeBlocks) {
        if (!isSimulationRunning) break;
        await moveTo(getBlockEl(block.start));
        if (!memory.isBlockOccupied(block) && block.size >= size) {
          const d = block.size - size;
          if (d > worstDiff) { worstDiff = d; position = block.start; selectedBlock = block; }
        }
      }
      if (selectedBlock) {
        await moveTo(getBlockEl(selectedBlock.start));
        pointer.className = 'scan-pointer found';
        await delay(simulationSpeed * 0.5);
      }
      break;
    }
  }

  return [position, selectedBlock];
}

/* ═══════════════════════════════════════════════════════════
   ANIMATE ALLOCATION (place process segment in block)
═══════════════════════════════════════════════════════════ */
async function animateAllocation(process, processNumber) {
  return new Promise(resolve => {
    const memoryBlock  = document.getElementById('memoryBlock');
    const blockContainer = memoryBlock.querySelector(`.memory-block-segment[data-block-index="${process.actualBlock}"]`);
    if (!blockContainer) { resolve(); return; }

    const range     = memory.blockRanges.get(process.actualBlock);
    const blockSize = range.end - range.start;
    const relStart  = process.start - range.start;
    const leftPct   = (relStart  / blockSize) * 100;
    const widthPct  = (process.size / blockSize) * 100;

    const ps = document.createElement('div');
    ps.className = 'process-segment';
    ps.style.left            = leftPct  + '%';
    ps.style.width           = widthPct + '%';
    ps.style.backgroundColor = PROC_COLORS[(processNumber - 1) % PROC_COLORS.length];
    ps.innerHTML = `P${processNumber} (${process.size}MB)`;
    ps.onclick   = () => deallocateProcess(process.id);

    blockContainer.appendChild(ps);
    setTimeout(resolve, simulationSpeed * 0.5);
  });
}

/* ═══════════════════════════════════════════════════════════
   DEALLOCATE
═══════════════════════════════════════════════════════════ */
function deallocateProcess(processId) {
  if (memory.deallocate(processId)) {
    visualizeMemoryBlocks();
    displayAllocationTables();
    updateWaitingProcessesList();
  }
}

/* ═══════════════════════════════════════════════════════════
   STOP SIMULATION
═══════════════════════════════════════════════════════════ */
function stopSimulation() {
  isSimulationRunning = false;
  resetMemory();
}

/* ═══════════════════════════════════════════════════════════
   RESET MEMORY
═══════════════════════════════════════════════════════════ */
function resetMemory() {
  isSimulationRunning = false;

  memory.segments = [];
  memory.lastAllocationEnd = 0;

  if (initialBlockDefs.length) {
    memory.totalSize = initialBlockDefs.reduce((t, b) => t + b.size, 0);
    memory.initializeFreeBlocks(initialBlockDefs.map(b => ({ ...b })));
  }

  waitingProcesses.length = 0;
  visualizeMemoryBlocks();

  const tablesSection = document.getElementById('allocationTables');
  if (tablesSection) tablesSection.innerHTML = '';

  const processList = document.getElementById('processList');
  if (processList) processList.innerHTML = '';

  const statusBar = document.getElementById('statusBar');
  if (statusBar) { statusBar.textContent = ''; }
}

/* ═══════════════════════════════════════════════════════════
   DISPLAY ALLOCATION TABLES
═══════════════════════════════════════════════════════════ */
function displayAllocationTables() {
  const tablesSection = document.getElementById('allocationTables');
  if (!tablesSection) return;
  tablesSection.innerHTML = '';

  if (!memory.segments.length && !waitingProcesses.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'allocation-tables';

  // ── Left: Allocation Table ──
  const leftDiv = document.createElement('div');

  const allocTitle = document.createElement('h3');
  allocTitle.textContent = 'Process Allocation Details';
  leftDiv.appendChild(allocTitle);

  const allocTable = document.createElement('table');
  const allProcs = [...memory.segments, ...waitingProcesses]
    .sort((a, b) => (a.processNumber || a.id) - (b.processNumber || b.id));

  allocTable.innerHTML = `
    <thead>
      <tr><th>Process</th><th>Size (MB)</th><th>Block #</th></tr>
    </thead>
    <tbody>
      ${allProcs.map(p => {
        const isAlloc = memory.segments.includes(p);
        return `<tr>
          <td>P${p.processNumber || p.id}</td>
          <td>${p.size}</td>
          <td class="${isAlloc ? '' : 'unallocated'}">${isAlloc ? p.actualBlock : '–'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
  leftDiv.appendChild(allocTable);

  // ── Right: Fragmentation Table ──
  const rightDiv = document.createElement('div');

  const fragTitle = document.createElement('h3');
  fragTitle.textContent = 'Block Fragmentation Details';
  rightDiv.appendChild(fragTitle);

  const fragTable = document.createElement('table');
  const fragRows = [];
  for (const [idx, range] of memory.blockRanges) {
    const blockSize = range.end - range.start;
    const used = memory.segments
      .filter(s => s.actualBlock === idx)
      .reduce((t, s) => t + s.size, 0);
    const frag = blockSize - used;
    if (frag > 0) fragRows.push(`<tr><td>${idx}</td><td>${frag}</td></tr>`);
  }

  fragTable.innerHTML = `
    <thead>
      <tr><th>Block #</th><th>Fragment (MB)</th></tr>
    </thead>
    <tbody>
      ${fragRows.length
        ? fragRows.join('')
        : '<tr><td colspan="2" style="color:#22c55e">No fragmentation</td></tr>'}
    </tbody>
  `;
  rightDiv.appendChild(fragTable);

  wrapper.appendChild(leftDiv);
  wrapper.appendChild(rightDiv);
  tablesSection.appendChild(wrapper);
}

/* ═══════════════════════════════════════════════════════════
   WAITING PROCESSES LIST
═══════════════════════════════════════════════════════════ */
function updateWaitingProcessesList() {
  const processList = document.getElementById('processList');
  if (!processList) return;
  processList.innerHTML = '';

  if (!waitingProcesses.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'waiting-processes';

  const title = document.createElement('h3');
  title.textContent = '⚠ Non-Allocated Processes';
  wrap.appendChild(title);

  const ul = document.createElement('ul');
  waitingProcesses.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `P${p.id} (${p.size} MB)`;
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  processList.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════
   STRATEGY INFO DIALOG
═══════════════════════════════════════════════════════════ */
function showStrategyInfo(title, info) {
  const dialog  = document.querySelector('.strategy-info-dialog');
  const overlay = document.querySelector('.dialog-overlay');
  if (!dialog || !overlay) return;

  dialog.querySelector('h3').textContent = title;
  dialog.querySelector('p').textContent  = info;
  dialog.style.display  = 'block';
  overlay.style.display = 'block';

  const closeDialog = () => {
    dialog.style.display  = 'none';
    overlay.style.display = 'none';
    document.removeEventListener('keydown', handleEsc);
  };

  dialog.querySelector('.close-dialog').onclick = closeDialog;
  overlay.onclick = closeDialog;

  const handleEsc = (e) => { if (e.key === 'Escape') closeDialog(); };
  document.addEventListener('keydown', handleEsc);
}

/* ═══════════════════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════════════════ */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(60, ms)));
}

/* ═══════════════════════════════════════════════════════════
   DOM READY
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  addSpeedControl();
  visualizeMemoryBlocks();

  const blockCountInput = document.getElementById('blockCount');
  if (blockCountInput) {
    blockCountInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') initializeMemoryBlocks();
    });
  }

  const processCountInput = document.getElementById('processCount');
  if (processCountInput) {
    processCountInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') generateProcessInputs();
    });
  }
});
