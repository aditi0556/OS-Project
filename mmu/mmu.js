class MemorySegment {
  constructor(id, name, base, limit, type) {
    this.id = id;
    this.name = name;
    this.base = base;
    this.limit = limit;
    this.type = type;
  }
}

class Page {
  constructor(pageNumber, frameNumber, valid = true) {
    this.pageNumber = pageNumber;
    this.frameNumber = frameNumber;
    this.valid = valid;
    this.referenced = false;
  }
}

class MemoryManagementSimulator {
  constructor() {
    this.segments = [];
    this.pages = [];
    this.totalMemorySize = 0x10000;
    this.pageSize = 0x1000;
    this.nextSegmentId = 0;
    this.initializeDOM();
    this.setupEventListeners();
    this.initializeDefaultSegments();
    this.initializeDefaultPages();
  }

  initializeDOM() {
    this.logicalMemory = document.getElementById('logicalMemory');
    this.physicalMemory = document.getElementById('physicalMemory');
    this.segmentTable = document.getElementById('segmentTable').querySelector('tbody');
    this.segmentNumber = document.getElementById('segmentNumber');
    this.offset = document.getElementById('offset');
    this.result = document.getElementById('result');
    this.virtualMemory = document.getElementById('virtualMemory');
    this.frameMemory = document.getElementById('frameMemory');
    this.pageTable = document.getElementById('pageTable').querySelector('tbody');
    this.pageNumber = document.getElementById('pageNumber');
    this.pageOffset = document.getElementById('pageOffset');
    this.pageResult = document.getElementById('pageResult');
    this.segmentationView = document.getElementById('segmentationView');
    this.pagingView = document.getElementById('pagingView');
  }

  setupEventListeners() {
    document.getElementById('convert').addEventListener('click', () => this.convertSegmentAddress());
    document.getElementById('convertPage').addEventListener('click', () => this.convertPageAddress());
    document.getElementById('segmentationMode').addEventListener('click', (e) => {
      this.switchMode('segmentation');
      document.querySelectorAll('.mode-selector button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
    document.getElementById('pagingMode').addEventListener('click', (e) => {
      this.switchMode('paging');
      document.querySelectorAll('.mode-selector button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  }

  switchMode(mode) {
    if (mode === 'segmentation') {
      this.segmentationView.classList.remove('hidden');
      this.pagingView.classList.add('hidden');
    } else {
      this.segmentationView.classList.add('hidden');
      this.pagingView.classList.remove('hidden');
    }
  }

  initializeDefaultSegments() {
    this.addSegment('Code', 0x1000, 0x1000, 'code');
    this.addSegment('Data', 0x3000, 0x2000, 'data');
    this.addSegment('Stack', 0x8000, 0x1000, 'stack');
    this.addSegment('Heap', 0x5000, 0x1500, 'heap');
  }

  initializeDefaultPages() {
    const usedFrames = new Set();
    for (let i = 0; i < 16; i++) {
      let frameNumber;
      do {
        frameNumber = Math.floor(Math.random() * 32);
      } while (usedFrames.has(frameNumber));
      usedFrames.add(frameNumber);
      this.pages.push(new Page(i, frameNumber, Math.random() > 0.2));
    }
    this.updatePageVisualization();
    this.updatePageTable();
  }

  addSegment(name, base, limit, type) {
    const segment = new MemorySegment(this.nextSegmentId++, name, base, limit, type);
    this.segments.push(segment);
    this.updateSegmentVisualization();
    this.updateSegmentTable();
  }

  updateSegmentVisualization() {
    this.logicalMemory.innerHTML = '';
    this.physicalMemory.innerHTML = '';
    this.segments.forEach(seg => {
      this.logicalMemory.appendChild(this.createSegmentElement(seg, true));
      this.physicalMemory.appendChild(this.createSegmentElement(seg, false));
    });
  }

  updatePageVisualization() {
    this.virtualMemory.innerHTML = '';
    this.frameMemory.innerHTML = '';
    this.pages.forEach(page => {
      this.virtualMemory.appendChild(this.createPageElement(page, true));
      if (page.valid) this.frameMemory.appendChild(this.createPageElement(page, false));
    });
  }

  createSegmentElement(segment, isLogical) {
    const el = document.createElement('div');
    el.className = 'segment';
    const position = isLogical
      ? (segment.id * 100 / this.segments.length)
      : (segment.base * 100 / this.totalMemorySize);
    const height = isLogical
      ? (100 / this.segments.length)
      : (segment.limit * 100 / this.totalMemorySize);
    el.style.top = `${position}%`;
    el.style.height = `${height}%`;
    const colors = {
      code: 'rgba(96,165,250,0.15)',
      data: 'rgba(52,211,153,0.15)',
      stack: 'rgba(251,146,60,0.15)',
      heap: 'rgba(167,139,250,0.15)'
    };
    const borders = {
      code: '#60a5fa',
      data: '#34d399',
      stack: '#fb923c',
      heap: '#a78bfa'
    };
    el.style.backgroundColor = colors[segment.type] || 'rgba(255,255,255,0.1)';
    el.style.borderLeftColor = borders[segment.type] || '#a855f7';
    const label = document.createElement('div');
    label.className = 'segment-label';
    label.textContent = segment.name;
    el.appendChild(label);
    return el;
  }

  createPageElement(page, isVirtual) {
    const el = document.createElement('div');
    el.className = 'page';
    const position = isVirtual
      ? (page.pageNumber * 100 / 16)
      : (page.frameNumber * 100 / 32);
    const height = isVirtual ? (100 / 16) : (100 / 32);
    el.style.top = `${position}%`;
    el.style.height = `${height}%`;
    el.style.backgroundColor = page.valid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
    el.style.borderLeftColor = page.valid ? '#22c55e' : '#ef4444';
    const label = document.createElement('div');
    label.className = 'page-label';
    label.textContent = isVirtual
      ? `P${page.pageNumber}`
      : `F${page.frameNumber} ← P${page.pageNumber}`;
    el.appendChild(label);
    return el;
  }

  updateSegmentTable() {
    this.segmentTable.innerHTML = '';
    this.segments.forEach(seg => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${seg.id}</td>
        <td>0x${seg.base.toString(16).toUpperCase()}</td>
        <td>0x${seg.limit.toString(16).toUpperCase()}</td>
        <td>${seg.type}</td>
      `;
      this.segmentTable.appendChild(row);
    });
  }

  updatePageTable() {
    this.pageTable.innerHTML = '';
    this.pages.forEach(page => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${page.pageNumber}</td>
        <td>${page.valid ? page.frameNumber : 'N/A'}</td>
        <td style="color:${page.valid ? 'var(--success)' : 'var(--error)'}">${page.valid ? 'Yes' : 'No'}</td>
        <td>${page.referenced ? 'Yes' : 'No'}</td>
      `;
      this.pageTable.appendChild(row);
    });
  }

  convertSegmentAddress() {
    const segNum = parseInt(this.segmentNumber.value);
    const offsetVal = parseInt(this.offset.value);
    if (isNaN(segNum) || isNaN(offsetVal)) {
      this.result.textContent = '✗ Invalid input';
      this.result.style.color = 'var(--error)';
      return;
    }
    const segment = this.segments.find(s => s.id === segNum);
    if (!segment) {
      this.result.textContent = '✗ Invalid segment number';
      this.result.style.color = 'var(--error)';
      return;
    }
    if (offsetVal >= segment.limit) {
      this.result.textContent = '✗ Segment violation: Offset exceeds limit';
      this.result.style.color = 'var(--error)';
      return;
    }
    const physicalAddress = segment.base + offsetVal;
    this.result.textContent = `✓ Physical Address: 0x${physicalAddress.toString(16).toUpperCase()}`;
    this.result.style.color = 'var(--success)';
    this.animateAddressTranslation(segNum, offsetVal, physicalAddress, true);
  }

  convertPageAddress() {
    const pageNum = parseInt(this.pageNumber.value);
    const offsetVal = parseInt(this.pageOffset.value);
    if (isNaN(pageNum) || isNaN(offsetVal)) {
      this.pageResult.textContent = '✗ Invalid input';
      this.pageResult.style.color = 'var(--error)';
      return;
    }
    if (pageNum >= this.pages.length) {
      this.pageResult.textContent = '✗ Invalid page number';
      this.pageResult.style.color = 'var(--error)';
      return;
    }
    if (offsetVal >= this.pageSize) {
      this.pageResult.textContent = '✗ Offset exceeds page size';
      this.pageResult.style.color = 'var(--error)';
      return;
    }
    const page = this.pages[pageNum];
    if (!page.valid) {
      this.pageResult.textContent = '✗ Page fault: Page not in memory';
      this.pageResult.style.color = 'var(--error)';
      return;
    }
    const physicalAddress = (page.frameNumber * this.pageSize) + offsetVal;
    this.pageResult.textContent = `✓ Physical Address: 0x${physicalAddress.toString(16).toUpperCase()}`;
    this.pageResult.style.color = 'var(--success)';
    page.referenced = true;
    this.updatePageTable();
    this.animateAddressTranslation(pageNum, offsetVal, physicalAddress, false);
  }

  animateAddressTranslation(num, offset, physicalAddress, isSegmentation) {
    const elements = document.querySelectorAll(isSegmentation ? '.segment' : '.page');
    elements.forEach(el => el.style.opacity = '0.2');
    const virtualIndex = isSegmentation
      ? this.segments.findIndex(s => s.id === num)
      : this.pages.findIndex(p => p.pageNumber === num);
    const vEl = (isSegmentation ? this.logicalMemory : this.virtualMemory).children[virtualIndex];
    const pEl = (isSegmentation ? this.physicalMemory : this.frameMemory).children[virtualIndex];
    if (vEl) { vEl.style.opacity = '1'; vEl.style.boxShadow = '0 0 12px rgba(168,85,247,0.6)'; }
    if (pEl) { pEl.style.opacity = '1'; pEl.style.boxShadow = '0 0 12px rgba(168,85,247,0.6)'; }
    setTimeout(() => {
      elements.forEach(el => { el.style.opacity = '1'; el.style.boxShadow = ''; });
    }, 1800);
  }
}

document.addEventListener('DOMContentLoaded', () => new MemoryManagementSimulator());
