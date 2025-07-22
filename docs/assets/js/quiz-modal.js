"use strict";

console.log('quiz-modal.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('startQuizBtn');
  console.log('openBtn:', openBtn);
  const modal = document.getElementById('quizModal');
  console.log('modal:', modal);
  const form = document.getElementById('quizForm');
  console.log('form:', form);
  const closeBtns = modal ? modal.querySelectorAll('.quiz-close') : [];
  console.log('closeBtns:', closeBtns);
  let focusables = [];
  let firstFocus, lastFocus;

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
      const clearBtn = document.getElementById('clearFilters');
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = labelText;
      select = document.createElement('select');
      select.id = id;
      select.innerHTML = '<option value="">Any</option>' +
        options.map(o => `<option value="${o}">${o}</option>`).join('');
      aside.insertBefore(label, clearBtn);
      aside.insertBefore(select, clearBtn);

      const key = id.replace('Filter', '');
      if (window.elements && elements[key] === null) {
        elements[key] = select;
        select.addEventListener('change', () => {
          if (typeof saveFilters === 'function') saveFilters();
          if (typeof applyFilters === 'function') applyFilters();
        });
      }
    }
    return select;
  }

  function trapFocus(e) {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'Tab' && focusables.length) {
      if (e.shiftKey && document.activeElement === firstFocus) {
        e.preventDefault();
        lastFocus.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocus) {
        e.preventDefault();
        firstFocus.focus();
      }
    }
  }

  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    focusables = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocus = focusables[0];
    lastFocus = focusables[focusables.length - 1];
    firstFocus.focus();
    document.addEventListener('keydown', trapFocus);
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapFocus);
    if (openBtn) openBtn.focus();
  }

  if (openBtn && modal && form) {
    openBtn.addEventListener('click', openModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

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
      closeModal();
    });
  }
});
