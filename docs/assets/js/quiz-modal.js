/* assets/js/quiz-modal.js
 * Reimagined Quiz:
 * - Environment-first: coverage, devices, primary use
 * - Plus: ISP speed tier, access type, mesh preference/autopilot, budget
 * - Prefill last answers (localStorage), robust focus trap, overlay close, a11y
 * - Submits to window.RH_APPLY_QUIZ(answers) — extras are included for future facet-prefill
 */
(() => {
  const dlg = document.getElementById('quizModal');
  if (!dlg) return; // no-op if modal not present

  // Triggers / form
  const openBtn   = document.getElementById('openQuiz');
  const editBtn   = document.getElementById('editQuiz');
  const form      = document.getElementById('quizForm');

  // Core selects
  const selCoverage = document.getElementById('qCoverage');   // Apartment/Small | 2–3 Bedroom | Large/Multi-floor
  const selDevices  = document.getElementById('qDevices');    // 1–5 | 6–15 | 16–30 | 31–60 | 61–100 | 100+
  const selUse      = document.getElementById('qUse');        // All-Purpose | Gaming | WFH | Family Streaming | Smart-Home | Prosumer

  // Optional extras
  const selAccess = document.getElementById('qAccess');       // Cable | Fiber | FixedWireless5G | Satellite | DSL
  const priceSel  = document.getElementById('qPrice');        // <150 | 150–299 | 300–599 | 600+
  const meshAuto  = document.getElementById('qMeshAuto');     // checkbox (default on)
  const meshHint  = document.getElementById('meshHint');      // text node for helper hint
  const cancelBtn = document.getElementById('quizCancel');    // button

  // New: Progress element
  const stepEl = document.getElementById('quizStep');

  let lastOpener = null;
  const LS_KEY = 'rh.quiz.answers';

  // ---------- Open / Close ----------
  function openModal(from = document.activeElement) {
    lastOpener = from || document.activeElement || null;
    prefillForm();
    dlg.showModal();
    dlg.classList.add('is-open');
    queueMicrotask(() => firstFocusable(dlg)?.focus());
    attachTrap();
    updateMeshHint();
    updateProgress(); // New: Update progress on open
  }
  function closeModal() {
    detachTrap();
    dlg.classList.remove('is-open');
    setTimeout(() => { if (dlg.open) dlg.close(); restoreFocus(); }, 0);
  }
  function restoreFocus() { try { lastOpener?.focus(); } catch {} }

  // Overlay click to close
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeModal();
  });

  // Native Esc
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });

  // Buttons / triggers
  openBtn?.addEventListener('click', () => openModal(openBtn));
  editBtn?.addEventListener('click', (e) => { e.preventDefault(); openModal(editBtn); });
  cancelBtn?.addEventListener('click', closeModal);
  dlg.querySelectorAll('.modal-close,.quiz-close').forEach(b => b.addEventListener('click', closeModal));

  // ---------- Focus Trap (enhanced for better a11y) ----------
  let trapHandler = null;
  function attachTrap() {
    trapHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(dlg);
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      const last = items.length - 1;
      if (e.shiftKey) {
        if (idx <= 0 || idx === -1) { e.preventDefault(); items[last].focus(); }
      } else {
        if (idx === last || idx === -1) { e.preventDefault(); items[0].focus(); }
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

  // ---------- Prefill ----------
  function getStored() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }
  function setStored(a) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch {}
  }
  function prefillForm() {
    const a = getStored() || {};
    if (selCoverage) selCoverage.value = a.coverage || '';
    if (selDevices)  selDevices.value  = a.devices  || '';
    if (selUse)      selUse.value      = a.use      || '';
    if (selAccess)   selAccess.value   = a.access   || '';
    if (priceSel)    priceSel.value    = a.price    || '';

    // Speed radios (qSpeedLabel: '', '≤1G','2.5G','5G','10G')
    const qSpeed = form?.elements?.qSpeedLabel;
    if (qSpeed) {
      const target = String(a.wanTierLabel || '');
      [...qSpeed].forEach(r => r.checked = (r.value === target));
      if (!target) [...qSpeed].find(r => r.value === '')?.setAttribute('checked','');
    }

    // Mesh: autopilot + explicit override
    if (meshAuto) meshAuto.checked = a.meshAuto !== false; // default true
    const meshRadios = form?.elements?.qMesh;
    if (meshRadios) {
      const meshVal = a.mesh || '';
      [...meshRadios].forEach(r => r.checked = (r.value === meshVal));
    }
  }

  // ---------- Mesh hint / autopilot ----------
  function updateMeshHint() {
    const cov = selCoverage?.value || '';
    const auto = !!meshAuto?.checked;
    if (!meshHint) return;
    if (cov === 'Large/Multi-floor') {
      meshHint.textContent = auto
        ? 'Large / multi-floor detected — we’ll prefer mesh systems for even coverage.'
        : 'Tip: mesh greatly improves multi-floor coverage.';
    } else {
      meshHint.textContent = '';
    }
  }
  selCoverage?.addEventListener('change', updateMeshHint);
  meshAuto?.addEventListener('change', updateMeshHint);

  // New: Dynamic progress update
  function updateProgress() {
    if (!stepEl) return;
    const groups = $$('.q-group', form);
    const steps = groups.length;
    let current = 0;
    groups.forEach(g => {
      const inputs = g.querySelectorAll('select, input:checked');
      if (inputs.length > 0 && Array.from(inputs).some(inp => inp.value)) current++;
    });
    stepEl.textContent = current;
    // Optionally: stepEl.textContent = `${current}/${steps}`;
  }

  // Event listeners for progress
  form?.addEventListener('input', updateProgress);
  form?.addEventListener('change', updateProgress);

  // ---------- Submit -> kits.js (with improved validation) ----------
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    // Read core fields
    const coverage = selCoverage?.value || '';
    const devices  = selDevices?.value  || '';
    const use      = selUse?.value      || '';

    // Validate required trio with visual feedback
    [selCoverage, selDevices, selUse].forEach(el => el?.classList.remove('error'));
    if (!coverage) { selCoverage?.classList.add('error'); selCoverage?.focus(); return; }
    if (!devices) { selDevices?.classList.add('error'); selDevices?.focus(); return; }
    if (!use) { selUse?.classList.add('error'); selUse?.focus(); return; }

    // Optional fields
    const access = selAccess?.value || '';
    const price  = priceSel?.value  || '';

    const wanTierLabel = readSpeedLabel(form?.elements?.qSpeedLabel); // '', '≤1G','2.5G','5G','10G'
    let mesh = readMeshChoice();                                       // 'yes' | 'no' | ''
    const meshAutoVal = !!meshAuto?.checked;

    // Autopilot: if user didn't pick mesh explicitly, decide from environment
    if (!mesh && meshAutoVal) {
      if (coverage === 'Large/Multi-floor') mesh = 'yes';
    }

    const answers = {
      coverage,
      devices,
      use,
      access,           // for future facet prefill
      wanTierLabel,     // for future facet prefill (matches UI labels)
      mesh,             // 'yes' | 'no' | ''
      meshAuto: meshAutoVal,
      price             // price bucket label
    };

    setStored(answers);

    if (typeof window.RH_APPLY_QUIZ === 'function') {
      window.RH_APPLY_QUIZ(answers);
    }
    closeModal();
  });

  function readSpeedLabel(radios) {
    if (!radios) return '';
    const r = [...radios].find(x => x.checked);
    const v = r ? String(r.value || '') : '';
    // normalize to allowed set
    return v === '10G' || v === '5G' || v === '2.5G' || v === '≤1G' ? v : '';
  }
  function readMeshChoice() {
    const r = form?.querySelector('input[name="qMesh"]:checked');
    const v = r ? r.value : '';
    return v === 'yes' || v === 'no' ? v : '';
  }

  // External reopen (from kits.js)
  document.addEventListener('quiz:edit', () => openModal(editBtn || openBtn));

  // A11y enhancements: Add aria-describedby to fieldset legends if hints present
  $$('.q-group').forEach(group => {
    const legend = group.querySelector('legend');
    const hint = group.querySelector('.hint');
    if (legend && hint) {
      hint.id = hint.id || `hint-${group.id || Math.random().toString(36).slice(2)}`;
      legend.setAttribute('aria-describedby', hint.id);
    }
  });
})();
