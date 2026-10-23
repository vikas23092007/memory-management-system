/**
 * ===================================================================
 * OS Memory Management - Project & Lab Report Generator Module
 * Formats simulations into an academic lab report ready for PDF print
 * ===================================================================
 */

const ReportGenerator = (function() {
  function init() {
    document.getElementById('report-generate-btn')?.addEventListener('click', generateReport);
    document.getElementById('report-print-btn')?.addEventListener('click', () => {
      window.print();
    });
  }

  function generateReport() {
    const studentName = document.getElementById('report-student-name')?.value || 'Student Name';
    const rollNo = document.getElementById('report-roll-no')?.value || 'OS-2026-001';
    const course = document.getElementById('report-course')?.value || 'CS301 - Operating Systems';
    const instructor = document.getElementById('report-instructor')?.value || 'Course Instructor';

    const outputContainer = document.getElementById('report-output-sheet');
    if (!outputContainer) return;

    outputContainer.style.display = 'block';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // Gather metrics from Contiguous Sim
    const contigAlloc = document.getElementById('contig-stat-allocated')?.innerText || 'N/A';
    const contigFree = document.getElementById('contig-stat-free')?.innerText || 'N/A';
    const contigUtil = document.getElementById('contig-stat-util')?.innerText || 'N/A';
    const contigExtFrag = document.getElementById('contig-stat-ext-frag')?.innerText || '0 KB';
    const contigIntFrag = document.getElementById('contig-stat-int-frag')?.innerText || '0 KB';

    // Gather metrics from Page Replacement Sim
    const prRefStr = document.getElementById('pr-ref-string')?.value || 'N/A';
    const prFrames = document.getElementById('pr-frames')?.value || '3';
    const prHits = document.getElementById('pr-stat-hits')?.innerText || '0';
    const prFaults = document.getElementById('pr-stat-faults')?.innerText || '0';
    const prHitRatio = document.getElementById('pr-stat-hit-ratio')?.innerText || '0%';

    // Gather metrics from TLB & EMAT
    const ematVal = document.getElementById('emat-result-val')?.innerText || 'N/A';
    const ematHitRatio = document.getElementById('emat-hit-ratio-val')?.innerText || '90%';

    outputContainer.innerHTML = `
      <div style="background:var(--bg-card); border:2px solid var(--border-color); border-radius:var(--radius-lg); padding:2.5rem; max-width:900px; margin:0 auto; box-shadow:var(--shadow-lg);">
        
        <!-- Header Banner -->
        <div style="text-align:center; border-bottom:2px solid var(--accent-cyan); padding-bottom:1.5rem; margin-bottom:2rem;">
          <h2 style="font-size:1.6rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">
            LABORATORY PROJECT REPORT
          </h2>
          <div style="font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">
            Operating System Memory Management System Simulation & Analysis
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem;">
            Generated on: ${dateStr}
          </div>
        </div>

        <!-- Student & Course Details Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:2rem; font-size:0.9rem;">
          <tr>
            <td style="padding:0.4rem 0; width:50%;"><strong>Student Name:</strong> ${studentName}</td>
            <td style="padding:0.4rem 0; width:50%;"><strong>Course / Subject:</strong> ${course}</td>
          </tr>
          <tr>
            <td style="padding:0.4rem 0;"><strong>Roll / Registration No:</strong> ${rollNo}</td>
            <td style="padding:0.4rem 0;"><strong>Evaluator / Instructor:</strong> ${instructor}</td>
          </tr>
        </table>

        <!-- Section 1: Executive Abstract -->
        <div style="margin-bottom:1.8rem;">
          <h3 style="font-size:1.15rem; color:var(--accent-cyan); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.75rem;">
            1. Project Executive Summary
          </h3>
          <p style="font-size:0.88rem; color:var(--text-muted); line-height:1.6;">
            This project provides an interactive simulation and analysis of core memory management concepts in modern operating systems. The test suite evaluates contiguous allocation policies (First Fit, Best Fit, Worst Fit, Next Fit), non-contiguous paging with Translation Lookaside Buffer (TLB) caching, logical-to-physical address translation, boundary-checked segmentation, page replacement algorithms (FIFO, LRU, Optimal, LFU, Clock), Belady's Anomaly validation, and thrashing under the Working Set model.
          </p>
        </div>

        <!-- Section 2: Contiguous Allocation Results -->
        <div style="margin-bottom:1.8rem;">
          <h3 style="font-size:1.15rem; color:var(--accent-cyan); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.75rem;">
            2. Contiguous Memory Allocation Benchmark
          </h3>
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem; font-family:var(--font-mono); margin-bottom:0.8rem;">
            <thead>
              <tr style="background:var(--bg-secondary); border-bottom:1px solid var(--border-color);">
                <th style="padding:0.5rem; text-align:left;">Parameter</th>
                <th style="padding:0.5rem; text-align:right;">Simulated Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:0.4rem;">Total Memory Allocated:</td><td style="text-align:right; font-weight:700;">${contigAlloc}</td></tr>
              <tr><td style="padding:0.4rem;">Total Free Memory:</td><td style="text-align:right; font-weight:700;">${contigFree}</td></tr>
              <tr><td style="padding:0.4rem;">Memory Utilization:</td><td style="text-align:right; font-weight:700; color:var(--accent-cyan)">${contigUtil}</td></tr>
              <tr><td style="padding:0.4rem;">External Fragmentation:</td><td style="text-align:right; font-weight:700; color:var(--accent-rose)">${contigExtFrag}</td></tr>
              <tr><td style="padding:0.4rem;">Internal Fragmentation:</td><td style="text-align:right; font-weight:700; color:var(--accent-amber)">${contigIntFrag}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Section 3: Page Replacement Results -->
        <div style="margin-bottom:1.8rem;">
          <h3 style="font-size:1.15rem; color:var(--accent-cyan); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.75rem;">
            3. Virtual Memory & Page Replacement Evaluation
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
            Reference String: <code style="color:var(--accent-cyan)">${prRefStr}</code> | Allocated Frames: <strong>${prFrames}</strong>
          </p>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:1rem;">
            <div class="stat-box" style="padding:0.75rem;">
              <span class="stat-label">Total Faults</span>
              <span class="stat-value rose">${prFaults}</span>
            </div>
            <div class="stat-box" style="padding:0.75rem;">
              <span class="stat-label">Total Hits</span>
              <span class="stat-value emerald">${prHits}</span>
            </div>
            <div class="stat-box" style="padding:0.75rem;">
              <span class="stat-label">Hit Ratio</span>
              <span class="stat-value cyan">${prHitRatio}</span>
            </div>
          </div>
        </div>

        <!-- Section 4: TLB & Effective Memory Access Time -->
        <div style="margin-bottom:1.8rem;">
          <h3 style="font-size:1.15rem; color:var(--accent-cyan); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.75rem;">
            4. Address Translation & Memory Latency (EMAT)
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">
            With a TLB Hit Ratio of <strong>${ematHitRatio}</strong>, the calculated Effective Memory Access Time (EMAT) is:
            <strong style="color:var(--accent-cyan); font-size:1.1rem; font-family:var(--font-mono); display:block; margin-top:4px;">
              EMAT = ${ematVal}
            </strong>
          </p>
        </div>

        <!-- Section 5: Signature & Verification -->
        <div style="margin-top:3rem; padding-top:1.5rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.85rem;">
          <div>
            <div>_____________________________</div>
            <div style="margin-top:4px; color:var(--text-muted)">Student Signature</div>
          </div>
          <div style="text-align:right;">
            <div>_____________________________</div>
            <div style="margin-top:4px; color:var(--text-muted)">Faculty / Evaluator Signature</div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('report-print-btn').style.display = 'inline-flex';
    outputContainer.scrollIntoView({ behavior: 'smooth' });
  }

  return {
    init,
    generateReport
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  ReportGenerator.init();
});
