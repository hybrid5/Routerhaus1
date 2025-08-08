/* assets/js/kits.js
 * RouterHaus Kits — App logic (client-side)
 * Implements: robust data load + URL sync, facets, sorting, pagination,
 * chips, compare, recommendations, accessibility.
 */

(() => {
  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const LS = {
    get: (k, d = null) => {
      try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
    },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    del: (k) => localStorage.removeItem(k),
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmtMoney = (v) => (v == null ? '' : `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

  // ---------- State ----------
  const state = {
    data: [],
    filtered: [],
    recos: [],
    facets: {},           // facetKey -> Set(selected values)
    facetDefs: {},        // facetKey -> { id, label, getValues(item), elIds... }
    openDetails: LS.get('rh.details', {}), // facetKey -> boolean (open/closed)
    sort: qs.get('sort') || 'relevance',
    page: Math.max(1, Number(qs.get('page')) || 1),
    pageSize: Number(qs.get('ps')) || 12,
    compare: new Set(),
    quiz: null,           // {coverage, devices, use}
    showRecos: (qs.get('recos') ?? '1') !== '0',
  };

  // ---------- Elements ----------
  const el = {
    headerMount: byId('header-placeholder'),
    footerMount: byId('footer-placeholder'),

    filtersAside: byId('filtersAside'),
    filtersForm: byId('filtersForm'),
    quickChips: byId('quickChips'),
    emptyQuickChips: byId('emptyQuickChips'),
    expandAll: byId('expandAll'),
    collapseAll: byId('collapseAll'),
    clearAllFacets: byId('clearAllFacets'),

    matchCount: byId('matchCount'),
    activeChips: byId('activeChips'),

    sortSelect: byId('sortSelect'),
    pageSizeSelect: byId('pageSizeSelect'),
    toggleRecos: byId('toggleRecos'),

    recommendations: byId('recommendations'),
    recoGrid: byId('recoGrid'),
    recoNote: byId('recoNote'),

    paginationTop: byId('paginationTop'),
    paginationBottom: byId('paginationBottom'),

    kitsStatus: byId('kitsStatus'),
    kitsError: byId('kitsError'),

    skeletonTpl: byId('skeletonTpl'),
    cardTpl: byId('cardTpl'),
    skeletonGrid: byId('skeletonGrid'),
    resultsGrid: byId('kitResults'),
    emptyState: byId('emptyState'),

    filtersFab: byId('filtersFab'),
    filtersDrawer: byId('filtersDrawer'),
    drawerTitle: byId('drawerTitle'),
    drawerFormMount: byId('drawerFormMount'),
    applyDrawer: byId('applyDrawer'),

    openFiltersHeader: byId('openFiltersHeader'),

    openQuiz: byId('openQuiz'),
    editQuiz: byId('editQuiz'),
    copyLink: byId('copyLink'),
    resetAll: byId('resetAll'),

    comparePanel: byId('comparePanel'),
    compareItemsPanel: byId('compareItemsPanel'),
    clearCompare: byId('clearCompare'),
    compareDrawer: byId('compareDrawer'),
    compareItems: byId('compareItems'),
    clearCompareMobile: byId('clearCompareMobile'),
    compareSticky: byId('compareSticky'),
    compareCount: byId('compareCount'),

    // badges
    badge_brand: byId('badge-brand'),
    badge_wifi: byId('badge-wifiGen'),
    badge_mesh: byId('badge-meshReady'),
    badge_wan: byId('badge-wanTier'),
    badge_cov: byId('badge-coverageBucket'),
    badge_dev: byId('badge-deviceLoad'),
    badge_use: byId('badge-primaryUse'),
    badge_price: byId('badge-priceBucket'),

    // facet containers
    facet_brand: byId('facet-brand'),
    facet_wifiGen: byId('facet-wifiGen'),
    facet_wifiBands: byId('facet-wifiBands'),
    facet_meshReady: byId('facet-meshReady'),
    facet_meshEco: byId('facet-meshEco'),
    facet_wanTier: byId('facet-wanTier'),
    facet_lanCount: byId('facet-lanCount'),
    facet_multiGigLan: byId('facet-multiGigLan'),
    facet_usb: byId('facet-usb'),
    facet_coverageBucket: byId('facet-coverageBucket'),
    facet_deviceLoad: byId('facet-deviceLoad'),
    facet_primaryUse: byId('facet-primaryUse'),
    facet_access: byId('facet-access'),
    facet_priceBucket: byId('facet-priceBucket'),
  };

  // ---------- Partial mounts (header/footer) ----------
  // Simple fetch to avoid CLS: header BEFORE main is already in HTML.
  // We still mount external partial HTML if present.
  const mountPartial = async (target) => {
    const path = target?.dataset?.partial;
    if (!path) return;
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) target.innerHTML = await res.text();
    } catch {}
  };

  // ---------- Fetch data (with fallback) ----------
  const getJsonUrl = () => (window.RH_CONFIG?.jsonUrl || 'kits.json');
  const fetchData = async () => {
    let urls = [getJsonUrl()];
    // fallback to ./kits.json if a nested path is used
    if (!urls[0].startsWith('./')) urls.push('./kits.json');

    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (!res.ok) continue;
        const arr = await res.json();
        if (Array.isArray(arr)) return arr.map(deriveFields);
      } catch (e) { /* try next */ }
    }
    throw new Error('Unable to load kits.json');
  };

  // ---------- Derive fields ----------
  function deriveFields(x, idx) {
    const o = { ...x };
    o.id = o.id ?? `k_${idx}_${(o.model || '').replace(/\W+/g, '').slice(0,12)}`;
    o.brand = o.brand || o.manufacturer || guessBrand(o.model);
    o.wifiStandard = normWifi(o.wifiStandard || o.wifi || '');
    o.wifiBands = o.wifiBands || guessBands(o);
    o.meshReady = !!(o.meshReady ?? /mesh/i.test(o.model || ''));
    o.coverageSqft = Number(o.coverageSqft ?? o.coverage ?? 0);
    o.coverageBucket = coverageToBucket(o.coverageSqft);
    o.maxWanSpeedMbps = Number(o.maxWanSpeedMbps ?? o.wan ?? 0);
    o.wanTier = wanToTier(o.maxWanSpeedMbps);
    o.lanCount = Number(o.lanCount ?? 0);
    o.multiGigLan = !!o.multiGigLan;
    o.usb = !!o.usb;
    o.deviceLoad = o.deviceLoad || '6–15';
    o.primaryUse = o.primaryUse || 'All-Purpose';
    o.accessSupport = o.accessSupport || ['Cable','Fiber'];
    o.priceUsd = Number(o.priceUsd ?? 0);
    o.priceBucket = priceToBucket(o.priceUsd);
    o.reviews = Number(o.reviews ?? 0);
    o.img = o.img || o.image || '';
    o.url = o.url || '#';
    // simple relevance score
    o._score = (o.wifiStandard === '7' ? 5 : o.wifiStandard === '6E' ? 4 : o.wifiStandard === '6' ? 3 : 1)
             + (o.meshReady ? 1 : 0)
             + (o.wanTier >= 2500 ? 1 : 0)
             + (o.priceUsd > 0 ? 1 : 0);
    return o;
  }

  const guessBrand = (m) => (m || '').split(' ')[0] || 'Unknown';
  const normWifi = (w) => {
    const s = String(w).toUpperCase().replace('WIFI','WI-FI').replace('WI-FI ','').replace('WIFI ','');
    if (/7/.test(s)) return '7';
    if (/6E/.test(s)) return '6E';
    if (/6/.test(s)) return '6';
    if (/5/.test(s)) return '5';
    return '6';
  };
  const guessBands = (o) => {
    if (/6E|7/.test(o.wifiStandard)) return ['2.4','5','6'];
    return ['2.4','5'];
  };
  const coverageToBucket = (sq) => {
    if (sq <= 1800) return 'Apartment/Small';
    if (sq <= 3000) return '2–3 Bedroom';
    return 'Large/Multi-floor';
  };
  const wanToTier = (mbps) => {
    if (mbps >= 10000) return 10000;
    if (mbps >= 5000) return 5000;
    if (mbps >= 2500) return 2500;
    if (mbps >= 1000) return 1000;
    if (mbps >= 500) return 500;
    if (mbps >= 250) return 250;
    return 200;
  };
  const priceToBucket = (p) => {
    if (p <= 150) return '$';
    if (p <= 300) return '$$';
    if (p <= 500) return '$$$';
    return '$$$$';
  };

  // ---------- URL sync ----------
  const syncUrl = () => {
    const qs2 = new URLSearchParams();
    if (state.sort !== 'relevance') qs2.set('sort', state.sort);
    if (state.page > 1) qs2.set('page', String(state.page));
    if (state.pageSize !== 12) qs2.set('ps', String(state.pageSize));
    if (!state.showRecos) qs2.set('recos', '0');
    // facets
    for (const [k, vals] of Object.entries(state.facets)) {
      if (vals.size) qs2.set(k, [...vals].join(','));
    }
    const qStr = qs2.toString();
    history.replaceState(null, '', qStr ? `?${qStr}` : location.pathname);
  };

  // ---------- Facet defs & building ----------
  function buildFacetDefs() {
    state.facetDefs = {
      brand: {
        id: 'brand',
        label: 'Brand',
        el: el.facet_brand,
        badge: el.badge_brand,
        getValues: (o) => [o.brand],
      },
      wifi: {
        id: 'wifi',
        label: 'Wi-Fi',
        el: el.facet_wifiGen,
        badge: el.badge_wifi,
        getValues: (o) => [o.wifiStandard],
      },
      bands: {
        id: 'bands',
        label: 'Bands',
        el: el.facet_wifiBands,
        getValues: (o) => o.wifiBands || [],
      },
      mesh: {
        id: 'mesh',
        label: 'Mesh',
        el: el.facet_meshReady,
        badge: el.badge_mesh,
        getValues: (o) => [o.meshReady ? 'Mesh-ready' : 'Standalone'],
        map: {
          'Mesh-ready': (o) => !!o.meshReady,
          'Standalone':  (o) => !o.meshReady,
        }
      },
      wan: {
        id: 'wan',
        label: 'WAN Tier',
        el: el.facet_wanTier,
        badge: el.badge_wan,
        getValues: (o) => [String(o.wanTier)],
      },
      lanCount: {
        id: 'lanCount',
        label: 'LAN Ports',
        el: el.facet_lanCount,
        getValues: (o) => [String(o.lanCount)],
      },
      multiGigLan: {
        id: 'multiGigLan',
        label: 'Multi-Gig LAN',
        el: el.facet_multiGigLan,
        getValues: (o) => [o.multiGigLan ? 'Yes' : 'No'],
      },
      usb: {
        id: 'usb',
        label: 'USB',
        el: el.facet_usb,
        getValues: (o) => [o.usb ? 'Yes' : 'No'],
      },
      coverage: {
        id: 'coverage',
        label: 'Coverage',
        el: el.facet_coverageBucket,
        badge: el.badge_cov,
        getValues: (o) => [o.coverageBucket],
      },
      device: {
        id: 'device',
        label: 'Device Load',
        el: el.facet_deviceLoad,
        badge: el.badge_dev,
        getValues: (o) => [o.deviceLoad],
      },
      use: {
        id: 'use',
        label: 'Primary Use',
        el: el.facet_primaryUse,
        badge: el.badge_use,
        getValues: (o) => [o.primaryUse],
      },
      access: {
        id: 'access',
        label: 'Access',
        el: el.facet_access,
        getValues: (o) => o.accessSupport || [],
      },
      price: {
        id: 'price',
        label: 'Price',
        el: el.facet_priceBucket,
        badge: el.badge_price,
        getValues: (o) => [o.priceBucket],
      },
    };

    // Initialize selected facets from URL
    for (const key of Object.keys(state.facetDefs)) {
      const urlKey = key; // keep keys simple
      const val = qs.get(urlKey);
      state.facets[key] = new Set(val ? val.split(',') : []);
    }
  }

  function facetOptionsFromData() {
    const opts = {};
    for (const key of Object.keys(state.facetDefs)) opts[key] = new Set();
    for (const o of state.data) {
      for (const [key, def] of Object.entries(state.facetDefs)) {
        def.getValues(o).forEach(v => v != null && String(v).trim() && opts[key].add(String(v)));
      }
    }
    // Some curated orders
    order(opts.wifi, ['7','6E','6','5']);
    order(opts.mesh, ['Mesh-ready','Standalone']);
    order(opts.wan, ['10000','5000','2500','1000','500','250','200']);
    order(opts.price, ['$','$$','$$$','$$$$']);
    return opts;

    function order(set, arr) {
      if (!set) return;
      const s = new Set(arr.filter(x => set.has(x)));
      [...set].forEach(x => { if (!s.has(x)) s.add(x); });
      opts[Object.keys(opts).find(k => opts[k] === set)] = s;
    }
  }

  function renderFacet(def, values) {
    if (!def.el) return;
    const selected = state.facets[def.id];
    def.el.innerHTML = '';
    for (const v of values) {
      const id = `f_${def.id}_${v.replace(/\W+/g,'')}`;
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${v}">
        <span>${v}</span>
      `;
      const input = label.querySelector('input');
      input.checked = selected.has(v);
      input.addEventListener('change', () => {
        if (input.checked) selected.add(v); else selected.delete(v);
        state.page = 1; // reset to first page on filter change
        onStateChanged({ focusAfter: label });
      });
      def.el.appendChild(label);
    }
    // update badge visibility
    if (def.badge) {
      const n = selected.size;
      def.badge.textContent = String(n);
      def.badge.style.visibility = n ? 'visible' : 'hidden';
    }
  }

  function renderAllFacets() {
    const opts = facetOptionsFromData();
    for (const [key, def] of Object.entries(state.facetDefs)) {
      renderFacet(def, opts[key] ? [...opts[key]] : []);
      // persist open/closed
      const details = document.querySelector(`details.facet[data-facet="${key}"]`);
      if (details && typeof state.openDetails[key] === 'boolean') details.open = state.openDetails[key];
      details?.addEventListener('toggle', () => {
        state.openDetails[key] = details.open;
        LS.set('rh.details', state.openDetails);
      }, { once: true });
    }
  }

  // ---------- Filtering ----------
  function applyFilters() {
    const selected = state.facets;
    const activeAny = Object.values(selected).some(s => s.size);

    const out = state.data.filter(o => {
      // For each facet with selections, item must match at least one value of that facet.
      for (const [key, def] of Object.entries(state.facetDefs)) {
        const sel = selected[key];
        if (!sel || sel.size === 0) continue;
        const vals = new Set(def.getValues(o).map(String));
        // custom maps (boolean facets)
        if (def.map) {
          const any = [...sel].some(v => !!def.map[v]?.(o));
          if (!any) return false;
        } else {
          const any = [...sel].some(v => vals.has(v));
          if (!any) return false;
        }
      }
      return true;
    });

    state.filtered = out;
    el.emptyState.classList.toggle('hide', !(activeAny && out.length === 0));
    return out;
  }

  // ---------- Sorting ----------
  const comparators = {
    relevance: (a, b) => (b._score - a._score) || cmpPriceAsc(a,b),
    'wifi-desc': (a, b) => rankWifi(b) - rankWifi(a) || cmpPriceAsc(a,b),
    'price-asc': (a, b) => cmpPriceAsc(a,b),
    'price-desc': (a, b) => (b.priceUsd - a.priceUsd),
    'coverage-desc': (a, b) => (b.coverageSqft - a.coverageSqft) || cmpPriceAsc(a,b),
    'wan-desc': (a, b) => (b.wanTier - a.wanTier) || cmpPriceAsc(a,b),
    'reviews-desc': (a, b) => (b.reviews - a.reviews) || cmpPriceAsc(a,b),
  };
  function cmpPriceAsc(a,b){ return (a.priceUsd||Infinity) - (b.priceUsd||Infinity); }
  function rankWifi(o){ return o.wifiStandard === '7' ? 4 : o.wifiStandard === '6E' ? 3 : o.wifiStandard === '6' ? 2 : 1; }

  function sortResults() {
    const cmp = comparators[state.sort] || comparators.relevance;
    state.filtered.sort(cmp);
  }

  // ---------- Pagination ----------
  function paginate() {
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = clamp(state.page, 1, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const slice = state.filtered.slice(start, end);
    renderPagination(el.paginationTop, pageCount);
    renderPagination(el.paginationBottom, pageCount);
    return slice;
  }

  function renderPagination(container, pageCount) {
    if (!container) return;
    container.innerHTML = '';
    if (pageCount <= 1) return;

    const makeBtn = (label, page, cls = 'page') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.setAttribute('data-page', String(page));
      b.disabled = page === state.page;
      if (cls === 'page' && page === state.page) b.setAttribute('aria-current','page');
      b.addEventListener('click', () => {
        state.page = page;
        onStateChanged({ scrollToTop: true });
      });
      b.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') b.click();
      });
      return b;
    };

    const prev = makeBtn('Prev', clamp(state.page - 1, 1, pageCount), 'page prev');
    prev.classList.toggle('disabled', state.page === 1);
    prev.disabled = state.page === 1;

    const next = makeBtn('Next', clamp(state.page + 1, 1, pageCount), 'page next');
    next.classList.toggle('disabled', state.page === pageCount);
    next.disabled = state.page === pageCount;

    container.appendChild(prev);

    // Numbered pages (compact)
    const pages = numberedPages(state.page, pageCount);
    for (const p of pages) {
      if (p === '…') {
        const span = document.createElement('span');
        span.className = 'page disabled';
        span.textContent = '…';
        container.appendChild(span);
      } else {
        container.appendChild(makeBtn(String(p), p));
      }
    }

    container.appendChild(next);
  }

  function numberedPages(current, total) {
    const arr = [];
    const push = (x) => arr.push(x);
    const windowSize = 2;
    const start = Math.max(1, current - windowSize);
    const end = Math.min(total, current + windowSize);

    if (start > 1) {
      push(1);
      if (start > 2) push('…');
    }
    for (let i = start; i <= end; i++) push(i);
    if (end < total) {
      if (end < total - 1) push('…');
      push(total);
    }
    return arr;
  }

  // ---------- Chips ----------
  function renderActiveChips() {
    el.activeChips.innerHTML = '';
    let any = false;
    for (const [key, def] of Object.entries(state.facetDefs)) {
      const sel = state.facets[key];
      if (!sel || sel.size === 0) continue;
      any = true;
      for (const v of sel) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.setAttribute('role','listitem');
        chip.setAttribute('aria-label', `Remove ${def.label}: ${v}`);
        chip.innerHTML = `${def.label}: ${v} ✕`;
        chip.addEventListener('click', () => {
          sel.delete(v);
          state.page = 1;
          onStateChanged({ focusAfter: el.activeChips });
        });
        // keyboard dismissible (Enter/Space default), Esc handled globally
        el.activeChips.appendChild(chip);
      }
    }
    el.activeChips.style.display = any ? '' : 'none';
  }

  // Esc clears last facet selection
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const keys = Object.keys(state.facetDefs);
    for (let i = keys.length - 1; i >= 0; i--) {
      const sel = state.facets[keys[i]];
      if (sel && sel.size) {
        // remove the most recently added (not tracked), so remove one arbitrary
        const first = sel.values().next().value;
        sel.delete(first);
        state.page = 1;
        onStateChanged({});
        break;
      }
    }
  });

  // ---------- Compare ----------
  const MAX_COMPARE = 4;

  function toggleCompare(id) {
    if (state.compare.has(id)) {
      state.compare.delete(id);
    } else {
      if (state.compare.size >= MAX_COMPARE) {
        alert(`You can compare up to ${MAX_COMPARE}.`);
        return;
      }
      state.compare.add(id);
    }
    updateCompareUI();
  }

  function clearCompareAll() {
    state.compare.clear();
    updateCompareUI();
  }

  function updateCompareUI() {
    const items = [...state.compare].map(id => state.data.find(x => x.id === id)).filter(Boolean);

    // Sidebar panel (desktop)
    el.compareItemsPanel.innerHTML = '';
    for (const it of items) el.compareItemsPanel.appendChild(compareBadge(it, 'panel'));

    // Mobile drawer bar
    el.compareItems.innerHTML = '';
    for (const it of items) el.compareItems.appendChild(compareBadge(it, 'drawer'));

    // Sticky button + count
    el.compareCount.textContent = String(items.length);
    el.compareSticky.hidden = items.length === 0;

    // Clear buttons
    el.clearCompare?.addEventListener('click', clearCompareAll, { once: true });
    el.clearCompareMobile?.addEventListener('click', clearCompareAll, { once: true });

    // Toggle compare button pressed state on cards
    $$('.compare-btn').forEach(btn => {
      const id = btn.closest('.product')?.dataset?.id;
      btn.setAttribute('aria-pressed', state.compare.has(id) ? 'true' : 'false');
    });

    // Mobile drawer visibility
    if (items.length === 0) {
      el.compareDrawer.hidden = true;
    }
  }

  function compareBadge(it) {
    const span = document.createElement('span');
    span.className = 'item';
    span.textContent = it.model;
    span.title = it.model;
    span.addEventListener('click', () => { toggleCompare(it.id); });
    return span;
  }

  el.compareSticky?.addEventListener('click', () => {
    el.compareDrawer.hidden = !el.compareDrawer.hidden;
  });

  // ---------- Recommendations ----------
  function computeRecommendations() {
    if (!state.quiz) return [];
    const { coverage, devices, use } = state.quiz;

    return state.data
      .filter(o => (
        (!coverage || o.coverageBucket === coverage) &&
        (!devices || o.deviceLoad === devices) &&
        (!use || o.primaryUse === use)
      ))
      .sort((a,b) => (rankWifi(b) - rankWifi(a)) || (b._score - a._score))
      .slice(0, 8);
  }

  function renderRecommendations() {
    if (!state.showRecos) {
      el.recommendations.style.display = 'none';
      return;
    }
    const rec = computeRecommendations();
    el.recommendations.style.display = rec.length ? '' : 'none';
    el.recoGrid.innerHTML = '';
    el.recoNote.textContent = state.quiz ? 'Based on your quiz answers' : 'Top picks right now';
    for (const o of rec) {
      el.recoGrid.appendChild(renderCard(o));
    }
  }

  // ---------- Results rendering ----------
  function renderSkeletons(n = state.pageSize) {
    el.skeletonGrid.innerHTML = '';
    el.skeletonGrid.style.display = '';
    for (let i = 0; i < n; i++) {
      el.skeletonGrid.appendChild(el.skeletonTpl.content.cloneNode(true));
    }
  }
  function hideSkeletons() {
    el.skeletonGrid.style.display = 'none';
  }

  function renderResults(items) {
    el.resultsGrid.innerHTML = '';
    for (const o of items) {
      el.resultsGrid.appendChild(renderCard(o));
    }
  }

  function renderCard(o) {
    const node = el.cardTpl.content.cloneNode(true);
    const art = node.querySelector('article');
    art.dataset.id = o.id;

    const img = node.querySelector('img');
    if (o.img) img.src = o.img; else img.remove();
    img.alt = o.model || 'Router image';

    node.querySelector('.title').textContent = o.model;
    const chips = node.querySelector('.chips.line');
    chips.appendChild(chip(`Wi-Fi ${o.wifiStandard}`));
    if (o.meshReady) chips.appendChild(chip('Mesh'));
    chips.appendChild(chip(`${o.wanTier >= 1000 ? o.wanTier/1000 + 'G' : o.wanTier + 'Mbps'} WAN`));
    chips.appendChild(chip(o.coverageBucket));

    const specs = node.querySelector('.specs');
    specs.appendChild(li(`${(o.wifiBands||[]).join(' / ')} GHz`));
    specs.appendChild(li(`${o.lanCount} LAN • Multi-Gig ${o.multiGigLan ? 'Yes' : 'No'}`));
    specs.appendChild(li(`${(o.accessSupport||[]).join(', ')}`));

    node.querySelector('.price').textContent = fmtMoney(o.priceUsd);
    const buy = node.querySelector('.ctaRow a');
    buy.href = o.url || '#';

    const cmpBtn = node.querySelector('.compare-btn');
    cmpBtn.setAttribute('aria-pressed', state.compare.has(o.id) ? 'true' : 'false');
    cmpBtn.addEventListener('click', () => toggleCompare(o.id));

    return node;

    function chip(t){ const s=document.createElement('span'); s.className='chip'; s.textContent=t; return s; }
    function li(t){ const li=document.createElement('li'); li.textContent=t; return li; }
  }

  // ---------- Toolbar handlers ----------
  function wireToolbar() {
    // sort
    if (el.sortSelect) {
      el.sortSelect.value = state.sort;
      el.sortSelect.addEventListener('change', () => {
        state.sort = el.sortSelect.value;
        state.page = 1;
        onStateChanged({});
      });
    }
    // page size
    if (el.pageSizeSelect) {
      el.pageSizeSelect.value = String(state.pageSize);
      el.pageSizeSelect.addEventListener('change', () => {
        state.pageSize = Number(el.pageSizeSelect.value);
        state.page = 1;
        onStateChanged({});
      });
    }
    // recos toggle
    if (el.toggleRecos) {
      el.toggleRecos.checked = state.showRecos;
      el.toggleRecos.addEventListener('change', () => {
        state.showRecos = el.toggleRecos.checked;
        syncUrl();
        renderRecommendations();
      });
    }
    // filters open (header button)
    el.openFiltersHeader?.addEventListener('click', openDrawer);
  }

  // ---------- Drawer (mobile filters) ----------
  function openDrawer() {
    el.drawerFormMount.innerHTML = '';
    // clone the existing form markup into drawer
    const clone = el.filtersForm.cloneNode(true);
    // Ensure IDs remain unique? We're safe because listeners are attached via event bubbling on inputs.
    el.drawerFormMount.appendChild(clone);
    el.filtersDrawer.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('scroll-lock');

    // Close buttons
    $$('[data-close-drawer]').forEach(b => b.addEventListener('click', closeDrawer, { once: true }));
    el.applyDrawer.onclick = () => {
      // copy checked states back to main form
      // map by input value paths
      syncChecks(clone, el.filtersForm);
      closeDrawer();
      onStateChanged({});
    };

    function syncChecks(src, dst){
      const map = new Map();
      $$('input[type="checkbox"]', src).forEach(i => map.set(i.value + '::' + i.closest('.facet')?.dataset?.facet, i.checked));
      $$('input[type="checkbox"]', dst).forEach(i => {
        const key = i.value + '::' + i.closest('.facet')?.dataset?.facet;
        if (map.has(key)) i.checked = map.get(key);
      });
      // rebuild state.facets from DOM (safer)
      rebuildFacetSelectionsFromDOM();
    }
  }
  function closeDrawer() {
    el.filtersDrawer.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('scroll-lock');
  }

  // ---------- Form-wide controls ----------
  function wireFacetsControls() {
    // Per-facet clear buttons
    $$('.facet-clear,[class*="facet__clear"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.clear;
        if (!key) return;
        (state.facets[key] || new Set()).clear();
        // Uncheck DOM inputs of that facet
        const boxen = $$(`details.facet[data-facet="${key}"] input[type="checkbox"]`);
        boxen.forEach(b => { b.checked = false; });
        state.page = 1;
        onStateChanged({ focusAfter: btn });
      });
    });

    // Expand / Collapse all
    el.expandAll?.addEventListener('click', () => {
      $$('details.facet').forEach(d => { d.open = true; state.openDetails[d.dataset.facet] = true; });
      LS.set('rh.details', state.openDetails);
    });
    el.collapseAll?.addEventListener('click', () => {
      $$('details.facet').forEach(d => { d.open = false; state.openDetails[d.dataset.facet] = false; });
      LS.set('rh.details', state.openDetails);
    });

    // Clear all
    el.clearAllFacets?.addEventListener('click', () => {
      for (const k of Object.keys(state.facets)) state.facets[k].clear();
      $$('input[type="checkbox"]', el.filtersForm).forEach(i => { i.checked = false; });
      state.page = 1;
      onStateChanged({});
    });
  }

  function rebuildFacetSelectionsFromDOM() {
    for (const [key, def] of Object.entries(state.facetDefs)) {
      const sel = new Set();
      $$(`details.facet[data-facet="${key}"] input[type="checkbox"]`).forEach(i => { if (i.checked) sel.add(i.value); });
      state.facets[key] = sel;
    }
  }

  // ---------- Status / A11y ----------
  function updateCounts() {
    const total = state.filtered.length;
    const all = state.data.length;
    el.matchCount.textContent = `${total} match${total===1?'':'es'} / ${all}`;
    el.kitsStatus.textContent = `Showing ${Math.min(total, state.pageSize)} of ${total} matches`;
  }

  // ---------- Quick chips ----------
  function renderQuickChips() {
    const make = (label, fn) => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip';
      c.textContent = label;
      c.addEventListener('click', () => {
        fn();
        state.page = 1;
        onStateChanged({});
      });
      return c;
    };
    const picks = [
      ['Wi-Fi 7', () => state.facets.wifi.add('7')],
      ['Mesh only', () => { state.facets.mesh.clear(); state.facets.mesh.add('Mesh-ready'); }],
      ['2.5G+ WAN', () => { ['2500','5000','10000'].forEach(v => state.facets.wan.add(v)); }],
      ['Budget', () => { state.facets.price.clear(); state.facets.price.add('$'); }],
    ];
    el.quickChips.innerHTML = '';
    for (const [l, fn] of picks) el.quickChips.appendChild(make(l, fn));

    el.emptyQuickChips.innerHTML = '';
    for (const [l, fn] of picks) el.emptyQuickChips.appendChild(make(l, fn));
  }

  // ---------- Copy link / Reset ----------
  el.copyLink?.addEventListener('click', async () => {
    syncUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      el.copyLink.textContent = 'Copied!';
      setTimeout(() => el.copyLink.textContent = 'Copy link', 1200);
    } catch {}
  });
  el.resetAll?.addEventListener('click', () => {
    for (const k of Object.keys(state.facets)) state.facets[k].clear();
    state.sort = 'relevance';
    state.page = 1;
    state.pageSize = 12;
    state.showRecos = true;
    state.quiz = null;
    state.compare.clear();
    $$('input[type="checkbox"]', el.filtersForm).forEach(i => { i.checked = false; });
    el.sortSelect.value = state.sort;
    el.pageSizeSelect.value = String(state.pageSize);
    el.toggleRecos.checked = state.showRecos;
    onStateChanged({});
  });

  // ---------- Quiz wiring (interop with quiz-modal.js) ----------
  // Expose a function for the quiz module to call after submit.
  window.RH_APPLY_QUIZ = (answers) => {
    // answers: { coverage, devices, use }
    state.quiz = answers;
    // prefill facets
    if (answers.coverage) { state.facets.coverage.clear(); state.facets.coverage.add(answers.coverage); }
    if (answers.devices)  { state.facets.device.clear(); state.facets.device.add(answers.devices); }
    if (answers.use)      { state.facets.use.clear(); state.facets.use.add(answers.use); }
    // ensure recos visible
    state.showRecos = true;
    el.toggleRecos.checked = true;
    onStateChanged({ scrollToRecos: true });
    // show Edit button
    el.editQuiz?.removeAttribute('hidden');
  };
  // Edit answers reopens the quiz modal (quiz-modal.js listens for this)
  el.editQuiz?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('quiz:edit')));

  // ---------- Life-cycle ----------
  async function init() {
    await Promise.all([mountPartial(el.headerMount), mountPartial(el.footerMount)]);

    // Pre-render skeletons
    renderSkeletons(12);

    // Load data
    try {
      state.data = await fetchData();
      hideSkeletons();
    } catch (e) {
      hideSkeletons();
      el.kitsError.classList.remove('hide');
      el.kitsError.textContent = 'Failed to load kits. Please try again later.';
      return;
    }

    // Build facets & UI
    buildFacetDefs();
    renderAllFacets();
    wireFacetsControls();
    wireToolbar();
    renderQuickChips();

    // Apply initial URL state to controls
    for (const [key] of Object.entries(state.facetDefs)) {
      const details = document.querySelector(`details.facet[data-facet="${key}"]`);
      if (!details) continue;
      // sync inputs
      $$('input[type="checkbox"]', details).forEach(i => {
        if (state.facets[key]?.has(i.value)) i.checked = true;
      });
    }

    // Initial render
    onStateChanged({ initial: true });
  }

  // Core update pipeline
  function onStateChanged(opts) {
    syncUrl();
    renderActiveChips();

    // Update badge counts
    for (const [key, def] of Object.entries(state.facetDefs)) {
      if (def.badge) {
        const n = state.facets[key]?.size || 0;
        def.badge.textContent = String(n);
        def.badge.style.visibility = n ? 'visible' : 'hidden';
      }
    }

    applyFilters();
    sortResults();

    updateCounts();

    const pageItems = paginate();
    renderResults(pageItems);
    renderRecommendations();
    updateCompareUI();

    // Friendly empty state
    el.emptyState.classList.toggle('hide', state.filtered.length > 0);

    // Focus management
    if (opts?.focusAfter && opts.focusAfter.focus) {
      requestAnimationFrame(() => opts.focusAfter.focus());
    }
    // Scroll behaviors
    if (opts?.scrollToTop) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (opts?.scrollToRecos) el.recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Card click delegation (compare etc.) ----------
  el.resultsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.compare-btn');
    if (!btn) return;
    const id = e.target.closest('.product')?.dataset?.id;
    if (id) toggleCompare(id);
  });

  // --------- Start Recommendation Quiz Modal -------
  document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('quiz') === '1') {
    const btn = document.getElementById('openQuiz');
    if (btn) btn.click();
  }
});

  // ---------- Misc wiring ----------
  // Make chips keyboard-friendly already by being buttons; nothing else needed.

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();

