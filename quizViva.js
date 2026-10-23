/**
 * ===================================================================
 * OS Memory Management - Viva Voce, Interactive Quiz & Flashcards
 * ===================================================================
 */

const QuizVivaModule = (function() {
  // Quiz Questions Data Bank
  const quizQuestions = [
    {
      q: "Which contiguous memory allocation algorithm leaves the smallest leftover hole, often resulting in small unusable fragments?",
      options: [
        "First Fit",
        "Best Fit",
        "Worst Fit",
        "Next Fit"
      ],
      answer: 1,
      explanation: "Best Fit allocates the smallest hole that is big enough, which leaves the smallest residual fragment. Worst Fit leaves the largest hole, and First Fit allocates the first available."
    },
    {
      q: "What is Internal Fragmentation?",
      options: [
        "Memory allocated to a process is slightly larger than requested memory; unassigned space within the partition is wasted.",
        "Total free memory space is enough to satisfy a request, but it is not contiguous.",
        "The operating system code size exceeds physical RAM.",
        "Fragmented files residing in secondary disk storage."
      ],
      answer: 0,
      explanation: "Internal fragmentation occurs when fixed-sized blocks are allocated and the process data does not completely fill the allocated block. The remaining space inside is wasted."
    },
    {
      q: "Which page replacement algorithm suffers from Belady's Anomaly?",
      options: [
        "LRU (Least Recently Used)",
        "Optimal (OPT)",
        "FIFO (First-In, First-Out)",
        "LFU (Least Frequently Used)"
      ],
      answer: 2,
      explanation: "FIFO suffers from Belady's Anomaly, where increasing the number of page frames can unexpectedly increase the number of page faults. Stack algorithms like LRU and OPT never suffer from Belady's Anomaly."
    },
    {
      q: "If a system uses 16-bit logical addresses with a page size of 4 KB (2¹² bytes), how many bits are used for the Page Number (p)?",
      options: [
        "12 bits",
        "4 bits",
        "8 bits",
        "16 bits"
      ],
      answer: 1,
      explanation: "Page Size = 4 KB = 2¹² bytes, so Offset bits (d) = 12. Logical Address = 16 bits. Page Number bits (p) = 16 - 12 = 4 bits (representing 2⁴ = 16 pages)."
    },
    {
      q: "What happens when a CPU attempts to access a page whose 'Valid/Invalid' bit in the Page Table is set to 0 (Invalid)?",
      options: [
        "The computer shuts down immediately.",
        "The CPU raises a Page Fault trap interrupt to the OS kernel.",
        "The memory access proceeds normally from ROM.",
        "The segment table is queried instead."
      ],
      answer: 1,
      explanation: "A bit of 0 means the page is currently not resident in physical RAM. The MMU hardware raises a Page Fault interrupt, causing the OS to fetch the page from the swap space on disk."
    },
    {
      q: "What is the primary purpose of the Translation Lookaside Buffer (TLB)?",
      options: [
        "To increase secondary storage capacity.",
        "A fast hardware associative cache that accelerates page table lookups without accessing RAM twice.",
        "To sort processes by priority before scheduling.",
        "To compress files in RAM."
      ],
      answer: 1,
      explanation: "The TLB is a high-speed hardware associative cache holding recently translated page-to-frame mappings. It avoids the extra memory access required to read the page table in RAM."
    },
    {
      q: "In Segmentation, what hardware check prevents a process from accessing memory outside its assigned segment?",
      options: [
        "Checking if Base Address > Offset",
        "Checking if Offset < Limit",
        "Checking if TLB Hit Ratio > 90%",
        "Checking if Frame Number == Page Number"
      ],
      answer: 1,
      explanation: "The MMU hardware compares the requested Offset (d) against the segment's Limit. If Offset ≥ Limit, a Trap: Segmentation Fault (SIGSEGV) is generated."
    },
    {
      q: "What is Thrashing in an Operating System?",
      options: [
        "A condition where CPU utilization drops drastically because the system spends virtually all its time paging rather than executing processes.",
        "Rapid deletion of temporary files from swap storage.",
        "Overheating of CPU cores during heavy compilation.",
        "Corrupted page frames due to physical RAM failure."
      ],
      answer: 0,
      explanation: "Thrashing occurs when the total memory required by active processes exceeds physical RAM (Sum of Working Set Sizes > Total Frames). The OS spends all CPU cycles servicing page faults."
    },
    {
      q: "Which technique can eliminate External Fragmentation in dynamic memory allocation?",
      options: [
        "Using larger disk block sizes",
        "Compaction (moving all allocated blocks to one end of memory)",
        "Increasing CPU clock speed",
        "Disabling the TLB"
      ],
      answer: 1,
      explanation: "Compaction rearranges memory contents to place all free memory together in one large continuous block. It is only possible if relocation is dynamic at execution time."
    },
    {
      q: "Which of the following describes the difference between Paging and Segmentation?",
      options: [
        "Paging divides memory into fixed-size blocks (hardware view), while Segmentation divides memory into variable-sized logical units (user/programmer view).",
        "Paging has external fragmentation; segmentation does not.",
        "Paging requires no address translation; segmentation requires two levels.",
        "Segmentation does not use base and limit registers."
      ],
      answer: 0,
      explanation: "Paging is a physical memory management scheme with fixed-sized pages (no external fragmentation). Segmentation provides a logical, variable-sized representation reflecting the programmer's view of subroutines, stack, etc."
    }
  ];

  // Viva Voce Question Bank
  const vivaBank = [
    {
      topic: "Contiguous Allocation",
      q: "What is the difference between Internal and External Fragmentation?",
      a: "<strong>Internal Fragmentation</strong> occurs when memory is allocated in fixed partitions; if a process needs less memory than the partition size, the leftover space inside the partition is wasted.<br><strong>External Fragmentation</strong> occurs in dynamic/variable partitioning when total free memory is sufficient to satisfy a request, but the space is non-contiguous (scattered into small holes), so the process cannot be allocated."
    },
    {
      topic: "Contiguous Allocation",
      q: "Which is better among First Fit, Best Fit, and Worst Fit?",
      a: "Empirical studies by Knuth and others show that <strong>First Fit</strong> is generally faster because it stops searching as soon as a suitable hole is found. <strong>Best Fit</strong> produces the smallest leftover fragments (which are often too tiny to be useful). <strong>Worst Fit</strong> produces larger leftover fragments that might still be usable, but generally performs worse overall than First Fit in space and time utilization."
    },
    {
      topic: "Paging & TLB",
      q: "What is the formula for Effective Memory Access Time (EMAT) with a TLB?",
      a: "<code>EMAT = α × (t_TLB + t_RAM) + (1 - α) × (t_TLB + 2 × t_RAM)</code><br>where <strong>α</strong> is the TLB hit ratio, <strong>t_TLB</strong> is TLB lookup time (e.g. 10-20 ns), and <strong>t_RAM</strong> is main memory access time (e.g. 100 ns). In two-level paging, the miss penalty increases to <code>(t_TLB + 3 × t_RAM)</code>."
    },
    {
      topic: "Virtual Memory",
      q: "Explain Belady's Anomaly with an example.",
      a: "Belady's Anomaly is the phenomenon where adding more physical page frames causes an <em>increase</em> in page faults under the FIFO algorithm. For the reference string <code>[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]</code>: with <strong>3 frames</strong>, FIFO produces <strong>9 faults</strong>; with <strong>4 frames</strong>, FIFO produces <strong>10 faults</strong>! It happens because FIFO does not belong to the class of 'Stack Algorithms'."
    },
    {
      topic: "Virtual Memory",
      q: "What is a Stack Algorithm in Page Replacement?",
      a: "A stack algorithm is an algorithm for which the set of pages in memory for <em>n</em> frames is always a subset of the pages in memory for <em>n + 1</em> frames. Examples include <strong>LRU</strong> and <strong>Optimal (OPT)</strong>. Stack algorithms are mathematically guaranteed never to suffer from Belady's Anomaly."
    },
    {
      topic: "Segmentation",
      q: "What causes a 'Segmentation Fault' (SIGSEGV) in C/C++?",
      a: "A segmentation fault is triggered by the hardware MMU when a program attempts to access a memory location beyond the <strong>Limit</strong> of its assigned segment (<code>Offset ≥ Limit</code>), or tries to write to a read-only segment (such as trying to overwrite a string literal or code segment), or dereferences a NULL / dangling pointer outside valid address bounds."
    },
    {
      topic: "Thrashing",
      q: "How does the Operating System detect and eliminate Thrashing?",
      a: "The OS monitors CPU utilization and page fault frequency. If CPU utilization is low while paging device queues are full, thrashing is detected.<br><strong>Remedies:</strong><br>1. <strong>Working Set Strategy:</strong> Allocate frames based on each process's Working Set Size (WSS). If total demand <code>D = Σ WSS > Total Frames</code>, suspend/swap out a process.<br>2. <strong>Page Fault Frequency (PFF):</strong> Establish upper and lower bounds on page fault rates; add frames if rate exceeds upper bound, remove frames if below lower bound."
    },
    {
      topic: "Virtual Memory",
      q: "What is the Dirty Bit (Modify Bit) in a Page Table entry?",
      a: "The Dirty Bit indicates whether a page has been modified by write operations since being loaded from disk into physical memory. If <code>dirty bit == 0</code>, the page in memory is identical to disk and can simply be overwritten without disk write on replacement. If <code>dirty bit == 1</code>, the page MUST be written back to disk (swap space) before replacement."
    },
    {
      topic: "Paging",
      q: "Why do we need Multi-Level Paging?",
      a: "In a 32-bit system with 4 KB pages, a single-level page table requires 2²⁰ (1 million) entries, which takes 4 MB of contiguous RAM per process! In 64-bit systems, a single-level table would be impossibly huge. Multi-level paging allows the page table itself to be paged, so non-contiguous page table pages can be allocated dynamically and unused page tables never occupy physical RAM."
    },
    {
      topic: "Paging",
      q: "What is an Inverted Page Table?",
      a: "An Inverted Page Table has only one entry for each real page (or frame) of physical memory, rather than one entry per page of logical address space. Each entry contains <code>&lt;Process ID, Page Number&gt;</code>. This drastically reduces the memory needed to store page tables, though it requires a hash lookup table to speed up searches."
    }
  ];

  // Flashcards Bank
  const flashcards = [
    {
      topic: "Contiguous Allocation",
      front: "First Fit vs Best Fit vs Worst Fit",
      back: "• First Fit: Earliest hole ≥ Size (Fastest)<br>• Best Fit: Smallest hole ≥ Size (Leaves tiny fragments)<br>• Worst Fit: Largest hole ≥ Size (Leaves largest leftover)"
    },
    {
      topic: "Fragmentation",
      front: "Internal vs External Fragmentation",
      back: "• Internal: Wasted space inside an allocated fixed partition.<br>• External: Total free memory is sufficient, but divided into small non-contiguous holes.<br>• Solution for External: Compaction or Paging!"
    },
    {
      topic: "Address Translation",
      front: "Paging Address Formula",
      back: "Logical Address = [ Page Number (p) | Offset (d) ]<br>• p = ⌊Logical Addr / Page Size⌋<br>• d = Logical Addr mod Page Size<br>• Physical Addr = (Frame Number × Frame Size) + d"
    },
    {
      topic: "TLB",
      front: "Effective Memory Access Time (EMAT)",
      back: "EMAT = α(t_TLB + t_RAM) + (1 - α)(t_TLB + 2 × t_RAM)<br>• α = Hit Ratio<br>• t_TLB = TLB access time (~10ns)<br>• t_RAM = RAM access time (~100ns)"
    },
    {
      topic: "Virtual Memory",
      front: "Belady's Anomaly",
      back: "Phenomenon where adding more frames INCREASES page faults under FIFO!<br>Occurs on sequence [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]:<br>• 3 frames = 9 faults<br>• 4 frames = 10 faults!"
    },
    {
      topic: "Thrashing",
      front: "Working Set Model Condition",
      back: "WSS_i = |W(t, Δ)| (pages accessed in window Δ)<br>Total Demand D = Σ WSS_i<br>• If D ≤ Total Frames M ➔ Normal operation<br>• If D > Total Frames M ➔ Thrashing occurs!"
    }
  ];

  // Current Quiz State
  let currentQuizIdx = 0;
  let quizScore = 0;
  let userAnswers = [];

  // Current Flashcard State
  let currentFlashcardIdx = 0;

  function init() {
    renderQuizQuestion();
    renderVivaList();
    renderFlashcard();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Viva Search Filter
    document.getElementById('viva-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      renderVivaList(q);
    });

    // Flashcard navigation
    document.getElementById('flashcard-prev-btn')?.addEventListener('click', prevFlashcard);
    document.getElementById('flashcard-next-btn')?.addEventListener('click', nextFlashcard);
    document.getElementById('flashcard-element')?.addEventListener('click', flipFlashcard);

    // Quiz submit
    document.getElementById('quiz-submit-btn')?.addEventListener('click', submitQuizAnswer);
    document.getElementById('quiz-next-btn')?.addEventListener('click', nextQuizQuestion);
    document.getElementById('quiz-restart-btn')?.addEventListener('click', restartQuiz);
  }

  function renderQuizQuestion() {
    const qBox = document.getElementById('quiz-question-container');
    const progBox = document.getElementById('quiz-progress-text');
    const scoreBox = document.getElementById('quiz-score-badge');
    const submitBtn = document.getElementById('quiz-submit-btn');
    const nextBtn = document.getElementById('quiz-next-btn');

    if (!qBox) return;

    if (currentQuizIdx >= quizQuestions.length) {
      // Quiz complete!
      const pct = Math.round((quizScore / quizQuestions.length) * 100);
      let grade = 'Master of OS Memory!';
      if (pct < 60) grade = 'Needs Practice!';
      else if (pct < 80) grade = 'Good Effort!';

      qBox.innerHTML = `
        <div style="text-align:center; padding:2rem;">
          <h3 style="font-size:1.8rem; margin-bottom:0.5rem; color:var(--accent-cyan)">Quiz Finished! 🎓</h3>
          <p style="color:var(--text-muted); margin-bottom:1.5rem">You scored <strong>${quizScore}</strong> out of <strong>${quizQuestions.length}</strong> (${pct}%)</p>
          <div class="stat-box" style="max-width:280px; margin:0 auto 1.5rem auto; border-color:${pct >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}">
            <span class="stat-label">Result Badge</span>
            <span class="stat-value ${pct >= 70 ? 'emerald' : 'amber'}">${grade}</span>
          </div>
          <button class="btn btn-primary" onclick="QuizVivaModule.restartQuiz()">Take Quiz Again</button>
        </div>
      `;
      if (submitBtn) submitBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    const cur = quizQuestions[currentQuizIdx];
    if (progBox) progBox.innerText = `Question ${currentQuizIdx + 1} of ${quizQuestions.length}`;
    if (scoreBox) scoreBox.innerText = `Score: ${quizScore}/${quizQuestions.length}`;
    if (submitBtn) {
      submitBtn.style.display = 'inline-flex';
      submitBtn.disabled = true;
    }
    if (nextBtn) nextBtn.style.display = 'none';

    let optionsHtml = '';
    cur.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      optionsHtml += `
        <div class="quiz-option" data-opt-idx="${idx}" onclick="QuizVivaModule.selectQuizOption(${idx})">
          <div class="quiz-opt-letter">${letter}</div>
          <div>${opt}</div>
        </div>
      `;
    });

    qBox.innerHTML = `
      <div class="quiz-question">${cur.q}</div>
      <div class="quiz-options">${optionsHtml}</div>
      <div id="quiz-explanation-box" class="quiz-explanation"></div>
    `;
  }

  let selectedOptionIdx = -1;

  function selectQuizOption(idx) {
    if (userAnswers[currentQuizIdx] !== undefined) return; // already answered
    selectedOptionIdx = idx;

    document.querySelectorAll('.quiz-option').forEach(el => {
      el.classList.remove('selected');
    });

    const chosen = document.querySelector(`.quiz-option[data-opt-idx="${idx}"]`);
    if (chosen) chosen.classList.add('selected');

    const submitBtn = document.getElementById('quiz-submit-btn');
    if (submitBtn) submitBtn.disabled = false;
  }

  function submitQuizAnswer() {
    if (selectedOptionIdx === -1) return;

    const cur = quizQuestions[currentQuizIdx];
    const isCorrect = selectedOptionIdx === cur.answer;
    userAnswers[currentQuizIdx] = selectedOptionIdx;

    if (isCorrect) quizScore++;

    const options = document.querySelectorAll('.quiz-option');
    options.forEach((optEl, idx) => {
      if (idx === cur.answer) {
        optEl.classList.add('correct');
      } else if (idx === selectedOptionIdx && !isCorrect) {
        optEl.classList.add('incorrect');
      }
    });

    const expBox = document.getElementById('quiz-explanation-box');
    if (expBox) {
      expBox.style.display = 'block';
      expBox.innerHTML = `
        <strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${cur.explanation}
      `;
    }

    const submitBtn = document.getElementById('quiz-submit-btn');
    const nextBtn = document.getElementById('quiz-next-btn');
    if (submitBtn) submitBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    const scoreBox = document.getElementById('quiz-score-badge');
    if (scoreBox) scoreBox.innerText = `Score: ${quizScore}/${quizQuestions.length}`;
  }

  function nextQuizQuestion() {
    selectedOptionIdx = -1;
    currentQuizIdx++;
    renderQuizQuestion();
  }

  function restartQuiz() {
    currentQuizIdx = 0;
    quizScore = 0;
    userAnswers = [];
    selectedOptionIdx = -1;
    renderQuizQuestion();
  }

  function renderVivaList(filter = '') {
    const container = document.getElementById('viva-accordion-container');
    if (!container) return;

    container.innerHTML = '';
    const filtered = vivaBank.filter(item => {
      if (!filter) return true;
      return item.q.toLowerCase().includes(filter) || item.a.toLowerCase().includes(filter) || item.topic.toLowerCase().includes(filter);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="color:var(--text-dim); padding:1rem; text-align:center;">No viva questions found matching your search.</div>';
      return;
    }

    filtered.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'viva-item';
      el.innerHTML = `
        <button class="viva-header" onclick="this.parentElement.classList.toggle('open')">
          <span>
            <span class="badge badge-cyan" style="font-size:0.65rem; margin-right:6px">${item.topic}</span>
            Q${idx + 1}: ${item.q}
          </span>
          <span class="viva-icon">▼</span>
        </button>
        <div class="viva-body">
          ${item.a}
        </div>
      `;
      container.appendChild(el);
    });
  }

  function renderFlashcard() {
    const cardEl = document.getElementById('flashcard-element');
    const countEl = document.getElementById('flashcard-counter');
    if (!cardEl) return;

    cardEl.classList.remove('flipped');
    const cur = flashcards[currentFlashcardIdx];

    const frontTopic = cardEl.querySelector('.flashcard-front .flashcard-topic');
    const frontTitle = cardEl.querySelector('.flashcard-front .flashcard-title');
    const backContent = cardEl.querySelector('.flashcard-back .flashcard-desc');

    if (frontTopic) frontTopic.innerText = cur.topic;
    if (frontTitle) frontTitle.innerText = cur.front;
    if (backContent) backContent.innerHTML = cur.back;

    if (countEl) countEl.innerText = `${currentFlashcardIdx + 1} / ${flashcards.length}`;
  }

  function flipFlashcard() {
    const cardEl = document.getElementById('flashcard-element');
    if (cardEl) cardEl.classList.toggle('flipped');
  }

  function prevFlashcard() {
    if (currentFlashcardIdx > 0) {
      currentFlashcardIdx--;
      renderFlashcard();
    }
  }

  function nextFlashcard() {
    if (currentFlashcardIdx < flashcards.length - 1) {
      currentFlashcardIdx++;
      renderFlashcard();
    }
  }

  return {
    init,
    selectQuizOption,
    submitQuizAnswer,
    nextQuizQuestion,
    restartQuiz,
    flipFlashcard,
    prevFlashcard,
    nextFlashcard
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  QuizVivaModule.init();
});
