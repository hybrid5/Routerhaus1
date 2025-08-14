/* assets/js/contact.js
 * RouterHaus — Contact page interactions
 * - Mount header/footer partials
 * - IntersectionObserver reveal
 * - Live reply ETA message
 * - Contact form validation
 * - Submit via optional backend (window.RH_CONTACT.action) or mailto fallback
 * - Downloadable summary after submit
 */
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // ---- Partials ----
  async function mountPartial(target){
    const path = target?.dataset?.partial;
    if(!path) return;
    try{
      const res = await fetch(path, { cache: 'no-store' });
      if(res.ok) target.innerHTML = await res.text();
    }catch{}
  }

  // ---- Reveal on scroll ----
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });
  function revealify(){ $$('.reveal').forEach(n => io.observe(n)); }

  // ---- Reply ETA (simple heuristic) ----
  function updateEta(){
    const el = byId('replyEta');
    if(!el) return;
    const now = new Date();
    const hr = now.getHours();
    const day = now.getDay(); // 0 Sun
    const inHours = (hr>=9 && hr<18) && day>=1 && day<=5;
    el.textContent = inHours ? 'Typically replies within a few hours.' : 'We’ll reply next business day (usually fast).';
  }

  // ---- Copy main email ----
  function wireCopy(){
    const btn = byId('copyEmail');
    const a = byId('mailtoMain');
    btn?.addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(a?.textContent?.trim() || 'support@routerhaus.com');
        btn.textContent = 'Copied!';
        setTimeout(()=> btn.textContent = 'Copy address', 1200);
      }catch{}
    });
  }

  // ---- Contact form ----
  function wireForm(){
    const form = byId('contactForm');
    if(!form) return;

    const msg = byId('formMsg');
    const after = byId('afterContact');
    const downloadMsg = byId('downloadMsg');
    const mailtoFallback = byId('mailtoFallback');

    const cfg = window.RH_CONTACT || {}; // optionally set { action: '/api/contact' }

    function setError(t){ msg.textContent = t || ''; }
    function clearError(){ setError(''); }

    function validate(){
      clearError();
      if (form.company?.value) { // honeypot
        setError('Something went wrong. Please try again.');
        return false;
      }
      const required = $$('input[required],select[required],textarea[required]', form);
      for(const el of required){
        if(!String(el.value || '').trim()){
          setError('Please fill out the required fields.');
          el.focus();
          return false;
        }
      }
      return true;
    }

    function buildSummary(data){
      return `RouterHaus Contact
——————————————
Name: ${data.name}
Email: ${data.email}
Topic: ${data.topic}
Org: ${data.org || '-'}
Subject: ${data.subject}
Message:
${data.message}

Links: ${data.link || '-'}
`;
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!validate()) return;

      const data = Object.fromEntries(new FormData(form).entries());
      const summary = buildSummary(data);

      // Persist minimal footprint
      try{ localStorage.setItem('rh.contact.last', JSON.stringify({ ...data, ts: Date.now() })); }catch{}

      // Backend first (if configured)
      if (cfg.action) {
        try{
          const res = await fetch(cfg.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if(!res.ok) throw new Error(String(res.status));
          setError('');
        }catch(err){
          // If backend fails, fall back to mailto
          console.warn('Contact backend error, falling back to mailto:', err);
          openMail(summary, data.subject);
        }
      } else {
        // No backend configured — mailto
        openMail(summary, data.subject);
      }

      // Download summary
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      downloadMsg.href = url;
      downloadMsg.download = `routerhaus-contact-${(data.name || 'message').toLowerCase().replace(/\W+/g,'-')}.txt`;

      // Mailto button (explicit)
      const subject = encodeURIComponent(data.subject || 'RouterHaus inquiry');
      const body = encodeURIComponent(summary);
      mailtoFallback.href = `mailto:support@routerhaus.com?subject=${subject}&body=${body}`;

      form.hidden = true;
      after.hidden = false;
      after.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    function openMail(summary, subject){
      const subj = encodeURIComponent(subject || 'RouterHaus inquiry');
      const body = encodeURIComponent(summary);
      // Use support@routerhaus.com by default
      location.href = `mailto:support@routerhaus.com?subject=${subj}&body=${body}`;
    }
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', async ()=>{
    await Promise.all([
      mountPartial(byId('header-placeholder')),
      mountPartial(byId('footer-placeholder')),
    ]);
    revealify();
    updateEta();
    wireCopy();
    wireForm();
  });
})();
