/**
 * ===================================================================
 * OS Memory Management - Contiguous Memory Allocation Module
 * Supports: First Fit, Best Fit, Worst Fit, Next Fit
 * Partitioning: Dynamic (Variable) & Fixed Partitioning
 * ===================================================================
 */

const ContiguousMemSim = (function() {
  // State
  let totalMemorySize = 1000; // in KB
  let partitionMode = 'dynamic'; // 'dynamic' or 'fixed'
  let algorithm = 'first-fit'; // 'first-fit', 'best-fit', 'worst-fit', 'next-fit'
  let nextFitPointer = 0; // last allocated block index
  let processCounter = 1;

  // Process color palette
  const processColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
    '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
  ];

  // Blocks array
  // Each block: { id, start, size, isFree, processId, internalFrag, color, partitionSize }
  let blocks = [];

  // History log
  let allocationLogs = [];

  function init() {
    resetMemory();
    setupEventListeners();
  }

  function resetMemory() {
    totalMemorySize = parseInt(document.getElementById('contig-total-mem')?.value || '1000', 10);
    partitionMode = document.getElementById('contig-part-mode')?.value || 'dynamic';
    algorithm = document.getElementById('contig-algo')?.value || 'first-fit';
    nextFitPointer = 0;
    processCounter = 1;
    allocationLogs = [];

    if (partitionMode === 'dynamic') {
      // Single continuous free hole of total size
      blocks = [{
        id: 'B0',
        start: 0,
        size: totalMemorySize,
        isFree: true,
        processId: null,
        internalFrag: 0,
        color: null
      }];
    } else {
      // Fixed Partitioning: split into pre-defined partitions (e.g. 5 partitions)
      const partsInput = document.getElementById('contig-fixed-partitions')?.value || '150, 250, 200, 300, 100';
      const partSizes = partsInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
      
      let currentStart = 0;
      blocks = [];
      partSizes.forEach((pSize, idx) => {
        blocks.push({
          id: 'P' + (idx + 1),
          start: currentStart,
          size: pSize,
          partitionSize: pSize,
          isFree: true,
          processId: null,
          internalFrag: 0,
          color: null
        });
        currentStart += pSize;
      });
      totalMemorySize = currentStart;
      const memInput = document.getElementById('contig-total-mem');
      if (memInput) memInput.value = totalMemorySize;
    }

    addLog(`Memory initialized to ${totalMemorySize} KB (${partitionMode === 'dynamic' ? 'Dynamic Variable Partitioning' : 'Fixed Partitioning'}).`);
    render();
  }

  function setupEventListeners() {
    document.getElementById('contig-allocate-btn')?.addEventListener('click', () => {
      const pSize = parseInt(document.getElementById('contig-proc-size').value, 10);
      if (isNaN(pSize) || pSize <= 0) {
        alert('Please enter a valid process size in KB.');
        return;
      }
      const pid = 'P' + processCounter;
      allocateProcess(pid, pSize);
    });

    document.getElementById('contig-deallocate-btn')?.addEventListener('click', () => {
      const pid = document.getElementById('contig-dealloc-pid').value.trim();
      if (!pid) {
        alert('Please select or enter a Process ID to deallocate.');
        return;
      }
      deallocateProcess(pid);
    });

    document.getElementById('contig-compact-btn')?.addEventListener('click', compactMemory);
    document.getElementById('contig-reset-btn')?.addEventListener('click', resetMemory);

    document.getElementById('contig-algo')?.addEventListener('change', (e) => {
      algorithm = e.target.value;
      addLog(`Allocation Algorithm changed to: ${getAlgoName(algorithm)}`);
    });

    document.getElementById('contig-part-mode')?.addEventListener('change', (e) => {
      partitionMode = e.target.value;
      const fixedConfig = document.getElementById('contig-fixed-config');
      if (fixedConfig) {
        fixedConfig.style.display = partitionMode === 'fixed' ? 'block' : 'none';
      }
      resetMemory();
    });

    // Preset buttons
    document.querySelectorAll('.contig-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        loadPreset(preset);
      });
    });
  }

  function getAlgoName(algo) {
    switch (algo) {
      case 'first-fit': return 'First Fit (Earliest hole ≥ Size)';
      case 'best-fit': return 'Best Fit (Smallest hole ≥ Size)';
      case 'worst-fit': return 'Worst Fit (Largest hole ≥ Size)';
      case 'next-fit': return 'Next Fit (First fit starting from last allocated index)';
      default: return algo;
    }
  }

  function allocateProcess(pid, size) {
    if (partitionMode === 'dynamic') {
      allocateDynamic(pid, size);
    } else {
      allocateFixed(pid, size);
    }
    render();
  }

  function allocateDynamic(pid, size) {
    let chosenIdx = -1;

    if (algorithm === 'first-fit') {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          chosenIdx = i;
          break;
        }
      }
    } else if (algorithm === 'best-fit') {
      let minHole = Infinity;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          if (blocks[i].size < minHole) {
            minHole = blocks[i].size;
            chosenIdx = i;
          }
        }
      }
    } else if (algorithm === 'worst-fit') {
      let maxHole = -1;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          if (blocks[i].size > maxHole) {
            maxHole = blocks[i].size;
            chosenIdx = i;
          }
        }
      }
    } else if (algorithm === 'next-fit') {
      const n = blocks.length;
      for (let step = 0; step < n; step++) {
        const idx = (nextFitPointer + step) % n;
        if (blocks[idx].isFree && blocks[idx].size >= size) {
          chosenIdx = idx;
          nextFitPointer = idx;
          break;
        }
      }
    }

    if (chosenIdx === -1) {
      // Check for External Fragmentation
      const totalFree = blocks.filter(b => b.isFree).reduce((acc, b) => acc + b.size, 0);
      if (totalFree >= size) {
        addLog(`❌ Cannot allocate ${pid} (${size} KB): EXTERNAL FRAGMENTATION detected! Total free space is ${totalFree} KB, but no single contiguous hole is large enough. Try "Compaction"!`, 'danger');
      } else {
        addLog(`❌ Cannot allocate ${pid} (${size} KB): Insufficient memory available. Only ${totalFree} KB free in total.`, 'danger');
      }
      return false;
    }

    const hole = blocks[chosenIdx];
    const color = processColors[(processCounter - 1) % processColors.length];

    if (hole.size === size) {
      // Perfect fit
      hole.isFree = false;
      hole.processId = pid;
      hole.color = color;
      hole.internalFrag = 0;
    } else {
      // Split the hole
      const allocatedBlock = {
        id: 'B_' + pid,
        start: hole.start,
        size: size,
        isFree: false,
        processId: pid,
        internalFrag: 0,
        color: color
      };
      const leftoverHole = {
        id: 'H_' + Date.now(),
        start: hole.start + size,
        size: hole.size - size,
        isFree: true,
        processId: null,
        internalFrag: 0,
        color: null
      };
      blocks.splice(chosenIdx, 1, allocatedBlock, leftoverHole);
      nextFitPointer = chosenIdx;
    }

    processCounter++;
    addLog(`✅ Allocated ${pid} (${size} KB) at start address ${hole.start} KB using ${algorithm.toUpperCase()}.`, 'success');
    return true;
  }

  function allocateFixed(pid, size) {
    let chosenIdx = -1;

    if (algorithm === 'first-fit') {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          chosenIdx = i;
          break;
        }
      }
    } else if (algorithm === 'best-fit') {
      let minHole = Infinity;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          if (blocks[i].size < minHole) {
            minHole = blocks[i].size;
            chosenIdx = i;
          }
        }
      }
    } else if (algorithm === 'worst-fit') {
      let maxHole = -1;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isFree && blocks[i].size >= size) {
          if (blocks[i].size > maxHole) {
            maxHole = blocks[i].size;
            chosenIdx = i;
          }
        }
      }
    } else if (algorithm === 'next-fit') {
      const n = blocks.length;
      for (let step = 0; step < n; step++) {
        const idx = (nextFitPointer + step) % n;
        if (blocks[idx].isFree && blocks[idx].size >= size) {
          chosenIdx = idx;
          nextFitPointer = idx;
          break;
        }
      }
    }

    if (chosenIdx === -1) {
      addLog(`❌ Cannot allocate ${pid} (${size} KB): No free partition is large enough.`, 'danger');
      return false;
    }

    const partition = blocks[chosenIdx];
    const color = processColors[(processCounter - 1) % processColors.length];
    partition.isFree = false;
    partition.processId = pid;
    partition.color = color;
    partition.internalFrag = partition.partitionSize - size; // Internal Fragmentation!

    processCounter++;
    addLog(`✅ Allocated ${pid} (${size} KB) into Partition ${partition.id} (${partition.partitionSize} KB). Internal Fragmentation = ${partition.internalFrag} KB.`, 'success');
    return true;
  }

  function deallocateProcess(pid) {
    let found = false;
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].isFree && blocks[i].processId === pid) {
        found = true;
        const freedSize = blocks[i].size;
        blocks[i].isFree = true;
        blocks[i].processId = null;
        blocks[i].color = null;
        blocks[i].internalFrag = 0;

        addLog(`🗑️ Deallocated ${pid} (${freedSize} KB). Memory freed at address ${blocks[i].start} KB.`, 'info');
        break;
      }
    }

    if (!found) {
      addLog(`⚠️ Process ${pid} not found in memory.`, 'warning');
      return;
    }

    // In Dynamic Partitioning: merge adjacent free holes (Coalescing)
    if (partitionMode === 'dynamic') {
      coalesceHoles();
    }

    render();
  }

  function coalesceHoles() {
    let i = 0;
    while (i < blocks.length - 1) {
      if (blocks[i].isFree && blocks[i + 1].isFree) {
        // Merge blocks[i] and blocks[i+1]
        blocks[i].size += blocks[i + 1].size;
        blocks.splice(i + 1, 1);
        addLog(`🔗 Coalesced adjacent free holes at address ${blocks[i].start} KB. New hole size: ${blocks[i].size} KB.`);
      } else {
        i++;
      }
    }
  }

  function compactMemory() {
    if (partitionMode === 'fixed') {
      alert('Compaction is applicable to Dynamic (Variable) Partitioning, not Fixed Partitioning.');
      return;
    }

    const allocated = blocks.filter(b => !b.isFree);
    const freeBlocks = blocks.filter(b => b.isFree);

    if (freeBlocks.length <= 1) {
      addLog(`ℹ️ Compaction skipped: Memory is already contiguous or completely free/full.`);
      return;
    }

    let currentStart = 0;
    const newBlocks = [];

    // Relocate all allocated blocks to the beginning of memory
    allocated.forEach(b => {
      newBlocks.push({
        ...b,
        start: currentStart
      });
      currentStart += b.size;
    });

    // Create a single consolidated free block at the end
    const totalFree = totalMemorySize - currentStart;
    if (totalFree > 0) {
      newBlocks.push({
        id: 'H_compacted',
        start: currentStart,
        size: totalFree,
        isFree: true,
        processId: null,
        internalFrag: 0,
        color: null
      });
    }

    blocks = newBlocks;
    nextFitPointer = 0;
    addLog(`✨ Memory Compaction completed! Combined all free memory into one contiguous hole of ${totalFree} KB at address ${currentStart} KB.`, 'success');
    render();
  }

  function loadPreset(presetName) {
    if (presetName === 'textbook') {
      // Classic Silberschatz Galvin example: Holes of 100K, 500K, 200K, 300K, 600K
      document.getElementById('contig-part-mode').value = 'dynamic';
      partitionMode = 'dynamic';
      totalMemorySize = 1700;
      document.getElementById('contig-total-mem').value = 1700;

      blocks = [
        { id: 'H1', start: 0, size: 100, isFree: true, processId: null, internalFrag: 0, color: null },
        { id: 'H2', start: 100, size: 500, isFree: true, processId: null, internalFrag: 0, color: null },
        { id: 'H3', start: 600, size: 200, isFree: true, processId: null, internalFrag: 0, color: null },
        { id: 'H4', start: 800, size: 300, isFree: true, processId: null, internalFrag: 0, color: null },
        { id: 'H5', start: 1100, size: 600, isFree: true, processId: null, internalFrag: 0, color: null }
      ];
      processCounter = 1;
      allocationLogs = [];
      addLog('📚 Loaded Classic Textbook Preset (Holes: 100K, 500K, 200K, 300K, 600K). Try allocating processes like 212K, 417K, 112K, 426K!');
      render();
    } else if (presetName === 'fragmented') {
      resetMemory();
      // Allocate 5 processes and deallocate alternating ones
      allocateProcess('P1', 150);
      allocateProcess('P2', 200);
      allocateProcess('P3', 150);
      allocateProcess('P4', 250);
      allocateProcess('P5', 100);
      deallocateProcess('P2');
      deallocateProcess('P4');
      addLog('🧩 Loaded Fragmented Memory Scenario! Note the scattered free holes creating External Fragmentation.');
    } else if (presetName === 'fixed-demo') {
      document.getElementById('contig-part-mode').value = 'fixed';
      partitionMode = 'fixed';
      document.getElementById('contig-fixed-config').style.display = 'block';
      document.getElementById('contig-fixed-partitions').value = '100, 200, 300, 400';
      resetMemory();
      allocateProcess('P1', 75);  // creates 25K internal frag
      allocateProcess('P2', 160); // creates 40K internal frag
      addLog('📐 Loaded Fixed Partitioning Demo showing Internal Fragmentation.');
    }
  }

  function addLog(msg, type = 'info') {
    allocationLogs.unshift({
      time: new Date().toLocaleTimeString(),
      msg: msg,
      type: type
    });
    if (allocationLogs.length > 30) allocationLogs.pop();
    updateLogView();
  }

  function updateLogView() {
    const logBox = document.getElementById('contig-log-box');
    if (!logBox) return;
    if (allocationLogs.length === 0) {
      logBox.innerHTML = '<span class="text-dim">No operations recorded yet.</span>';
      return;
    }
    const latest = allocationLogs[0];
    let colorClass = 'text-main';
    if (latest.type === 'danger') colorClass = 'log-fault';
    else if (latest.type === 'success') colorClass = 'log-hit';
    else if (latest.type === 'warning') colorClass = 'stat-value amber';

    logBox.innerHTML = `<span><strong style="color: var(--accent-cyan); font-family: var(--font-mono)">[${latest.time}]</strong> <span class="${colorClass}">${latest.msg}</span></span>`;
  }

  function render() {
    renderMemoryBar();
    renderStats();
    renderProcessTable();
    populateDeallocDropdown();
  }

  function renderMemoryBar() {
    const bar = document.getElementById('contig-mem-bar');
    const addrBar = document.getElementById('contig-addr-bar');
    if (!bar || !addrBar) return;

    bar.innerHTML = '';
    addrBar.innerHTML = '';

    // Calculate total rendered width
    const total = totalMemorySize;

    blocks.forEach((b, idx) => {
      const pct = (b.size / total) * 100;
      const blockEl = document.createElement('div');
      blockEl.className = 'memory-block ' + (b.isFree ? 'free' : 'allocated');
      blockEl.style.width = pct + '%';
      if (!b.isFree && b.color) {
        blockEl.style.backgroundColor = b.color;
      }

      // If there is internal fragmentation in fixed partitioning, render a sub-stripe
      if (b.internalFrag > 0) {
        const fragPct = (b.internalFrag / b.partitionSize) * 100;
        const usedPct = 100 - fragPct;

        blockEl.innerHTML = `
          <div style="display:flex; width:100%; height:100%">
            <div style="width:${usedPct}%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span class="block-label">${b.processId}</span>
              <span class="block-size">${b.size - b.internalFrag} KB</span>
            </div>
            <div class="memory-block internal-frag" style="width:${fragPct}%; height:100%; display:flex; align-items:center; justify-content:center;" title="Internal Fragmentation: ${b.internalFrag} KB">
              <span class="block-size" style="font-size:0.6rem;">${b.internalFrag}K Frag</span>
            </div>
          </div>
        `;
      } else {
        blockEl.innerHTML = `
          <span class="block-label">${b.isFree ? 'FREE' : b.processId}</span>
          <span class="block-size">${b.size} KB</span>
        `;
      }

      blockEl.title = b.isFree 
        ? `Free Hole: ${b.size} KB (Start: ${b.start} KB, End: ${b.start + b.size} KB)`
        : `Process ${b.processId}: ${b.size} KB (Start: ${b.start} KB, End: ${b.start + b.size} KB)${b.internalFrag ? ` | Internal Frag: ${b.internalFrag} KB` : ''}`;

      bar.appendChild(blockEl);
    });

    // Address labels below bar
    addrBar.innerHTML = `<span>0 KB</span>`;
    let accumulated = 0;
    blocks.forEach((b) => {
      accumulated += b.size;
    });
    addrBar.innerHTML += `<span>${accumulated} KB</span>`;
  }

  function renderStats() {
    const totalAllocated = blocks.filter(b => !b.isFree).reduce((acc, b) => acc + (b.size - (b.internalFrag || 0)), 0);
    const totalFree = blocks.filter(b => b.isFree).reduce((acc, b) => acc + b.size, 0);
    const totalInternalFrag = blocks.reduce((acc, b) => acc + (b.internalFrag || 0), 0);
    const freeHolesCount = blocks.filter(b => b.isFree).length;
    
    // External fragmentation exists if there are 2 or more free holes
    const externalFrag = freeHolesCount > 1 ? totalFree : 0;
    const utilization = totalMemorySize > 0 ? ((totalAllocated / totalMemorySize) * 100).toFixed(1) : 0;

    const elAlloc = document.getElementById('contig-stat-allocated');
    const elFree = document.getElementById('contig-stat-free');
    const elUtil = document.getElementById('contig-stat-util');
    const elIntFrag = document.getElementById('contig-stat-int-frag');
    const elExtFrag = document.getElementById('contig-stat-ext-frag');

    if (elAlloc) elAlloc.innerText = `${totalAllocated} KB`;
    if (elFree) elFree.innerText = `${totalFree} KB`;
    if (elUtil) elUtil.innerText = `${utilization}%`;
    if (elIntFrag) elIntFrag.innerText = `${totalInternalFrag} KB`;
    if (elExtFrag) elExtFrag.innerText = `${externalFrag} KB`;
  }

  function renderProcessTable() {
    const tbody = document.getElementById('contig-proc-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const allocated = blocks.filter(b => !b.isFree);

    if (allocated.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-dim" style="padding:1rem;">No processes currently allocated.</td></tr>';
      return;
    }

    allocated.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:${b.color || '#fff'}">${b.processId}</td>
        <td>${b.size - (b.internalFrag || 0)} KB</td>
        <td>${b.start} KB</td>
        <td>${b.start + b.size} KB</td>
        <td>${b.internalFrag > 0 ? `<span class="stat-value rose" style="font-size:0.85rem">${b.internalFrag} KB</span>` : '0 KB'}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="ContiguousMemSim.deallocateProcess('${b.processId}')">Dealloc</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function populateDeallocDropdown() {
    const select = document.getElementById('contig-dealloc-pid');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Process --</option>';

    blocks.filter(b => !b.isFree).forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.processId;
      opt.innerText = `${b.processId} (${b.size - (b.internalFrag || 0)} KB)`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  }

  return {
    init,
    resetMemory,
    allocateProcess,
    deallocateProcess,
    compactMemory,
    loadPreset
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  ContiguousMemSim.init();
});
