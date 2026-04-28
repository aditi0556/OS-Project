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

function initNavigationButtons() {
  document.querySelectorAll('[data-nav-target]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = button.dataset.navTarget;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initVortexBackground();
  initScrollHeader();
  initNavigationButtons();
});
