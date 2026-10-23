/**
 * ===================================================================
 * OS Memory Management - Page Replacement Simulator Module
 * Algorithms: FIFO, LRU, Optimal (OPT), LFU, Clock (Second Chance)
 * Features: Step-by-step playback, comparison matrix, Belady's Anomaly
 * ===================================================================
 */

const PageReplacementSim = (function() {
  // Simulator State
  let refString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  let numFrames = 3;
  let algorithm = 'fifo'; // 'fifo', 'lru', 'optimal', 'lfu', 'clock'

  let simulationSteps = []; // precomputed execution steps
  let currentStepIdx = -1; // -1 = start, 0..N-1
  let isPlaying = false;
  let playInterval = null;
  let playSpeed = 800; // ms

  // Presets
  const presets = {
    silberschatz: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1],
    belady: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    locality: [1, 2, 3, 1, 2, 3, 4, 5, 4, 5, 1, 2, 1, 2, 6, 7],
    tanenbaum: [2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2]
  };

  function init() {
    setupEventListeners();
    loadFromInputs();
  }

  function setupEventListeners() {
    // Control inputs
    document.getElementById('pr-algo')?.addEventListener('change', (e) => {
      algorithm = e.target.value;
      recalculateSimulation();
    });

    document.getElementById('pr-frames')?.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 8) val = 8;
      e.target.value = val;
      numFrames = val;
      recalculateSimulation();
    });

    document.getElementById('pr-ref-string')?.addEventListener('change', () => {
      loadFromInputs();
    });

    // Playback buttons
    document.getElementById('pr-play-btn')?.addEventListener('click', togglePlay);
    document.getElementById('pr-step-fwd-btn')?.addEventListener('click', stepForward);
    document.getElementById('pr-step-back-btn')?.addEventListener('click', stepBackward);
    document.getElementById('pr-reset-btn')?.addEventListener('click', resetSimulation);

    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        playSpeed = parseInt(e.target.dataset.speed, 10);
        if (isPlaying) {
          pause();
          play();
        }
      });
    });

    // Presets
    document.querySelectorAll('.pr-preset-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const key = e.target.dataset.preset;
        if (presets[key]) {
          document.getElementById('pr-ref-string').value = presets[key].join(', ');
          if (key === 'belady') {
            document.getElementById('pr-algo').value = 'fifo';
            algorithm = 'fifo';
          }
          loadFromInputs();
        }
      });
    });

    // Random Ref String Generator
    document.getElementById('pr-gen-random')?.addEventListener('click', () => {
      const len = 16;
      const maxVal = 7;
      const arr = [];
      for (let i = 0; i < len; i++) {
        arr.push(Math.floor(Math.random() * maxVal));
      }
      document.getElementById('pr-ref-string').value = arr.join(', ');
      loadFromInputs();
    });

    // Run Comparison
    document.getElementById('pr-compare-btn')?.addEventListener('click', runAllComparison);

    // Belady's Anomaly Test
    document.getElementById('pr-belady-demo-btn')?.addEventListener('click', runBeladyAnomalyTest);
  }

  function loadFromInputs() {
    const rawStr = document.getElementById('pr-ref-string')?.value || '7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1';
    const parsed = rawStr.split(/[\s,]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (parsed.length === 0) {
      alert('Please enter at least one integer page number.');
      return;
    }
    refString = parsed;
    numFrames = parseInt(document.getElementById('pr-frames')?.value || '3', 10);
    algorithm = document.getElementById('pr-algo')?.value || 'fifo';

    recalculateSimulation();
  }

  function recalculateSimulation() {
    pause();
    simulationSteps = computeAlgorithmSteps(algorithm, refString, numFrames);
    currentStepIdx = simulationSteps.length - 1; // default to showing full completion
    renderMatrix();
    updateStepView();
  }

  /**
   * Core Algorithm Simulator Logic
   * Computes state at every single reference step
   */
  function computeAlgorithmSteps(algo, pages, frameCount) {
    const steps = [];
    const frames = new Array(frameCount).fill(null);
    let totalFaults = 0;
    let totalHits = 0;

    // Data structures for specific algorithms
    const fifoQueue = []; // tracks insertion order
    const lastUsedMap = new Map(); // page -> last index used (LRU)
    const freqMap = new Map(); // page -> access count (LFU)
    const lfuEntryTime = new Map(); // page -> insertion step for tie breaking
    
    // For Clock Algorithm
    const clockFrames = new Array(frameCount).fill(null);
    const clockRefBits = new Array(frameCount).fill(0);
    let clockHand = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let isHit = false;
      let replacedPage = null;
      let targetFrameIdx = -1;
      let reason = '';

      if (algo === 'clock') {
        // Clock / Second-Chance
        const existingIdx = clockFrames.indexOf(page);
        if (existingIdx !== -1) {
          isHit = true;
          clockRefBits[existingIdx] = 1;
          reason = `Hit! Page ${page} already in Frame ${existingIdx}. Reference bit set to 1.`;
        } else {
          isHit = false;
          // Find replacement using clock hand
          while (true) {
            if (clockFrames[clockHand] === null) {
              targetFrameIdx = clockHand;
              clockFrames[targetFrameIdx] = page;
              clockRefBits[targetFrameIdx] = 1;
              reason = `Page Fault! Empty Frame ${targetFrameIdx} filled with Page ${page}. Hand -> ${(clockHand + 1) % frameCount}.`;
              clockHand = (clockHand + 1) % frameCount;
              break;
            }
            if (clockRefBits[clockHand] === 0) {
              replacedPage = clockFrames[clockHand];
              targetFrameIdx = clockHand;
              clockFrames[targetFrameIdx] = page;
              clockRefBits[targetFrameIdx] = 1;
              reason = `Page Fault! Frame ${targetFrameIdx} had bit 0. Replaced Page ${replacedPage} with ${page}. Hand -> ${(clockHand + 1) % frameCount}.`;
              clockHand = (clockHand + 1) % frameCount;
              break;
            } else {
              // Second chance given
              clockRefBits[clockHand] = 0;
              clockHand = (clockHand + 1) % frameCount;
            }
          }
        }
        // Sync frames array for unified rendering
        for (let f = 0; f < frameCount; f++) frames[f] = clockFrames[f];

      } else {
        // FIFO, LRU, OPTIMAL, LFU
        const existingIdx = frames.indexOf(page);

        if (existingIdx !== -1) {
          isHit = true;
          targetFrameIdx = existingIdx;
          lastUsedMap.set(page, i);
          freqMap.set(page, (freqMap.get(page) || 0) + 1);
          reason = `Hit! Page ${page} is already loaded in Frame ${existingIdx}.`;
        } else {
          isHit = false;
          // Check for empty frame
          const emptyIdx = frames.indexOf(null);
          if (emptyIdx !== -1) {
            targetFrameIdx = emptyIdx;
            frames[targetFrameIdx] = page;
            reason = `Page Fault! Empty Frame ${targetFrameIdx} allocated for Page ${page}.`;
          } else {
            // Need page replacement
            if (algo === 'fifo') {
              const oldestPage = fifoQueue.shift();
              targetFrameIdx = frames.indexOf(oldestPage);
              replacedPage = oldestPage;
              frames[targetFrameIdx] = page;
              reason = `Page Fault! Page ${replacedPage} (oldest in FIFO) replaced by Page ${page} in Frame ${targetFrameIdx}.`;
            } else if (algo === 'lru') {
              // Find page with minimum last-used index
              let lruPage = frames[0];
              let minTime = lastUsedMap.get(lruPage) ?? -1;
              for (let f = 1; f < frameCount; f++) {
                const p = frames[f];
                const t = lastUsedMap.get(p) ?? -1;
                if (t < minTime) {
                  minTime = t;
                  lruPage = p;
                }
              }
              targetFrameIdx = frames.indexOf(lruPage);
              replacedPage = lruPage;
              frames[targetFrameIdx] = page;
              reason = `Page Fault! Page ${replacedPage} was least recently used (at step ${minTime + 1}). Replaced with ${page}.`;
            } else if (algo === 'optimal') {
              // Find page that won't be used for the longest future time
              let farthestDistance = -1;
              let pageToReplace = frames[0];

              for (let f = 0; f < frameCount; f++) {
                const p = frames[f];
                let nextUse = Infinity;
                for (let k = i + 1; k < pages.length; k++) {
                  if (pages[k] === p) {
                    nextUse = k;
                    break;
                  }
                }
                if (nextUse === Infinity) {
                  // Never used again - optimal choice!
                  pageToReplace = p;
                  break;
                }
                if (nextUse > farthestDistance) {
                  farthestDistance = nextUse;
                  pageToReplace = p;
                }
              }
              targetFrameIdx = frames.indexOf(pageToReplace);
              replacedPage = pageToReplace;
              frames[targetFrameIdx] = page;
              reason = `Page Fault! Page ${replacedPage} ${farthestDistance === Infinity ? 'is never used again' : `has farthest future access at step ${farthestDistance + 1}`}. Replaced with ${page}.`;
            } else if (algo === 'lfu') {
              // Find page with lowest frequency, break ties with oldest entry time
              let minFreq = Infinity;
              let chosenPage = frames[0];

              for (let f = 0; f < frameCount; f++) {
                const p = frames[f];
                const fCount = freqMap.get(p) || 0;
                if (fCount < minFreq) {
                  minFreq = fCount;
                  chosenPage = p;
                } else if (fCount === minFreq) {
                  // Tie break by FIFO insertion
                  if ((lfuEntryTime.get(p) || 0) < (lfuEntryTime.get(chosenPage) || 0)) {
                    chosenPage = p;
                  }
                }
              }
              targetFrameIdx = frames.indexOf(chosenPage);
              replacedPage = chosenPage;
              frames[targetFrameIdx] = page;
              reason = `Page Fault! Page ${replacedPage} had lowest frequency (${minFreq}). Replaced with Page ${page}.`;
            }
          }

          // Update data structures after fault
          fifoQueue.push(page);
          lfuEntryTime.set(page, i);
        }

        lastUsedMap.set(page, i);
        freqMap.set(page, (freqMap.get(page) || 0) + 1);
      }

      if (isHit) totalHits++;
      else totalFaults++;

      steps.push({
        stepIdx: i,
        page: page,
        isHit: isHit,
        replacedPage: replacedPage,
        targetFrameIdx: targetFrameIdx,
        framesSnapshot: [...frames],
        clockRefBitsSnapshot: algo === 'clock' ? [...clockRefBits] : null,
        clockHandSnapshot: algo === 'clock' ? clockHand : null,
        totalHits: totalHits,
        totalFaults: totalFaults,
        reason: reason
      });
    }

    return steps;
  }

  function renderMatrix() {
    const table = document.getElementById('pr-matrix-table');
    if (!table) return;

    let html = '<thead><tr><th class="ref-col-hdr">Frame \\ Step</th>';
    for (let i = 0; i < refString.length; i++) {
      const activeClass = i === currentStepIdx ? 'curr-ref-cell' : '';
      html += `<th class="${activeClass}">S${i + 1}<br><strong>${refString[i]}</strong></th>`;
    }
    html += '</tr></thead><tbody>';

    // Frame rows
    for (let f = 0; f < numFrames; f++) {
      html += `<tr><td class="ref-col">Frame ${f}</td>`;
      for (let s = 0; s < refString.length; s++) {
        if (s <= currentStepIdx && s < simulationSteps.length) {
          const stepData = simulationSteps[s];
          const pageInFrame = stepData.framesSnapshot[f];
          const isJustLoaded = !stepData.isHit && stepData.targetFrameIdx === f;
          const cellClass = isJustLoaded ? 'new-page-in' : '';
          
          let content = pageInFrame !== null ? pageInFrame : '-';
          if (algorithm === 'clock' && stepData.clockRefBitsSnapshot && pageInFrame !== null) {
            content += `<sub style="color:var(--accent-cyan); font-size:0.65rem">(${stepData.clockRefBitsSnapshot[f]})</sub>`;
          }

          html += `<td class="${cellClass}">${content}</td>`;
        } else {
          html += `<td style="opacity: 0.3">-</td>`;
        }
      }
      html += '</tr>';
    }

    // Status Row (Hit / Fault)
    html += '<tr><td class="ref-col" style="font-weight:700;">Status</td>';
    for (let s = 0; s < refString.length; s++) {
      if (s <= currentStepIdx && s < simulationSteps.length) {
        const stepData = simulationSteps[s];
        if (stepData.isHit) {
          html += `<td class="hit-cell">HIT</td>`;
        } else {
          html += `<td class="fault-cell">MISS</td>`;
        }
      } else {
        html += `<td style="opacity: 0.3">-</td>`;
      }
    }
    html += '</tr></tbody>';

    table.innerHTML = html;
  }

  function updateStepView() {
    const stepCountEl = document.getElementById('pr-step-counter');
    const logBox = document.getElementById('pr-step-log');
    const hitsEl = document.getElementById('pr-stat-hits');
    const faultsEl = document.getElementById('pr-stat-faults');
    const hitRatioEl = document.getElementById('pr-stat-hit-ratio');
    const faultRatioEl = document.getElementById('pr-stat-fault-ratio');

    if (currentStepIdx < 0 || simulationSteps.length === 0) {
      if (stepCountEl) stepCountEl.innerText = `Step 0 / ${refString.length}`;
      if (logBox) logBox.innerHTML = '<span class="text-dim">Simulation ready. Click "Play" or "Step Next" to begin execution.</span>';
      if (hitsEl) hitsEl.innerText = '0';
      if (faultsEl) faultsEl.innerText = '0';
      if (hitRatioEl) hitRatioEl.innerText = '0%';
      if (faultRatioEl) faultRatioEl.innerText = '0%';
      return;
    }

    const cur = simulationSteps[currentStepIdx];
    const totalSteps = currentStepIdx + 1;
    const hitRatio = ((cur.totalHits / totalSteps) * 100).toFixed(1);
    const faultRatio = ((cur.totalFaults / totalSteps) * 100).toFixed(1);

    if (stepCountEl) stepCountEl.innerText = `Step ${currentStepIdx + 1} / ${refString.length}`;
    if (hitsEl) hitsEl.innerText = cur.totalHits;
    if (faultsEl) faultsEl.innerText = cur.totalFaults;
    if (hitRatioEl) hitRatioEl.innerText = `${hitRatio}%`;
    if (faultRatioEl) faultRatioEl.innerText = `${faultRatio}%`;

    if (logBox) {
      const statusBadge = cur.isHit 
        ? `<span class="badge badge-green" style="margin-right:8px;">PAGE HIT</span>` 
        : `<span class="badge badge-rose" style="background:rgba(244,63,94,0.15); color:#fb7185; border:1px solid rgba(244,63,94,0.3); margin-right:8px;">PAGE FAULT</span>`;
      
      logBox.innerHTML = `
        <div>
          ${statusBadge}
          <span>Step ${cur.stepIdx + 1}: Referencing Page <strong style="color:var(--accent-cyan); font-size:1.1rem">${cur.page}</strong>. ${cur.reason}</span>
        </div>
      `;
    }
  }

  function stepForward() {
    if (currentStepIdx < simulationSteps.length - 1) {
      currentStepIdx++;
      renderMatrix();
      updateStepView();
    } else {
      pause();
    }
  }

  function stepBackward() {
    if (currentStepIdx > 0) {
      currentStepIdx--;
      renderMatrix();
      updateStepView();
    } else if (currentStepIdx === 0) {
      currentStepIdx = -1;
      renderMatrix();
      updateStepView();
    }
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      if (currentStepIdx >= simulationSteps.length - 1) {
        currentStepIdx = -1;
      }
      play();
    }
  }

  function play() {
    isPlaying = true;
    const playBtn = document.getElementById('pr-play-btn');
    if (playBtn) playBtn.innerHTML = '⏸ Pause';
    playInterval = setInterval(() => {
      if (currentStepIdx < simulationSteps.length - 1) {
        stepForward();
      } else {
        pause();
      }
    }, playSpeed);
  }

  function pause() {
    isPlaying = false;
    const playBtn = document.getElementById('pr-play-btn');
    if (playBtn) playBtn.innerHTML = '▶ Play';
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function resetSimulation() {
    pause();
    currentStepIdx = -1;
    renderMatrix();
    updateStepView();
  }

  /**
   * Run All 5 Algorithms simultaneously and compare performance
   */
  function runAllComparison() {
    const algos = [
      { id: 'fifo', name: 'FIFO (First-In-First-Out)' },
      { id: 'lru', name: 'LRU (Least Recently Used)' },
      { id: 'optimal', name: 'Optimal (OPT / Belady)' },
      { id: 'lfu', name: 'LFU (Least Frequently Used)' },
      { id: 'clock', name: 'Clock (Second Chance)' }
    ];

    const results = algos.map(a => {
      const steps = computeAlgorithmSteps(a.id, refString, numFrames);
      const last = steps[steps.length - 1];
      const faults = last.totalFaults;
      const hits = last.totalHits;
      const hitRatio = ((hits / refString.length) * 100).toFixed(1);
      const faultRatio = ((faults / refString.length) * 100).toFixed(1);
      return {
        id: a.id,
        name: a.name,
        faults,
        hits,
        hitRatio,
        faultRatio
      };
    });

    // Populate comparison table
    const compTbody = document.getElementById('pr-compare-tbody');
    if (compTbody) {
      compTbody.innerHTML = '';
      
      // Find optimal/best
      const minFaults = Math.min(...results.map(r => r.faults));

      results.forEach(r => {
        const isBest = r.faults === minFaults;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.name}</strong> ${isBest ? '<span class="badge badge-green" style="font-size:0.65rem">Best</span>' : ''}</td>
          <td class="stat-value rose" style="font-size:1rem">${r.faults}</td>
          <td class="stat-value emerald" style="font-size:1rem">${r.hits}</td>
          <td class="stat-value cyan" style="font-size:1rem">${r.hitRatio}%</td>
          <td style="font-size:0.85rem">${r.faultRatio}%</td>
        `;
        compTbody.appendChild(tr);
      });
    }

    // Render comparison chart on HTML5 Canvas
    renderComparisonCanvasChart(results);

    // Scroll smoothly to comparison card
    document.getElementById('pr-compare-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  function renderComparisonCanvasChart(results) {
    const canvas = document.getElementById('pr-compare-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 40, bottom: 40, left: 60, right: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...results.map(r => Math.max(r.faults, r.hits)), refString.length);

    // Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const yVal = Math.round((maxVal / numTicks) * i);
      const y = padding.top + chartHeight - (yVal / maxVal) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(yVal, padding.left - 8, y + 4);
    }

    // Bar dimensions
    const groupWidth = chartWidth / results.length;
    const barWidth = groupWidth * 0.32;

    results.forEach((r, idx) => {
      const groupX = padding.left + idx * groupWidth;

      // Faults Bar (Red/Rose)
      const faultBarH = (r.faults / maxVal) * chartHeight;
      const faultX = groupX + groupWidth * 0.15;
      const faultY = padding.top + chartHeight - faultBarH;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(faultX, faultY, barWidth, faultBarH);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(r.faults, faultX + barWidth / 2, faultY - 5);

      // Hits Bar (Emerald)
      const hitBarH = (r.hits / maxVal) * chartHeight;
      const hitX = faultX + barWidth + 4;
      const hitY = padding.top + chartHeight - hitBarH;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(hitX, hitY, barWidth, hitBarH);
      ctx.fillStyle = '#fff';
      ctx.fillText(r.hits, hitX + barWidth / 2, hitY - 5);

      // Label below
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.fillText(r.id.toUpperCase(), groupX + groupWidth / 2, height - padding.bottom + 20);
    });

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(width - 170, 15, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('Page Faults', width - 150, 25);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(width - 80, 15, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('Hits', width - 60, 25);
  }

  /**
   * Belady's Anomaly Demonstration
   * Sequence: 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5
   * Demonstrates how FIFO page faults increase from 9 (3 frames) to 10 (4 frames)!
   */
  function runBeladyAnomalyTest() {
    const anomalyString = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    const frameRange = [1, 2, 3, 4, 5, 6, 7];
    const faultsFIFO = [];
    const faultsLRU = [];

    frameRange.forEach(f => {
      const stepsFIFO = computeAlgorithmSteps('fifo', anomalyString, f);
      faultsFIFO.push(stepsFIFO[stepsFIFO.length - 1].totalFaults);

      const stepsLRU = computeAlgorithmSteps('lru', anomalyString, f);
      faultsLRU.push(stepsLRU[stepsLRU.length - 1].totalFaults);
    });

    const modalOrBox = document.getElementById('pr-belady-result-box');
    if (modalOrBox) {
      modalOrBox.style.display = 'block';
      modalOrBox.innerHTML = `
        <h4 style="color:var(--accent-amber); margin-bottom:0.75rem;">⚡ Belady's Anomaly Proven!</h4>
        <p style="font-size:0.9rem; margin-bottom:1rem; color:var(--text-muted)">
          Under <strong>FIFO</strong> with reference string <code>[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]</code>:
        </p>
        <div style="display:flex; gap:1.5rem; margin-bottom:1.2rem; flex-wrap:wrap">
          <div class="stat-box" style="flex:1">
            <span class="stat-label">3 Frames (FIFO)</span>
            <span class="stat-value emerald">${faultsFIFO[2]} Faults</span>
          </div>
          <div class="stat-box" style="flex:1; border-color:var(--accent-rose)">
            <span class="stat-label">4 Frames (FIFO)</span>
            <span class="stat-value rose">${faultsFIFO[3]} Faults ⚠️</span>
          </div>
          <div class="stat-box" style="flex:1">
            <span class="stat-label">4 Frames (LRU - Stack Algo)</span>
            <span class="stat-value cyan">${faultsLRU[3]} Faults (No Anomaly)</span>
          </div>
        </div>
        <p style="font-size:0.85rem; color:#94a3b8; line-height:1.5">
          <strong>Key OS Insight:</strong> Normally, increasing frame allocation reduces page faults. But FIFO is NOT a <em>stack algorithm</em>, so its frame contents at size 3 are not a subset of size 4. This anomaly was discovered by Laszlo Belady in 1969. In contrast, <strong>LRU and Optimal never suffer from Belady's Anomaly</strong>!
        </p>
      `;
    }

    // Set simulator to this exact scenario
    document.getElementById('pr-ref-string').value = anomalyString.join(', ');
    document.getElementById('pr-frames').value = 4;
    document.getElementById('pr-algo').value = 'fifo';
    loadFromInputs();
  }

  return {
    init,
    loadFromInputs,
    recalculateSimulation,
    togglePlay,
    stepForward,
    stepBackward,
    resetSimulation,
    runAllComparison,
    runBeladyAnomalyTest
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  PageReplacementSim.init();
});
