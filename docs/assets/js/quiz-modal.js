"use strict";

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('startQuizBtn');
  const modal = document.getElementById('quizModal');
  const form = document.getElementById('quizForm');
  const closeBtns = modal ? modal.querySelectorAll('.quiz-close') : [];

  const envMap = {
    'Apartment/Small': 'Apartment',
    '2–3 Bedroom': 'House',
    'Large/Multi-floor': 'House'
  };

  function ensureFilter(id, labelText, options) {
    let select = document.getElementById(id);
    if (!select) {
      const aside = document.getElementById('kitFilterSection');
      if (!aside) return null;
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = labelText;
      select = document.createElement('select');
      select.id = id;
      select.innerHTML = '<option value="">Any</option>' +
        options.map(o => `<option value="${o}">${o}</option>`).join('');
      aside.appendChild(label);
      aside.appendChild(select);
    }
    return select;
  }

  if (openBtn && modal && form) {
    openBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtns.forEach(btn => btn.addEventListener('click', () => modal.classList.remove('active')));

    form.addEventListener('submit', e => {
      e.preventDefault();
      const home = form.quizHomeSize.value;
      const devices = form.quizDeviceLoad.value;
      const usage = form.quizPrimaryUse.value;

      const envSelect = document.getElementById('envFilter');
      if (envSelect) envSelect.value = envMap[home] || home;

      ensureFilter('deviceFilter', 'Device Load', ['1–5','6–15','16+']).value = devices;
      ensureFilter('usageFilter', 'Primary Use', ['Family Streaming','Gaming','Work-From-Home','Smart-Home','All-Purpose']).value = usage;

      if (typeof applyFilters === 'function') applyFilters();
      modal.classList.remove('active');
    });
  }
});
