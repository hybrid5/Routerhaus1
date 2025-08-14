/* assets/js/consult.js
 * RouterHaus — Consult page interactions
 * - Header/footer partials
 * - Case scroller controls
 * - IntersectionObserver reveals
 * - Intake multi-step form with validation
 * - Summary download + mailto handoff
 */
(() => {
  // Tiny helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // ----- Mount partials -----
  async function mountPartial(target) {
    const path = target?.dataset?.partial;
    if (!path) return;
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) target.innerHTML = await res.text();
    } catch {}
  }

  // ----- Intersection reveals -----
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  function revealify() { $$('.reveal').forEach(el => io.observe(el)); }

  // ----- Case scroller -----
  function wireCases() {
    const scroller = byId('caseScroller');
    if (!scroller) return;
    byId('casePrev')?.addEventListener('click', () => scroller.scrollBy({ left: -360, behavior: 'smooth' }));
    byId('caseNext')?.addEventListener('click', () => scroller.scrollBy({ left:  360, behavior: 'smooth' }));
  }

  // ----- Intake form (multi-step) -----
  function wireIntake() {
    const form = byId('intakeForm');
    if (!form) return;

    const steps = $$('.step', form);
    const progressBar = byId('progressBar');
    const msg = byId('formMsg');
    const nextBtn = byId('nextStep');
    const prevBtn = byId('prevStep');
    const submitBtn = byId('submitIntake');
    const after = byId('afterIntake');
    const downloadBrief = byId('downloadBrief');
    const mailtoLink = byId('mailtoLink');

    let idx = 0;

    const setStep = (i) => {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach((s, j) => { s.hidden = j !== idx; });
      prevBtn.disabled = idx === 0;
      nextBtn.hidden = idx === steps.length - 1;
      submitBtn.hidden = idx !== steps.length - 1;
      const pct = Math.round(((idx + 1) / steps.length) * 100);
      progressBar.style.width = pct + '%';
      msg.textContent = '';
      steps[idx].querySelector('input,select,textarea')?.focus();
    };

    const validateStep = () => {
      msg.textContent = '';
      const required = $$('input[required],select[required],textarea[required]', steps[idx]);
      for (const el of required) {
        if (!String(el.value || '').trim()) {
          msg.textContent = 'Please complete the required fields.';
          el.focus();
          return false;
        }
      }
      return true;
    };

    nextBtn.addEventListener('click', () => {
      if (!validateStep()) return;
      setStep(idx + 1);
    });
    prevBtn.addEventListener('click', () => setStep(idx - 1));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateStep()) return;

      const data = Object.fromEntries(new FormData(form).entries());
      // Persist locally
      try { localStorage.setItem('rh.consult.intake', JSON.stringify({ ...data, ts: new Date().toISOString() })); } catch {}

      // Build human summary
      const summary =
`RouterHaus Consult Intake
———————————————
Property: ${data.propertyType || '-'}
Goal: ${data.primaryGoal || '-'}
Size/Floors: ${data.sqft || '-'} sq ft · ${data.floors || '-'} floors
Backhaul: ${data.backhaul || '-'}
Internet/Devices: ${data.wanTier || '-'} · ${data.deviceLoad || '-'}
Special: ${data.special || '-'}
Timeline/Budget: ${data.timeline || '-'} · ${data.budget || '-'}
Contact: ${data.name || '-'} · ${data.email || '-'} · ${data.phone || '-'}
Notes:
${(data.notes || '').trim() || '(none)'}
`;

      // Download brief (JSON)
      const blob = new Blob([JSON.stringify({ ...data, summary }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloadBrief.href = url;
      downloadBrief.download = `routerhaus-consult-${(data.name || 'intake').toLowerCase().replace(/\W+/g,'-')}.json`;

      // Mailto (easy handoff)
      const to = 'consult@routerhaus.com';
      const subject = encodeURIComponent('Consult request');
      const body = encodeURIComponent(summary);
      mailtoLink.href = `mailto:${to}?subject=${subject}&body=${body}`;

      form.hidden = true;
      after.hidden = false;
      after.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Open from hero/footer buttons
    $$('.js-open-intake').forEach(b => b.addEventListener('click', () => {
      form.hidden = false; after.hidden = true; setStep(0);
      document.querySelector('.intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // Start at first step
    setStep(0);
  }

  // Capture UTM tags (if present) to localStorage for later CRM imports
  function storeUTMs() {
    const p = new URLSearchParams(location.search);
    const utm = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].reduce((o,k)=> (p.get(k)? (o[k]=p.get(k),o):o), {});
    if (Object.keys(utm).length) {
      try { localStorage.setItem('rh.utm', JSON.stringify({ ...utm, ts: Date.now() })); } catch {}
    }
  }

  // ----- Init -----
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      mountPartial(byId('header-placeholder')),
      mountPartial(byId('footer-placeholder'))
    ]);

    revealify();
    wireCases();
    wireIntake();
    storeUTMs();
  });
})();
