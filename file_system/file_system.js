/* file_system_sim.js
   File Allocation (Sequential · Indexed · Linked)
   Directory Structures (Single-Level · Two-Level · Tree · DAG)
*/

(function () {
  'use strict';

  /* ─── COLOUR PALETTE ─────────────────────────────── */
  const COLORS = [
    '#6366f1','#8b5cf6','#06b6d4','#ec4899',
    '#f97316','#22c55e','#ef4444','#facc15',
    '#14b8a6','#f43f5e','#a78bfa','#34d399',
    '#fb923c','#38bdf8','#e879f9','#a3e635'
  ];

  const ALLOC_INFO = {
    sequential: '<strong>Sequential (Contiguous):</strong> File blocks are stored in consecutive disk sectors. Fast access, but suffers from external fragmentation.',
    indexed:    '<strong>Indexed:</strong> One dedicated index block stores pointers to all data blocks. Supports direct access and avoids fragmentation.',
    linked:     '<strong>Linked:</strong> Each block contains a pointer to the next block. No fragmentation, but sequential-only access and overhead per block.'
  };

  const DIR_NAMES = {
    'single-level':  'Single-Level',
    'two-level':     'Two-Level',
    'tree-structured':'Tree-Structured',
    'dag':           'DAG'
  };

  /* ─── STATE ──────────────────────────────────────── */
  const S = {
    diskSize:   64,
    blocks:     [],    // null | { fileId, type:'data'|'index' }
    files:      {},    // id -> FileEntry
    dirs:       {},    // id -> DirEntry
    selected:   null,  // { id, type:'file'|'dir' }
    allocMethod:'sequential',
    dirStruct:  'single-level',
    colorIdx:   0,
    fileSeq:    0,
    dirSeq:     0
  };

  /* ─── BOOTSTRAP ──────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    bindUI();
    resetDisk();
  });

  function bindUI() {
    q('#reset-disk-btn')       .addEventListener('click',  resetDisk);
    q('#create-file-btn')      .addEventListener('click',  handleCreateFile);
    q('#create-dir-btn')       .addEventListener('click',  handleCreateDir);
    q('#delete-selected-btn')  .addEventListener('click',  handleDelete);
    q('#clear-log-btn')        .addEventListener('click',  clearLog);

    q('#allocation-method').addEventListener('change', e => {
      S.allocMethod = e.target.value;
      updateAllocBadge();
      renderDisk();
    });

    q('#directory-structure').addEventListener('change', e => {
      S.dirStruct = e.target.value;
      resetDisk();   // rebuild filesystem for new structure
    });

    q('#disk-size').addEventListener('change', e => {
      S.diskSize = Math.max(16, Math.min(256, parseInt(e.target.value) || 64));
      e.target.value = S.diskSize;
    });
  }

  /* ─── RESET ──────────────────────────────────────── */
  function resetDisk() {
    const sz = parseInt(q('#disk-size').value) || 64;
    S.diskSize  = Math.max(16, Math.min(256, sz));
    S.blocks    = new Array(S.diskSize).fill(null);
    S.files     = {};
    S.dirs      = {};
    S.selected  = null;
    S.colorIdx  = 0;
    S.fileSeq   = 0;
    S.dirSeq    = 0;

    // Root always exists
    mkDir('root', 'root', []);

    // Pre-seed two-level with user dirs
    if (S.dirStruct === 'two-level') {
      ['user_A', 'user_B'].forEach(n => {
        const id = 'dir_' + (++S.dirSeq);
        mkDir(id, n, ['root']);
        S.dirs['root'].childIds.push(id);
      });
    }

    updateDirUI();
    updateAllocBadge();
    updateDeleteBtn();
    renderAll();
    log('Disk reset — ' + S.diskSize + ' blocks, method: ' + S.allocMethod + ', structure: ' + DIR_NAMES[S.dirStruct], 'info');
  }

  function mkDir(id, name, parentIds) {
    S.dirs[id] = { id, name, parentIds: [...parentIds], childIds: [], fileIds: [] };
  }

  /* ─── ALLOCATION HELPERS ─────────────────────────── */

  function freeBlocks(count) {
    // Any `count` free block indices
    const out = [];
    for (let i = 0; i < S.blocks.length && out.length < count; i++) {
      if (!S.blocks[i]) out.push(i);
    }
    return out.length === count ? out : null;
  }

  function consecutiveFreeBlocks(count) {
    let run = 0, start = 0;
    for (let i = 0; i <= S.blocks.length; i++) {
      if (i < S.blocks.length && !S.blocks[i]) {
        if (run === 0) start = i;
        run++;
        if (run === count) return Array.from({ length: count }, (_, k) => start + k);
      } else {
        run = 0;
      }
    }
    return null;
  }

  function allocateBlocks(fileId, size, method) {
    if (method === 'sequential') {
      const blocks = consecutiveFreeBlocks(size);
      if (!blocks) return null;
      blocks.forEach(b => { S.blocks[b] = { fileId, type: 'data' }; });
      return { dataBlocks: blocks, indexBlock: null };
    }

    if (method === 'indexed') {
      // 1 index block + `size` data blocks
      const all = freeBlocks(size + 1);
      if (!all) return null;
      const indexBlock = all[0];
      const dataBlocks = all.slice(1);
      S.blocks[indexBlock] = { fileId, type: 'index' };
      dataBlocks.forEach(b => { S.blocks[b] = { fileId, type: 'data' }; });
      return { dataBlocks, indexBlock };
    }

    if (method === 'linked') {
      const blocks = freeBlocks(size);
      if (!blocks) return null;
      blocks.forEach(b => { S.blocks[b] = { fileId, type: 'data' }; });
      return { dataBlocks: blocks, indexBlock: null };
    }
    return null;
  }

  function releaseFileBlocks(fileId) {
    for (let i = 0; i < S.blocks.length; i++) {
      if (S.blocks[i]?.fileId === fileId) S.blocks[i] = null;
    }
  }

  /* ─── FILE OPERATIONS ────────────────────────────── */

  function handleCreateFile() {
    const name = q('#file-name').value.trim();
    const size = parseInt(q('#file-size').value) || 1;

    if (!name)               return log('Enter a file name.', 'error');
    if (size < 1 || size > 30) return log('Size must be 1–30 blocks.', 'error');
    if (Object.values(S.files).some(f => f.name === name))
      return log(`File "${name}" already exists.`, 'error');

    const parentId = defaultParentDir();
    const result   = allocateBlocks('__tmp__', size, S.allocMethod);

    if (!result) {
      const needed = S.allocMethod === 'sequential' ? `${size} consecutive` : `${size + (S.allocMethod === 'indexed' ? 1 : 0)}`;
      return log(`Not enough free blocks (need ${needed}).`, 'error');
    }

    const id    = 'file_' + (++S.fileSeq);
    const color = COLORS[S.colorIdx++ % COLORS.length];

    // Fix ownership (was __tmp__)
    result.dataBlocks.forEach(b => { S.blocks[b] = { fileId: id, type: 'data' }; });
    if (result.indexBlock !== null)
      S.blocks[result.indexBlock] = { fileId: id, type: 'index' };

    S.files[id] = { id, name, size, color, dataBlocks: result.dataBlocks, indexBlock: result.indexBlock, parentDirIds: [parentId] };
    S.dirs[parentId].fileIds.push(id);

    const allocDesc = S.allocMethod === 'sequential'
      ? `blocks [${result.dataBlocks.join(', ')}]`
      : S.allocMethod === 'indexed'
      ? `index@${result.indexBlock} → data [${result.dataBlocks.join(', ')}]`
      : `linked: ${result.dataBlocks.join(' → ')}`;

    log(`Created "${name}" (${size} blk) in /${S.dirs[parentId].name} — ${allocDesc}`, 'success');
    q('#file-name').value = '';
    renderAll();
  }

  function defaultParentDir() {
    if (S.dirStruct === 'single-level') return 'root';
    if (S.dirStruct === 'two-level') {
      const kids = S.dirs['root'].childIds;
      return kids.length ? kids[0] : 'root';
    }
    // tree / dag: use selected directory or root
    if (S.selected?.type === 'dir') return S.selected.id;
    return 'root';
  }

  /* ─── DIRECTORY OPERATIONS ───────────────────────── */

  function handleCreateDir() {
    const name = q('#dir-name').value.trim();
    if (!name) return log('Enter a directory name.', 'error');

    if (S.dirStruct === 'single-level')
      return log('Single-level: only one root directory allowed.', 'error');

    let parentId = 'root';
    if ((S.dirStruct === 'tree-structured' || S.dirStruct === 'dag') && S.selected?.type === 'dir') {
      parentId = S.selected.id;
    }

    if (S.dirs[parentId].childIds.some(cid => S.dirs[cid]?.name === name))
      return log(`"${name}" already exists in "${S.dirs[parentId].name}".`, 'error');

    const id = 'dir_' + (++S.dirSeq);
    mkDir(id, name, [parentId]);
    S.dirs[parentId].childIds.push(id);

    log(`Created directory "${name}" under "${S.dirs[parentId].name}"`, 'success');
    q('#dir-name').value = '';
    renderAll();
  }

  /* ─── DELETE ─────────────────────────────────────── */

  function handleDelete() {
    if (!S.selected) return;
    const { id, type } = S.selected;
    if (id === 'root') return log('Cannot delete root.', 'error');
    if (type === 'file') {
      const f = S.files[id];
      if (!f) return;
      // DAG: if file has multiple parents, prompt which link to remove
      if (S.dirStruct === 'dag' && f.parentDirIds.length > 1) {
        showUnlinkModal(id);
      } else {
        deleteFile(id);
      }
    } else {
      deleteDir(id);
    }
  }

  function deleteFile(id) {
    const f = S.files[id];
    if (!f) return;
    releaseFileBlocks(id);
    f.parentDirIds.forEach(pid => {
      if (S.dirs[pid]) S.dirs[pid].fileIds = S.dirs[pid].fileIds.filter(x => x !== id);
    });
    delete S.files[id];
    log(`Deleted file "${f.name}" entirely (all references removed)`, 'success');
    S.selected = null;
    updateDeleteBtn();
    renderAll();
  }

  function unlinkFile(fileId, fromDirId) {
    const f = S.files[fileId];
    const d = S.dirs[fromDirId];
    if (!f || !d) return;
    f.parentDirIds = f.parentDirIds.filter(pid => pid !== fromDirId);
    d.fileIds      = d.fileIds.filter(fid => fid !== fileId);
    log(`Unlinked "${f.name}" from "${d.name}" — still exists in ${f.parentDirIds.map(pid => '"' + (S.dirs[pid]?.name || pid) + '"').join(', ')}`, 'success');
    S.selected = null;
    updateDeleteBtn();
    renderAll();
  }

  function showUnlinkModal(fileId) {
    const existing = document.getElementById('dag-unlink-modal');
    if (existing) existing.remove();

    const f = S.files[fileId];
    const parents = f.parentDirIds.map(pid => ({ pid, name: S.dirs[pid]?.name || pid }));

    const modal = document.createElement('div');
    modal.id        = 'dag-unlink-modal';
    modal.className = 'dag-modal';
    modal.innerHTML = `
      <div class="dag-modal-box">
        <h3><i class="fas fa-unlink" style="margin-right:8px;color:#f87171"></i>Remove Reference — DAG</h3>
        <p><strong style="color:${f.color}">${escHtml(f.name)}</strong> is linked to ${parents.length} directories. Choose what to do:</p>
        <div class="form-group" style="margin-top:12px">
          <label>Unlink from a specific directory</label>
          <select id="dag-unlink-dir-sel">
            ${parents.map(p => `<option value="${p.pid}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button id="dag-unlink-confirm" class="btn-indigo" style="flex:1">Unlink from selected</button>
          <button id="dag-unlink-cancel"  class="btn-ghost-sm" style="flex:1">Cancel</button>
        </div>
        <div class="divider" style="margin:14px 0"></div>
        <button id="dag-delete-all" style="width:100%;padding:9px;border-radius:999px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.1);color:#f87171;font-family:'Outfit',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;">
          <i class="fas fa-trash" style="margin-right:6px"></i>Delete entirely (remove all ${parents.length} references)
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    q('#dag-unlink-confirm').addEventListener('click', () => {
      unlinkFile(fileId, q('#dag-unlink-dir-sel').value);
      modal.remove();
    });
    q('#dag-unlink-cancel').addEventListener('click', () => modal.remove());
    q('#dag-delete-all').addEventListener('click', () => {
      deleteFile(fileId);
      modal.remove();
    });
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  function deleteDir(id) {
    const d = S.dirs[id];
    if (!d) return;
    [...d.childIds].forEach(deleteDir);
    [...d.fileIds].forEach(fid => {
      const f = S.files[fid];
      if (!f) return;
      f.parentDirIds = f.parentDirIds.filter(p => p !== id);
      if (!f.parentDirIds.length) { releaseFileBlocks(fid); delete S.files[fid]; }
    });
    d.parentIds.forEach(pid => {
      if (S.dirs[pid]) S.dirs[pid].childIds = S.dirs[pid].childIds.filter(c => c !== id);
    });
    delete S.dirs[id];
    log(`Deleted directory "${d.name}"`, 'success');
    S.selected = null;
    updateDeleteBtn();
    renderAll();
  }

  /* ─── DAG LINK ───────────────────────────────────── */

  function linkFileToDir(fileId, targetDirId) {
    const f = S.files[fileId];
    if (!f) return;
    if (f.parentDirIds.includes(targetDirId))
      return log(`"${f.name}" is already linked to "${S.dirs[targetDirId].name}".`, 'error');
    f.parentDirIds.push(targetDirId);
    S.dirs[targetDirId].fileIds.push(fileId);
    log(`Linked "${f.name}" → "${S.dirs[targetDirId].name}" (DAG shared link)`, 'success');
    renderAll();
  }

  /* ─── RENDER ORCHESTRATOR ────────────────────────── */

  function renderAll() {
    renderDisk();
    renderDirStructure();
    renderLegend();
    updateStats();
    updateDeleteBtn();
  }

  /* ─── DISK GRID ──────────────────────────────────── */

  function renderDisk() {
    const grid = q('#disk-grid');
    grid.innerHTML = '';
    const selFileId = S.selected?.type === 'file' ? S.selected.id : null;

    S.blocks.forEach((blk, i) => {
      const div = document.createElement('div');
      div.className = 'disk-block';

      if (blk) {
        const file = S.files[blk.fileId];
        if (file) {
          div.classList.add('occupied');
          div.style.backgroundColor = blk.type === 'index' ? tintColor(file.color, 60) : file.color;
          div.style.color = '#fff';
          if (blk.type === 'index') {
            const tag = document.createElement('span');
            tag.className = 'block-tag';
            tag.textContent = 'I';
            div.appendChild(tag);
          }
          div.title = `Block ${i} — ${file.name} (${blk.type})`;
        }
        if (selFileId && blk.fileId === selFileId) div.classList.add('selected');
      } else {
        div.title = `Block ${i} — free`;
      }

      const idx = document.createElement('span');
      idx.className = 'block-idx';
      idx.textContent = i;
      div.appendChild(idx);

      div.addEventListener('click', () => {
        if (blk?.fileId) selectItem(blk.fileId, 'file');
      });

      grid.appendChild(div);
    });
  }

  /* Brighten a hex colour by `amount` */
  function tintColor(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16)        + amount);
    const g = Math.min(255, ((n >> 8) & 0xff)+ amount);
    const b = Math.min(255, (n & 0xff)       + amount);
    return `rgb(${r},${g},${b})`;
  }

  /* ─── DIRECTORY STRUCTURE RENDERER ──────────────── */

  function renderDirStructure() {
    const wrap = q('#dir-visual-wrap');
    wrap.innerHTML = '';

    if (S.dirStruct === 'dag') {
      const container = document.createElement('div');
      container.className = 'dag-container';
      wrap.appendChild(container);
      renderDAG(container);
    } else {
      const treeWrap = document.createElement('div');
      treeWrap.className = 'dir-tree-wrap';
      wrap.appendChild(treeWrap);
      const empty = !Object.keys(S.files).length && !S.dirs['root']?.childIds.length;
      if (empty) {
        treeWrap.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i>No files yet. Create one!</div>`;
      } else {
        treeWrap.appendChild(buildTreeNode('root'));
      }
    }
  }

  /* ─── CSS TREE (Single / Two-Level / Tree) ───────── */

  function buildTreeNode(dirId) {
    const dir = S.dirs[dirId];
    if (!dir) return document.createDocumentFragment();

    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    // Dir row
    const row = document.createElement('div');
    row.className = 'tree-item tree-dir' + (S.selected?.id === dirId ? ' selected' : '');
    row.innerHTML = `
      <span class="tree-icon">📁</span>
      <span class="tree-label">${escHtml(dir.name)}</span>
      <span class="tree-meta">${dir.fileIds.length + dir.childIds.length} item${dir.fileIds.length + dir.childIds.length !== 1 ? 's' : ''}</span>
    `;
    row.addEventListener('click', e => { e.stopPropagation(); selectItem(dirId, 'dir'); });
    wrapper.appendChild(row);

    // Children
    const hasKids = dir.childIds.length || dir.fileIds.length;
    if (hasKids) {
      const kids = document.createElement('div');
      kids.className = 'tree-children';
      dir.childIds.forEach(cid => kids.appendChild(buildTreeNode(cid)));
      dir.fileIds.forEach(fid => {
        const f = S.files[fid];
        if (!f) return;
        const fRow = document.createElement('div');
        fRow.className = 'tree-item tree-file' + (S.selected?.id === fid ? ' selected' : '');
        fRow.innerHTML = `
          <span class="tree-icon" style="color:${f.color}">📄</span>
          <span class="tree-label">${escHtml(f.name)}</span>
          <span class="tree-meta">${f.size} blk</span>
        `;
        fRow.addEventListener('click', e => { e.stopPropagation(); selectItem(fid, 'file'); });
        kids.appendChild(fRow);
      });
      wrapper.appendChild(kids);
    }

    return wrapper;
  }

  /* ─── SVG DAG ────────────────────────────────────── */

  function renderDAG(container) {
    const NS = 'http://www.w3.org/2000/svg';
    const NW = 130, NH = 34, HGAP = 16, VGAP = 70;

    /* ── layout: BFS levels for dirs ── */
    const levels = {};
    const bfsQ   = [{ id: 'root', lv: 0 }];
    const seen   = new Set();
    while (bfsQ.length) {
      const { id, lv } = bfsQ.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      levels[id] = lv;
      (S.dirs[id]?.childIds || []).forEach(cid => bfsQ.push({ id: cid, lv: lv + 1 }));
    }

    const byLevel = {};
    Object.entries(levels).forEach(([id, lv]) => {
      (byLevel[lv] = byLevel[lv] || []).push(id);
    });

    const maxDirLevel = Math.max(0, ...Object.values(levels));
    const fileLv      = maxDirLevel + 1;
    byLevel[fileLv]   = Object.keys(S.files);

    /* ── compute x,y per node ── */
    const pos = {};
    Object.entries(byLevel).forEach(([lv, nodes]) => {
      const y = parseInt(lv) * (NH + VGAP) + 14;
      const totalW = nodes.length * NW + (nodes.length - 1) * HGAP;
      nodes.forEach((id, i) => {
        pos[id] = { x: i * (NW + HGAP) + 10, y };
      });
    });

    const svgW = Math.max(
      300,
      ...Object.values(byLevel).map(nodes => nodes.length * (NW + HGAP) + 20)
    );
    const svgH = (maxDirLevel + 2) * (NH + VGAP) + 20;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('width', '100%');
    svg.style.minHeight = svgH + 'px';
    svg.style.display   = 'block';

    /* ── edges first (behind nodes) ── */
    const edgeGroup = document.createElementNS(NS, 'g');
    svg.appendChild(edgeGroup);

    function addEdge(fromId, toId, dashed) {
      if (!pos[fromId] || !pos[toId]) return;
      const x1 = pos[fromId].x + NW / 2, y1 = pos[fromId].y + NH;
      const x2 = pos[toId].x   + NW / 2, y2 = pos[toId].y;
      const cy = (y1 + y2) / 2;
      const p  = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', dashed ? '#06b6d4' : 'rgba(99,102,241,.55)');
      p.setAttribute('stroke-width', dashed ? '1.8' : '1.4');
      if (dashed) p.setAttribute('stroke-dasharray', '5,3');
      edgeGroup.appendChild(p);
    }

    // Dir → subdir edges
    Object.values(S.dirs).forEach(d => {
      d.childIds.forEach(cid => addEdge(d.id, cid, false));
    });

    // Dir → file edges
    Object.values(S.dirs).forEach(d => {
      d.fileIds.forEach(fid => {
        const shared = S.files[fid]?.parentDirIds.length > 1;
        addEdge(d.id, fid, shared);
      });
    });

    /* ── dir nodes ── */
    Object.values(S.dirs).forEach(dir => {
      if (!pos[dir.id]) return;
      const { x, y } = pos[dir.id];
      const isSelected = S.selected?.id === dir.id;

      const g = document.createElementNS(NS, 'g');
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => selectItem(dir.id, 'dir'));

      const rect = svgRect(NS, x, y, NW, NH, 7,
        isSelected ? 'rgba(99,102,241,.45)' : 'rgba(99,102,241,.12)',
        isSelected ? '#6366f1' : 'rgba(99,102,241,.5)',
        isSelected ? 2 : 1.2
      );
      const lbl = svgText(NS, x + NW/2, y + NH/2 + 4.5, '📁 ' + dir.name, '#ededf0', 11);

      g.appendChild(rect); g.appendChild(lbl);
      svg.appendChild(g);
    });

    /* ── file nodes ── */
    Object.values(S.files).forEach(file => {
      if (!pos[file.id]) return;
      const { x, y } = pos[file.id];
      const isSelected = S.selected?.id === file.id;
      const isShared   = file.parentDirIds.length > 1;

      const g = document.createElementNS(NS, 'g');
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => selectItem(file.id, 'file'));

      const rect = svgRect(NS, x, y, NW, NH, 7,
        isSelected ? file.color + 'aa' : file.color + '2a',
        isShared ? '#06b6d4' : file.color,
        isShared ? 2 : 1.2,
        isShared
      );
      const label = file.name + (isShared ? ' ×' + file.parentDirIds.length : '');
      const lbl = svgText(NS, x + NW/2, y + NH/2 + 4.5, '📄 ' + label, '#ededf0', 10.5);

      g.appendChild(rect); g.appendChild(lbl);
      svg.appendChild(g);
    });

    /* ── empty state ── */
    if (!Object.keys(S.files).length) {
      const t = svgText(NS, svgW/2, svgH - 20, 'No files yet — create one!', 'rgba(237,237,240,.25)', 12);
      t.setAttribute('text-anchor', 'middle');
      svg.appendChild(t);
    }

    container.appendChild(svg);

    /* ── link button (DAG-specific) ── */
    if (Object.keys(S.files).length && Object.keys(S.dirs).length > 1) {
      const btn = document.createElement('button');
      btn.className = 'btn-link-file';
      btn.innerHTML = '<i class="fas fa-link" style="margin-right:5px"></i>Link File to Another Directory (DAG)';
      btn.addEventListener('click', showLinkModal);
      container.appendChild(btn);
    }
  }

  /* SVG helpers */
  function svgRect(NS, x, y, w, h, rx, fill, stroke, sw, dashed) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('rx', rx);
    r.setAttribute('fill', fill);
    r.setAttribute('stroke', stroke);
    r.setAttribute('stroke-width', sw);
    if (dashed) r.setAttribute('stroke-dasharray', '4,2');
    return r;
  }
  function svgText(NS, x, y, text, fill, size) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', fill);
    t.setAttribute('font-size', size);
    t.setAttribute('font-family', 'Outfit, sans-serif');
    t.setAttribute('font-weight', '500');
    t.textContent = text;
    return t;
  }

  /* ─── DAG LINK MODAL ─────────────────────────────── */

  function showLinkModal() {
    const existingModal = q('#dag-link-modal');
    if (existingModal) existingModal.remove();

    const files = Object.values(S.files);
    const dirs  = Object.values(S.dirs).filter(d => d.id !== 'root');

    if (!files.length) return log('No files to link.', 'error');
    if (!dirs.length)  return log('Create a directory first.', 'error');

    const modal = document.createElement('div');
    modal.id    = 'dag-link-modal';
    modal.className = 'dag-modal';
    modal.innerHTML = `
      <div class="dag-modal-box">
        <h3><i class="fas fa-link" style="margin-right:8px;color:var(--cyan)"></i>Link File (DAG)</h3>
        <p>Create a shared link — the file will appear in both directories.</p>
        <div class="form-group">
          <label>Select File</label>
          <select id="dag-file-sel">
            ${files.map(f => `<option value="${f.id}">${f.name} (currently in: ${f.parentDirIds.map(pid => S.dirs[pid]?.name || pid).join(', ')})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Link to Directory</label>
          <select id="dag-dir-sel">
            ${dirs.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button id="dag-confirm" class="btn-indigo" style="flex:1">Create Link</button>
          <button id="dag-cancel"  class="btn-ghost-sm" style="flex:1">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    q('#dag-confirm').addEventListener('click', () => {
      linkFileToDir(q('#dag-file-sel').value, q('#dag-dir-sel').value);
      modal.remove();
    });
    q('#dag-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  /* ─── LEGEND ─────────────────────────────────────── */

  function renderLegend() {
    const legend = q('#disk-legend');
    legend.innerHTML = '';

    // Free
    addLegendItem(legend, 'rgba(255,255,255,.05)', 'Free block');

    // Index blocks (if indexed)
    if (S.allocMethod === 'indexed' && Object.keys(S.files).length) {
      addLegendItem(legend, '#b8bcff', 'Index block');
    }

    // Per-file colours
    Object.values(S.files).slice(0, 8).forEach(f => {
      addLegendItem(legend, f.color, f.name);
    });
    if (Object.keys(S.files).length > 8) {
      const more = document.createElement('span');
      more.className = 'legend-item';
      more.style.color = 'var(--subtle)';
      more.textContent = '…and more';
      legend.appendChild(more);
    }
  }

  function addLegendItem(parent, color, label) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-dot" style="background:${color};border:1px solid rgba(255,255,255,.1)"></div><span>${escHtml(label)}</span>`;
    parent.appendChild(item);
  }

  /* ─── SELECTION ──────────────────────────────────── */

  function selectItem(id, type) {
    S.selected = { id, type };
    updateDeleteBtn();
    renderDisk();
    renderDirStructure();

    const info = q('#selection-info');
    if (type === 'file') {
      const f = S.files[id];
      if (!f) return;
      const blockInfo = S.allocMethod === 'indexed'
        ? `Index: ${f.indexBlock} | Data: [${f.dataBlocks.join(', ')}]`
        : S.allocMethod === 'linked'
        ? `Linked: ${f.dataBlocks.join(' → ')}`
        : `Blocks: [${f.dataBlocks.join(', ')}]`;
      info.innerHTML = `<strong style="color:${f.color}">${escHtml(f.name)}</strong> — ${blockInfo}`;
      log(`Selected file "${f.name}" — ${blockInfo}`, 'info');
    } else {
      const d = S.dirs[id];
      if (!d) return;
      info.innerHTML = `<strong style="color:var(--cyan)">📁 ${escHtml(d.name)}</strong> — ${d.fileIds.length} file(s), ${d.childIds.length} subdir(s)`;
    }
  }

  /* ─── STATS ──────────────────────────────────────── */

  function updateStats() {
    const used = S.blocks.filter(Boolean).length;
    const free = S.diskSize - used;
    q('#total-blocks').textContent = S.diskSize;
    q('#used-blocks').textContent  = used;
    q('#free-blocks').textContent  = free;
    q('#disk-usage-bar').style.width = (used / S.diskSize * 100).toFixed(1) + '%';
  }

  /* ─── UI HELPERS ─────────────────────────────────── */

  function updateDeleteBtn() {
    const btn = q('#delete-selected-btn');
    const ok  = S.selected && S.selected.id !== 'root';
    btn.disabled = !ok;
    if (ok) {
      btn.innerHTML = S.selected.type === 'file'
        ? '<i class="fas fa-trash"></i> Delete File'
        : '<i class="fas fa-trash"></i> Delete Directory';
    } else {
      btn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected';
    }
  }

  function updateAllocBadge() {
    const badge = q('#alloc-method-badge');
    const labels = { sequential: 'Sequential', indexed: 'Indexed', linked: 'Linked' };
    badge.textContent = labels[S.allocMethod] || S.allocMethod;
    badge.className   = 'method-badge ' + S.allocMethod;
    q('#alloc-info-box').innerHTML = ALLOC_INFO[S.allocMethod] || '';
  }

  function updateDirUI() {
    const struct = S.dirStruct;
    const dirCard = q('#create-dir-section');
    const hint    = q('#dir-hint');
    const structLabel = q('#struct-name');

    structLabel.textContent = DIR_NAMES[struct] || struct;

    if (struct === 'single-level') {
      dirCard.style.display = 'none';
      hint.textContent      = '';
    } else {
      dirCard.style.display = 'block';
      if (struct === 'two-level')
        hint.textContent = 'Creates a user directory under root. Files go into user directories.';
      else if (struct === 'tree-structured')
        hint.textContent = 'Select a directory first to create a subdirectory inside it.';
      else if (struct === 'dag')
        hint.textContent = 'Like tree-structured, but files can be linked to multiple directories.';
    }
  }

  /* ─── LOG ────────────────────────────────────────── */

  function log(msg, type = 'info') {
    const el = q('#output-log');
    const p  = document.createElement('div');
    p.className = 'log-line log-' + type;
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.textContent = `[${t}] ${msg}`;
    el.insertBefore(p, el.firstChild);
    while (el.children.length > 60) el.removeChild(el.lastChild);
  }

  function clearLog() {
    q('#output-log').innerHTML = '<div class="log-line log-info">[log cleared]</div>';
  }

  /* ─── UTILS ──────────────────────────────────────── */

  function q(sel)      { return document.querySelector(sel); }
  function escHtml(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

}());
