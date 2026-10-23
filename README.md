# ⚡ OS-MemSim: Operating System Memory Management Simulation Suite

A comprehensive, academic-grade web application and interactive simulator for the **Operating Systems (CS301 / CSE / IT)** curriculum.

This suite visualizes, simulates, and analyzes all primary memory management techniques implemented in modern computer operating systems—from low-level physical contiguous allocation to virtual memory paging, hardware MMU address translation, TLB caching, segmentation, and thrashing prevention.

---

## 🌟 Key Highlights & Features

1. **📦 Contiguous Memory Allocation Simulator**:
   - **Dynamic Partitioning (Variable Partitioning)** & **Fixed Partitioning** (Equal & Unequal slots).
   - Four Core Algorithms:
     - **First Fit**: Allocates the earliest hole that is $\ge$ requested size (fastest search).
     - **Best Fit**: Allocates the smallest suitable hole (minimizes immediate unused partition space).
     - **Worst Fit**: Allocates the largest available hole (leaves large usable leftover chunks).
     - **Next Fit**: Continues searching from the last allocated position.
   - Real-time tracking of **Internal Fragmentation**, **External Fragmentation**, and **Memory Utilization (%)**.
   - **Memory Compaction (Defragmentation)**: Consolidates scattered free holes into a single contiguous block.
   - Deallocation with automatic adjacent hole coalescing.

2. **🔄 Virtual Memory & Page Replacement Simulator**:
   - **5 Core Replacement Algorithms**:
     - **FIFO (First-In, First-Out)**
     - **LRU (Least Recently Used)**
     - **Optimal (OPT / Belady's Min Faults)**
     - **LFU (Least Frequently Used)**
     - **Clock / Second-Chance Algorithm** (with circular pointer and reference bits `R`).
   - Interactive playback controls: **Play, Pause, Step Next, Step Prev, Speed control (0.5x, 1x, 2x)**.
   - Dynamic step-by-step commentary detailing every page reference, frame replacement, and cache hit/miss.
   - **Belady's Anomaly Demonstration**: Demonstrates the anomaly on sequence `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]` (3 frames yield 9 faults, while 4 frames unexpectedly yield 10 faults!).
   - **Multi-Algorithm Benchmark Matrix & Canvas Graph**: Compares all 5 algorithms simultaneously with hit/miss ratios.

3. **🗺️ Non-Contiguous Paging & Hardware MMU Address Translation**:
   - Bitwise address breakdown:
     - $\text{Total Logical Bits } m = \log_2(\text{Logical Address Space})$
     - $\text{Offset Bits } d = \log_2(\text{Page Size})$
     - $\text{Page Bits } p = m - d$
     - $\text{Physical Address } = (\text{Frame Number } f \times \text{Frame Size}) + d$
   - Interactive inputs in decimal, hexadecimal (`0x14E6`), and binary.
   - **Translation Lookaside Buffer (TLB)** high-speed hardware cache simulation (Hit vs. Miss).
   - **Effective Memory Access Time (EMAT)** Interactive Calculator:
     $$\text{EMAT} = \alpha \times (t_{\text{TLB}} + t_{\text{RAM}}) + (1 - \alpha) \times (t_{\text{TLB}} + (N + 1) \times t_{\text{RAM}})$$
   - Interactive Page Fault exception handling flow (Valid/Invalid bit toggling).

4. **📐 Segmentation & Boundary Protection**:
   - User-view logical memory representation via Segment Table (`Base`, `Limit`, `Permissions`).
   - Hardware MMU boundary validation: checks if $\text{Offset} < \text{Limit}$.
   - Interactive **Segmentation Fault (SIGSEGV / Trap 11)** simulation when a boundary violation occurs.
   - Visual map of segments placed non-contiguously throughout physical memory.

5. **⚡ Thrashing & Working Set Model**:
   - Interactive **CPU Utilization vs Degree of Multiprogramming** curve with real-time slider.
   - Visual demonstration of the **Thrashing Cliff** where CPU utilization plunges toward 0% as system spends all time swapping pages.
   - **Peter Denning's Working Set Model**: Calculates $W(t, \Delta)$ and Total Demand $D = \sum \text{WSS}_i$.
   - **Page Fault Frequency (PFF)** explanation and threshold strategies.

6. **🎓 OS Viva Voce & Interactive Exam Prep**:
   - **Interactive Graded Quiz**: 10 questions with immediate feedback, explanations, and score badging.
   - **OS Viva Voce Bank**: 25+ frequently asked university lab questions with model answers.
   - **Flippable Concept Flashcards**: Rapid revision of key formulas and definitions.

7. **📄 Printable Academic Lab Report Generator**:
   - Generates a formatted lab report including Student Name, Roll No., Course Code, simulation statistics, and signature lines.
   - One-click print-to-PDF with clean `@media print` styling.

---

## 🚀 How to Run the Project

This project is built using modern standard web technologies (HTML5, CSS3, Vanilla ES6+ JavaScript). It requires **zero build tools, zero npm packages, and zero server installations**!

### Quick Start:
1. Navigate to the project folder:
   ```
   c:\Users\Vikas Pal\Desktop\vikas2
   ```
2. Double-click **`index.html`** to open it directly in any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari, etc.).
3. That's it! Everything works immediately and 100% offline.

---

## 📁 Project Structure

```
vikas2/
├── index.html              # Main single-page application interface
├── README.md               # Detailed documentation, theory, and viva guide
├── css/
│   └── style.css           # Modern cyber dark/light responsive design & print CSS
└── js/
    ├── app.js              # Tab controller, theme switcher, and global init
    ├── contiguous.js       # Contiguous allocation (First/Best/Worst/Next Fit & Compaction)
    ├── pageReplacement.js  # FIFO, LRU, Optimal, LFU, Clock & Belady's Anomaly
    ├── pagingTlb.js        # Logical-to-Physical translation, TLB cache & EMAT
    ├── segmentation.js     # Segment table, limit check, and SIGSEGV trap
    ├── thrashing.js        # Thrashing curve and Working Set Model simulator
    ├── quizViva.js         # Interactive exam quiz, flashcards & 25+ viva questions
    └── reportGenerator.js  # Academic lab submission report exporter
```

---

## 🎯 Quick Reference for Class Presentations & Viva

### 1. Internal vs External Fragmentation
- **Internal Fragmentation**: Occurs in **fixed partitioning**. A partition is allocated to a process that does not use all the space. The difference is wasted inside the partition.
- **External Fragmentation**: Occurs in **variable/dynamic partitioning**. Free memory exists in total to satisfy a request, but it is split into non-contiguous scattered holes.
- **Solution for External Fragmentation**: Compaction (costly I/O relocation) or Paging (non-contiguous allocation).

### 2. Page vs Frame
- **Page**: Fixed-size block of **logical memory** (CPU view).
- **Frame**: Fixed-size block of **physical memory** (RAM hardware view). Page size is always equal to frame size (typically 4 KB).

### 3. Belady's Anomaly
- Discovered in 1969 by Laszlo Belady.
- Occurs under **FIFO** page replacement where increasing the number of physical frames leads to an **increase** in page faults.
- Does **not** occur in stack algorithms such as **LRU** and **Optimal**, because for stack algorithms, the set of pages in memory for $n$ frames is always a subset of the pages for $n+1$ frames.

### 4. What is a Segmentation Fault?
- When a process attempts to access an address outside its assigned segment boundary ($\text{Offset} \ge \text{Limit}$) or violates segment permissions (such as writing to a read-only code segment). The hardware MMU asserts a trap signal, and the OS sends signal `SIGSEGV` to kill the process.

### 5. What is Thrashing?
- A severe operating system performance degradation occurring when total memory demand exceeds physical RAM ($\sum \text{WSS}_i > \text{Total Frames}$). The operating system spends virtually all its time moving pages in and out of swap disk rather than executing user code, causing CPU utilization to drop to near zero.

---

## 💻 Tech Stack
- **HTML5**: Semantic tags, canvas visualizers, accessibility.
- **CSS3**: CSS Grid, Flexbox, Custom CSS variables, Glassmorphism, animations, print media queries.
- **JavaScript (ES6+)**: Modular IIFE architecture, pure vanilla algorithms, HTML5 Canvas 2D rendering.

*Developed for Operating Systems subject evaluation and lab practicals.*
