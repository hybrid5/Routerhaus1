/* ============================
   RouterHaus – home.js
   Page-only behavior for index.html
============================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- Persona quick chips → route to kits with mapped filters ---- */
  function wireQuickChips() {
    const chips = $$(".persona-chips .chip");
    if (!chips.length) return;

    const map = {
      apt: "coverage=Apartment%2FSmall&recos=1",
      large: "coverage=Large%2FMulti-floor&mesh=Mesh-ready&recos=1",
      wfh: "use=Work%20from%20Home&recos=1",
      gaming: "use=Gaming&wan=2.5G&recos=1",
    };

    chips.forEach((btn) => {
      if (!btn.getAttribute("type")) btn.setAttribute("type", "button");
      btn.addEventListener("click", () => {
        const key = btn.dataset.qpick;
        const qs = map[key] || "quiz=1";
        window.location.href = `kits.html?${qs}`;
      });
    });
  }

  /* ---- Reveal animations on scroll (aligns with .reveal/.in-view in CSS) ---- */
  function revealify() {
    const els = $$(".reveal");
    if (!els.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---- Optional: slight tilt on value/product cards ---- */
  function tiltCards() {
    const cards = $$(".value-card, .product");
    if (!cards.length) return;
    cards.forEach((card) => {
      let rAF = 0;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(800px) rotateX(${(-dy * 6).toFixed(2)}deg) ` +
            `rotateY(${(dx * 6).toFixed(2)}deg) translateY(-6px)`;
        });
      };
      const reset = () => {
        cancelAnimationFrame(rAF);
        card.style.transform = "";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  /* ---- Hooks after header/footer partials (if needed later) ---- */
  function wireHeaderHooks() {
    // Example: const quizBtn = document.getElementById('openQuiz');
  }

  /* ---- Init ---- */
  document.addEventListener("DOMContentLoaded", () => {
    wireQuickChips();
    revealify();
    tiltCards();
  });

  document.addEventListener("partials:loaded", wireHeaderHooks);
})();
