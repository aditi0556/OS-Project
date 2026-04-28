'use strict';

const algorithms = {

  fifo(refString, frameCount) {
    const memory = Array(frameCount).fill(-1);
    const queue = [];
    const history = [];
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = memory.includes(page);

      if (!isHit) {
        faults++;
        const emptySlot = memory.indexOf(-1);
        if (emptySlot !== -1) {
          memory[emptySlot] = page;
          queue.push(page);
        } else {
          const evict = queue.shift();
          memory[memory.indexOf(evict)] = page;
          queue.push(page);
        }
      }

      history.push({ page, hit: isHit, fault: !isHit, memory: [...memory] });
    }

    return { history, totalFaults: faults, totalHits: refString.length - faults };
  },

  lru(refString, frameCount) {
    const memory = Array(frameCount).fill(-1);
    const order  = [];
    const history = [];
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = memory.includes(page);

      // Remove page from order only if it's already there
      const existsInOrder = order.indexOf(page);
      if (existsInOrder !== -1) order.splice(existsInOrder, 1);

      if (!isHit) {
        faults++;
        const emptySlot = memory.indexOf(-1);
        if (emptySlot !== -1) {
          memory[emptySlot] = page;
        } else {
          const evict = order.shift();
          memory[memory.indexOf(evict)] = page;
        }
      }

      order.push(page);
      history.push({ page, hit: isHit, fault: !isHit, memory: [...memory] });
    }

    return { history, totalFaults: faults, totalHits: refString.length - faults };
  },

  lfu(refString, frameCount) {
    const memory   = Array(frameCount).fill(-1);
    const freq     = {};
    const lastUsed = {};
    const history  = [];
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      freq[page]     = (freq[page] || 0) + 1;
      lastUsed[page] = i;

      const isHit = memory.includes(page);

      if (!isHit) {
        faults++;
        const emptySlot = memory.indexOf(-1);
        if (emptySlot !== -1) {
          memory[emptySlot] = page;
        } else {
          let minFreq = Infinity, minLast = Infinity, evictIdx = 0;
          for (let j = 0; j < frameCount; j++) {
            const p = memory[j];
            if (freq[p] < minFreq || (freq[p] === minFreq && lastUsed[p] < minLast)) {
              minFreq = freq[p]; minLast = lastUsed[p]; evictIdx = j;
            }
          }
          memory[evictIdx] = page;
        }
      }

      history.push({
        page, hit: isHit, fault: !isHit,
        memory: [...memory],
        freq: { ...freq }
      });
    }

    return { history, totalFaults: faults, totalHits: refString.length - faults };
  },

  optimal(refString, frameCount) {
    const memory  = Array(frameCount).fill(-1);
    const history = [];
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = memory.includes(page);

      if (!isHit) {
        faults++;
        const emptySlot = memory.indexOf(-1);
        if (emptySlot !== -1) {
          memory[emptySlot] = page;
        } else {
          let farthest = -1, evictIdx = 0;
          for (let j = 0; j < frameCount; j++) {
            const future = refString.indexOf(memory[j], i + 1);
            const dist   = future === -1 ? Infinity : future;
            if (dist > farthest) { farthest = dist; evictIdx = j; }
          }
          memory[evictIdx] = page;
        }
      }

      history.push({ page, hit: isHit, fault: !isHit, memory: [...memory] });
    }

    return { history, totalFaults: faults, totalHits: refString.length - faults };
  },

  random(refString, frameCount) {
    const memory  = Array(frameCount).fill(-1);
    const history = [];
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = memory.includes(page);

      if (!isHit) {
        faults++;
        const emptySlot = memory.indexOf(-1);
        if (emptySlot !== -1) {
          memory[emptySlot] = page;
        } else {
          memory[Math.floor(Math.random() * frameCount)] = page;
        }
      }

      history.push({ page, hit: isHit, fault: !isHit, memory: [...memory] });
    }

    return { history, totalFaults: faults, totalHits: refString.length - faults };
  }
};