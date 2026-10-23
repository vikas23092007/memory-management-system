/**
 * ===================================================================
 * OS Memory Management - Thrashing & Working Set Model Module
 * Features:
 *  - Interactive CPU Utilization vs Degree of Multiprogramming Curve
 *  - Working Set Model Simulator (Window Delta, WSS Calculation)
 *  - Thrashing Detection & Page Fault Frequency (PFF) Strategy
 * ===================================================================
 */

const ThrashingSim = (function() {
  // Working Set Parameters
  let deltaWindow = 4;
  let sampleReferenceString = [2, 6, 1, 5, 7, 7, 7, 7, 5, 1, 6, 2, 3, 4, 1, 2, 3, 4, 4, 4, 3, 4, 3, 4, 4, 4, 1, 3, 2, 3, 4, 4, 4, 3, 4, 4, 4];
  let totalSystemFrames = 10;

  function init() {
    setupEventListeners();
    drawThrashingCurve(6); // initial degree of 6
    updateWorkingSetSimulation();
  }

  function setupEventListeners() {
    // Degree of Multiprogramming Slider
    const degSlider = document.getElementById('thrash-degree-slider');
    degSlider?.addEventListener('input', (e) => {
      const degree = parseInt(e.target.value, 10);
      document.getElementById('thrash-degree-val').innerText = degree;
      drawThrashingCurve(degree);
    });

    // Working Set Delta Slider
    const deltaSlider = document.getElementById('ws-delta-slider');
    deltaSlider?.addEventListener('input', (e) => {
      deltaWindow = parseInt(e.target.value, 10);
      document.getElementById('ws-delta-val').innerText = deltaWindow;
      updateWorkingSetSimulation();
    });

    // Working Set Step Slider
    const stepSlider = document.getElementById('ws-step-slider');
    stepSlider?.addEventListener('input', (e) => {
      document.getElementById('ws-step-val').innerText = e.target.value;
      updateWorkingSetSimulation();
    });
  }

  /**
   * Draws the classic Operating System curve:
   * CPU Utilization (%) vs Degree of Multiprogramming
   */
  function drawThrashingCurve(currentDegree) {
    const canvas = document.getElementById('thrash-curve-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 35, bottom: 45, left: 55, right: 30 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Gridlines & Axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    // Y-Axis: CPU Utilization 0% to 100%
    for (let u = 0; u <= 100; u += 20) {
      const y = pad.top + chartH - (u / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(u + '%', pad.left - 8, y + 4);
    }

    // X-Axis: Degree of Multiprogramming (1 to 15 processes)
    ctx.textAlign = 'center';
    for (let d = 1; d <= 15; d += 2) {
      const x = pad.left + ((d - 1) / 14) * chartW;
      ctx.fillText(d, x, h - pad.bottom + 18);
    }

    ctx.fillText('Degree of Multiprogramming (Active Processes)', pad.left + chartW / 2, h - 8);

    // Y-axis title (rotated)
    ctx.save();
    ctx.translate(16, pad.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('CPU Utilization (%)', 0, 0);
    ctx.restore();

    // Critical Thrashing Threshold is around degree = 8
    const peakDegree = 8;

    // Mathematical curve function for CPU utilization vs degree:
    // Models initial logarithmic growth as more processes keep CPU busy,
    // followed by catastrophic plunge due to thrashing.
    function getUtilization(deg) {
      if (deg <= peakDegree) {
        // Curve rising up to ~88% at peak
        return 15 + 75 * Math.sin((deg / peakDegree) * (Math.PI / 2));
      } else {
        // Thrashing drop
        const dropFactor = (deg - peakDegree) / (15 - peakDegree);
        return Math.max(5, 90 * Math.exp(-dropFactor * 3.5));
      }
    }

    // Draw the curve line
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;

    for (let deg = 1; deg <= 15; deg += 0.2) {
      const u = getUtilization(deg);
      const x = pad.left + ((deg - 1) / 14) * chartW;
      const y = pad.top + chartH - (u / 100) * chartH;
      if (deg === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill underneath the curve with gradient
    ctx.lineTo(w - pad.right, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Danger Zone highlight (Thrashing cliff)
    const peakX = pad.left + ((peakDegree - 1) / 14) * chartW;
    ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
    ctx.fillRect(peakX, pad.top, w - pad.right - peakX, chartH);

    ctx.fillStyle = '#fb7185';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠️ THRASHING ZONE', peakX + 12, pad.top + 20);

    // Draw marker for current slider degree
    const curU = getUtilization(currentDegree);
    const curX = pad.left + ((currentDegree - 1) / 14) * chartW;
    const curY = pad.top + chartH - (curU / 100) * chartH;

    const isThrashing = currentDegree > peakDegree;

    ctx.beginPath();
    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
    ctx.fillStyle = isThrashing ? '#f43f5e' : '#10b981';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Callout box on point
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isThrashing ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 1;
    ctx.fillRect(curX - 45, curY - 32, 90, 22);
    ctx.strokeRect(curX - 45, curY - 32, 90, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${curU.toFixed(1)}% CPU`, curX, curY - 18);

    // Update state text in UI
    const stateTextEl = document.getElementById('thrash-state-indicator');
    if (stateTextEl) {
      if (isThrashing) {
        stateTextEl.innerHTML = `
          <div class="stat-box" style="border-color:var(--accent-rose); background:rgba(244,63,94,0.1)">
            <span class="stat-label" style="color:var(--accent-rose)">SYSTEM STATE</span>
            <span class="stat-value rose" style="font-size:1.15rem">THRASHING DETECTED! 🚨</span>
            <span style="font-size:0.8rem; color:#fca5a5; margin-top:4px">
              Page fault rate is so high that CPU is 90%+ idle waiting for disk paging I/O.
              <strong>Remedy:</strong> OS must suspend / swap out some processes to reduce degree of multiprogramming.
            </span>
          </div>
        `;
      } else {
        stateTextEl.innerHTML = `
          <div class="stat-box" style="border-color:var(--accent-emerald); background:rgba(16,185,129,0.1)">
            <span class="stat-label" style="color:var(--accent-emerald)">SYSTEM STATE</span>
            <span class="stat-value emerald" style="font-size:1.15rem">OPTIMAL THROUGHPUT ✅</span>
            <span style="font-size:0.8rem; color:#6ee7b7; margin-top:4px">
              Processes have sufficient working frames allocated. CPU utilization is high (${curU.toFixed(1)}%).
            </span>
          </div>
        `;
      }
    }
  }

  /**
   * Working Set Model Simulator
   * Given reference string, window delta Δ, and current time t:
   * Working Set W(t, Δ) = set of distinct pages accessed in [t - Δ + 1, t]
   * Working Set Size WSS = |W(t, Δ)|
   */
  function updateWorkingSetSimulation() {
    const stepSlider = document.getElementById('ws-step-slider');
    if (!stepSlider) return;

    const t = parseInt(stepSlider.value, 10); // current reference index (0-based)
    const startIdx = Math.max(0, t - deltaWindow + 1);
    const windowSlice = sampleReferenceString.slice(startIdx, t + 1);

    // Distinct pages in window
    const workingSet = Array.from(new Set(windowSlice));
    const wss = workingSet.length;

    // Assume 3 active processes in system with distinct demand
    // Process 1: current WSS
    // Process 2: fixed demand 4 frames
    // Process 3: fixed demand 4 frames
    const proc2Demand = 4;
    const proc3Demand = 3;
    const totalDemandD = wss + proc2Demand + proc3Demand;
    const framesAvailable = totalSystemFrames;

    const willThrash = totalDemandD > framesAvailable;

    const wsDisplayEl = document.getElementById('ws-display-container');
    if (wsDisplayEl) {
      // Build visual timeline of references
      let timelineHtml = '<div style="display:flex; gap:4px; overflow-x:auto; padding:8px 0; margin-bottom:1rem;">';
      sampleReferenceString.forEach((p, idx) => {
        const inWindow = idx >= startIdx && idx <= t;
        const isCurrent = idx === t;
        let borderStyle = isCurrent ? 'outline:2px solid var(--accent-cyan);' : '';
        let bgStyle = inWindow ? 'background:rgba(59,130,246,0.3); color:#93c5fd;' : 'background:var(--bg-secondary); color:var(--text-dim);';
        timelineHtml += `
          <div style="min-width:32px; height:36px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; font-family:var(--font-mono); font-size:0.8rem; ${bgStyle} ${borderStyle}">
            <strong>${p}</strong>
            <span style="font-size:0.6rem; opacity:0.7">t${idx+1}</span>
          </div>
        `;
      });
      timelineHtml += '</div>';

      wsDisplayEl.innerHTML = `
        ${timelineHtml}
        <div style="background:#0b111e; padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color); font-family:var(--font-mono); font-size:0.85rem; line-height:1.6">
          <div style="color:var(--accent-cyan); font-weight:700; margin-bottom:0.5rem">
            At Time t = ${t + 1} with Window Size Δ = ${deltaWindow}:
          </div>
          • References in Window: [${windowSlice.join(', ')}]<br>
          • <strong>Working Set W(t, Δ)</strong> = { <span style="color:var(--accent-emerald); font-weight:700">${workingSet.join(', ')}</span> }<br>
          • <strong>Working Set Size (WSS₁)</strong> = |W(t, Δ)| = <strong style="color:var(--accent-purple)">${wss} frames</strong><br>
          • Total System Demand D = WSS₁ (${wss}) + WSS₂ (${proc2Demand}) + WSS₃ (${proc3Demand}) = <strong style="color:${willThrash ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; font-size:1.1rem">${totalDemandD} frames</strong><br>
          • Total Physical Frames Available (M) = <strong>${framesAvailable} frames</strong>
          <div style="margin-top:0.75rem; padding:0.6rem; border-radius:4px; ${willThrash ? 'background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#fb7185' : 'background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399'}">
            ${willThrash 
              ? `🚨 <strong>THRASHING IMMINENT!</strong> Total Demand D (${totalDemandD}) > Total Frames M (${framesAvailable}). Process needs more frames than memory can provide!`
              : `✅ <strong>STABLE SYSTEM!</strong> Total Demand D (${totalDemandD}) ≤ Total Frames M (${framesAvailable}). No thrashing.`}
          </div>
        </div>
      `;
    }
  }

  return {
    init,
    drawThrashingCurve,
    updateWorkingSetSimulation
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  ThrashingSim.init();
});
