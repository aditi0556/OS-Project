const interruptCatalog = {
  timer: {
    label: 'Timer Interrupt',
    device: 'System Timer',
    vector: '0x20',
    purpose: 'The timer tells the OS that the current time slice is over, so the scheduler may switch processes.',
    handler: 'Update scheduler clock, account CPU time, and decide whether to continue or preempt the running process.'
  },
  keyboard: {
    label: 'Keyboard Interrupt',
    device: 'Keyboard Controller',
    vector: '0x21',
    purpose: 'A key was pressed, so the CPU must pause user code and collect the input from the device buffer.',
    handler: 'Read scan code, convert it to a key event, store it in the input buffer, and wake any waiting task.'
  },
  disk: {
    label: 'Disk Completion Interrupt',
    device: 'Disk Controller',
    vector: '0x2E',
    purpose: 'An I/O request finished, so the CPU is notified that data is ready or a blocked process can continue.',
    handler: 'Acknowledge the device, mark the I/O request complete, and unblock the process waiting for disk data.'
  },
  systemCall: {
    label: 'System Call / Trap',
    device: 'Software Interrupt',
    vector: '0x80',
    purpose: 'A user program requested a kernel service such as file access, memory allocation, or output.',
    handler: 'Validate the request, run the kernel service, place the result in registers, and return to user mode.'
  }
};

const interruptState = {
  currentStep: -1,
  playing: false,
  timerId: null,
  scenario: null
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

    requestAnimationFrame(draw);
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

function getActiveOptionValue(groupName) {
  const activeOption = document.querySelector(`[data-option-group="${groupName}"].active-option`);
  return activeOption?.dataset.optionValue ?? '';
}

function initOptionGroups() {
  document.querySelectorAll('[data-option-group]').forEach((button) => {
    button.addEventListener('click', () => {
      const groupName = button.dataset.optionGroup;
      document.querySelectorAll(`[data-option-group="${groupName}"]`).forEach((item) => {
        item.classList.remove('active-option');
      });
      button.classList.add('active-option');
    });
  });
}

function createScenario() {
  const processName = document.getElementById('interrupt-process').value.trim() || 'Process P1';
  const interruptType = getActiveOptionValue('interrupt-type') || 'timer';
  const priority = getActiveOptionValue('interrupt-priority') || 'normal';
  const interrupt = interruptCatalog[interruptType];

  return {
    processName,
    interruptType,
    priority,
    interrupt,
    stackFrames: [
      { key: 'PC', value: '0x8048A2', note: 'Return address of the interrupted instruction stream.' },
      { key: 'PSW', value: priority === 'critical' ? 'Kernel flags elevated' : 'User mode flags', note: 'Processor status word stores execution mode and flags.' },
      { key: 'R0-R3', value: 'General registers', note: 'Working register values are preserved before the ISR starts.' }
    ],
    steps: [
      {
        title: 'CPU executes current process',
        status: 'The CPU is running the current process normally.',
        explanation: `${processName} is executing in user mode. The CPU is fetching instructions, updating registers, and advancing the program counter.`,
        snapshot: {
          mode: 'User Mode',
          pc: '0x8048A2',
          source: 'None',
          next: 'Keep executing user code'
        },
        stackDepth: 0
      },
      {
        title: 'Interrupt request arrives',
        status: `${interrupt.label} is raised by ${interrupt.device}.`,
        explanation: `${interrupt.purpose} The interrupt request line signals the CPU that an external or software event needs attention.`,
        snapshot: {
          mode: 'User Mode',
          pc: '0x8048A2',
          source: interrupt.device,
          next: 'Finish current instruction'
        },
        stackDepth: 0
      },
      {
        title: 'CPU acknowledges the interrupt',
        status: 'The CPU completes the current instruction and accepts the interrupt.',
        explanation: `To keep execution consistent, the CPU usually completes the current instruction first. Then it acknowledges the interrupt, temporarily stops normal flow, and prepares to transfer control to the kernel.`,
        snapshot: {
          mode: 'Transition to Kernel',
          pc: '0x8048A6',
          source: interrupt.device,
          next: 'Save process context'
        },
        stackDepth: 0
      },
      {
        title: 'Context is saved',
        status: 'Program counter, flags, and registers are pushed to the stack.',
        explanation: `The CPU must remember exactly where ${processName} stopped. It saves critical context so the interrupted process can resume later without losing work.`,
        snapshot: {
          mode: 'Kernel Mode',
          pc: '0x8048A6',
          source: interrupt.device,
          next: `Vector to ISR ${interrupt.vector}`
        },
        stackDepth: 3
      },
      {
        title: 'Interrupt vector is used',
        status: `The CPU jumps to ISR entry ${interrupt.vector}.`,
        explanation: `The interrupt vector table maps this interrupt to the correct interrupt service routine. The CPU loads the handler address and begins executing privileged kernel code.`,
        snapshot: {
          mode: 'Kernel Mode',
          pc: interrupt.vector,
          source: interrupt.device,
          next: 'Run interrupt service routine'
        },
        stackDepth: 3
      },
      {
        title: 'ISR handles the event',
        status: 'The interrupt service routine performs the required kernel work.',
        explanation: interrupt.handler,
        snapshot: {
          mode: 'Kernel Mode',
          pc: `${interrupt.vector} + handler`,
          source: interrupt.device,
          next: 'Return from interrupt'
        },
        stackDepth: 3
      },
      {
        title: 'Context is restored',
        status: 'Saved registers and status are popped back from the stack.',
        explanation: `Once the ISR is done, the kernel restores the saved state of ${processName}. This includes registers, flags, and the saved return address.`,
        snapshot: {
          mode: 'Kernel to User Return',
          pc: '0x8048A6',
          source: interrupt.device,
          next: 'Resume interrupted process'
        },
        stackDepth: 1
      },
      {
        title: 'Process resumes execution',
        status: `${processName} continues as if the interrupt happened transparently.`,
        explanation: `The CPU executes a return-from-interrupt instruction, switches back to user mode, restores the original execution context, and resumes ${processName} from the saved program counter.`,
        snapshot: {
          mode: 'User Mode',
          pc: '0x8048A6',
          source: 'Cleared',
          next: 'Continue user program'
        },
        stackDepth: 0
      }
    ]
  };
}

function renderSnapshot() {
  const container = document.getElementById('cpu-snapshot');
  const scenario = interruptState.scenario;

  if (!scenario || interruptState.currentStep < 0) {
    container.innerHTML = `
      <div class="summary-card">
        <span class="summary-label">CPU Mode</span>
        <span class="summary-value">Idle</span>
        <p class="summary-note">Load a scenario to inspect state.</p>
      </div>
      <div class="summary-card">
        <span class="summary-label">Interrupt Source</span>
        <span class="summary-value">None</span>
        <p class="summary-note">No interrupt has arrived.</p>
      </div>
      <div class="summary-card">
        <span class="summary-label">Program Counter</span>
        <span class="summary-value">-</span>
        <p class="summary-note">Instruction pointer appears here.</p>
      </div>
      <div class="summary-card">
        <span class="summary-label">Next CPU Action</span>
        <span class="summary-value">Waiting</span>
        <p class="summary-note">Advance the simulation.</p>
      </div>
    `;
    return;
  }

  const step = scenario.steps[interruptState.currentStep];
  container.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">CPU Mode</span>
      <span class="summary-value">${escapeHtml(step.snapshot.mode)}</span>
      <p class="summary-note">${escapeHtml(scenario.processName)}</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Interrupt Source</span>
      <span class="summary-value">${escapeHtml(step.snapshot.source)}</span>
      <p class="summary-note">Priority ${escapeHtml(scenario.priority)}</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Program Counter</span>
      <span class="summary-value">${escapeHtml(step.snapshot.pc)}</span>
      <p class="summary-note">Vector ${escapeHtml(scenario.interrupt.vector)}</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Next CPU Action</span>
      <span class="summary-value">${escapeHtml(step.snapshot.next)}</span>
      <p class="summary-note">${escapeHtml(scenario.interrupt.label)}</p>
    </div>
  `;
}

function renderTimeline() {
  const container = document.getElementById('interrupt-timeline');
  const scenario = interruptState.scenario;

  if (!scenario) {
    container.innerHTML = '<div class="timeline-item empty-state"><p>No timeline available yet.</p></div>';
    return;
  }

  container.innerHTML = scenario.steps.map((step, index) => {
    let stateClass = 'pending-step';
    if (index < interruptState.currentStep) {
      stateClass = 'completed-step';
    } else if (index === interruptState.currentStep) {
      stateClass = 'active-step';
    }

    return `
      <div class="timeline-item ${stateClass}">
        <div class="timeline-badge">${index + 1}</div>
        <div class="timeline-title">${escapeHtml(step.title)}</div>
        <p>${escapeHtml(step.status)}</p>
      </div>
    `;
  }).join('');
}

function renderStatusAndExplanation() {
  const statusPanel = document.getElementById('interrupt-status');
  const explanationPanel = document.getElementById('interrupt-explanation');
  const scenario = interruptState.scenario;

  if (!scenario || interruptState.currentStep < 0) {
    statusPanel.className = 'status-banner status-neutral';
    statusPanel.innerHTML = `
      <div class="status-title">Ready to simulate</div>
      <p>Load a scenario to see how the CPU reacts when an interrupt arrives.</p>
    `;
    explanationPanel.innerHTML = '<p>No interrupt steps generated yet.</p>';
    return;
  }

  const step = scenario.steps[interruptState.currentStep];
  const isFinished = interruptState.currentStep === scenario.steps.length - 1;

  statusPanel.className = `status-banner ${isFinished ? 'status-safe' : 'status-neutral'}`;
  statusPanel.innerHTML = `
    <div class="status-title">${escapeHtml(step.title)}</div>
    <p>${escapeHtml(step.status)}</p>
  `;

  explanationPanel.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Current Step</span>
      <span class="summary-value">${escapeHtml(step.title)}</span>
      <p class="summary-note">${escapeHtml(step.status)}</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Current Explanation</span>
      <span class="summary-value">${escapeHtml(scenario.interrupt.label)}</span>
      <p class="summary-note">${escapeHtml(step.explanation)}</p>
    </div>
    <div class="summary-card">
      <span class="summary-label">Why This Matters</span>
      <span class="summary-value">${escapeHtml(scenario.interrupt.label)}</span>
      <p class="summary-note">${escapeHtml(scenario.interrupt.purpose)}</p>
    </div>
  `;
}

function renderStack() {
  const container = document.getElementById('interrupt-stack');
  const scenario = interruptState.scenario;

  if (!scenario || interruptState.currentStep < 0) {
    container.innerHTML = '<div class="stack-entry empty-state"><p>The saved CPU context will appear here.</p></div>';
    return;
  }

  const step = scenario.steps[interruptState.currentStep];
  const visibleFrames = scenario.stackFrames.slice(0, step.stackDepth);

  if (!visibleFrames.length) {
    container.innerHTML = '<div class="stack-entry empty-state"><p>No saved context on the stack at this step.</p></div>';
    return;
  }

  container.innerHTML = visibleFrames.slice().reverse().map((frame) => `
    <div class="stack-entry">
      <strong>${escapeHtml(frame.key)}</strong>
      <div>${escapeHtml(frame.value)}</div>
      <p>${escapeHtml(frame.note)}</p>
    </div>
  `).join('');
}

function renderAll() {
  renderSnapshot();
  renderTimeline();
  renderStatusAndExplanation();
  renderStack();
}

function stopAutoPlay() {
  interruptState.playing = false;
  if (interruptState.timerId) {
    window.clearInterval(interruptState.timerId);
    interruptState.timerId = null;
  }
}

function loadScenario() {
  stopAutoPlay();
  interruptState.scenario = createScenario();
  interruptState.currentStep = 0;
  renderAll();
}

function nextStep() {
  if (!interruptState.scenario) {
    loadScenario();
    return;
  }

  if (interruptState.currentStep < interruptState.scenario.steps.length - 1) {
    interruptState.currentStep += 1;
    renderAll();
  } else {
    stopAutoPlay();
  }
}

function autoPlay() {
  if (!interruptState.scenario) {
    loadScenario();
  }

  stopAutoPlay();
  interruptState.playing = true;
  interruptState.timerId = window.setInterval(() => {
    if (!interruptState.scenario || interruptState.currentStep >= interruptState.scenario.steps.length - 1) {
      stopAutoPlay();
      return;
    }

    interruptState.currentStep += 1;
    renderAll();
  }, 1400);
}

function resetScenario() {
  stopAutoPlay();
  interruptState.scenario = null;
  interruptState.currentStep = -1;
  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  initVortexBackground();
  initScrollHeader();
  initOptionGroups();
  renderAll();

  document.getElementById('load-interrupt-scenario').addEventListener('click', loadScenario);
  document.getElementById('next-interrupt-step').addEventListener('click', nextStep);
  document.getElementById('play-interrupt-flow').addEventListener('click', autoPlay);
  document.getElementById('reset-interrupt-flow').addEventListener('click', resetScenario);
});
