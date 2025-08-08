/* assets/js/quiz-modal.js
 * Quiz modal logic:
 * - Open/close (Esc/overlay/close btn), focus trap, restore focus to opener
 * - Prefill from previous selections
 * - Submit -> window.RH_APPLY_QUIZ({coverage, devices, use}) and scroll handled by kits.js
 * - "Edit answers" event reopens with previous selections
 */

(() => {
  // Elements
  const dlg = document.getElementById('quizModal');
  const openBtn = document.getElementById('openQuiz');
  const editBtn = document.getElementById('editQuiz');
  const form = document.getElementById('quizForm');
  const selCoverage = document.getElementById('qCoverage');
  const selDevices  = document.getElementById('qDevices');
  const selUse      = document.getElementById('qUse');
  const closeBtns = Array.from(dlg.querySelectorAll('.modal-close, .quiz-close'));
  let lastOpener = null;
  let lastAnswers = null; // {coverage, devices, use}

  // --- Open / Close ---
  function openModal(from = document.activeElement) {
    lastOpener = from || document.activeElement || null;
    prefillForm();
    dlg.showModal();
    dlg.classList.add('is-open');
    // Focus first field
    setTimeout(() => (firstFocusable(dlg)?.focus()), 0);
    attachTrap();
  }

  function closeModal() {
    detachTrap();
    dlg.classList.remove('is-open');
    // allow CSS transition if any
    setTimeout(() => { if (dlg.open) dlg.close(); restoreFocus(); }, 0);
  }

  function restoreFocus() {
    if (lastOpener && document.contains(lastOpener)) {
      try { lastOpener.focus(); } catch {}
    }
  }

  // Click outside (overlay)
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const inDialog = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inDialog) closeModal();
  });

  // Native cancel (Esc)
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });

  closeBtns.forEach(b => b.addEventListener('click', closeModal));
  openBtn?.addEventListener('click', () => openModal(openBtn));

  // External "edit" trigger from kits.js
  document.addEventListener('quiz:edit', () => openModal(editBtn || openBtn));

  // --- Focus Trap ---
  let trapHandler = null;
  function attachTrap() {
    trapHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(dlg);
      if (!items.length) return;
      const current = document.activeElement;
      const idx = items.indexOf(current);
      let nextIdx = idx;
      if (e.shiftKey) nextIdx = idx <= 0 ? items.length - 1 : idx - 1;
      else nextIdx = idx === items.length - 1 ? 0 : idx + 1;
      if (idx === -1 || (e.shiftKey && current === items[0]) || (!e.shiftKey && current === items[items.length - 1])) {
        e.preventDefault();
        items[nextIdx].focus();
      }
    };
    document.addEventListener('keydown', trapHandler, true);
  }
  function detachTrap() {
    if (trapHandler) document.removeEventListener('keydown', trapHandler, true);
    trapHandler = null;
  }
  function focusables(root) {
    return Array.from(root.querySelectorAll([
      'a[href]',
      'button:not([disabled])',
      'select:not([disabled])',
      'input:not([disabled]):not([type=hidden])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(','))).filter(el => el.offsetParent !== null || el === document.activeElement);
  }
  function firstFocusable(root) {
    return focusables(root)[0] || root;
  }

  // --- Prefill ---
  function prefillForm() {
    if (!lastAnswers) return;
    if (selCoverage) selCoverage.value = lastAnswers.coverage || '';
    if (selDevices)  selDevices.value  = lastAnswers.devices  || '';
    if (selUse)      selUse.value      = String(lastAnswers.use || '');
  }

  // --- Submit -> apply filters & scroll (kits.js listens) ---
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = {
      coverage: selCoverage?.value || '',
      devices:  selDevices?.value || '',
      use:      selUse?.value || ''
    };

    // Basic validation: focus first empty
    const missing = Object.entries(answers).find(([,v]) => !v);
    if (missing) {
      const key = missing[0];
      ({ coverage: selCoverage, devices: selDevices, use: selUse }[key]).focus();
      return;
    }

    lastAnswers = answers;
    if (typeof window.RH_APPLY_QUIZ === 'function') {
      window.RH_APPLY_QUIZ(answers);
    }
    closeModal();
  });

  // Make sure edit button reopens with previous selection if user already submitted once
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(editBtn);
    });
  }
})();
