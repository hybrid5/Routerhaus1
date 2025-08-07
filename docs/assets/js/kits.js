"use strict";

let kitsData = [];

const elements = {
  wifi: document.getElementById('wifiFilter'),
  env: document.getElementById('envFilter'),
  access: document.getElementById('accessFilter'),
  speed: document.getElementById('speedFilter'),
  mesh: document.getElementById('meshFilter'),
  device: document.getElementById('deviceFilter'),
  usage: document.getElementById('usageFilter'),
  results: document.getElementById('kitResults')
};

function cardTemplate(k) {
  const chips = [`<span class="chip">Wi-Fi ${k.wifiStandard}</span>`];
  if (k.meshReady) chips.push('<span class="chip">Mesh</span>');
  return `<article class="product glass">
  <h4>${k.model}</h4>
  <p class="tag">${chips.join(' ')} • ${k.coverageSqft.toLocaleString()} sq ft</p>
  <p>$${k.priceUsd}</p>
</article>`;
}

function applyFilters() {
  let res = kitsData;
  const wifi = elements.wifi.value;
  const env = elements.env.value;
  const access = elements.access.value;
  const speed = parseInt(elements.speed.value, 10);
  const mesh = elements.mesh.value === 'mesh';
  const device = elements.device ? elements.device.value : '';
  const usage = elements.usage ? elements.usage.value : '';

  if (wifi) res = res.filter(k => k.wifiStandard === wifi);
  if (env) res = res.filter(k => k.environmentPreset === env);
  if (access) res = res.filter(k => k.accessSupport.includes(access));
  if (!isNaN(speed)) res = res.filter(k => k.maxWanSpeedMbps >= speed);
  if (mesh) res = res.filter(k => k.meshReady);
  if (device) res = res.filter(k => k.deviceLoad ? k.deviceLoad === device : true);
  if (usage) res = res.filter(k => k.primaryUse ? k.primaryUse.includes(usage) : true);

  res = [...res].sort((a, b) => a.priceUsd - b.priceUsd);

  renderResults(res);
}

function renderResults(list) {
  if (!list.length) {
    elements.results.innerHTML = '<p>No matches</p>';
    return;
  }
  elements.results.innerHTML = list.map(cardTemplate).join('\n');
}

const STORE_KEY = 'rh-kit-filters';

function saveFilters() {
  const data = {};
  ['wifi','env','access','speed','mesh','device','usage'].forEach(k => {
    if (elements[k]) data[k] = elements[k].value;
  });
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function loadFilters() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      ['wifi','env','access','speed','mesh','device','usage'].forEach(k => {
        if (data[k] !== undefined && elements[k]) elements[k].value = data[k];
      });
    } catch(e) {}
  }
}

async function init() {
  loadFilters();
  try {
    const resp = await fetch('routers_full_combined.json');
    if (!resp.ok) throw new Error('Fetch failed');
    kitsData = await resp.json();
    applyFilters();
  } catch (err) {
    elements.results.textContent = 'Could not load kits.';
  }
}

['wifi','env','access','speed','mesh','device','usage'].forEach(id => {
  if (elements[id]) {
    elements[id].addEventListener('change', () => { saveFilters(); applyFilters(); });
  }
});

const clearBtn = document.getElementById('clearFilters');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    ['wifi','env','access','speed','mesh','device','usage'].forEach(k => {
      if (elements[k]) elements[k].value = '';
    });
    localStorage.removeItem(STORE_KEY);
    applyFilters();
  });
}

document.addEventListener('DOMContentLoaded', init);
