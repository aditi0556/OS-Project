
document.addEventListener('DOMContentLoaded', function () {

  const dataSizeInput = document.getElementById('data-size');
  const blockSizeInput = document.getElementById('block-size');
  const speedInput = document.getElementById('sim-speed');
  const speedLabel = document.getElementById('speed-label');
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnReset = document.getElementById('btn-reset');
  const logEl = document.getElementById('interrupt-log');
  const resultsCard = document.getElementById('results-card');
  const finalStatsEl = document.getElementById('final-stats');

  const statDmaInt = document.getElementById('stat-dma-int');
  const statPioInt = document.getElementById('stat-pio-int');
  const statDmaBytes = document.getElementById('stat-dma-bytes');
  const statPioBytes = document.getElementById('stat-pio-bytes');
  const barDma = document.getElementById('bar-dma');
  const barPio = document.getElementById('bar-pio');

  const dmaDeviceStatus = document.getElementById('dma-device-status');
  const dmaCtrlStatus = document.getElementById('dma-ctrl-status');
  const dmaMemStatus = document.getElementById('dma-mem-status');
  const dmaCpuDot = document.getElementById('dma-cpu-dot');
  const dmaCpuText = document.getElementById('dma-cpu-text');
  const arrowDevDma = document.getElementById('arrow-dev-dma');
  const arrowDmaMem = document.getElementById('arrow-dma-mem');
  const arrowDmaCpu = document.getElementById('arrow-dma-cpu');
  const dmaDeviceBox = document.getElementById('dma-device');
  const dmaCtrlBox = document.getElementById('dma-controller-box');
  const dmaMemBox = document.getElementById('dma-memory');
  const dmaCpuBox = document.getElementById('dma-cpu');

  const pioDeviceStatus = document.getElementById('pio-device-status');
  const pioMemStatus = document.getElementById('pio-mem-status');
  const pioCpuDot = document.getElementById('pio-cpu-dot');
  const pioCpuText = document.getElementById('pio-cpu-text');
  const arrowPioDevCpu = document.getElementById('arrow-pio-dev-cpu');
  const arrowPioCpuMem = document.getElementById('arrow-pio-cpu-mem');
  const pioDeviceBox = document.getElementById('pio-device');
  const pioCpuBox = document.getElementById('pio-cpu');
  const pioMemBox = document.getElementById('pio-memory');

  let dataSize = 16;
  let blockSize = 4;
  let speed = 300;
  let running = false;
  let timer = null;

  let dmaInterrupts = 0;
  let pioInterrupts = 0;
  let dmaBytesSent = 0;
  let pioBytesSent = 0;
  let dmaBlockIndex = 0;
  let pioByteIndex = 0;
  let dmaPhase = 0;
  let pioPhase = 0;
  let dmaDone = false;
  let pioDone = false;
  let dmaCurrentByte = 0;

  const viewDma = document.getElementById('view-dma');
  const viewPio = document.getElementById('view-pio');

  window.setViewMode = function (mode) {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    if (mode === 'sideBySide') {
      viewDma.style.display = ''; viewPio.style.display = '';
      document.getElementById('tab-side-by-side').classList.add('active');
    } else if (mode === 'dmaOnly') {
      viewDma.style.display = ''; viewPio.style.display = 'none';
      document.getElementById('tab-dma-only').classList.add('active');
    } else {
      viewDma.style.display = 'none'; viewPio.style.display = '';
      document.getElementById('tab-pio-only').classList.add('active');
    }
  };


  speedInput.addEventListener('input', function () {
    speed = parseInt(this.value);
    speedLabel.textContent = speed + 'ms';
  });

  function log(msg, cls) {
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + cls;
    entry.textContent = msg;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }


  function updateStats() {
    statDmaInt.textContent = dmaInterrupts;
    statPioInt.textContent = pioInterrupts;
    statDmaBytes.textContent = dmaBytesSent + ' / ' + dataSize;
    statPioBytes.textContent = pioBytesSent + ' / ' + dataSize;
    dmaMemStatus.textContent = dmaBytesSent + ' / ' + dataSize + ' bytes';
    pioMemStatus.textContent = pioBytesSent + ' / ' + dataSize + ' bytes';

    const maxInt = Math.max(dmaInterrupts, pioInterrupts, 1);
    barDma.style.width = (dmaInterrupts / maxInt * 100) + '%';
    barDma.textContent = dmaInterrupts;
    barPio.style.width = (pioInterrupts / maxInt * 100) + '%';
    barPio.textContent = pioInterrupts;
  }

  function clearArch() {

    [arrowDevDma, arrowDmaMem, arrowDmaCpu].forEach(a => { a.className = 'arch-arrow-line'; });
    [dmaDeviceBox, dmaCtrlBox, dmaMemBox, dmaCpuBox].forEach(b => { b.className = 'arch-box'; });
    dmaDeviceStatus.textContent = 'Idle';
    dmaCtrlStatus.textContent = 'Idle';
    dmaCpuDot.className = 'cpu-dot free';
    dmaCpuText.textContent = 'Free';


    [arrowPioDevCpu, arrowPioCpuMem].forEach(a => { a.className = 'arch-arrow-line'; });
    [pioDeviceBox, pioCpuBox, pioMemBox].forEach(b => { b.className = 'arch-box'; });
    pioDeviceStatus.textContent = 'Idle';
    pioCpuDot.className = 'cpu-dot free';
    pioCpuText.textContent = 'Free';
  }

  function stepDma() {
    if (dmaDone) return;

    if (dmaPhase === 0) {

      clearDmaHighlights();
      dmaDeviceBox.classList.add('active-cyan');
      dmaCtrlBox.classList.add('active-cyan');
      arrowDevDma.classList.add('active-dma');
      dmaDeviceStatus.textContent = 'Sending block ' + (dmaBlockIndex + 1);
      dmaCtrlStatus.textContent = 'Receiving…';
      dmaCpuDot.className = 'cpu-dot free';
      dmaCpuText.textContent = 'Free (other work)';

      dmaCurrentByte = 0;
      log(`[DMA] Block ${dmaBlockIndex + 1}: Device → DMA Controller (${blockSize} bytes)`, 'dma-log');
      dmaPhase = 1;

    } else if (dmaPhase === 1) {

      clearDmaHighlights();
      dmaCtrlBox.classList.add('active-cyan');
      dmaMemBox.classList.add('active-cyan');
      arrowDmaMem.classList.add('active-dma');
      dmaCtrlStatus.textContent = 'Writing block…';

      const bytesThisBlock = Math.min(blockSize, dataSize - dmaBytesSent);
      dmaBytesSent += bytesThisBlock;
      log(`[DMA] Block ${dmaBlockIndex + 1}: DMA Controller → Memory (${bytesThisBlock} bytes written, total: ${dmaBytesSent}/${dataSize})`, 'dma-log');

      dmaCpuDot.className = 'cpu-dot free';
      dmaCpuText.textContent = 'Free (other work)';
      dmaPhase = 2;

    } else if (dmaPhase === 2) {

      clearDmaHighlights();
      dmaCpuBox.classList.add('active');
      arrowDmaCpu.classList.add('active');
      dmaCpuDot.className = 'cpu-dot busy';
      dmaCpuText.textContent = 'Handling interrupt';
      dmaCtrlStatus.textContent = 'Interrupt sent';
      dmaInterrupts++;

      log(`[DMA] INTERRUPT #${dmaInterrupts} -- Block ${dmaBlockIndex + 1} complete (${dmaBytesSent}/${dataSize} bytes transferred)`, 'dma-log');
      dmaBlockIndex++;

      if (dmaBytesSent >= dataSize) {
        dmaDone = true;
        log(`[DMA] Transfer complete! Total interrupts: ${dmaInterrupts}`, 'info-log');
        dmaDeviceStatus.textContent = 'Done';
        dmaCtrlStatus.textContent = 'Done';
        setTimeout(() => {
          clearDmaHighlights();
          dmaCpuDot.className = 'cpu-dot free';
          dmaCpuText.textContent = 'Free';
        }, speed * 0.6);
      } else {
        dmaPhase = 0;
      }
    }

    updateStats();
  }

  function clearDmaHighlights() {
    [arrowDevDma, arrowDmaMem, arrowDmaCpu].forEach(a => { a.className = 'arch-arrow-line'; });
    [dmaDeviceBox, dmaCtrlBox, dmaMemBox, dmaCpuBox].forEach(b => { b.className = 'arch-box'; });
  }


  function stepPio() {
    if (pioDone) return;

    if (pioPhase === 0) {

      clearPioHighlights();
      pioDeviceBox.classList.add('active-rose');
      pioCpuBox.classList.add('active-rose');
      arrowPioDevCpu.classList.add('active');
      arrowPioDevCpu.style.background = 'var(--rose)';
      arrowPioDevCpu.style.boxShadow = '0 0 8px rgba(244,63,94,.5)';
      pioDeviceStatus.textContent = 'Sending byte ' + (pioByteIndex + 1);
      pioCpuDot.className = 'cpu-dot busy';
      pioCpuText.textContent = 'Busy — reading byte';
      pioPhase = 1;

    } else if (pioPhase === 1) {

      clearPioHighlights();
      pioCpuBox.classList.add('active-rose');
      pioMemBox.classList.add('active-rose');
      arrowPioCpuMem.classList.add('active');
      arrowPioCpuMem.style.background = 'var(--rose)';
      arrowPioCpuMem.style.boxShadow = '0 0 8px rgba(244,63,94,.5)';
      pioCpuDot.className = 'cpu-dot busy';
      pioCpuText.textContent = 'Busy — writing byte';
      pioBytesSent++;
      pioPhase = 2;

    } else if (pioPhase === 2) {

      clearPioHighlights();
      pioCpuBox.classList.add('active');
      pioCpuDot.className = 'cpu-dot busy';
      pioCpuText.textContent = 'Handling interrupt';
      pioInterrupts++;
      pioByteIndex++;

      log(`[PIO] INTERRUPT #${pioInterrupts} -- Byte ${pioByteIndex} transferred (${pioBytesSent}/${dataSize})`, 'pio-log');

      if (pioBytesSent >= dataSize) {
        pioDone = true;
        log(`[PIO] Transfer complete! Total interrupts: ${pioInterrupts}`, 'info-log');
        pioDeviceStatus.textContent = 'Done';
        setTimeout(() => {
          clearPioHighlights();
          pioCpuDot.className = 'cpu-dot free';
          pioCpuText.textContent = 'Free';
        }, speed * 0.6);
      } else {
        pioPhase = 0;
      }
    }

    updateStats();
  }

  function clearPioHighlights() {
    [arrowPioDevCpu, arrowPioCpuMem].forEach(a => {
      a.className = 'arch-arrow-line';
      a.style.background = '';
      a.style.boxShadow = '';
    });
    [pioDeviceBox, pioCpuBox, pioMemBox].forEach(b => { b.className = 'arch-box'; });
  }


  function tick() {
    if (!running) return;

    if (!dmaDone) stepDma();
    if (!pioDone) stepPio();

    if (dmaDone && pioDone) {
      running = false;
      updateButtons();
      showResults();
      return;
    }

    timer = setTimeout(tick, speed);
  }


  function showResults() {
    resultsCard.style.display = 'block';
    const reduction = dataSize > 0 ? (((dataSize - dmaInterrupts) / dataSize) * 100).toFixed(1) : 0;

    finalStatsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Data Size</div>
        <div class="stat-value indigo">${dataSize} B</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Block Size</div>
        <div class="stat-value indigo">${blockSize} B</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">DMA Interrupts</div>
        <div class="stat-value cyan">${dmaInterrupts}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">PIO Interrupts</div>
        <div class="stat-value rose">${pioInterrupts}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Interrupt Reduction</div>
        <div class="stat-value emerald">${reduction}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">CPU Free (DMA)</div>
        <div class="stat-value emerald">~${(100 - (dmaInterrupts / pioInterrupts * 100)).toFixed(0)}%</div>
      </div>
    `;

    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }


  function updateButtons() {
    btnStart.disabled = running;
    btnStop.disabled = !running;
    dataSizeInput.disabled = running;
    blockSizeInput.disabled = running;
  }

  function resetAll() {
    running = false;
    clearTimeout(timer);
    dmaInterrupts = 0; pioInterrupts = 0;
    dmaBytesSent = 0; pioBytesSent = 0;
    dmaBlockIndex = 0; pioByteIndex = 0;
    dmaPhase = 0; pioPhase = 0;
    dmaCurrentByte = 0;
    dmaDone = false; pioDone = false;

    dataSize = Math.max(4, Math.min(64, parseInt(dataSizeInput.value) || 16));
    blockSize = Math.max(2, Math.min(16, parseInt(blockSizeInput.value) || 4));
    dataSizeInput.value = dataSize;
    blockSizeInput.value = blockSize;

    clearArch();
    updateStats();
    updateButtons();

    logEl.innerHTML = '<div class="log-entry info-log">Simulation reset. Ready to start.</div>';
    resultsCard.style.display = 'none';
    dmaMemStatus.textContent = '0 / ' + dataSize + ' bytes';
    pioMemStatus.textContent = '0 / ' + dataSize + ' bytes';
  }

  btnStart.addEventListener('click', function () {
    resetAll();
    running = true;
    updateButtons();

    log(`Starting simulation: ${dataSize} bytes, DMA block size = ${blockSize}`, 'info-log');
    log(`Expected: DMA = ${Math.ceil(dataSize / blockSize)} interrupts, PIO = ${dataSize} interrupts`, 'info-log');

    timer = setTimeout(tick, speed);
  });

  btnStop.addEventListener('click', function () {
    running = false;
    clearTimeout(timer);
    updateButtons();
    log('Simulation paused.', 'info-log');
  });

  btnReset.addEventListener('click', resetAll);


  resetAll();
});
