// -------------------------------------------------------------
// INTERACTIVE ENGINE - LOGISTICS YOS 3D SCROLL & DASHBOARD
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

  // 1. Scroll-Based Image Frame Engine
  const canvas = document.getElementById('hero-frame-canvas');
  const heroWrapper = document.getElementById('hero');
  const frameCounter = document.getElementById('hero-frame-counter');
  
  if (canvas && heroWrapper) {
    const ctx = canvas.getContext('2d');
    const totalFrames = 300;
    const images = [];
    let loadedCount = 0;
    let imagesPreloaded = false;
    // No particles needed for Grid Scan transition

    // Generate file path for a frame index
    function getFramePath(index) {
      const paddedIndex = String(index).padStart(3, '0');
      return `images/hero-frames/ezgif-frame-${paddedIndex}.jpg`;
    }

    // Set canvas dimensions to viewport size
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderCurrentFrame();
    }
    window.addEventListener('resize', resizeCanvas);

    // Load a single frame and draw
    function loadFrame(index, callback) {
      if (images[index]) {
        if (callback) callback(images[index]);
        return;
      }
      const img = new Image();
      img.src = getFramePath(index);
      img.onload = () => {
        images[index] = img;
        if (callback) callback(img);
      };
    }

    // Load first frame immediately for instant first paint
    loadFrame(1, (img) => {
      renderImage(img);
      // Once first frame is painted, trigger background preloading of other frames
      preloadNextFrames();
    });

    // Preload remaining frames in batches to avoid network congestion
    function preloadNextFrames() {
      let index = 2;
      function loadNextBatch() {
        const batchSize = 4;
        const end = Math.min(index + batchSize, totalFrames + 1);
        let batchLoaded = 0;
        const totalInBatch = end - index;

        if (totalInBatch <= 0) {
          imagesPreloaded = true;
          return;
        }

        for (let i = index; i < end; i++) {
          const img = new Image();
          img.src = getFramePath(i);
          const currentIdx = i;
          img.onload = () => {
            images[currentIdx] = img;
            loadedCount++;
            batchLoaded++;
            if (batchLoaded === totalInBatch) {
              index = end;
              // Schedule next batch
              setTimeout(loadNextBatch, 80);
            }
          };
          img.onerror = () => {
            // Handle error silently, try next in batch
            batchLoaded++;
            if (batchLoaded === totalInBatch) {
              index = end;
              setTimeout(loadNextBatch, 80);
            }
          };
        }
      }
      loadNextBatch();
    }

    // Aspect-ratio cover calculation (similar to background-size: cover)
    function renderImage(img) {
      if (!img) return;
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;
      let drawWidth, drawHeight, drawX, drawY;

      if (canvasRatio > imgRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawWidth = canvas.height * imgRatio;
        drawHeight = canvas.height;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    function renderCurrentFrame() {
      // Calculate scroll fraction specifically relative to hero scroll wrapper height
      const rect = heroWrapper.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      let fraction = 0;
      
      if (scrollRange > 0) {
        // Keep progress bounded between 0 and 1
        fraction = Math.max(0, Math.min(1, -rect.top / scrollRange));
      }

      // Map fraction to frame range [1, 300]
      const targetFrame = Math.max(1, Math.min(totalFrames, Math.round(fraction * (totalFrames - 1)) + 1));
      
      // Update frame counter HUD element
      if (frameCounter) {
        frameCounter.textContent = `FRAME ${String(targetFrame).padStart(3, '0')}/${totalFrames}`;
      }

      // Check if image is loaded, otherwise load it dynamically on demand
      if (images[targetFrame]) {
        renderImage(images[targetFrame]);
      } else {
        // Fallback: load missing frame and render when ready
        loadFrame(targetFrame, (img) => {
          // Verify we are still on this frame before drawing
          const currentRect = heroWrapper.getBoundingClientRect();
          const currentScrollRange = currentRect.height - window.innerHeight;
          const currentFraction = currentScrollRange > 0 ? Math.max(0, Math.min(1, -currentRect.top / currentScrollRange)) : 0;
          const currentTargetFrame = Math.max(1, Math.min(totalFrames, Math.round(currentFraction * (totalFrames - 1)) + 1));
          if (currentTargetFrame === targetFrame) {
            renderImage(img);
          }
        });
        
        // If image isn't loaded yet, draw the nearest available frame
        let nearestFrame = null;
        for (let offset = 1; offset < 300; offset++) {
          if (targetFrame - offset >= 1 && images[targetFrame - offset]) {
            nearestFrame = images[targetFrame - offset];
            break;
          }
          if (targetFrame + offset <= totalFrames && images[targetFrame + offset]) {
            nearestFrame = images[targetFrame + offset];
            break;
          }
        }
        if (nearestFrame) {
          renderImage(nearestFrame);
        }
      }

      // Canvas transition: freeze on last frame when fraction >= 0.80
      if (canvas) {
        if (fraction >= 0.80) {
          if (images[300]) {
            renderImage(images[300]);
          }
        }
      }

      const transText = document.getElementById('hero-trans-text');
      if (transText) {
        if (fraction >= 0.60) {
          const textProg = Math.min(1, (fraction - 0.60) / 0.30); // fully visible by fraction = 0.90
          transText.style.opacity = textProg;
          const translateY = -50 - (15 * (1 - textProg)); // slide up into view
          transText.style.transform = `translate(-50%, ${translateY}%)`;
        } else {
          transText.style.opacity = 0;
          transText.style.transform = 'translate(-50%, -35%)';
        }
      }
    }

    // Scroll listener updates the canvas frame
    window.addEventListener('scroll', renderCurrentFrame);
    
    // Initial resize trigger to layout canvas
    resizeCanvas();
  }

  // 2. Live Yard Grid Visualizer Setup (Below hero)
  const liveYardGrid = document.getElementById('live-yard-grid');
  if (liveYardGrid) {
    const totalSlots = 12 * 6;
    for (let i = 0; i < totalSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'visualizer-slot';
      const rowChar = String.fromCharCode(65 + Math.floor(i / 12));
      const colNum = (i % 12) + 1;
      if (i % 5 === 0) {
        slot.textContent = `${rowChar}${colNum}`;
      }
      liveYardGrid.appendChild(slot);
    }

    const mockTrailers = [
      { id: 'TR-8902', x: 2, y: 1, status: 'LOADED', color: 'var(--c-lime)' },
      { id: 'TR-1104', x: 7, y: 3, status: 'EMPTY', color: 'rgba(255,255,255,0.7)' },
      { id: 'TR-5639', x: 4, y: 0, status: 'IN_TRANSIT', color: 'var(--c-lime)' },
      { id: 'TR-3398', x: 9, y: 4, status: 'STAGED', color: 'var(--c-lime)' },
    ];

    const activeTrailerElements = [];

    mockTrailers.forEach((trailer) => {
      const el = document.createElement('div');
      el.className = 'truck-unit';
      el.style.width = '70px';
      el.style.height = '45px';
      el.style.left = `calc(${trailer.x * 8.33}% + 5px)`;
      el.style.top = `calc(${trailer.y * 16.6}% + 5px)`;
      el.style.borderColor = trailer.color;
      el.style.color = trailer.color;

      el.innerHTML = `
        <span class="id">${trailer.id}</span>
        <span class="status">${trailer.status}</span>
      `;

      liveYardGrid.appendChild(el);
      activeTrailerElements.push({ element: el, data: trailer });
    });

    setInterval(() => {
      activeTrailerElements.forEach(item => {
        if (Math.random() > 0.6) {
          const moveX = Math.random() > 0.5 ? 1 : -1;
          const newX = Math.max(0, Math.min(11, item.data.x + moveX));
          item.data.x = newX;
          item.element.style.left = `calc(${newX * 8.33}% + 5px)`;
          item.element.querySelector('.status').textContent = 'MOVING...';
          item.element.querySelector('.status').style.color = 'var(--c-lime)';
          
          setTimeout(() => {
            item.element.querySelector('.status').textContent = 'STAGED';
            item.element.querySelector('.status').style.color = '';
          }, 1500);
        }
      });
    }, 4000);
  }

  // 3. Interactive Simulator Showcase Panel
  const tabButtons = document.querySelectorAll('.tab-btn');
  const simTitle = document.getElementById('sim-title');
  const simContent = document.getElementById('sim-screen-content');

  const tabContents = {
    gate: {
      title: 'TERMINAL_GATE_FEED.EXE',
      render: () => `
        <div class="vision-overlay">
          <div style="width:100%; height:100%; background: linear-gradient(135deg, #093b3b 0%, #031414 100%); display:flex; align-items:center; justify-content:center; position:relative;">
            <div style="font-family:var(--font-mono); color:rgba(255,255,255,0.1); font-size:3rem; font-weight:700; text-transform:uppercase;">Gate Stream</div>
            <div class="scan-line"></div>
            <div class="vision-box" style="top:25%; left:30%; width:160px; height:120px;">
              <div class="vision-tag">CONTAINER // ID: AMZ-9982</div>
            </div>
            <div class="vision-box" style="top:50%; left:65%; width:100px; height:60px; border-color:white; box-shadow:none;">
              <div class="vision-tag" style="background:white; color:black;">PLATE // TX-981A</div>
            </div>
          </div>
        </div>
        <div class="terminal-feed" id="gate-logs" style="margin-top:1rem; height:120px;">
          <div class="terminal-line"><span class="time">[11:40:02]</span> GATE_1: System ready. Waiting for chassis trigger...</div>
        </div>
      `,
      init: () => {
        const logs = document.getElementById('gate-logs');
        const lines = [
          'GATE_1: Truck entering lane 2...',
          'SYS_VISION: Capturing container decals...',
          'SYS_VISION: Container ID identified: [AMZ-9982] (Accuracy: 99.7%)',
          'SYS_VISION: License plate matched: TX-981A',
          'WMS_SYNC: Verifying booking confirmation...',
          'WMS_SYNC: Match found. Booking #8812A valid.',
          'GATE_1: Barrier raised. Hostler instructed to park at Bay 14.',
        ];
        let i = 0;
        const interval = setInterval(() => {
          if (i < lines.length && logs) {
            const line = document.createElement('div');
            line.className = 'terminal-line';
            const time = new Date().toLocaleTimeString();
            line.innerHTML = `<span class="time">[${time}]</span> <span class="status-green">>></span> ${lines[i]}`;
            logs.appendChild(line);
            logs.scrollTop = logs.scrollHeight;
            i++;
          } else {
            clearInterval(interval);
          }
        }, 1500);
      }
    },
    inventory: {
      title: 'SYS.LIVE_YARD_INVENTORY.SYS',
      render: () => `
        <div style="display:grid; grid-template-columns:1fr 2fr; gap:1rem; height:100%;">
          <div style="border: 1px solid var(--c-border-white-15); padding:1rem; display:flex; flex-direction:column; justify-content:space-between; background:rgba(0,0,0,0.2);">
            <div>
              <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--c-lime); margin-bottom:0.5rem;">YARD METRICS</div>
              <div style="font-size:1.5rem; font-weight:700; line-height:1.2;">184 / 200</div>
              <div style="font-size:0.65rem; color:var(--c-gray-light);">BAY CAPACITY UTILIZATION</div>
            </div>
            <div>
              <div style="font-size:1.5rem; font-weight:700; line-height:1.2; color:#ff6b6b;">14h 22m</div>
              <div style="font-size:0.65rem; color:var(--c-gray-light);">AVERAGE DWELL TIME</div>
            </div>
          </div>
          <div class="terminal-feed" id="inv-logs" style="height:100%;">
            <div class="terminal-line"><span class="time">[11:42:10]</span> FETCHING REAL-TIME CONTAINER MATRIX...</div>
          </div>
        </div>
      `,
      init: () => {
        const logs = document.getElementById('inv-logs');
        const lines = [
          'MATRIX: A1 - Loaded (TR-8902) [Dwell: 2h 10m]',
          'MATRIX: A2 - Empty (TR-1104) [Dwell: 18h 45m] - ALERT: Detention warning',
          'MATRIX: A3 - Empty (Chassis #9090)',
          'MATRIX: B1 - Staged (TR-3398) [Priority: High]',
          'MATRIX: Real-time scan complete. 0 discrepancies found.',
        ];
        let i = 0;
        const interval = setInterval(() => {
          if (i < lines.length && logs) {
            const line = document.createElement('div');
            line.className = 'terminal-line';
            const time = new Date().toLocaleTimeString();
            line.innerHTML = `<span class="time">[${time}]</span> ${lines[i]}`;
            logs.appendChild(line);
            logs.scrollTop = logs.scrollHeight;
            i++;
          } else {
            clearInterval(interval);
          }
        }, 1200);
      }
    },
    hostler: {
      title: 'SYS.HOSTLER_ROUTING.LOG',
      render: () => `
        <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
          <div style="border: 1px dashed var(--c-border-white-30); border-radius:4px; padding:1rem; display:flex; justify-content:space-around; align-items:center; background:rgba(171, 255, 2, 0.03);">
            <div style="text-align:center;">
              <div style="font-size:0.65rem; color:var(--c-gray-light); font-family:var(--font-mono);">ACTIVE TUGS</div>
              <div style="font-size:1.5rem; font-weight:700; color:var(--c-lime);">08</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.65rem; color:var(--c-gray-light); font-family:var(--font-mono);">QUEUE LENGTH</div>
              <div style="font-size:1.5rem; font-weight:700;">02</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.65rem; color:var(--c-gray-light); font-family:var(--font-mono);">EFFICIENCY</div>
              <div style="font-size:1.5rem; font-weight:700; color:var(--c-lime);">96.5%</div>
            </div>
          </div>
          <div class="terminal-feed" id="hostler-logs" style="height:170px;">
            <div class="terminal-line"><span class="time">[11:44:00]</span> HOSTLER_DISPATCHER: Active and monitoring hostler telemetry...</div>
          </div>
        </div>
      `,
      init: () => {
        const logs = document.getElementById('hostler-logs');
        const lines = [
          'TUG_02: Job assigned - Move AMZ-9982 from Gate 1 to Bay 14',
          'TUG_05: Completed task - Container MSK-1090 stacked in Row C3',
          'TUG_02: Navigation updated. Optimal path selected via Yard Row A',
          'TUG_02: Container AMZ-9982 dropped at Bay 14. Job logged.',
          'ALGORITHM: Load balance complete. Next dispatch queuing...',
        ];
        let i = 0;
        const interval = setInterval(() => {
          if (i < lines.length && logs) {
            const line = document.createElement('div');
            line.className = 'terminal-line';
            const time = new Date().toLocaleTimeString();
            line.innerHTML = `<span class="time">[${time}]</span> <span class="status-green">[*]</span> ${lines[i]}`;
            logs.appendChild(line);
            logs.scrollTop = logs.scrollHeight;
            i++;
          } else {
            clearInterval(interval);
          }
        }, 1400);
      }
    }
  };

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const selectedTab = tabContents[tabId];
    if (selectedTab) {
      simTitle.textContent = selectedTab.title;
      simContent.innerHTML = selectedTab.render();
      selectedTab.init();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  switchTab('gate');

  // 4. Reveal on Scroll Observer
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // 5. Services Section Loading Bar Progress on Scroll
  const servicesSection = document.getElementById('services');
  const servicesProgressBar = document.getElementById('services-progress-bar');
  if (servicesSection && servicesProgressBar) {
    window.addEventListener('scroll', () => {
      const rect = servicesSection.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Calculate progress of section through the viewport
      const startScroll = rect.top - viewportHeight;
      const totalScrollRange = elementHeight + viewportHeight;
      const currentScrollPosition = -startScroll;

      let progress = 0;
      if (totalScrollRange > 0) {
        progress = Math.max(0, Math.min(1, currentScrollPosition / totalScrollRange));
      }

      servicesProgressBar.style.width = `${progress * 100}%`;
    });
  }

  // 6. Split Sticky Scroll Interaction logic
  const splitScrollSection = document.getElementById('split-scroll');
  const totalSplitItems = 6;
  
  if (splitScrollSection) {
    // Scroll mapping
    window.addEventListener('scroll', () => {
      const rect = splitScrollSection.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      let fraction = 0;
      
      if (scrollRange > 0) {
        fraction = Math.max(0, Math.min(1, -rect.top / scrollRange));
      }

      const activeIdx = Math.max(1, Math.min(totalSplitItems, Math.floor(fraction * totalSplitItems) + 1));

      for (let i = 1; i <= totalSplitItems; i++) {
        const txtItem = document.getElementById(`split-text-${i}`);
        const videoItem = document.getElementById(`split-video-${i}`);
        
        if (i === activeIdx) {
          if (txtItem) txtItem.classList.add('active');
          if (videoItem) {
            videoItem.classList.add('active');
            if (videoItem.paused) {
              videoItem.play().catch(err => {
                // Autoplay might be blocked until interaction, ignore error
              });
            }
          }
        } else {
          if (txtItem) txtItem.classList.remove('active');
          if (videoItem) {
            videoItem.classList.remove('active');
            if (!videoItem.paused) {
              videoItem.pause();
            }
          }
        }
      }
    });
  }

  // 7. LOS Text Reveal Scroll-Bound Animation
  const losRevealSection = document.getElementById('los-reveal');
  if (losRevealSection) {
    const subtext = document.getElementById('los-subtext');
    const heading = document.getElementById('los-heading');
    const fadeL = document.getElementById('los-fade-l');
    const fadeS = document.getElementById('los-fade-s');
    const tm = document.getElementById('los-tm');
    
    const lettersWordL = document.querySelectorAll('#los-word-l .letter');
    const letterS = document.querySelector('#los-word-s .letter');

    let widthL = 0;
    let widthS = 0;

    function measureWidths() {
      // Temporarily expand to measure natural width
      fadeL.style.maxWidth = 'none';
      fadeS.style.maxWidth = 'none';
      
      widthL = fadeL.offsetWidth;
      widthS = fadeS.offsetWidth;
    }
    
    // Measure after DOM and font layouts are settled
    setTimeout(measureWidths, 100);
    window.addEventListener('resize', measureWidths);

    window.addEventListener('scroll', () => {
      const rect = losRevealSection.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      let p = 0;
      
      if (scrollRange > 0) {
        p = Math.max(0, Math.min(1, -rect.top / scrollRange));
      }

      // Phase 1: Fade out helper text and full letters (0 to 0.4)
      let opacityFade = 1;
      if (p <= 0.4) {
        opacityFade = 1 - (p / 0.4);
      } else {
        opacityFade = 0;
      }
      
      subtext.style.opacity = opacityFade;
      subtext.style.transform = `translateY(${-p * 30}px)`;
      
      fadeL.style.opacity = opacityFade;
      fadeS.style.opacity = opacityFade;

      // Phase 2: Collapse width of words & close word spacing (0.35 to 0.75)
      let collapseProgress = 0;
      if (p > 0.35 && p <= 0.75) {
        collapseProgress = (p - 0.35) / 0.40;
      } else if (p > 0.75) {
        collapseProgress = 1;
      }
      
      const currentWidthL = widthL * (1 - collapseProgress);
      const currentWidthS = widthS * (1 - collapseProgress);
      
      fadeL.style.maxWidth = `${currentWidthL}px`;
      fadeS.style.maxWidth = `${currentWidthS}px`;
      
      // Close the spacing gap
      const currentGap = 0.25 * (1 - collapseProgress);
      heading.style.gap = `${currentGap}em`;

      // Phase 3: Reveal TM and highlight letters in Lime (0.7 to 1.0)
      let tmProgress = 0;
      if (p > 0.7) {
        tmProgress = (p - 0.7) / 0.3;
      }
      
      tm.style.opacity = tmProgress;
      const tx = -15 * (1 - tmProgress);
      const ty = 15 * (1 - tmProgress);
      const scale = 0.5 + 0.5 * tmProgress;
      tm.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;

      if (p >= 0.8) {
        lettersWordL.forEach(el => el.classList.add('highlight'));
        if (letterS) letterS.classList.add('highlight');
      } else {
        lettersWordL.forEach(el => el.classList.remove('highlight'));
        if (letterS) letterS.classList.remove('highlight');
      }
    });
  }

  revealElements.forEach(el => revealObserver.observe(el));

  // 8. Services section card-stacking shrink animation on scroll
  const serviceCards = document.querySelectorAll('.service-card');
  if (serviceCards.length > 0) {
    // Dynamically set z-indexes to stack sequentially
    serviceCards.forEach((card, idx) => {
      card.style.zIndex = idx + 1;
    });

    function updateServiceCards() {
      serviceCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        // Check if the card has started scrolling past the top of the viewport
        if (rect.top < 0) {
          // Calculate the percentage of the card scrolled out (up to 100% of height)
          const scrolledFraction = Math.min(1, Math.abs(rect.top) / rect.height);
          
          // Scale down (shrink) and fade slightly
          const scale = 1 - scrolledFraction * 0.08; // scales from 1.0 down to 0.92
          const opacity = 1 - scrolledFraction * 0.3; // fades down to 70% opacity
          
          card.style.transform = `scale(${scale})`;
          card.style.opacity = opacity;
        } else {
          // Reset styles when the card is in full view or below
          card.style.transform = 'scale(1)';
          card.style.opacity = 1;
        }
      });
    }

    window.addEventListener('scroll', updateServiceCards);
    updateServiceCards(); // initial run
  }
});

