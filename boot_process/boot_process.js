(function () {
  'use strict';

  /* ── Vortex background (matching homepage) ── */
  const cvs = document.getElementById('vortex-canvas');
  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, pts = [];
  const HUES = [
    { h: 240, spread: 25 },
    { h: 262, spread: 22 },
    { h: 192, spread: 18 }
  ];
  function minHalf() { return Math.min(W, H) * 0.5; }

  class Particle {
    constructor(boot) {
      const hDef = HUES[Math.floor(Math.random() * HUES.length)];
      this.hue = hDef.h + (Math.random() - 0.5) * hDef.spread;
      this.sat = 70 + Math.random() * 20;
      this.lit = 55 + Math.random() * 25;
      this.angle = Math.random() * Math.PI * 2;
      this.r = boot ? Math.random() * minHalf() : 1;
      this.va = 0.0018 + Math.random() * 0.004;
      this.vr = (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.55);
      this.size = 0.4 + Math.random() * 1.5;
      this.life = 0;
      this.maxLife = 110 + Math.random() * 210;
    }
    step() {
      this.angle += this.va;
      this.r += this.vr * 0.38;
      this.life += 1;
      if (this.r < 1 || this.r > minHalf() || this.life > this.maxLife) {
        Object.assign(this, new Particle(false));
      }
    }
    paint() {
      const t = this.life / this.maxLife;
      const a = t < 0.12 ? t / 0.12 : t > 0.8 ? (1 - t) / 0.2 : 1;
      const x = W / 2 + Math.cos(this.angle) * this.r;
      const y = H / 2 + Math.sin(this.angle) * this.r;
      ctx.beginPath();
      ctx.arc(x, y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${this.lit}%,${(a * 0.4).toFixed(2)})`;
      ctx.fill();
    }
  }

  function resizeCanvas() {
    W = cvs.width = window.innerWidth;
    H = cvs.height = window.innerHeight;
  }
  function initParticles() {
    pts = Array.from({ length: 150 }, function () { return new Particle(true); });
  }
  function drawFrame() {
    ctx.fillStyle = 'rgba(6,6,8,0.2)';
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, minHalf() * 0.55);
    g.addColorStop(0, 'rgba(99,102,241,0.03)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    pts.forEach(function (p) { p.step(); p.paint(); });
    requestAnimationFrame(drawFrame);
  }
  window.addEventListener('resize', function () { resizeCanvas(); initParticles(); });

  /* ── Timeline data (from README) ── */
  var STEPS = [
    {
      num: 1,
      title: 'Power Button Pressed',
      summary: 'A power-good signal triggers CPU reset and device initialization.',
      details: [
        'Electric pulse sent to the CPU reset pin (<strong>Power On Reset</strong>).',
        'CPU enters <strong>Reset Mode</strong> — not executing any instructions.',
        'All connected devices receive power and begin self-initialization.',
        'Registers set to zero, except <code>CS = 0xF000</code> and <code>IP = 0xFFF0</code>.',
        'Physical address = <code>(CS &lt;&lt; 4) + IP = 0xFFFF0</code> — the first instruction.'
      ]
    },
    {
      num: 2,
      title: 'CPU Activates in Real Mode',
      summary: 'CPU starts executing from 0xFFFF0 on the BIOS chip in 16-bit Real Mode.',
      details: [
        'Only <strong>1 MB</strong> of RAM addressable (<code>0x0</code> to <code>0x100000</code>).',
        '20 physical address bus lines available (2²⁰ = 1 MB).',
        '<strong>16-bit addressing:</strong> two registers combine for a physical address.',
        'Logical address format: <code>segment:offset</code>.',
        '<code>Physical = (segment &lt;&lt; 4) + offset</code>.'
      ]
    },
    {
      num: 3,
      title: 'BIOS Takes Over',
      summary: 'BIOS loads from Flash/EPROM and runs the Power-On Self-Test (POST).',
      details: [
        'BIOS firmware resides in <strong>non-volatile</strong> Flash/EPROM memory.',
        'In multi-processor systems, one CPU is the <strong>Boot Processor (BSP)</strong>.',
        '<strong>POST</strong> performs a system inventory and checks all connected devices.',
        'BIOS then searches for the <strong>Master Boot Record</strong> on bootable devices.'
      ]
    },
    {
      num: 4,
      title: 'MBR Located & Loaded',
      summary: 'BIOS finds the 512-byte MBR on disk and loads it into RAM at 0x7C00.',
      details: [
        'MBR is a 512-byte sector split into three logical sections.',
        'First <strong>446 bytes</strong> — Bootloader code (e.g. GRUB).',
        'Next <strong>64 bytes</strong> — Partition table (4 × 16-byte entries).',
        'Last <strong>2 bytes</strong> — Boot signature <code>0x55AA</code>.',
        'If the signature is missing, BIOS tries the next bootable device.'
      ]
    },
    {
      num: 5,
      title: 'Bootloader Executes',
      summary: 'The bootloader scans partitions, sets up GDT and switches to Protected Mode.',
      details: [
        'Stage 1 bootloader may load a larger Stage 2 (446 bytes is very small).',
        'Bootloader may present an OS selection menu (e.g. GRUB menu).',
        'Sets up the <strong>GDT / IVT</strong> for the operating system.',
        'Switches from <strong>Real Mode → Protected Mode</strong>.',
        'Memory addressability expands from 1 MB to the full available RAM.'
      ]
    },
    {
      num: 6,
      title: 'OS Kernel Loaded',
      summary: 'Bootloader loads the kernel from the active partition into memory.',
      details: [
        'Bootloader finds the <strong>active/bootable partition</strong> in the partition table.',
        'The first sector of that partition (the <strong>Boot Record</strong>) is loaded.',
        'Boot Record loads the full operating system kernel into RAM.',
        'Control is handed off from the bootloader to the kernel entry point.'
      ]
    },
    {
      num: 7,
      title: 'Kernel Initialises Hardware',
      summary: 'Kernel initialises timers, devices, hard disks and mounts the root filesystem.',
      details: [
        'Timers, interrupt controllers, and device drivers are initialised.',
        'Hard disks, network interfaces, and peripherals are detected.',
        'The <strong>root filesystem</strong> is mounted.',
        'Kernel sets up memory management, virtual memory, and process tables.'
      ]
    },
    {
      num: 8,
      title: 'User Space — init / systemd',
      summary: 'The init process (PID 1) starts services, daemons and displays the login prompt.',
      details: [
        '<code>init</code> (or <code>systemd</code>) is the first user-space process.',
        'System services and daemons are started (networking, logging, cron, etc.).',
        'Run levels / targets are processed.',
        'A <strong>login prompt</strong> (TTY or graphical) is displayed — the system is ready.'
      ]
    }
  ];

  /* ── Flow diagram data ── */
  var FLOW = [
    { icon: '⏻', label: 'Power On', tip: 'Power-good signal triggers CPU reset pin. All registers zeroed except CS:IP.' },
    { icon: '🔧', label: 'Real Mode', tip: 'CPU operates in 16-bit mode with 1 MB addressable RAM. Starts at 0xFFFF0.' },
    { icon: '🧪', label: 'POST', tip: 'BIOS runs Power-On Self-Test: checks memory, devices, and system inventory.' },
    { icon: '💾', label: 'Find MBR', tip: 'BIOS searches for a valid MBR (512 bytes) with the 0x55AA signature.' },
    { icon: '🚀', label: 'Bootloader', tip: 'Bootloader (e.g. GRUB) loads from MBR at 0x7C00, may chain-load Stage 2.' },
    { icon: '🔀', label: 'Protected Mode', tip: 'CPU switches from Real Mode to Protected Mode. Full RAM accessible.' },
    { icon: '🐧', label: 'Kernel Init', tip: 'OS kernel initialises hardware, drivers, and mounts root filesystem.' },
    { icon: '👤', label: 'Login', tip: 'init/systemd starts services and presents the user login prompt.' }
  ];

  /* ── Build the page ── */
  function buildPage() {
    var container = document.querySelector('.container');

    /* Hero */
    var hero = document.createElement('section');
    hero.className = 'bp-hero';
    hero.innerHTML =
      '<h1>Linux Boot Process</h1>' +
      '<p>From the moment you press the power button to the login prompt — explore every stage of how a Linux system comes alive.</p>';
    container.appendChild(hero);

    /* Flow diagram */
    var flowSec = document.createElement('section');
    flowSec.className = 'flow-section';
    flowSec.innerHTML =
      '<h2>Boot Flow Overview</h2>' +
      '<p class="section-sub">Hover or tap each node for details</p>';

    var track = document.createElement('div');
    track.className = 'flow-track';

    FLOW.forEach(function (f, i) {
      var node = document.createElement('div');
      node.className = 'flow-node';
      node.innerHTML =
        '<span class="flow-icon">' + f.icon + '</span>' +
        f.label +
        '<div class="flow-tooltip">' + f.tip + '</div>';
      track.appendChild(node);

      if (i < FLOW.length - 1) {
        var arrow = document.createElement('span');
        arrow.className = 'flow-arrow';
        arrow.textContent = '→';
        track.appendChild(arrow);
      }
    });

    flowSec.appendChild(track);
    container.appendChild(flowSec);

    /* MBR diagram */
    var mbrSec = document.createElement('section');
    mbrSec.className = 'mbr-section';
    mbrSec.innerHTML =
      '<h2>Master Boot Record Structure</h2>' +
      '<p class="section-sub">512 bytes — the foundation of boot</p>' +
      '<div class="mbr-bar">' +
        '<div class="mbr-seg mbr-boot">Bootloader Code<span class="mbr-bytes">446 bytes</span></div>' +
        '<div class="mbr-seg mbr-part">Partition Table<span class="mbr-bytes">64 bytes (4×16)</span></div>' +
        '<div class="mbr-seg mbr-sig">0x55AA<span class="mbr-bytes">2 bytes</span></div>' +
      '</div>';
    container.appendChild(mbrSec);

    /* Timeline */
    var tlSec = document.createElement('section');
    tlSec.className = 'timeline';

    STEPS.forEach(function (s) {
      var step = document.createElement('div');
      step.className = 'tl-step';
      step.innerHTML =
        '<div class="tl-dot"></div>' +
        '<div class="tl-num">' + s.num + '</div>' +
        '<div class="tl-card">' +
          '<h3>' + s.title + '</h3>' +
          '<p class="tl-summary">' + s.summary + '</p>' +
          '<div class="tl-detail">' +
            '<div class="tl-detail-inner">' +
              '<ul>' + s.details.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';
      tlSec.appendChild(step);
    });

    container.appendChild(tlSec);
  }

  /* ── Interaction: click to expand / collapse ── */
  function setupInteraction() {
    document.querySelectorAll('.tl-step').forEach(function (step) {
      step.querySelector('.tl-card').addEventListener('click', function () {
        var wasActive = step.classList.contains('active');
        /* close all others */
        document.querySelectorAll('.tl-step.active').forEach(function (s) {
          s.classList.remove('active');
        });
        if (!wasActive) step.classList.add('active');
      });
    });
  }

  /* ── Scroll reveal ── */
  var lastScrollY = window.scrollY;

  function onScroll() {
    var header = document.querySelector('.bp-header');
    if (header) {
      if (window.scrollY > 60) {
        if (window.scrollY > lastScrollY) {
          header.classList.add('nav-hidden');
        } else {
          header.classList.remove('nav-hidden');
        }
      } else {
        header.classList.remove('nav-hidden');
      }
      header.classList.toggle('scrolled', window.scrollY > 60);
    }
    lastScrollY = window.scrollY;

    var threshold = window.innerHeight * 0.88;
    document.querySelectorAll('.tl-step').forEach(function (step) {
      if (!step.classList.contains('visible') &&
        step.getBoundingClientRect().top < threshold) {
        step.classList.add('visible');
      }
    });
  }

  /* ── Init ── */
  window.addEventListener('load', function () {
    resizeCanvas();
    initParticles();
    drawFrame();
    buildPage();
    setupInteraction();
    onScroll();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
}());
