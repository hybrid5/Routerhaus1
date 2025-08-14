// ============================
//   RouterHaus v5 – scripts.js
//   Partials + global UI wiring
//   Emits `partials:loaded`
// ============================
"use strict";

/* ---------- Utilities ---------- */
const debounce = (fn, d = 200) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, a), d);
  };
};
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- Toast (lightweight) ---------- */
function showToast(msg, type = "success") {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    Object.assign(c.style, {
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      zIndex: "1100",
      display: "flex",
      flexDirection: "column",
      gap: ".5rem",
    });
    c.id = "toast-container";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  const bg = type === "error" ? "#FF6B7B" : type === "info" ? "#00CFFD" : "#37C978";
  Object.assign(t.style, {
    padding: "0.8rem 1.2rem",
    borderRadius: "8px",
    color: "#fff",
    background: bg,
    opacity: "0",
    transform: "translateY(10px)",
    transition: "all .3s ease",
  });
  c.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.addEventListener("transitionend", () => t.remove());
  }, 3400);
}

/* ---------- Partials ---------- */
async function loadPartials() {
  const headHolder = document.getElementById("header-placeholder");
  if (headHolder) {
    try {
      const h = await fetch("header.html", { cache: "no-store" });
      if (h.ok) headHolder.outerHTML = await h.text();
    } catch {}
  }
  const footHolder = document.getElementById("footer-placeholder");
  if (footHolder) {
    try {
      const f = await fetch("footer.html", { cache: "no-store" });
      if (f.ok) footHolder.outerHTML = await f.text();
    } catch {}
  }
  document.dispatchEvent(new CustomEvent("partials:loaded"));
}

/* ---------- UI Wiring ---------- */
function initUI() {
  const header = document.querySelector(".navbar");
  const hamburger = document.getElementById("hamburger-menu");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const themeToggle = document.getElementById("theme-toggle");

  /* Sticky header blur / elevation */
  if (header) {
    const onScroll = debounce(() => {
      const active = (window.scrollY || document.documentElement.scrollTop) > 50;
      header.style.backdropFilter = active ? "blur(26px)" : "blur(0px)";
      header.style.webkitBackdropFilter = header.style.backdropFilter;
      header.style.boxShadow = active ? "var(--shadow)" : "none";
    }, 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Sidebar (mobile nav) + body lock */
  if (hamburger && sidebar && overlay) {
    const lock = (on) => {
      document.documentElement.style.overflow = on ? "hidden" : "";
      document.body.style.overflow = on ? "hidden" : "";
    };
    const isOpen = () => sidebar.classList.contains("active");
    const toggleSidebar = (force) => {
      const open = typeof force === "boolean" ? force : !isOpen();
      sidebar.classList.toggle("active", open);
      hamburger.classList.toggle("active", open);
      overlay.classList.toggle("active", open);
      hamburger.setAttribute("aria-expanded", String(open));
      sidebar.setAttribute("aria-hidden", String(!open));
      lock(open);
    };
    hamburger.addEventListener("click", () => toggleSidebar());
    overlay.addEventListener("click", () => toggleSidebar(false));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) toggleSidebar(false);
    });

    // Delegated smooth-scroll for in-page anchors; also closes sidebar if open
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute("href");
      const target = href ? document.querySelector(href) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (isOpen()) toggleSidebar(false);
    });
  } else {
    // Smooth-scroll on pages without sidebar
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute("href");
      const target = href ? document.querySelector(href) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* Theme toggle — respects system; persists manual override; toast only on manual */
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  let userOverride = localStorage.getItem("themeOverride");

  const applyTheme = (mode, silent = false) => {
    document.documentElement.dataset.theme = mode;
    if (themeToggle) themeToggle.textContent = mode === "dark" ? "Light Mode" : "Dark Mode";
    if (!silent) showToast(mode === "dark" ? "Dark mode on" : "Light mode on", "info");
  };

  const initialAttr = document.documentElement.getAttribute("data-theme");
  const initialMode = userOverride || initialAttr || (prefersDark.matches ? "dark" : "light");
  applyTheme(initialMode, true);

  prefersDark.addEventListener("change", (e) => {
    if (!userOverride) applyTheme(e.matches ? "dark" : "light", true);
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const newMode = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      userOverride = newMode;
      localStorage.setItem("themeOverride", newMode);
      applyTheme(newMode, false);
    });
  }

  /* Simple accordion (any .accordion-item) */
  $$(".accordion-item").forEach((item) => {
    item.addEventListener("click", () => item.classList.toggle("open"));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.classList.toggle("open");
      }
    });
    item.setAttribute("tabindex", "0");
  });
}

/* ---------- DOM Ready ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadPartials();
  initUI();
});
