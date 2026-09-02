/**
 * ACM-W SNU — BLUE COMMAND CENTER ENGINE
 * Theme: Deep Space × Electric Blue × Cyan × Holographic Satellite Interface
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER ENGINE (Web Audio API) ---
  let audioContext = null;
  let isSoundEnabled = true;

  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
  }

  function playSynthSound(type) {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      const now = audioContext.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.21); // C6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'beep') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn('Audio synth error:', e);
    }
  }

  // --- BOOT SEQUENCE ENGINE ---
  function initBootSequence() {
    const bootEl = document.getElementById('boot-sequence');
    const progressBar = document.getElementById('boot-progress-fill');
    const skipBtn = document.getElementById('btn-skip-boot');

    if (!bootEl) return;

    const hasBooted = sessionStorage.getItem('acmw_booted_blue');
    if (hasBooted) {
      bootEl.classList.add('hidden');
      return;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 24) + 14;
      if (progress > 100) progress = 100;
      if (progressBar) progressBar.style.width = progress + '%';
      playSynthSound('beep');

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          bootEl.classList.add('hidden');
          sessionStorage.setItem('acmw_booted_blue', 'true');
          playSynthSound('chime');
        }, 300);
      }
    }, 110);

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        clearInterval(interval);
        bootEl.classList.add('hidden');
        sessionStorage.setItem('acmw_booted_blue', 'true');
        playSynthSound('click');
      });
    }
  }

  // --- CUSTOM CURSOR (Electric Blue / Cyan) ---
  function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('custom-cursor-follower');
    if (!cursor || !follower) return;

    let mouseX = -100, mouseY = -100;
    let followerX = -100, followerY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
    });

    function renderFollower() {
      followerX += (mouseX - followerX) * 0.18;
      followerY += (mouseY - followerY) * 0.18;
      follower.style.left = followerX + 'px';
      follower.style.top = followerY + 'px';
      requestAnimationFrame(renderFollower);
    }
    renderFollower();

    const clickables = document.querySelectorAll('a, button, input, .trophy-card, .scrapbook-item, .event-poster-card');
    clickables.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover');
      });
      el.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
      });
      el.addEventListener('click', () => {
        playSynthSound('click');
      });
    });
  }

  // --- BACKGROUND CANVAS (Cyan Nodes & Orbital Data Particles) ---
  function initBackgroundCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const numParticles = Math.min(35, Math.floor(width / 35));

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.4 ? 'rgba(0, 217, 255, ' : 'rgba(0, 140, 255, ',
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Connect close nodes with faint cyan data lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(0, 140, 255, ${0.15 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.05;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = Math.sin(p.pulse) * 0.2 + p.alpha;
        ctx.fillStyle = p.color + currentAlpha + ')';

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- COMMAND PALETTE (CMD+K) ---
  const commandItems = [
    { title: 'Home • System Root', section: '#home', tag: 'Navigation' },
    { title: 'About • Mission & Core', section: '#about', tag: 'Mission' },
    { title: 'Team • Members & Leads', section: '#team', tag: 'Roster' },
    { title: 'Events • Poster Vault', section: '#events', tag: 'Events' },
    { title: 'Gallery • Digital Scrapbook', section: '#scrapbook', tag: 'Gallery' },
    { title: 'The Lab • Interactive Terminal', section: '#lab', tag: 'Terminal' },
    { title: 'Contact • Communication Nodes', section: '#footer', tag: 'Contact' },
    { title: 'Open Official Instagram', url: 'https://www.instagram.com/acmw.snu', tag: 'External' },
    { title: 'Open Official LinkedIn', url: 'https://www.linkedin.com/company/acm-w-shiv-nadar-institution-of-eminence-chapter/', tag: 'External' }
  ];

  function initCommandPalette() {
    const backdrop = document.getElementById('cmd-palette-backdrop');
    const input = document.getElementById('cmd-search-input');
    const list = document.getElementById('cmd-results-list');
    const triggers = document.querySelectorAll('.cmd-k-trigger');

    if (!backdrop || !input || !list) return;

    let selectedIndex = 0;
    let filteredItems = [...commandItems];

    function renderResults() {
      list.innerHTML = '';
      if (filteredItems.length === 0) {
        list.innerHTML = '<li style="padding: 16px; color: var(--text-dim); text-align: center; font-family: var(--font-mono);">No system modules found.</li>';
        return;
      }

      filteredItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = `cmd-item ${index === selectedIndex ? 'selected' : ''}`;
        li.innerHTML = `
          <div class="cmd-item-left">
            <span style="color: var(--cyber-cyan); font-family: var(--font-mono);">></span>
            <span>${item.title}</span>
          </div>
          <span class="cmd-item-tag">${item.tag}</span>
        `;
        li.addEventListener('click', () => {
          executeCommand(item);
        });
        list.appendChild(li);
      });
    }

    function executeCommand(item) {
      playSynthSound('chime');
      closePalette();
      if (item.url) {
        window.open(item.url, '_blank');
      } else if (item.section) {
        const target = document.querySelector(item.section);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }

    function openPalette() {
      backdrop.classList.add('open');
      input.value = '';
      filteredItems = [...commandItems];
      selectedIndex = 0;
      renderResults();
      setTimeout(() => input.focus(), 50);
      playSynthSound('chime');
    }

    function closePalette() {
      backdrop.classList.remove('open');
      input.blur();
    }

    triggers.forEach((btn) => btn.addEventListener('click', openPalette));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closePalette();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (backdrop.classList.contains('open')) closePalette();
        else openPalette();
      } else if (e.key === 'Escape' && backdrop.classList.contains('open')) {
        closePalette();
      } else if (backdrop.classList.contains('open')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % filteredItems.length;
          renderResults();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
          renderResults();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            executeCommand(filteredItems[selectedIndex]);
          }
        }
      }
    });

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      filteredItems = commandItems.filter(item => item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q));
      selectedIndex = 0;
      renderResults();
    });
  }

  // --- 3D CARD TILT EFFECT ---
  function initCardTilt() {
    const tiltCards = document.querySelectorAll('.team-card, .trophy-card');
    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -7;
        const rotateY = ((x - centerX) / centerX) * 7;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // --- MODAL VIEWER SYSTEM ---
  function initModals() {
    const modalBackdrop = document.getElementById('modal-overlay-backdrop');
    const modalTitle = document.getElementById('modal-window-title');
    const modalContent = document.getElementById('modal-window-content');
    const modalClose = document.getElementById('modal-close-btn');

    if (!modalBackdrop || !modalTitle || !modalContent) return;

    function openModal(title, htmlContent) {
      modalTitle.textContent = title;
      modalContent.innerHTML = htmlContent;
      modalBackdrop.classList.add('open');
      playSynthSound('chime');
    }

    function closeModal() {
      modalBackdrop.classList.remove('open');
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Scrapbook Lightbox
    const scrapbookItems = document.querySelectorAll('.scrapbook-item');
    scrapbookItems.forEach((item) => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const caption = item.querySelector('.scrapbook-caption');
        if (img) {
          openModal(
            'MEMORY VAULT: ' + (caption ? caption.textContent : 'CAMERA ROLL'),
            `<div style="text-align: center;">
              <img src="${img.src}" style="max-height: 65vh; margin: 0 auto 16px; border-radius: 8px; border: 1px solid var(--sys-border);" alt="Full View">
              <p style="font-family: var(--font-mono); color: var(--cyber-cyan); font-size: 0.9rem;">${caption ? caption.textContent : ''}</p>
            </div>`
          );
        }
      });
    });

    // Event Poster Inspector Modal
    const eventCards = document.querySelectorAll('.event-poster-card');
    eventCards.forEach((card) => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const titleEl = card.querySelector('.poster-title');
        const descEl = card.querySelector('.poster-desc');
        const img = card.querySelector('.poster-img');
        const tagEl = card.querySelector('.poster-category-tag');
        const badgeEl = card.querySelector('.poster-footer-row span');

        const title = titleEl ? titleEl.textContent : 'EVENT DETAILS';
        const desc = descEl ? descEl.textContent : '';
        const imgSrc = img ? img.src : '';
        const tag = tagEl ? tagEl.textContent : 'EVENT';
        const badge = badgeEl ? badgeEl.textContent : '';

        openModal(
          `EVENT RECORD: ${title.toUpperCase()}`,
          `<div class="modal-event-layout">
            <div style="background: #030814; border-radius: 10px; overflow: hidden; border: 1px solid var(--sys-border);">
              <img src="${imgSrc}" style="width: 100%; max-height: 60vh; object-fit: contain; display: block;" alt="${title}">
            </div>
            <div>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                <span class="poster-category-tag" style="position: static;">${tag}</span>
                ${badge ? `<span style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--blue-light); background: rgba(0,140,255,0.1); padding: 3px 8px; border-radius: 4px;">${badge}</span>` : ''}
              </div>
              <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 14px; line-height: 1.25;">${title}</h2>
              <p style="font-size: 0.96rem; color: var(--text-pearl); line-height: 1.7; margin-bottom: 0;">
                ${desc}
              </p>
            </div>
          </div>`
        );
      });
    });
  }

  // --- EVENTS & TEAM FILTER SYSTEM ---
  function initFilters() {
    // Event filter
    const eventBtns = document.querySelectorAll('.event-filter-btn');
    const eventCards = document.querySelectorAll('.event-poster-card');

    eventBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        eventBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');

        eventCards.forEach((card) => {
          const cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
        playSynthSound('click');
      });
    });

    // Team filter
    const teamBtns = document.querySelectorAll('.team-tab-btn');
    const teamCards = document.querySelectorAll('.team-card');

    teamBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        teamBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const roleFilter = btn.getAttribute('data-team');

        teamCards.forEach((card) => {
          const dept = card.getAttribute('data-dept');
          const tier = card.getAttribute('data-tier') || (dept === 'lead' ? 'core' : 'subcore');
          if (
            roleFilter === 'all' ||
            dept === roleFilter ||
            tier === roleFilter ||
            (roleFilter === 'lead' && tier === 'core') ||
            (roleFilter === 'core' && (tier === 'core' || dept === 'lead')) ||
            (roleFilter === 'subcore' && tier === 'subcore')
          ) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
        playSynthSound('click');
      });
    });
  }

  // --- INTERACTIVE TERMINAL (/dev/acmw/the_lab) ---
  function initTerminal() {
    const input = document.getElementById('terminal-cli-input');
    const output = document.getElementById('terminal-cli-output');
    if (!input || !output) return;

    const commands = {
      help: () => `Available subroutines:
  <span style="color: var(--cyber-cyan);">about</span>    - Print chapter core directive
  <span style="color: var(--cyber-cyan);">team</span>     - Print leadership and domain leads
  <span style="color: var(--cyber-cyan);">events</span>   - Print signature events & hackathons
  <span style="color: var(--cyber-cyan);">awards</span>   - Display national & university accolades
  <span style="color: var(--cyber-cyan);">clear</span>    - Wipe the console screen`,
      about: () => `ACM-W (Association for Computing Machinery - Women's Chapter) at Shiv Nadar Institution of Eminence is dedicated to fostering gender diversity and technical excellence across computing and engineering disciplines.`,
      team: () => `Active Operators:
- Paridhi Kumar [Chairperson]
- Anvi Gupta [Vice Chairperson]
- Antara Shyam [Secretary]
- Navya Arora [Treasurer]
- Priyesi Taneja [Fresher Coordinator]
- Prachee Mahapatra & Shree Gattani [Technical Leads]
- Naina Lal Mehta [Design Lead]
- Mirambika Patel [Content Lead]
- Shreeym Sharma & Shivani [Marketing Leads]
- Parishi Garg & Anya Maheshwari [Event Management Leads]`,
      awards: () => `[HONOR] Best Emerging Women Chapter in Region 2 (ACM India)
[HONOR] Most Consistent Society of the Year (Among 60+ SNU Clubs)
[HONOR] Top Technical Society 2024-25 (Club Wars)`,
      events: () => `Flagships:
- LevelUp Buildathon (Inter-college Web Dev Sprint)
- CryptX Files (34hr online crypthunt with 150+ devs)
- HackData 2026 (ACM × ACM-W × GDG Mega Fest)
- Envisage Hackathon (₹60,000 prize pool)
- Reverse Coding, Think Before You Click NGO Workshop, Dell SDE Series`,
      clear: () => {
        output.innerHTML = '';
        return null;
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim().toLowerCase();
        input.value = '';
        if (!cmd) return;

        playSynthSound('beep');

        const userLine = document.createElement('div');
        userLine.style.marginBottom = '6px';
        userLine.innerHTML = `<span style="color: var(--cyber-cyan); font-weight: bold;">ACMW@SNU:~$</span> ${cmd}`;
        output.appendChild(userLine);

        if (commands[cmd]) {
          const res = commands[cmd]();
          if (res !== null) {
            const resLine = document.createElement('div');
            resLine.style.marginBottom = '14px';
            resLine.style.color = 'var(--text-pearl)';
            resLine.innerHTML = res;
            output.appendChild(resLine);
          }
        } else {
          const errLine = document.createElement('div');
          errLine.style.marginBottom = '14px';
          errLine.style.color = '#FF4D4D';
          errLine.innerHTML = `command not found: ${cmd}. Type <span style="color: var(--cyber-cyan);">'help'</span> for instructions.`;
          output.appendChild(errLine);
        }

        output.scrollTop = output.scrollHeight;
      }
    });
  }

  // --- LIVE IST CLOCK & SOUND TOGGLE ---
  function initLiveClock() {
    const clockEl = document.getElementById('sys-live-time');
    const audioToggle = document.getElementById('sys-audio-toggle');

    function updateTime() {
      if (clockEl) {
        const now = new Date();
        const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockEl.textContent = now.toLocaleTimeString('en-US', options) + ' IST';
      }
    }
    updateTime();
    setInterval(updateTime, 1000);

    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        audioToggle.textContent = isSoundEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
        if (isSoundEnabled) playSynthSound('click');
      });
    }
  }

  // --- MOBILE NAV DRAWER ---
  function initMobileDrawer() {
    const openBtn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('btn-close-drawer');
    const links = document.querySelectorAll('.mobile-nav-links a');

    if (!openBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('active');
      playSynthSound('click');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('active');
    }

    openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    links.forEach(l => l.addEventListener('click', closeDrawer));
  }

  // --- INITIALIZE ALL MODULES ---
  document.addEventListener('DOMContentLoaded', () => {
    initBootSequence();
    initCustomCursor();
    initBackgroundCanvas();
    initCommandPalette();
    initCardTilt();
    initModals();
    initFilters();
    initTerminal();
    initLiveClock();
    initMobileDrawer();
  });
})();