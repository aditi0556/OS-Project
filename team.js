(function () {
  'use strict';

  // --- Canvas Vortex Background ---
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
    ctx.fillStyle = 'rgba(6,6,8,0.17)';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, minHalf() * 0.55);
    g.addColorStop(0, 'rgba(99,102,241,0.05)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    pts.forEach(p => { p.step(); p.paint(); });
    requestAnimationFrame(drawFrame);
  }
  window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

  const TEAM_MEMBERS = [
    { name: 'Abhyuday K Hedge', roll: 'Roll Number: 241CS201', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#020c14 0%,#0a2540 50%,#0d3b6e 100%)' },
    { name: 'Aditi Sinha', roll: 'Roll Number: 241CS202', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#0a0010 0%,#220035 50%,#3d0060 100%)' },
    { name: 'Affan Arshad', roll: 'Roll Number: 241CS203', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#060024 0%,#1b0556 50%,#2d1b69 100%)' },
    { name: 'Ajay Kumar', roll: 'Roll Number: 241CS204', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#000d1a 0%,#002040 50%,#003566 100%)' },
    { name: 'Alluri Shanthi', roll: 'Roll Number: 241CS206', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#0d0221 0%,#1a0a3b 50%,#0e1f5c 100%)' },
    { name: 'A.D.L.Nikhileswar', roll: 'Roll Number: 241CS207', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#100020 0%,#300050 50%,#4a0070 100%)' },
    { name: 'Aniketa R', roll: 'Roll Number: 241CS208', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#040a1a 0%,#0a1e4a 50%,#0f3070 100%)' },
    { name: 'Ankit Kumar', roll: 'Roll Number: 241CS209', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#030a20 0%,#081d50 50%,#0d2d7a 100%)' },
    { name: 'Ankit Kumar Saran', roll: 'Roll Number: 241CS210', icon: 'fas fa-user-graduate', bg: 'linear-gradient(155deg,#001a1a 0%,#003d4a 50%,#005f73 100%)' }
  ];

  function buildCards() {
    const grid = document.getElementById('fcGrid');
    if (!grid) return;

    TEAM_MEMBERS.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'fc-card';
      card.style.transitionDelay = (i * 40) + 'ms';

      card.innerHTML = `
        <div class="fc-bg" style="background:${c.bg}"></div>
        <div class="fc-scrim"></div>
        <div class="fc-icon"><i class="${c.icon}"></i></div>
        <div class="fc-body">
          <h3>${c.name}</h3>
          <span class="fc-by">${c.roll}</span>
        </div>
      `;

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
    li.innerHTML = '<a href="index.html#topics" class="nav-cta">Explore Topics</a>';
    ul.appendChild(li);
  }

  function onScroll() {
    const hdr = document.querySelector('header');
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 60);

    const threshold = window.innerHeight * 0.88;
    document.querySelectorAll('.fc-card').forEach(function (card) {
      if (!card.classList.contains('in-view') &&
        card.getBoundingClientRect().top < threshold) {
        card.classList.add('in-view');
      }
    });
  }

  window.addEventListener('load', function () {
    resizeCanvas();
    initParticles();
    drawFrame();

    buildCards();
    upgradeNav();

    onScroll();
  });

  window.addEventListener('scroll', onScroll, { passive: true });

}());
