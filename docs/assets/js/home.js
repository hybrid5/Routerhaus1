/* ============================
   RouterHaus – home.js
   Page-only behavior for index.html
   - Persona hover/focus effect
   - Section reveal on scroll
   - Lightweight value-card tilt (optional)
   - Hooks into `partials:loaded` if header elements are needed later
============================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- Persona interactions ---- */
  function wirePersonas() {
    const cards = $$(".persona-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      // Accessible hover/focus state
      const setActive = (on) => card.classList.toggle("is-active", on);
      card.addEventListener("mouseenter", () => setActive(true));
      card.addEventListener("mouseleave", () => setActive(false));
      card.addEventListener("focusin", () => setActive(true));
      card.addEventListener("focusout", () => setActive(false));

      // Keyboard click
      card.setAttribute("tabindex", "0");
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.classList.toggle("is-active");
        }
      });
    });
  }

  /* ---- Reveal animations on scroll ---- */
  function revealify() {
    const els = $$(
      ".value-card, .persona-card, .product, .hero .hero-actions a, .product-row article, .footer-cta, .value-grid h2, .persona-heading"
    );
    if (!els.length || !("IntersectionObserver" in window)) return;
    els.forEach((el) => el.classList.add("will-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---- Optional: slight tilt on value cards (no external libs) ---- */
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
          card.style.transform = `perspective(800px) rotateX(${(-dy * 6).toFixed(
            2
          )}deg) rotateY(${(dx * 6).toFixed(2)}deg) translateY(-6px)`;
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

  /* ---- If header buttons are needed on the home page, bind after partials ---- */
  function wireHeaderHooks() {
    // Example: deep-link to kits quiz when a header button is present
    // const quizBtn = document.getElementById('openQuiz');
    // if (quizBtn) quizBtn.addEventListener('click', () => {/* optional analytics */});
  }

  /* ---- Init ---- */
  document.addEventListener("DOMContentLoaded", () => {
    wirePersonas();
    revealify();
    tiltCards();
  });

  document.addEventListener("partials:loaded", wireHeaderHooks);
})();
