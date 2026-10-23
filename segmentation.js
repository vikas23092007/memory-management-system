/**
 * ===================================================================
 * OS Memory Management - Segmentation Simulator Module
 * Features:
 *  - Segment Table (Base, Limit, Permissions)
 *  - Logical to Physical Address Translation: <Segment s, Offset d>
 *  - Boundary Check & Segmentation Fault Trap Demonstration
 *  - Physical Memory Segment Allocation Map
 * ===================================================================
 */

const SegmentationSim = (function() {
  // Physical memory size for segmentation demo
  const TOTAL_PHYSICAL_MEM = 5000; // in bytes

  // Default Segment Table: [Segment No, Segment Name, Base Address, Limit, Permission]
  let segmentTable = [
    { id: 0, name: 'Main Code Segment', base: 1400, limit: 1000, perm: 'Read/Execute', color: '#3b82f6' },
    { id: 1, name: 'Call Stack Segment', base: 6300, limit: 400, perm: 'Read/Write', color: '#10b981' },
    { id: 2, name: 'Symbol Table', base: 4300, limit: 400, perm: 'Read Only', color: '#f59e0b' },
    { id: 3, name: 'Standard Library', base: 3200, limit: 1100, perm: 'Read/Execute', color: '#8b5cf6' },
    { id: 4, name: 'Heap / Dynamic Data', base: 4700, limit: 1000, perm: 'Read/Write', color: '#ec4899' }
  ];

  function init() {
    setupEventListeners();
    renderSegmentTable();
    renderPhysicalMemoryMap();
  }

  function setupEventListeners() {
    document.getElementById('seg-translate-btn')?.addEventListener('click', translateSegmentAddress);

    // Preset tests
    document.getElementById('seg-valid-test-btn')?.addEventListener('click', () => {
      document.getElementById('seg-num-input').value = 0;
      document.getElementById('seg-offset-input').value = 450; // 450 < 1000 -> Valid!
      translateSegmentAddress();
    });

    document.getElementById('seg-fault-test-btn')?.addEventListener('click', () => {
      document.getElementById('seg-num-input').value = 0;
      document.getElementById('seg-offset-input').value = 1200; // 1200 >= 1000 -> Fault!
      translateSegmentAddress();
    });

    document.getElementById('seg-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      addNewSegment();
    });
  }

  function renderSegmentTable() {
    const tbody = document.getElementById('seg-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    segmentTable.forEach(seg => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:${seg.color}">s = ${seg.id}</td>
        <td><strong>${seg.name}</strong></td>
        <td style="font-family:var(--font-mono); color:var(--accent-purple)">${seg.base}</td>
        <td style="font-family:var(--font-mono); color:var(--accent-amber)">${seg.limit}</td>
        <td style="font-size:0.8rem; color:var(--text-muted)">${seg.perm}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="SegmentationSim.testSegment(${seg.id})" style="font-size:0.7rem; padding:2px 8px">
            Select
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Populate segment dropdown
    const select = document.getElementById('seg-num-input');
    if (select) {
      select.innerHTML = '';
      segmentTable.forEach(seg => {
        const opt = document.createElement('option');
        opt.value = seg.id;
        opt.innerText = `Segment ${seg.id} (${seg.name} - Limit: ${seg.limit})`;
        select.appendChild(opt);
      });
    }
  }

  function renderPhysicalMemoryMap() {
    const mapContainer = document.getElementById('seg-phys-map');
    if (!mapContainer) return;

    mapContainer.innerHTML = '';

    // Sort segments by base address to show layout in physical RAM
    const sorted = [...segmentTable].sort((a, b) => a.base - b.base);

    sorted.forEach(seg => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--bg-secondary);
        border-left: 4px solid ${seg.color};
        padding: 0.6rem 0.85rem;
        border-radius: var(--radius-sm);
        margin-bottom: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 0.82rem;
      `;
      card.innerHTML = `
        <div>
          <strong style="color:${seg.color}">Segment ${seg.id}</strong> (${seg.name})
          <div style="font-size:0.72rem; color:var(--text-dim)">Limit: ${seg.limit} B | ${seg.perm}</div>
        </div>
        <div style="text-align:right">
          <span style="color:var(--accent-cyan)">[${seg.base} - ${seg.base + seg.limit - 1}]</span>
        </div>
      `;
      mapContainer.appendChild(card);
    });
  }

  function testSegment(segId) {
    const seg = segmentTable.find(s => s.id === segId);
    if (!seg) return;
    document.getElementById('seg-num-input').value = seg.id;
    document.getElementById('seg-offset-input').value = Math.floor(seg.limit / 2);
    translateSegmentAddress();
  }

  function translateSegmentAddress() {
    const segId = parseInt(document.getElementById('seg-num-input')?.value, 10);
    const offset = parseInt(document.getElementById('seg-offset-input')?.value, 10);

    const resultBox = document.getElementById('seg-result-box');
    if (!resultBox) return;
    resultBox.style.display = 'block';

    if (isNaN(segId) || isNaN(offset) || offset < 0) {
      alert('Please enter a valid segment number and non-negative offset.');
      return;
    }

    const seg = segmentTable.find(s => s.id === segId);

    // Check 1: Does segment exist?
    if (!seg) {
      resultBox.innerHTML = `
        <div style="padding:1.2rem; background: rgba(244, 63, 94, 0.1); border:1px solid rgba(244, 63, 94, 0.4); border-radius:var(--radius-md);">
          <strong style="color:var(--accent-rose)">❌ TRAP: ILLEGAL SEGMENT NUMBER!</strong><br>
          Segment ${segId} exceeds the Segment Table Length Register (STLR). Process aborted.
        </div>
      `;
      return;
    }

    // Check 2: Boundary validation: Is offset < limit?
    if (offset >= seg.limit) {
      // SEGMENTATION FAULT!
      resultBox.innerHTML = `
        <div style="padding:1.2rem; background: rgba(244, 63, 94, 0.12); border:1px solid rgba(244, 63, 94, 0.5); border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:1.15rem; font-weight:800; color:var(--accent-rose)">
              🛑 CRITICAL TRAP: SEGMENTATION FAULT (SIGSEGV)!
            </span>
            <span class="badge" style="background:rgba(244,63,94,0.25); color:#fb7185">Access Violation</span>
          </div>
          <p style="font-size:0.88rem; color:#fca5a5; margin-bottom:0.8rem; line-height:1.5">
            <strong>Boundary Check Failed:</strong> Offset (<strong>${offset}</strong>) ≥ Segment Limit (<strong>${seg.limit}</strong>) for <strong>${seg.name} (Segment ${seg.id})</strong>.
          </p>
          <div style="font-family:var(--font-mono); font-size:0.82rem; background:#0b111e; padding:0.85rem; border-radius:var(--radius-sm); color:#e2e8f0; line-height:1.6">
            <strong>Hardware MMU Validation Sequence:</strong><br>
            1. Look up Segment Table Entry for Segment <strong style="color:var(--accent-cyan)">${seg.id}</strong>.<br>
            2. Retrieve Base = <strong style="color:var(--accent-purple)">${seg.base}</strong>, Limit = <strong style="color:var(--accent-amber)">${seg.limit}</strong>.<br>
            3. Hardware Comparator checks condition: <code>offset &lt; limit</code><br>
            &nbsp;&nbsp;&nbsp;&nbsp;Evaluated: <code>${offset} &lt; ${seg.limit}</code> ➔ <strong style="color:var(--accent-rose)">FALSE!</strong><br>
            4. MMU asserts TRAP signal to CPU.<br>
            5. OS Kernel intercepts trap, raises <code>SIGSEGV (Signal 11: Segmentation Violation)</code>, and terminates the offending process to protect system memory!
          </div>
        </div>
      `;
    } else {
      // VALID TRANSLATION!
      const physicalAddr = seg.base + offset;
      resultBox.innerHTML = `
        <div style="padding:1.2rem; background: rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:1.15rem; font-weight:700; color:var(--accent-emerald)">
              ✅ Valid Segmentation Access!
            </span>
            <span class="badge badge-green">Memory Bounds OK</span>
          </div>
          <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:0.8rem">
            Logical Address: <strong>&lt;Segment ${seg.id}, Offset ${offset}&gt;</strong> in <strong>${seg.name}</strong>.
          </p>
          <div style="font-family:var(--font-mono); font-size:0.85rem; background:#0b111e; padding:0.85rem; border-radius:var(--radius-sm); color:#e2e8f0; line-height:1.6">
            <strong>Translation Calculation:</strong><br>
            1. Boundary Check: <code>Offset (${offset}) &lt; Limit (${seg.limit})</code> ➔ <strong style="color:var(--accent-emerald)">TRUE (Valid)</strong><br>
            2. Base Address = <strong style="color:var(--accent-purple)">${seg.base}</strong><br>
            3. Physical Address = Base + Offset = ${seg.base} + ${offset} = <strong style="color:var(--accent-emerald); font-size:1.1rem">${physicalAddr}</strong> (0x${physicalAddr.toString(16).toUpperCase()})<br>
            4. Access Permissions: <span class="badge badge-cyan" style="font-size:0.7rem">${seg.perm}</span>
          </div>
        </div>
      `;
    }
  }

  return {
    init,
    translateSegmentAddress,
    testSegment
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  SegmentationSim.init();
});
