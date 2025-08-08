/* assets/js/quiz-modal.js
 * RouterHaus Kits — Quiz modal + mapping (connected to filters)
 */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const dlg = document.getElementById('quizModal');
const openBtn = document.getElementById('openQuiz');
const closeBtns = $$('.modal-close', dlg);
const form = $('#quizForm', dlg);

// Helpers
function lockScroll(lock){ document.documentElement.style.overflow = lock ? 'hidden' : ''; }
function openModal(){
  if (!dlg) return;
  dlg.showModal();
  dlg.classList.add('is-open');
  lockScroll(true);
  const first = dlg.querySelector('select, button, [href], input');
  first && first.focus();
}
function closeModal(){
  if (!dlg) return;
  dlg.classList.remove('is-open');
  setTimeout(()=>{ dlg.close(); lockScroll(false); }, 120);
}

openBtn?.addEventListener('click', openModal);
closeBtns.forEach(b=> b.addEventListener('click', closeModal));

// Click outside panel closes
dlg?.addEventListener('click', (e)=>{
  const rect = dlg.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) closeModal();
});
dlg?.addEventListener('cancel', (e)=>{ e.preventDefault(); closeModal(); });
dlg?.addEventListener('close', ()=> lockScroll(false));

form?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const coverage = $('#qCoverage', dlg).value;
  const deviceLoad = $('#qDevices', dlg).value;
  const primaryUse = $('#qUse', dlg).value;
  if (!coverage || !deviceLoad || !primaryUse) return;

  // Basic mapping: large homes benefit from mesh
  const meshNeed = (coverage === 'Large/Multi-floor');

  const result = { coverage, deviceLoad, primaryUse, meshNeed };

  // Push into Kits logic (sets facets + recommendations + renders)
  if (window.__kits?.applyQuizResult) {
    window.__kits.applyQuizResult(result, { openFilters: false, scrollToResults: true });
  }

  closeModal();
});
