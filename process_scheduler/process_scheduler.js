document.addEventListener('DOMContentLoaded', function () {
  // Initial state
  let processes = [
    { id: 1, name: "P1", arrivalTime: 0, burstTime: 10, priority: 2, color: "#6366f1", remainingTime: 10 },
    { id: 2, name: "P2", arrivalTime: 1, burstTime: 4, priority: 1, color: "#10b981", remainingTime: 4 },
    { id: 3, name: "P3", arrivalTime: 2, burstTime: 2, priority: 3, color: "#f43f5e", remainingTime: 2 },
    { id: 4, name: "P4", arrivalTime: 3, burstTime: 6, priority: 4, color: "#f97316", remainingTime: 6 },
  ];

  let algorithm = "fcfs";
  let isPreemptive = false;
  let timeQuantum = 2;
  let currentTime = 0;
  let isRunning = false;
  let speed = 1000;
  let ganttChart = [];
  let completionInfo = [];
  let simulationComplete = false;
  let queue = [];
  let currentProcess = null;
  let quantumProgress = 0;
  let simulationTimer;

  let mlfqQ1Quantum = 2;
  let mlfqQ2Quantum = 4;
  let mlfqQueues = [[], [], []];
  let mlfqCurrentLevel = 0;
  let mlfqQuantumProgress = 0;

  const colors = [
    "#6366f1", // Indigo
    "#10b981", // Emerald
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#06b6d4", // Cyan
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#3b82f6", // Blue
    "#eab308", // Yellow
    "#d946ef", // Fuchsia
    "#84cc16"  // Lime
  ];

  // DOM elements
  const algorithmSelect = document.getElementById('algorithm');
  const preemptiveContainer = document.getElementById('preemptive-container');
  const preemptiveSelect = document.getElementById('preemptive');
  const timeQuantumContainer = document.getElementById('time-quantum-container');
  const timeQuantumInput = document.getElementById('time-quantum');
  const speedInput = document.getElementById('speed');
  const speedValue = document.getElementById('speed-value');
  const processNameInput = document.getElementById('process-name');
  const arrivalTimeInput = document.getElementById('arrival-time');
  const burstTimeInput = document.getElementById('burst-time');
  const priorityInput = document.getElementById('priority');
  const priorityContainer = document.getElementById('priority-container');
  const addProcessBtn = document.getElementById('add-process-btn');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const resetBtn = document.getElementById('reset-btn');
  const processesTable = document.getElementById('processes-tbody');
  const ganttChartEl = document.getElementById('gantt-chart');
  const currentTimeEl = document.getElementById('current-time');
  const currentProcessInfo = document.getElementById('current-process-info');
  const queueDisplay = document.getElementById('queue-display');
  const outputCard = document.getElementById('output-card');
  const outputTable = document.getElementById('output-tbody');
  const mlfqContainer = document.getElementById('mlfq-container');
  const mlfqQ1Input = document.getElementById('mlfq-q1');
  const mlfqQ2Input = document.getElementById('mlfq-q2');

  algorithmSelect.addEventListener('change', function () {
    algorithm = this.value;

    if (algorithm === 'fcfs' || algorithm === 'rr' || algorithm === 'mlfq') {
      preemptiveContainer.style.display = 'none';
    } else {
      preemptiveContainer.style.display = 'block';
    }

    if (algorithm === 'rr') {
      timeQuantumContainer.style.display = 'block';
    } else {
      timeQuantumContainer.style.display = 'none';
    }

    if (algorithm === 'mlfq') {
      mlfqContainer.style.display = 'block';
    } else {
      mlfqContainer.style.display = 'none';
    }

    if (algorithm === 'priority') {
      priorityContainer.style.display = 'block';
    } else {
      priorityContainer.style.display = 'none';
    }
  });


  preemptiveSelect.addEventListener('change', function () {
    isPreemptive = this.value === 'true';
  });


  timeQuantumInput.addEventListener('change', function () {
    timeQuantum = Math.max(1, parseInt(this.value) || 1);
    this.value = timeQuantum;
  });


  speedInput.addEventListener('input', function () {
    speed = parseInt(this.value);
    speedValue.textContent = speed + 'ms';
  });


  addProcessBtn.addEventListener('click', function () {
    const name = processNameInput.value.trim();
    const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
    const burstTime = parseInt(burstTimeInput.value) || 1;
    const priority = parseInt(priorityInput.value) || 1;

    if (name && burstTime > 0) {
      const newId = processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1;
      const processColor = colors[newId % colors.length];

      processes.push({
        id: newId,
        name: name,
        arrivalTime: arrivalTime,
        burstTime: burstTime,
        priority: priority,
        color: processColor,
        remainingTime: burstTime
      });

      processNameInput.value = '';
      updateProcessesTable();
    }
  });


  startBtn.addEventListener('click', function () {
    resetSimulation();
    isRunning = true;
    updateButtons();
    runSimulation();
  });


  stopBtn.addEventListener('click', function () {
    isRunning = false;
    updateButtons();
    clearTimeout(simulationTimer);
  });


  resetBtn.addEventListener('click', function () {
    resetSimulation();
    updateButtons();
  });


  function resetSimulation() {
    currentTime = 0;
    ganttChart = [];
    isRunning = false;
    simulationComplete = false;
    completionInfo = [];
    currentProcess = null;
    quantumProgress = 0;
    queue = [];
    clearTimeout(simulationTimer);

    mlfqQueues = [[], [], []];
    mlfqCurrentLevel = 0;
    mlfqQuantumProgress = 0;
    if (mlfqQ1Input) mlfqQ1Quantum = Math.max(1, parseInt(mlfqQ1Input.value) || 2);
    if (mlfqQ2Input) mlfqQ2Quantum = Math.max(1, parseInt(mlfqQ2Input.value) || 4);


    processes = processes.map(p => ({
      ...p,
      remainingTime: p.burstTime,
      mlfqLevel: 0
    }));

    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
    updateQueueDisplay();
    updateOutputTable();
  }

  function updateButtons() {
    startBtn.disabled = isRunning || processes.length === 0;
    stopBtn.disabled = !isRunning;
  }


  function removeProcess(id) {
    processes = processes.filter(p => p.id !== id);
    updateProcessesTable();
  }

  function updateProcessesTable() {
    processesTable.innerHTML = '';

    processes.forEach(process => {
      const row = document.createElement('tr');


      const nameCell = document.createElement('td');
      const nameDiv = document.createElement('div');
      nameDiv.style.display = 'flex';
      nameDiv.style.alignItems = 'center';

      const colorDiv = document.createElement('div');
      colorDiv.classList.add('process-color');
      colorDiv.style.backgroundColor = process.color;

      nameDiv.appendChild(colorDiv);
      nameDiv.appendChild(document.createTextNode(process.name));
      nameCell.appendChild(nameDiv);
      row.appendChild(nameCell);


      const arrivalCell = document.createElement('td');
      arrivalCell.textContent = process.arrivalTime;
      row.appendChild(arrivalCell);


      const burstCell = document.createElement('td');
      burstCell.textContent = process.burstTime;
      row.appendChild(burstCell);


      const priorityCell = document.createElement('td');
      priorityCell.textContent = process.priority;
      row.appendChild(priorityCell);


      const remainingCell = document.createElement('td');

      const progressBar = document.createElement('div');
      progressBar.classList.add('progress-bar');

      const progressFill = document.createElement('div');
      progressFill.classList.add('progress-bar-fill');
      progressFill.style.width = `${(process.burstTime - process.remainingTime) / process.burstTime * 100}%`;
      progressFill.style.backgroundColor = process.color;

      const progressText = document.createElement('div');
      progressText.classList.add('progress-text');
      progressText.textContent = `${process.remainingTime}/${process.burstTime}`;

      progressBar.appendChild(progressFill);
      remainingCell.appendChild(progressBar);
      remainingCell.appendChild(progressText);
      row.appendChild(remainingCell);


      const actionsCell = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-btn');
      removeBtn.textContent = 'Remove';
      removeBtn.disabled = isRunning;
      removeBtn.addEventListener('click', () => removeProcess(process.id));

      actionsCell.appendChild(removeBtn);
      row.appendChild(actionsCell);

      processesTable.appendChild(row);
    });

    updateButtons();
  }


  function updateGanttChart() {
    ganttChartEl.innerHTML = '';

    if (ganttChart.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.classList.add('text-center', 'text-gray');
      emptyMessage.style.padding = '16px';
      emptyMessage.textContent = 'Gantt chart will appear here when simulation starts';
      ganttChartEl.appendChild(emptyMessage);
      return;
    }

    ganttChart.forEach((item, index) => {
      const ganttItem = document.createElement('div');
      ganttItem.classList.add('gantt-item');
      ganttItem.style.backgroundColor = item.color;
      ganttItem.style.minWidth = '60px';


      const processName = document.createElement('div');
      processName.classList.add('gantt-process-name');
      processName.textContent = item.processName;
      processName.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);


      const timeRange = document.createElement('div');
      timeRange.classList.add('gantt-time');
      timeRange.textContent = `${item.startTime} - ${item.endTime}`;
      timeRange.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);

      ganttItem.appendChild(processName);
      ganttItem.appendChild(timeRange);


      const startMarker = document.createElement('div');
      startMarker.classList.add('time-marker');
      startMarker.style.left = '0';
      ganttItem.appendChild(startMarker);

      const startLabel = document.createElement('div');
      startLabel.classList.add('time-marker-label');
      startLabel.textContent = item.startTime;
      startLabel.style.left = '0';
      ganttItem.appendChild(startLabel);

      if (index === ganttChart.length - 1) {
        const endMarker = document.createElement('div');
        endMarker.classList.add('time-marker');
        endMarker.style.right = '0';
        ganttItem.appendChild(endMarker);

        const endLabel = document.createElement('div');
        endLabel.classList.add('time-marker-label');
        endLabel.textContent = item.endTime;
        endLabel.style.right = '0';
        ganttItem.appendChild(endLabel);
      }

      ganttChartEl.appendChild(ganttItem);
    });
  }


  function updateCurrentTime() {
    currentTimeEl.textContent = currentTime;
  }


  function updateCurrentProcessInfo() {
    currentProcessInfo.innerHTML = '';

    if (currentProcess) {
      const infoDiv = document.createElement('div');
      infoDiv.classList.add('current-process-info');

      const processNameDiv = document.createElement('div');
      processNameDiv.style.fontWeight = '500';
      processNameDiv.textContent = `Current Process: ${currentProcess.name}`;
      infoDiv.appendChild(processNameDiv);

      if (algorithm === 'rr') {
        const quantumDiv = document.createElement('div');
        quantumDiv.style.fontSize = '14px';
        quantumDiv.classList.add('quantum-progress');
        quantumDiv.textContent = `Quantum Progress: ${quantumProgress}/${timeQuantum}`;

        const quantumBar = document.createElement('div');
        quantumBar.classList.add('quantum-bar');

        const quantumFill = document.createElement('div');
        quantumFill.classList.add('quantum-bar-fill');
        quantumFill.style.width = `${quantumProgress / timeQuantum * 100}%`;

        quantumBar.appendChild(quantumFill);
        quantumDiv.appendChild(quantumBar);
        infoDiv.appendChild(quantumDiv);
      }

      if (algorithm === 'mlfq') {
        const levelDiv = document.createElement('div');
        levelDiv.style.fontSize = '14px';
        levelDiv.classList.add('quantum-progress');
        const qLabel = mlfqCurrentLevel === 2 ? 'Queue 3 (FCFS)' : `Queue ${mlfqCurrentLevel + 1} (RR)`;
        const qMax = mlfqCurrentLevel === 0 ? mlfqQ1Quantum : mlfqCurrentLevel === 1 ? mlfqQ2Quantum : '-';
        levelDiv.textContent = `Level: ${qLabel} | Progress: ${mlfqQuantumProgress}/${qMax}`;

        const quantumBar = document.createElement('div');
        quantumBar.classList.add('quantum-bar');
        const quantumFill = document.createElement('div');
        quantumFill.classList.add('quantum-bar-fill');
        if (mlfqCurrentLevel < 2) {
          const max = mlfqCurrentLevel === 0 ? mlfqQ1Quantum : mlfqQ2Quantum;
          quantumFill.style.width = `${(mlfqQuantumProgress / max) * 100}%`;
        } else {
          quantumFill.style.width = '100%';
        }
        quantumBar.appendChild(quantumFill);
        levelDiv.appendChild(quantumBar);
        infoDiv.appendChild(levelDiv);
      }

      currentProcessInfo.appendChild(infoDiv);
    }
  }

  function updateQueueDisplay() {
    queueDisplay.innerHTML = '';

    if (algorithm === 'rr' && queue.length > 0) {
      const queueDiv = document.createElement('div');
      queueDiv.classList.add('queue-display');

      const titleDiv = document.createElement('div');
      titleDiv.classList.add('queue-title');
      titleDiv.textContent = 'Ready Queue:';
      queueDiv.appendChild(titleDiv);

      const itemsDiv = document.createElement('div');
      itemsDiv.classList.add('queue-items');

      queue.forEach((process, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('queue-item');
        itemDiv.style.backgroundColor = process.color;
        itemDiv.style.color = getContrastColor(process.color);
        itemDiv.textContent = `${process.name} (${process.remainingTime})`;

        itemsDiv.appendChild(itemDiv);
      });

      queueDiv.appendChild(itemsDiv);
      queueDisplay.appendChild(queueDiv);
    }

    if (algorithm === 'mlfq') {
      const queueNames = ['Queue 1 (RR, q=' + mlfqQ1Quantum + ')', 'Queue 2 (RR, q=' + mlfqQ2Quantum + ')', 'Queue 3 (FCFS)'];
      const queueColors = ['rgba(99,102,241,0.15)', 'rgba(139,92,246,0.15)', 'rgba(6,182,212,0.15)'];
      const borderColors = ['rgba(99,102,241,0.4)', 'rgba(139,92,246,0.4)', 'rgba(6,182,212,0.4)'];

      for (let i = 0; i < 3; i++) {
        if (mlfqQueues[i].length === 0 && !(currentProcess && currentProcess.mlfqLevel === i)) continue;

        const queueDiv = document.createElement('div');
        queueDiv.classList.add('queue-display');
        queueDiv.style.background = queueColors[i];
        queueDiv.style.borderColor = borderColors[i];

        const titleDiv = document.createElement('div');
        titleDiv.classList.add('queue-title');
        titleDiv.textContent = queueNames[i];
        queueDiv.appendChild(titleDiv);

        const itemsDiv = document.createElement('div');
        itemsDiv.classList.add('queue-items');

        mlfqQueues[i].forEach(process => {
          const itemDiv = document.createElement('div');
          itemDiv.classList.add('queue-item');
          itemDiv.style.backgroundColor = process.color;
          itemDiv.style.color = getContrastColor(process.color);
          itemDiv.textContent = `${process.name} (${process.remainingTime})`;
          itemsDiv.appendChild(itemDiv);
        });

        queueDiv.appendChild(itemsDiv);
        queueDisplay.appendChild(queueDiv);
      }
    }
  }


  function updateOutputTable() {
    outputTable.innerHTML = '';

    if (completionInfo.length === 0) {
      outputCard.style.display = 'none';
      return;
    }

    outputCard.style.display = 'block';


    completionInfo.forEach(info => {
      const row = document.createElement('tr');


      const nameCell = document.createElement('td');
      const nameDiv = document.createElement('div');
      nameDiv.style.display = 'flex';
      nameDiv.style.alignItems = 'center';

      const colorDiv = document.createElement('div');
      colorDiv.classList.add('process-color');
      const process = processes.find(p => p.id === info.id);
      colorDiv.style.backgroundColor = process ? process.color : 'gray';

      nameDiv.appendChild(colorDiv);
      nameDiv.appendChild(document.createTextNode(info.name));
      nameCell.appendChild(nameDiv);
      row.appendChild(nameCell);


      const completionCell = document.createElement('td');
      completionCell.textContent = info.completionTime;
      row.appendChild(completionCell);


      const turnaroundCell = document.createElement('td');
      turnaroundCell.textContent = info.turnaroundTime;
      row.appendChild(turnaroundCell);


      const waitingCell = document.createElement('td');
      waitingCell.textContent = info.waitingTime;
      row.appendChild(waitingCell);

      outputTable.appendChild(row);
    });


    const averages = calculateAverages();
    const avgRow = document.createElement('tr');
    avgRow.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    avgRow.style.fontWeight = '500';

    const avgLabelCell = document.createElement('td');
    avgLabelCell.textContent = 'Average';
    avgRow.appendChild(avgLabelCell);

    const emptyCell = document.createElement('td');
    emptyCell.textContent = '-';
    avgRow.appendChild(emptyCell);

    const avgTurnaroundCell = document.createElement('td');
    avgTurnaroundCell.textContent = averages.avgTurnaround;
    avgRow.appendChild(avgTurnaroundCell);

    const avgWaitingCell = document.createElement('td');
    avgWaitingCell.textContent = averages.avgWaiting;
    avgRow.appendChild(avgWaitingCell);

    outputTable.appendChild(avgRow);
  }


  function calculateAverages() {
    if (completionInfo.length === 0) return { avgTurnaround: 0, avgWaiting: 0 };

    const totalTurnaround = completionInfo.reduce((sum, p) => sum + p.turnaroundTime, 0);
    const totalWaiting = completionInfo.reduce((sum, p) => sum + p.waitingTime, 0);

    return {
      avgTurnaround: (totalTurnaround / completionInfo.length).toFixed(2),
      avgWaiting: (totalWaiting / completionInfo.length).toFixed(2)
    };
  }


  function getContrastColor(hexColor) {

    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);


    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;


    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }


  function runSimulation() {
    if (!isRunning) return;


    if (processes.every(p => p.remainingTime === 0)) {
      isRunning = false;
      updateButtons();
      simulationComplete = true;


      updateOutputTable();
      return;
    }


    const arrivedProcesses = processes.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);


    if (arrivedProcesses.length === 0) {
      currentTime++;
      updateCurrentTime();


      const lastItem = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;

      if (lastItem && lastItem.processId === "idle") {

        lastItem.endTime = currentTime;
      } else {

        ganttChart.push({
          processId: "idle",
          processName: "Idle",
          startTime: currentTime - 1,
          endTime: currentTime,
          color: "#E5E7EB"
        });
      }

      updateGanttChart();


      simulationTimer = setTimeout(runSimulation, speed);
      return;
    }


    let nextProcess;

    switch (algorithm) {
      case 'fcfs':
        nextProcess = handleFCFS(arrivedProcesses);
        break;
      case 'sjf':
        nextProcess = handleSJF(arrivedProcesses, isPreemptive);
        break;
      case 'priority':
        nextProcess = handlePriority(arrivedProcesses, isPreemptive);
        break;
      case 'rr':
        nextProcess = handleRoundRobin(arrivedProcesses);
        break;
      case 'mlfq':
        nextProcess = handleMLFQ(arrivedProcesses);
        break;
      default:
        nextProcess = handleFCFS(arrivedProcesses);
    }


    if (nextProcess) {
      executeProcess(nextProcess);
    }


    simulationTimer = setTimeout(runSimulation, speed);
  }


  function handleFCFS(arrivedProcesses) {
    if (currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }


    return arrivedProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
  }


  function handleSJF(arrivedProcesses, isPreemptive) {

    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }


    return arrivedProcesses.sort((a, b) => a.remainingTime - b.remainingTime)[0];
  }


  function handlePriority(arrivedProcesses, isPreemptive) {

    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }


    return arrivedProcesses.sort((a, b) => a.priority - b.priority)[0];
  }


  function handleRoundRobin(arrivedProcesses) {

    arrivedProcesses.forEach(p => {
      if (!queue.includes(p) && p !== currentProcess && p.remainingTime > 0) {
        queue.push(p);
      }
    });


    if (!currentProcess || quantumProgress >= timeQuantum || currentProcess.remainingTime === 0) {

      quantumProgress = 0;


      if (currentProcess && currentProcess.remainingTime > 0) {
        queue.push(currentProcess);
      }

      const nextProcess = queue.shift();

      updateQueueDisplay();

      return nextProcess;
    } else {
      quantumProgress++;
      updateQueueDisplay();
      return currentProcess;
    }
  }

  function handleMLFQ(arrivedProcesses) {
    arrivedProcesses.forEach(p => {
      if (p.mlfqLevel === undefined) p.mlfqLevel = 0;
      const inAnyQueue = mlfqQueues.some(q => q.includes(p));
      if (!inAnyQueue && p !== currentProcess && p.remainingTime > 0) {
        mlfqQueues[p.mlfqLevel].push(p);
      }
    });

    if (currentProcess && currentProcess.remainingTime > 0) {
      const level = mlfqCurrentLevel;

      const higherQueueHasProcess = mlfqQueues.slice(0, level).some(q => q.length > 0);
      if (higherQueueHasProcess) {
        mlfqQueues[level].unshift(currentProcess);
        currentProcess = null;
        mlfqQuantumProgress = 0;
      } else if (level < 2) {
        const quantum = level === 0 ? mlfqQ1Quantum : mlfqQ2Quantum;
        mlfqQuantumProgress++;

        if (mlfqQuantumProgress >= quantum) {
          mlfqQuantumProgress = 0;
          const newLevel = Math.min(level + 1, 2);
          currentProcess.mlfqLevel = newLevel;
          mlfqQueues[newLevel].push(currentProcess);
          currentProcess = null;
        } else {
          updateQueueDisplay();
          return currentProcess;
        }
      } else {
        updateQueueDisplay();
        return currentProcess;
      }
    }

    for (let i = 0; i < 3; i++) {
      if (mlfqQueues[i].length > 0) {
        const next = mlfqQueues[i].shift();
        mlfqCurrentLevel = i;
        mlfqQuantumProgress = 0;
        updateQueueDisplay();
        return next;
      }
    }

    updateQueueDisplay();
    return null;
  }

  function executeProcess(process) {
    if (!process) return;


    if (currentProcess !== process) {

      const lastItem = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;

      if (lastItem && lastItem.processId === process.id) {

        lastItem.endTime = currentTime + 1;
      } else {

        ganttChart.push({
          processId: process.id,
          processName: process.name,
          startTime: currentTime,
          endTime: currentTime + 1,
          color: process.color
        });
      }
    } else {

      const lastItem = ganttChart[ganttChart.length - 1];
      lastItem.endTime = currentTime + 1;
    }


    currentProcess = process;


    process.remainingTime--;
    currentTime++;


    if (process.remainingTime === 0) {

      const completionTime = currentTime;
      const turnaroundTime = completionTime - process.arrivalTime;
      const waitingTime = turnaroundTime - process.burstTime;

      completionInfo.push({
        id: process.id,
        name: process.name,
        completionTime: completionTime,
        turnaroundTime: turnaroundTime,
        waitingTime: waitingTime
      });


      if (algorithm !== 'rr' && algorithm !== 'mlfq') {
        currentProcess = null;
      }
      if (algorithm === 'mlfq') {
        currentProcess = null;
        mlfqQuantumProgress = 0;
      }
    }


    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
  }


  updateProcessesTable();
  updateGanttChart();


  algorithmSelect.dispatchEvent(new Event('change'));
});
