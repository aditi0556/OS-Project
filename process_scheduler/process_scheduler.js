document.addEventListener('DOMContentLoaded', function () {
  // Initial state
  let processes = [
    { id: 1, name: "P1", arrivalTime: 0, burstTime: 10, priority: 2, color: "#FF5733", remainingTime: 10 },
    { id: 2, name: "P2", arrivalTime: 1, burstTime: 4, priority: 1, color: "#33FF57", remainingTime: 4 },
    { id: 3, name: "P3", arrivalTime: 2, burstTime: 2, priority: 3, color: "#3357FF", remainingTime: 2 },
    { id: 4, name: "P4", arrivalTime: 3, burstTime: 6, priority: 4, color: "#F3FF33", remainingTime: 6 },
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
  timeQuantum = timeQuantum - 1;

  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#F3FF33",
    "#FF33F3", "#33FFF3", "#F333FF", "#C70039",
    "#900C3F", "#581845", "#FFC300", "#DAF7A6"
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

  // Update UI based on algorithm
  algorithmSelect.addEventListener('change', function () {
    algorithm = this.value;

    if (algorithm === 'fcfs' || algorithm === 'rr') {
      preemptiveContainer.style.display = 'none';
    } else {
      preemptiveContainer.style.display = 'block';
    }

    if (algorithm === 'rr') {
      timeQuantumContainer.style.display = 'block';
    } else {
      timeQuantumContainer.style.display = 'none';
    }

    if (algorithm === 'priority') {
      priorityContainer.style.display = 'block';
    } else {
      priorityContainer.style.display = 'none';
    }
  });

  // Update isPreemptive when changed
  preemptiveSelect.addEventListener('change', function () {
    isPreemptive = this.value === 'true';
  });

  // Update timeQuantum when changed
  timeQuantumInput.addEventListener('change', function () {
    timeQuantum = Math.max(0, parseInt(this.value || 1) - 1);
    if (timeQuantum < 1) {
      timeQuantum = 1;
      this.value = 1;
    }
  });

  // Update speed when changed
  speedInput.addEventListener('input', function () {
    speed = parseInt(this.value);
    speedValue.textContent = speed + 'ms';
  });

  // Add process
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

  // Start simulation
  startBtn.addEventListener('click', function () {
    resetSimulation();
    isRunning = true;
    updateButtons();
    runSimulation();
  });

  // Stop simulation
  stopBtn.addEventListener('click', function () {
    isRunning = false;
    updateButtons();
    clearTimeout(simulationTimer);
  });

  // Reset simulation
  resetBtn.addEventListener('click', function () {
    resetSimulation();
    updateButtons();
  });

  // Reset simulation function
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

    // Reset remaining time for all processes
    processes = processes.map(p => ({
      ...p,
      remainingTime: p.burstTime
    }));

    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
    updateQueueDisplay();
    updateOutputTable();
  }

  // Update buttons based on state
  function updateButtons() {
    startBtn.disabled = isRunning || processes.length === 0;
    stopBtn.disabled = !isRunning;
  }

  // Remove process
  function removeProcess(id) {
    processes = processes.filter(p => p.id !== id);
    updateProcessesTable();
  }

  // Update processes table
  function updateProcessesTable() {
    processesTable.innerHTML = '';

    processes.forEach(process => {
      const row = document.createElement('tr');

      // Process name with color
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

      // Arrival time
      const arrivalCell = document.createElement('td');
      arrivalCell.textContent = process.arrivalTime;
      row.appendChild(arrivalCell);

      // Burst time
      const burstCell = document.createElement('td');
      burstCell.textContent = process.burstTime;
      row.appendChild(burstCell);

      // Priority
      const priorityCell = document.createElement('td');
      priorityCell.textContent = process.priority;
      row.appendChild(priorityCell);

      // Remaining time with progress bar
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

      // Actions
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

  // Update gantt chart
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

      // Process name
      const processName = document.createElement('div');
      processName.classList.add('gantt-process-name');
      processName.textContent = item.processName;
      processName.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);

      // Time range
      const timeRange = document.createElement('div');
      timeRange.classList.add('gantt-time');
      timeRange.textContent = `${item.startTime} - ${item.endTime}`;
      timeRange.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);

      ganttItem.appendChild(processName);
      ganttItem.appendChild(timeRange);

      // Start time marker
      const startMarker = document.createElement('div');
      startMarker.classList.add('time-marker');
      startMarker.style.left = '0';
      ganttItem.appendChild(startMarker);

      const startLabel = document.createElement('div');
      startLabel.classList.add('time-marker-label');
      startLabel.textContent = item.startTime;
      startLabel.style.left = '0';
      ganttItem.appendChild(startLabel);

      // End time marker (only for the last item)
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

  // Update current time display
  function updateCurrentTime() {
    currentTimeEl.textContent = currentTime;
  }

  // Update current process info
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
        quantumDiv.textContent = `Quantum Progress: ${quantumProgress + 1}/${timeQuantum}`;

        const quantumBar = document.createElement('div');
        quantumBar.classList.add('quantum-bar');

        const quantumFill = document.createElement('div');
        quantumFill.classList.add('quantum-bar-fill');
        quantumFill.style.width = `${(quantumProgress + 1) / timeQuantum * 100}%`;

        quantumBar.appendChild(quantumFill);
        quantumDiv.appendChild(quantumBar);
        infoDiv.appendChild(quantumDiv);
      }

      currentProcessInfo.appendChild(infoDiv);
    }
  }

  // Update queue display for Round Robin
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
  }

  // Update output table
  function updateOutputTable() {
    outputTable.innerHTML = '';

    if (completionInfo.length === 0) {
      outputCard.style.display = 'none';
      return;
    }

    outputCard.style.display = 'block';

    // Process rows
    completionInfo.forEach(info => {
      const row = document.createElement('tr');

      // Process name with color
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

      // Completion time
      const completionCell = document.createElement('td');
      completionCell.textContent = info.completionTime;
      row.appendChild(completionCell);

      // Turnaround time
      const turnaroundCell = document.createElement('td');
      turnaroundCell.textContent = info.turnaroundTime;
      row.appendChild(turnaroundCell);

      // Waiting time
      const waitingCell = document.createElement('td');
      waitingCell.textContent = info.waitingTime;
      row.appendChild(waitingCell);

      outputTable.appendChild(row);
    });

    // Average row
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

  // Calculate averages
  function calculateAverages() {
    if (completionInfo.length === 0) return { avgTurnaround: 0, avgWaiting: 0 };

    const totalTurnaround = completionInfo.reduce((sum, p) => sum + p.turnaroundTime, 0);
    const totalWaiting = completionInfo.reduce((sum, p) => sum + p.waitingTime, 0);

    return {
      avgTurnaround: (totalTurnaround / completionInfo.length).toFixed(2),
      avgWaiting: (totalWaiting / completionInfo.length).toFixed(2)
    };
  }

  // Get contrast color for text readability
  function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  // Run simulation
  function runSimulation() {
    if (!isRunning) return;

    // Check if all processes are complete
    if (processes.every(p => p.remainingTime === 0)) {
      isRunning = false;
      updateButtons();
      simulationComplete = true;

      // Update output table
      updateOutputTable();
      return;
    }

    // Get arrived processes
    const arrivedProcesses = processes.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

    // Handle idle time if no processes are available
    if (arrivedProcesses.length === 0) {
      currentTime++;
      updateCurrentTime();

      // Add idle time to Gantt chart
      const lastItem = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;

      if (lastItem && lastItem.processId === "idle") {
        // Extend the last idle period
        lastItem.endTime = currentTime;
      } else {
        // Add new idle period
        ganttChart.push({
          processId: "idle",
          processName: "Idle",
          startTime: currentTime - 1,
          endTime: currentTime,
          color: "#E5E7EB"
        });
      }

      updateGanttChart();

      // Continue simulation after delay
      simulationTimer = setTimeout(runSimulation, speed);
      return;
    }

    // Select next process based on scheduling algorithm
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
      default:
        nextProcess = handleFCFS(arrivedProcesses);
    }

    // Execute the selected process
    if (nextProcess) {
      executeProcess(nextProcess);
    }

    // Continue simulation after delay
    simulationTimer = setTimeout(runSimulation, speed);
  }

  // First Come First Served (FCFS) scheduling
  function handleFCFS(arrivedProcesses) {
    if (currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }

    // Sort by arrival time
    return arrivedProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
  }

  // Shortest Job First (SJF) scheduling
  function handleSJF(arrivedProcesses, isPreemptive) {
    // Non-preemptive - continue current process if exists
    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }

    // Sort by remaining time
    return arrivedProcesses.sort((a, b) => a.remainingTime - b.remainingTime)[0];
  }

  // Priority scheduling
  function handlePriority(arrivedProcesses, isPreemptive) {
    // Non-preemptive - continue current process if exists
    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) {
      return currentProcess;
    }

    // Sort by priority (lower value = higher priority)
    return arrivedProcesses.sort((a, b) => a.priority - b.priority)[0];
  }

  // Round Robin scheduling
  // Round Robin scheduling
  function handleRoundRobin(arrivedProcesses) {
    // First, check for newly arrived processes and add them to the queue
    arrivedProcesses.forEach(p => {
      // Only add if not already in queue and not the current process
      if (!queue.includes(p) && p !== currentProcess && p.remainingTime > 0) {
        queue.push(p);
      }
    });

    // If we don't have a current process or the quantum is complete or current process is done
    if (!currentProcess || quantumProgress >= timeQuantum || currentProcess.remainingTime === 0) {
      // Reset quantum progress
      quantumProgress = 0;

      // If current process isn't finished, add it back to the queue
      if (currentProcess && currentProcess.remainingTime > 0) {
        queue.push(currentProcess);
      }

      // Get next process from queue
      const nextProcess = queue.shift();

      // Update queue display
      updateQueueDisplay();

      return nextProcess;
    } else {
      // Continue with current process and increment quantum progress
      quantumProgress++;
      updateQueueDisplay();
      return currentProcess;
    }
  }
  // Execute process
  function executeProcess(process) {
    if (!process) return;

    // Check if this is a new process or a continuation
    if (currentProcess !== process) {
      // Update gantt chart
      const lastItem = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;

      if (lastItem && lastItem.processId === process.id) {
        // Extend the last process period
        lastItem.endTime = currentTime + 1;
      } else {
        // Add new process period
        ganttChart.push({
          processId: process.id,
          processName: process.name,
          startTime: currentTime,
          endTime: currentTime + 1,
          color: process.color
        });
      }
    } else {
      // Extend the last gantt chart item
      const lastItem = ganttChart[ganttChart.length - 1];
      lastItem.endTime = currentTime + 1;
    }

    // Set current process
    currentProcess = process;

    // Execute one time unit
    process.remainingTime--;
    currentTime++;

    // Check if process completed
    if (process.remainingTime === 0) {
      // Calculate process stats
      const completionTime = currentTime;
      const turnaroundTime = completionTime - process.arrivalTime;
      const waitingTime = turnaroundTime - process.burstTime;

      // Add to completion info
      completionInfo.push({
        id: process.id,
        name: process.name,
        completionTime: completionTime,
        turnaroundTime: turnaroundTime,
        waitingTime: waitingTime
      });

      // Remove from current process
      if (algorithm !== 'rr') {
        currentProcess = null;
      }
    }

    // Update UI
    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
  }

  // Initialize the simulation
  updateProcessesTable();
  updateGanttChart();

  // Trigger change event to set initial UI state based on select default
  algorithmSelect.dispatchEvent(new Event('change'));
});
