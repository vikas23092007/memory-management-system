/**
 * ===================================================================
 * OS Memory Management - Paging, Address Translation & TLB Module
 * Features:
 *  - Logical to Physical Address Translation (Decimal, Hex, Binary)
 *  - Interactive Page Table (Valid/Invalid, Read/Write bits)
 *  - TLB Cache Simulation (Hit / Miss)
 *  - Effective Memory Access Time (EMAT) Formula derivation & Sliders
 *  - Multi-level Paging Bit Distribution
 * ===================================================================
 */

const PagingTlbSim = (function() {
  // Configuration State
  let logicalSpaceKB = 64;   // 64 KB -> 16-bit logical address (2^16)
  let pageSizeKB = 4;        // 4 KB -> 12-bit offset (2^12 = 4096 bytes)
  let physicalMemoryKB = 128; // 128 KB -> 17-bit physical address

  // Page Table: array of { pageNum, frameNum, valid, permission }
  let pageTable = [];

  // TLB Cache: array of { pageNum, frameNum, valid, lastAccessed }
  const TLB_CAPACITY = 4;
  let tlbEntries = [];

  // Access history log
  let translationHistory = [];

  function init() {
    setupDefaultPageTable();
    setupEventListeners();
    calculateAddressArchitecture();
    calculateEMAT();
  }

  function setupDefaultPageTable() {
    const numPages = logicalSpaceKB / pageSizeKB;
    const numFrames = physicalMemoryKB / pageSizeKB;

    pageTable = [];
    tlbEntries = [];

    // Prepopulate realistic page table
    const frameAssignments = [5, 12, 1, 8, 22, 14, 3, 19, 7, 10, 31, 2, 9, 15, 20, 25];

    for (let p = 0; p < numPages; p++) {
      const isValid = p < 8; // first 8 pages are mapped
      pageTable.push({
        pageNum: p,
        frameNum: isValid ? (frameAssignments[p % frameAssignments.length] % numFrames) : null,
        valid: isValid,
        permission: p === 0 ? 'Read Only (Code)' : 'Read/Write (Data)'
      });
    }

    // Seed initial TLB with 2 entries
    tlbEntries = [
      { pageNum: 0, frameNum: pageTable[0].frameNum, valid: true, accessTime: 1 },
      { pageNum: 1, frameNum: pageTable[1].frameNum, valid: true, accessTime: 2 }
    ];

    renderPageTable();
    renderTLBTable();
  }

  function setupEventListeners() {
    document.getElementById('paging-translate-btn')?.addEventListener('click', performTranslation);
    document.getElementById('paging-random-addr-btn')?.addEventListener('click', () => {
      const maxAddr = logicalSpaceKB * 1024 - 1;
      const randAddr = Math.floor(Math.random() * maxAddr);
      document.getElementById('paging-logical-input').value = randAddr;
      performTranslation();
    });

    // Architecture config changes
    document.getElementById('paging-page-size')?.addEventListener('change', (e) => {
      pageSizeKB = parseInt(e.target.value, 10);
      setupDefaultPageTable();
      calculateAddressArchitecture();
    });

    document.getElementById('paging-log-space')?.addEventListener('change', (e) => {
      logicalSpaceKB = parseInt(e.target.value, 10);
      setupDefaultPageTable();
      calculateAddressArchitecture();
    });

    document.getElementById('paging-phys-mem')?.addEventListener('change', (e) => {
      physicalMemoryKB = parseInt(e.target.value, 10);
      setupDefaultPageTable();
      calculateAddressArchitecture();
    });

    // EMAT Sliders
    ['emat-hit-ratio', 'emat-tlb-time', 'emat-ram-time', 'emat-levels'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', calculateEMAT);
    });

    // Add TLB flush button
    document.getElementById('tlb-flush-btn')?.addEventListener('click', () => {
      tlbEntries = [];
      renderTLBTable();
      addTranslationLog('🧹 TLB cache flushed (all entries invalidated).');
    });
  }

  /**
   * Computes bits breakdown:
   * Total bits = log2(Logical Space in Bytes)
   * Offset bits d = log2(Page Size in Bytes)
   * Page bits p = Total bits - d
   */
  function calculateAddressArchitecture() {
    const logicalBytes = logicalSpaceKB * 1024;
    const pageBytes = pageSizeKB * 1024;
    const physicalBytes = physicalMemoryKB * 1024;

    const totalLogBits = Math.round(Math.log2(logicalBytes));
    const offsetBits = Math.round(Math.log2(pageBytes));
    const pageBits = totalLogBits - offsetBits;

    const totalPhysBits = Math.round(Math.log2(physicalBytes));
    const frameBits = totalPhysBits - offsetBits;

    const numPages = logicalBytes / pageBytes;
    const numFrames = physicalBytes / pageBytes;

    const archInfoEl = document.getElementById('paging-arch-summary');
    if (archInfoEl) {
      archInfoEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
          <div class="stat-box">
            <span class="stat-label">Logical Address Space</span>
            <span class="stat-value cyan">${totalLogBits} bits <span style="font-size:0.8rem">(${logicalSpaceKB} KB)</span></span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px">
              Page Bits (p): <strong>${pageBits}</strong> | Offset Bits (d): <strong>${offsetBits}</strong>
            </span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Physical Address Space</span>
            <span class="stat-value emerald">${totalPhysBits} bits <span style="font-size:0.8rem">(${physicalMemoryKB} KB)</span></span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px">
              Frame Bits (f): <strong>${frameBits}</strong> | Offset Bits (d): <strong>${offsetBits}</strong>
            </span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Total Pages / Frames</span>
            <span class="stat-value amber">${numPages} p / ${numFrames} f</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px">
              Page Size: <strong>${pageSizeKB} KB</strong> (${pageBytes} B)
            </span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Performs address translation for user input
   */
  function performTranslation() {
    const inputStr = document.getElementById('paging-logical-input')?.value.trim();
    if (!inputStr) {
      alert('Please enter a logical address.');
      return;
    }

    let logicalAddr;
    if (inputStr.startsWith('0x') || inputStr.startsWith('0X')) {
      logicalAddr = parseInt(inputStr, 16);
    } else {
      logicalAddr = parseInt(inputStr, 10);
    }

    const maxLogicalAddr = logicalSpaceKB * 1024 - 1;
    if (isNaN(logicalAddr) || logicalAddr < 0 || logicalAddr > maxLogicalAddr) {
      alert(`Invalid Address! Must be between 0 and ${maxLogicalAddr} (0x${maxLogicalAddr.toString(16).toUpperCase()}).`);
      return;
    }

    const pageSizeBytes = pageSizeKB * 1024;
    const pageNum = Math.floor(logicalAddr / pageSizeBytes);
    const offset = logicalAddr % pageSizeBytes;

    const offsetBits = Math.round(Math.log2(pageSizeBytes));
    const totalLogBits = Math.round(Math.log2(logicalSpaceKB * 1024));
    const pageBits = totalLogBits - offsetBits;

    // Check TLB first
    let tlbHit = false;
    let frameNum = null;
    let tlbEntryIndex = tlbEntries.findIndex(e => e.valid && e.pageNum === pageNum);

    if (tlbEntryIndex !== -1) {
      tlbHit = true;
      frameNum = tlbEntries[tlbEntryIndex].frameNum;
      tlbEntries[tlbEntryIndex].accessTime = Date.now();
    } else {
      // TLB Miss -> Look into Page Table
      const ptEntry = pageTable.find(e => e.pageNum === pageNum);
      if (!ptEntry || !ptEntry.valid) {
        // Page Fault!
        renderPageFaultResult(logicalAddr, pageNum, offset);
        return;
      }
      frameNum = ptEntry.frameNum;

      // Update TLB cache (FIFO / LRU replacement)
      insertIntoTLB(pageNum, frameNum);
    }

    const physicalAddr = (frameNum * pageSizeBytes) + offset;

    // Binary representations
    const pBin = pageNum.toString(2).padStart(pageBits, '0');
    const dBin = offset.toString(2).padStart(offsetBits, '0');
    const totalPhysBits = Math.round(Math.log2(physicalMemoryKB * 1024));
    const frameBits = totalPhysBits - offsetBits;
    const fBin = frameNum.toString(2).padStart(frameBits, '0');

    renderSuccessResult({
      logicalAddr,
      pageNum,
      offset,
      frameNum,
      physicalAddr,
      pBin,
      dBin,
      fBin,
      tlbHit
    });

    renderTLBTable();
  }

  function insertIntoTLB(pageNum, frameNum) {
    if (tlbEntries.length < TLB_CAPACITY) {
      tlbEntries.push({ pageNum, frameNum, valid: true, accessTime: Date.now() });
    } else {
      // LRU replace oldest accessTime
      let oldestIdx = 0;
      let oldestTime = tlbEntries[0].accessTime;
      for (let i = 1; i < tlbEntries.length; i++) {
        if (tlbEntries[i].accessTime < oldestTime) {
          oldestTime = tlbEntries[i].accessTime;
          oldestIdx = i;
        }
      }
      tlbEntries[oldestIdx] = { pageNum, frameNum, valid: true, accessTime: Date.now() };
    }
  }

  function renderSuccessResult(res) {
    const resultBox = document.getElementById('paging-result-container');
    if (!resultBox) return;

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="padding:1.2rem; background: rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem">
          <span style="font-size:1.1rem; font-weight:700; color:var(--accent-emerald)">
            ✅ Address Translation Successful!
          </span>
          <span class="badge ${res.tlbHit ? 'badge-green' : 'badge-amber'}">
            ${res.tlbHit ? '⚡ TLB HIT' : '🔄 TLB MISS (Page Table Resolved)'}
          </span>
        </div>

        <!-- Visual Address Breakdown -->
        <div style="display:grid; grid-template-columns: 1fr auto 1fr; align-items:center; gap:1rem; margin-bottom:1.2rem;">
          <!-- Logical Address -->
          <div style="background:var(--bg-secondary); padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Logical Address</div>
            <div style="font-size:1.2rem; font-family:var(--font-mono); font-weight:700; color:var(--accent-cyan)">
              ${res.logicalAddr} <span style="font-size:0.8rem; color:var(--text-muted)">(0x${res.logicalAddr.toString(16).toUpperCase()})</span>
            </div>
            <div class="addr-split-box">
              <div class="addr-part page-num" style="flex:1">
                <span class="addr-part-lbl">Page (p)</span>
                <strong>${res.pageNum}</strong>
                <span style="font-size:0.65rem">${res.pBin}₂</span>
              </div>
              <div class="addr-part offset-num" style="flex:1">
                <span class="addr-part-lbl">Offset (d)</span>
                <strong>${res.offset}</strong>
                <span style="font-size:0.65rem">${res.dBin}₂</span>
              </div>
            </div>
          </div>

          <!-- Arrow -->
          <div style="font-size:1.5rem; color:var(--accent-cyan); font-weight:700;">➔</div>

          <!-- Physical Address -->
          <div style="background:var(--bg-secondary); padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Physical Address</div>
            <div style="font-size:1.2rem; font-family:var(--font-mono); font-weight:700; color:var(--accent-emerald)">
              ${res.physicalAddr} <span style="font-size:0.8rem; color:var(--text-muted)">(0x${res.physicalAddr.toString(16).toUpperCase()})</span>
            </div>
            <div class="addr-split-box">
              <div class="addr-part frame-num" style="flex:1">
                <span class="addr-part-lbl">Frame (f)</span>
                <strong>${res.frameNum}</strong>
                <span style="font-size:0.65rem">${res.fBin}₂</span>
              </div>
              <div class="addr-part offset-num" style="flex:1">
                <span class="addr-part-lbl">Offset (d)</span>
                <strong>${res.offset}</strong>
                <span style="font-size:0.65rem">${res.dBin}₂</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mathematical Derivation -->
        <div style="font-family:var(--font-mono); font-size:0.82rem; background:#0b111e; padding:0.85rem; border-radius:var(--radius-sm); color:#e2e8f0; line-height:1.6">
          <strong>Step-by-Step Translation Formula:</strong><br>
          1. Page Number p = ⌊Logical Address / Page Size⌋ = ⌊${res.logicalAddr} / ${pageSizeKB * 1024}⌋ = <strong style="color:var(--accent-cyan)">${res.pageNum}</strong><br>
          2. Offset d = Logical Address mod Page Size = ${res.logicalAddr} mod ${pageSizeKB * 1024} = <strong style="color:var(--accent-emerald)">${res.offset}</strong><br>
          3. ${res.tlbHit ? 'TLB Lookup: Hit! Frame Number =' : 'Page Table Lookup: Page ' + res.pageNum + ' is valid. Frame Number ='} <strong style="color:var(--accent-purple)">${res.frameNum}</strong><br>
          4. Physical Address = (Frame Number × Frame Size) + Offset = (${res.frameNum} × ${pageSizeKB * 1024}) + ${res.offset} = <strong style="color:var(--accent-emerald); font-size:0.95rem">${res.physicalAddr}</strong> (0x${res.physicalAddr.toString(16).toUpperCase()})
        </div>
      </div>
    `;

    addTranslationLog(`Translated Logical ${res.logicalAddr} ➔ Physical ${res.physicalAddr} [Frame ${res.frameNum}, Offset ${res.offset}] (${res.tlbHit ? 'TLB Hit' : 'TLB Miss'})`);
  }

  function renderPageFaultResult(addr, p, d) {
    const resultBox = document.getElementById('paging-result-container');
    if (!resultBox) return;

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="padding:1.2rem; background: rgba(244, 63, 94, 0.1); border:1px solid rgba(244, 63, 94, 0.4); border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-size:1.15rem; font-weight:700; color:var(--accent-rose)">
            ⚠️ PAGE FAULT TRAP EXCEPTION!
          </span>
          <span class="badge" style="background:rgba(244,63,94,0.2); color:#fb7185">Valid Bit = 0</span>
        </div>
        <p style="font-size:0.88rem; color:#f87171; line-height:1.5; margin-bottom:0.75rem;">
          Logical address <strong>${addr}</strong> maps to <strong>Page ${p}</strong>. In the Page Table, Page ${p} is marked as <strong>INVALID (Not in RAM)</strong>!
        </p>
        <div style="font-family:var(--font-mono); font-size:0.8rem; background:#0b111e; padding:0.75rem; border-radius:var(--radius-sm); color:#cbd5e1; line-height:1.5">
          <strong>OS Interrupt Handling Sequence:</strong><br>
          1. CPU detects Invalid bit and raises Page Fault Interrupt to OS kernel.<br>
          2. OS looks up backing store (Swap space / Disk) for Page ${p}.<br>
          3. OS finds a free physical frame (or executes a Page Replacement algorithm like LRU/FIFO).<br>
          4. OS issues I/O read to fetch Page ${p} into physical memory.<br>
          5. Page Table is updated (Valid bit = 1, Frame Number assigned).<br>
          6. Instruction is restarted by CPU!
        </div>
      </div>
    `;

    addTranslationLog(`⚠️ Page Fault on Address ${addr} (Page ${p} is invalid/not in RAM)`);
  }

  function renderPageTable() {
    const tbody = document.getElementById('paging-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    pageTable.forEach(entry => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--accent-cyan)">${entry.pageNum}</td>
        <td>${entry.valid ? `<strong style="color:var(--accent-purple)">Frame ${entry.frameNum}</strong>` : '<span style="color:var(--text-dim)">-</span>'}</td>
        <td>
          <span class="badge ${entry.valid ? 'badge-green' : 'badge-rose'}" style="font-size:0.7rem">
            ${entry.valid ? '1 (Valid)' : '0 (Invalid)'}
          </span>
        </td>
        <td style="font-size:0.78rem; color:var(--text-muted)">${entry.permission}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="PagingTlbSim.togglePageValid(${entry.pageNum})" style="font-size:0.7rem; padding:2px 6px">
            Toggle
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function togglePageValid(pNum) {
    const entry = pageTable.find(e => e.pageNum === pNum);
    if (!entry) return;
    entry.valid = !entry.valid;
    if (entry.valid && entry.frameNum === null) {
      entry.frameNum = Math.floor(Math.random() * (physicalMemoryKB / pageSizeKB));
    }
    renderPageTable();
  }

  function renderTLBTable() {
    const tbody = document.getElementById('tlb-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    for (let i = 0; i < TLB_CAPACITY; i++) {
      const entry = tlbEntries[i];
      const tr = document.createElement('tr');
      if (entry && entry.valid) {
        tr.innerHTML = `
          <td>TLB #${i}</td>
          <td style="font-weight:700; color:var(--accent-cyan)">Page ${entry.pageNum}</td>
          <td style="font-weight:700; color:var(--accent-purple)">Frame ${entry.frameNum}</td>
          <td><span class="badge badge-green" style="font-size:0.7rem">Valid</span></td>
        `;
      } else {
        tr.innerHTML = `
          <td style="color:var(--text-dim)">TLB #${i}</td>
          <td style="color:var(--text-dim)">-</td>
          <td style="color:var(--text-dim)">-</td>
          <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-dim); font-size:0.7rem">Empty</span></td>
        `;
      }
      tbody.appendChild(tr);
    }
  }

  /**
   * Effective Memory Access Time (EMAT) Calculation
   * Formula:
   * EMAT = alpha * (t_TLB + t_RAM) + (1 - alpha) * (t_TLB + (levels + 1) * t_RAM)
   */
  function calculateEMAT() {
    const hitRatioInput = document.getElementById('emat-hit-ratio');
    const tlbTimeInput = document.getElementById('emat-tlb-time');
    const ramTimeInput = document.getElementById('emat-ram-time');
    const levelsInput = document.getElementById('emat-levels');

    if (!hitRatioInput || !tlbTimeInput || !ramTimeInput || !levelsInput) return;

    const hitRatio = parseFloat(hitRatioInput.value) / 100; // e.g. 0.90
    const tlbTime = parseFloat(tlbTimeInput.value);         // e.g. 20 ns
    const ramTime = parseFloat(ramTimeInput.value);         // e.g. 100 ns
    const levels = parseInt(levelsInput.value, 10);         // 1, 2, or 3

    // Labels update
    document.getElementById('emat-hit-ratio-val').innerText = `${Math.round(hitRatio * 100)}%`;
    document.getElementById('emat-tlb-time-val').innerText = `${tlbTime} ns`;
    document.getElementById('emat-ram-time-val').innerText = `${ramTime} ns`;
    document.getElementById('emat-levels-val').innerText = `${levels}-Level`;

    // Formula execution
    // Hit case: 1 TLB lookup + 1 Memory access (for actual data) = (tlbTime + ramTime)
    // Miss case: 1 TLB lookup + 'levels' memory accesses (for page table walk) + 1 access (for data)
    //          = tlbTime + (levels + 1) * ramTime
    const hitTime = tlbTime + ramTime;
    const missTime = tlbTime + (levels + 1) * ramTime;
    const emat = (hitRatio * hitTime) + ((1 - hitRatio) * missTime);

    // Speedup vs No TLB
    const noTlbTime = (levels + 1) * ramTime;
    const slowdownPct = (((emat - ramTime) / ramTime) * 100).toFixed(1);

    const ematValEl = document.getElementById('emat-result-val');
    const ematDerivEl = document.getElementById('emat-derivation-text');

    if (ematValEl) {
      ematValEl.innerText = `${emat.toFixed(2)} ns`;
    }

    if (ematDerivEl) {
      ematDerivEl.innerHTML = `
        <strong>Mathematical Derivation:</strong><br>
        • Hit Time = t<sub>TLB</sub> + t<sub>RAM</sub> = ${tlbTime} + ${ramTime} = <strong>${hitTime} ns</strong><br>
        • Miss Time = t<sub>TLB</sub> + (${levels} + 1) × t<sub>RAM</sub> = ${tlbTime} + (${levels + 1} × ${ramTime}) = <strong>${missTime} ns</strong><br>
        • EMAT = [α × Hit Time] + [(1 - α) × Miss Time]<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= [${hitRatio.toFixed(2)} × ${hitTime}] + [${(1 - hitRatio).toFixed(2)} × ${missTime}] = <strong style="color:var(--accent-cyan); font-size:1.05rem">${emat.toFixed(2)} ns</strong><br>
        <span style="font-size:0.75rem; color:var(--text-muted)">
          (Without TLB, access time would be ${(levels + 1) * ramTime} ns. TLB saves ${(((noTlbTime - emat) / noTlbTime) * 100).toFixed(1)}% memory latency!)
        </span>
      `;
    }
  }

  function addTranslationLog(msg) {
    translationHistory.unshift({
      time: new Date().toLocaleTimeString(),
      msg: msg
    });
    if (translationHistory.length > 20) translationHistory.pop();
    updateTranslationLogView();
  }

  function updateTranslationLogView() {
    const logBox = document.getElementById('paging-log-box');
    if (!logBox) return;
    if (translationHistory.length === 0) {
      logBox.innerHTML = '<span class="text-dim">No translations executed yet.</span>';
      return;
    }
    const latest = translationHistory[0];
    logBox.innerHTML = `<span><strong style="color: var(--accent-cyan); font-family: var(--font-mono)">[${latest.time}]</strong> ${latest.msg}</span>`;
  }

  return {
    init,
    performTranslation,
    calculateEMAT,
    togglePageValid
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  PagingTlbSim.init();
});
