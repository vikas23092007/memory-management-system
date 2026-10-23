/**
 * ===================================================================
 * OS Memory Management - Main Application Controller
 * Handles Navigation, Tab Switching, Themes & Quick Presets
 * ===================================================================
 */

const App = (function() {
  function init() {
    setupNavigation();
    setupThemeToggle();
    restoreTheme();
  }

  function setupNavigation() {
    // Navigation tab buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        switchTab(targetTab);
      });
    });

    // Topic cards on Overview page
    document.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const targetTab = card.dataset.targetTab;
        if (targetTab) switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    if (!tabId) return;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger specific resize / render if canvas charts need redraw
    if (tabId === 'thrashing') {
      const degSlider = document.getElementById('thrash-degree-slider');
      if (degSlider && window.ThrashingSim) {
        window.ThrashingSim.drawThrashingCurve(parseInt(degSlider.value, 10));
      }
    }
  }

  function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('os-memsim-theme', isLight ? 'light' : 'dark');
      themeBtn.innerHTML = isLight ? '🌙 Dark' : '☀️ Light';
    });
  }

  function restoreTheme() {
    const saved = localStorage.getItem('os-memsim-theme');
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (saved === 'light') {
      document.body.classList.add('light-theme');
      if (themeBtn) themeBtn.innerHTML = '🌙 Dark';
    } else {
      document.body.classList.remove('light-theme');
      if (themeBtn) themeBtn.innerHTML = '☀️ Light';
    }
  }

  return {
    init,
    switchTab
  };
})();

// Auto initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
