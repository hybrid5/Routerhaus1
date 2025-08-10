/* assets/js/quiz-modal.js
 * Reimagined Quiz:
 * - Environment-first + ISP speed + access type + mesh autopilot + optional budget
 * - Prefill last answers, robust focus trap, overlay close, a11y
 * - Submits to window.RH_APPLY_QUIZ(answers)
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
  const selAccess   = document.getElementById('qAccess');
  const priceSel    = document.getElementById('qPrice');
  const meshAuto    = document.getElementById('qMeshAuto');
  const meshHint    = document.getElementById('meshHint');
  const cancelBtn   = document.getElementById('quizCancel');

  let lastOpener = null;
  let lastAnswers = null; // persisted in-memory for this page session

  // --- Open / Close ---
  function openModal(from = document.activeElement) {
    lastOpener = from || document.activeElement || null;
    prefillForm();
    dlg.showModal();
    dlg.classList.add('is-open');
    queueMicrotask(() => (firstFocusable(dlg)?.focus()));
    attachTrap();
    updateMeshHint();
  }
  function closeModal() {
    detachTrap();
    dlg.classList.remove('is-open');
    setTimeout(() => { if (dlg.open) dlg.close(); restoreFocus(); }, 0);
  }
  function restoreFocus() { try { lastOpener?.focus(); } catch {} }

  // Click outside (overlay)
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeModal();
  });

  // Esc
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });

  // Buttons
  openBtn?.addEventListener('click', () => openModal(openBtn));
  document.addEventListener('quiz:edit', () => openModal(editBtn || openBtn));
  cancelBtn?.addEventListener('click', closeModal);
  dlg.querySelectorAll('.modal-close,.quiz-close').forEach(b => b.addEventListener('click', closeModal));

  // --- Focus Trap ---
  let trapHandler = null;
  function attachTrap() {
    trapHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(dlg);
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      let next = idx;
      next = e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : (idx === items.length - 1 ? 0 : idx + 1);
      if (idx === -1 || (e.shiftKey && document.activeElement === items[0]) || (!e.shiftKey && document.activeElement === items.at(-1))) {
        e.preventDefault();
        items[next].focus();
      }
    };
    document.addEventListener('keydown', trapHandler, true);
  }
  function detachTrap() { if (trapHandler) document.removeEventListener('keydown', trapHandler, true); trapHandler = null; }
  function focusables(root) {
    return Array.from(root.querySelectorAll('a[href],button:not([disabled]),select:not([disabled]),input:not([disabled]):not([type=hidden]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }
  function firstFocusable(root) { return focusables(root)[0] || root; }

  // --- Prefill ---
  function prefillForm() {
    const a = lastAnswers || {};
    if (selCoverage) selCoverage.value = a.coverage || '';
    if (selDevices)  selDevices.value  = a.devices  || '';
    if (selUse)      selUse.value      = a.use      || '';
    if (selAccess)   selAccess.value   = a.access   || '';
    if (priceSel)    priceSel.value    = a.price    || '';
    // speed radios
    const qSpeed = form?.elements?.qSpeed;
    if (qSpeed) {
      const v = String(a.wanTier || '');
      [...qSpeed].forEach(r => r.checked = (r.value === v));
      if (!v) { // "I'm not sure" radio
        [...qSpeed].find(r => r.value === '')?.setAttribute('checked','');
      }
    }
    if (meshAuto) meshAuto.checked = a.meshAuto !== false; // default true
    // mesh explicit
    const meshRadios = form.querySelectorAll('input[name="qMesh"]');
    [...meshRadios].forEach(r => r.checked = (r.value === (a.mesh || '')));
  }

  // --- Mesh hint / auto behavior ---
  function updateMeshHint() {
    const cov = selCoverage?.value;
    const auto = !!meshAuto?.checked;
    if (cov === 'Large/Multi-floor') {
      meshHint.textContent = auto ? 'Large / multi-floor detected — we’ll prefer mesh systems for even coverage.' : 'Tip: mesh greatly improves multi-floor coverage.';
    } else {
      meshHint.textContent = '';
    }
  }
  selCoverage?.addEventListener('change', updateMeshHint);
  meshAuto?.addEventListener('change', updateMeshHint);

  // --- Submit -> kits.js
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const wanTier = readSpeed(form?.elements?.qSpeed);
    const meshChoice = readMeshChoice();

    const answers = {
      coverage: selCoverage?.value || '',
      devices:  selDevices?.value  || '',
      use:      selUse?.value      || '',
      access:   selAccess?.value   || '',
      wanTier,                         // '', 200, 250, 500, 1000, 2500, 5000, 10000 (number or '')
      mesh:     meshChoice,            // 'yes' | 'no' | '' (no pref)
      meshAuto: !!meshAuto?.checked,   // true = allow auto-suggestion
      price:    priceSel?.value || ''  // '$' | '$$' | '$$$' | '$$$$' | ''
    };

    // Validate required trio first
    const missingKey = ['coverage','devices','use'].find(k => !answers[k]);
    if (missingKey) {
      ({ coverage: selCoverage, devices: selDevices, use: selUse }[missingKey]).focus();
      return;
    }

    lastAnswers = answers;
    if (typeof window.RH_APPLY_QUIZ === 'function') {
      window.RH_APPLY_QUIZ(answers);
    }
    closeModal();
  });

  function readSpeed(radios) {
    if (!radios) return '';
    const r = [...radios].find(x => x.checked);
    if (!r) return '';
    const v = r.value.trim();
    return v === '' ? '' : Number(v);
  }
  function readMeshChoice() {
    const r = form.querySelector('input[name="qMesh"]:checked');
    return r ? r.value : '';
  }

  // Keep Edit button behavior
  if (editBtn) {
    editBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(editBtn); });
  }
})();
