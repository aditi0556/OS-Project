/*
   OS Emulator  —  index.js
   Vortex background + Focus Cards + layout assembly
   All class names match index.css exactly. */
(function () {
  'use strict';

  const cvs = document.createElement('canvas');
  cvs.id = 'vortex-canvas';
  document.body.prepend(cvs);
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
      ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${this.lit}%,${(a * 0.65).toFixed(2)})`;
      ctx.fill();
    }
  }

  function resizeCanvas() {
    W = cvs.width = window.innerWidth;
    H = cvs.height = window.innerHeight;
  }
  function initParticles() {
    pts = Array.from({ length: 600 }, () => new Particle(true));
  }
  function drawFrame() {
    /* semi-transparent clear for trailing effect */
    ctx.fillStyle = 'rgba(6,6,8,0.17)';
    ctx.fillRect(0, 0, W, H);
    /* soft central glow */
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, minHalf() * 0.55);
    g.addColorStop(0, 'rgba(99,102,241,0.05)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* particles */
    pts.forEach(p => { p.step(); p.paint(); });
    requestAnimationFrame(drawFrame);
  }
  window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

  const CARDS = [
    {
      title: 'System Calls',
      desc: 'API bridge between user programs and the OS kernel',
      by: 'Alluri Shanthi',
      icon: 'fas fa-laptop-code',
      href: 'system_calls/index.html',
      bg: 'linear-gradient(155deg,#0d0221 0%,#1a0a3b 50%,#0e1f5c 100%)'
    },
    {
      title: 'CPU Scheduling',
      desc: 'Round-robin, SJF and priority algorithms visualised',
      by: 'Abhyuday K Hedge',
      icon: 'fas fa-clock',
      href: 'process_scheduler/process_scheduler.html',
      bg: 'linear-gradient(155deg,#020c14 0%,#0a2540 50%,#0d3b6e 100%)'
    },
    {
      title: 'Process Sync',
      desc: 'Classical synchronisation problems solved step-by-step',
      by: 'Affan Arshad',
      icon: 'fas fa-hdd',
      href: 'process-synchronization/process-sync.html',
      bg: 'linear-gradient(155deg,#060024 0%,#1b0556 50%,#2d1b69 100%)'
    },
    {
      title: 'Deadlocks',
      desc: "Detection, prevention and Banker's algorithm",
      by: 'A.D.L.Nikhileswar',
      icon: 'fas fa-random',
      href: 'deadlock/deadlock.html',
      bg: 'linear-gradient(155deg,#100020 0%,#300050 50%,#4a0070 100%)'
    },
    {
      title: 'Memory Management',
      desc: 'Paging, segmentation and virtual memory techniques',
      by: 'Ankit Kumar Saran',
      icon: 'fas fa-shield-alt',
      href: 'memory-management/memory-management.html',
      bg: 'linear-gradient(155deg,#001a1a 0%,#003d4a 50%,#005f73 100%)'
    },
    {
      title: 'Contiguous Allocation',
      desc: 'First-fit, best-fit and worst-fit algorithms',
      by: 'Aniketa R',
      icon: 'fas fa-users',
      href: 'cma/info.html',
      bg: 'linear-gradient(155deg,#040a1a 0%,#0a1e4a 50%,#0f3070 100%)'
    },
    {
      title: 'Page Replacement',
      desc: 'FIFO, LRU, Optimal — live page fault simulation',
      by: 'Aditi Sinha',
      icon: 'fas fa-project-diagram',
      href: 'page_replacement/pagereplacement_theory.html',
      bg: 'linear-gradient(155deg,#0a0010 0%,#220035 50%,#3d0060 100%)'
    },
    {
      title: 'Disk Scheduling',
      desc: 'SSTF, SCAN and C-SCAN with seek-time charts',
      by: 'Ajay Kumar',
      icon: 'fas fa-tasks',
      href: 'disk_sched/index.html',
      bg: 'linear-gradient(155deg,#000d1a 0%,#002040 50%,#003566 100%)'
    },
    {
      title: 'File System Simulator',
      desc: 'Unified file allocation and directory organization with DAG support',
      by: '',
      icon: 'fas fa-hdd',
      href: 'file_system/file_system.html',
      bg: 'linear-gradient(155deg,#030a20 0%,#081d50 50%,#0d2d7a 100%)'
    },

    {
      title: 'RTOS',
      desc: 'Real-time scheduling with deadline tracking',
      by: '',
      icon: 'fas fa-microchip',
      href: 'rtos/rtos.html',
      bg: 'linear-gradient(155deg,#150005 0%,#380012 50%,#5e001e 100%)',
      isNew: true
    },
    {
      title: 'MMU',
      desc: 'Address translation and TLB simulation',
      by: 'Aniketa R',
      icon: 'fas fa-sitemap',
      href: 'MMU/index.html',
      bg: 'linear-gradient(155deg,#001018 0%,#00293e 50%,#004060 100%)',
      isNew: true
    },
    {
      title: 'DMA Transfer',
      desc: 'Direct Memory Access vs Programmed I/O comparison',
      by: 'Abhyuday K Hedge',
      icon: 'fas fa-bolt',
      href: 'dma/dma.html',
      bg: 'linear-gradient(155deg,#0a0018 0%,#1a0040 50%,#2d0070 100%)',
      isNew: true
    },
    {
      title: 'Clock Algorithm Simulator',
      desc: 'Clock Algorithm Simulator',
      by: 'A.D.L.Nikhileswar',
      icon: 'fas fa-clock',
      href: 'clock_algo/time.html',
      bg: 'linear-gradient(155deg,#140000 0%,#3a0000 50%,#700000 100%)',
      isNew: true
    }
  ];


  function buildHero() {
    const sec = document.getElementById('intro');
    if (!sec) return;
    sec.className = 'intro-section';
    sec.innerHTML = `
      <div class="wrap">
        <div class="hero-inner">
          <div class="hero-eyebrow">
            <span class="hero-dot"></span>
            Interactive OS Learning Platform
          </div>

          <h1>
            Operating Systems<br>
            <span class="h1-grad">Brought to Life</span>
          </h1>

          <p class="hero-sub">
            Step inside the kernel. Explore scheduling, memory, deadlocks
            and file systems through real interactive simulations — no setup needed.
          </p>

          <div class="hero-actions">
            <a href="#topics" class="btn-primary">Browse Modules</a>
            <a href="#team"   class="btn-ghost">Meet the Team</a>
          </div>

          <div class="hero-stats">
            <div class="stat-chip"><span class="n">13</span><span class="lbl">Modules</span></div>
            <div class="stat-chip"><span class="n">8+</span><span class="lbl">Core Topics</span></div>
            <div class="stat-chip"><span class="n">100%</span><span class="lbl">In-Browser</span></div>
            <div class="stat-chip"><span class="n">Live</span><span class="lbl">Simulations</span></div>
          </div>

          <div class="scroll-caret">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            <span>Scroll</span>
          </div>
        </div>
      </div>
    `;
  }



  function buildCards() {
    const sec = document.getElementById('topics');
    if (!sec) return;
    sec.className = 'topics-section';

    sec.innerHTML = `
      <div class="wrap">
        <div class="section-head">
          <span class="section-kicker">13 Interactive Modules</span>
          <h2>Explore the Curriculum</h2>
          <p>Hover a card to focus — everything else fades away.</p>
        </div>
        <div class="fc-grid" id="fcGrid"></div>
      </div>
    `;

    const grid = document.getElementById('fcGrid');

    CARDS.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'fc-card';
      /* stagger the entry animation */
      card.style.transitionDelay = (i * 40) + 'ms';

      card.innerHTML = `
        <div class="fc-bg" style="background:${c.bg}"></div>
        <div class="fc-scrim"></div>
        <div class="fc-icon"><i class="${c.icon}"></i></div>
        ${c.isNew ? '<span class="fc-new">New</span>' : ''}
        <div class="fc-body">
          <h3>${c.title}</h3>
          <p class="fc-desc">${c.desc}</p>
          <span class="fc-by">By ${c.by}</span>
          <a href="${c.href}" class="fc-explore">Explore</a>
        </div>
      `;

      /* focus effect */
      card.addEventListener('mouseenter', () => {
        grid.classList.add('fc-active');
        card.classList.add('fc-focused');
      });
      card.addEventListener('mouseleave', () => {
        grid.classList.remove('fc-active');
        card.classList.remove('fc-focused');
      });

      grid.appendChild(card);
    });
  }

  function upgradeNav() {
    const ul = document.querySelector('nav .navigation');
    if (!ul) return;
    const li = document.createElement('li');
    li.innerHTML = '<a href="#topics" class="nav-cta">Get Started</a>';
    ul.appendChild(li);
  }

  function buildFooter() {
    const ft = document.querySelector('footer');
    if (!ft) return;
    ft.innerHTML = `
      <div class="wrap">
        <div class="foot-inner">
          <div class="logo">OS<span>Emulator</span></div>
          <p>&copy; 2026 OS Emulator Project. All rights reserved.</p>
        </div>
      </div>
    `;
  }


  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - 72, behavior: 'smooth' });
    }
  });



  function onScroll() {
    /* header frosted-glass effect */
    const hdr = document.querySelector('header');
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 60);

    /* reveal cards as they enter viewport */
    const threshold = window.innerHeight * 0.88;
    document.querySelectorAll('.fc-card').forEach(function (card, i) {
      if (!card.classList.contains('in-view') &&
        card.getBoundingClientRect().top < threshold) {
        /* keep the stagger from the inline transition-delay */
        card.classList.add('in-view');
      }
    });
  }


  window.addEventListener('load', function () {
    /* canvas */
    resizeCanvas();
    initParticles();
    drawFrame();

    /* layout */
    buildHero();
    buildCards();
    buildFooter();
    upgradeNav();

    /* hide the original team section if present */
    var team = document.getElementById('team');
    if (team) team.style.display = 'none';

    /* initial scroll pass */
    onScroll();
  });

  window.addEventListener('scroll', onScroll, { passive: true });

}());
