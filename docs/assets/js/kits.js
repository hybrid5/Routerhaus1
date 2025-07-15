"use strict";

let kitsData = [];

const elements = {
  wifi: document.getElementById('wifiFilter'),
  env: document.getElementById('envFilter'),
  access: document.getElementById('accessFilter'),
  speed: document.getElementById('speedFilter'),
  mesh: document.getElementById('meshFilter'),
  results: document.getElementById('kitResults')
};

function cardTemplate(k) {
  return `<article class="product glass">
  <h4>${k.model}</h4>
  <p class="tag">Wi-Fi ${k.wifiStandard} • ${k.coverageSqft.toLocaleString()} sq ft</p>
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

  if (wifi) res = res.filter(k => k.wifiStandard === wifi);
  if (env) res = res.filter(k => k.environmentPreset === env);
  if (access) res = res.filter(k => k.accessSupport.includes(access));
  if (!isNaN(speed)) res = res.filter(k => k.maxWanSpeedMbps >= speed);
  if (mesh) res = res.filter(k => k.meshReady);

  renderResults(res);
}

function renderResults(list) {
  if (!list.length) {
    elements.results.innerHTML = '<p>No matches</p>';
    return;
  }
  elements.results.innerHTML = list.map(cardTemplate).join('\n');
}

async function init() {
  const resp = await fetch('kits.json');
  kitsData = await resp.json();
  applyFilters();
}

['wifi','env','access','speed','mesh'].forEach(id =>
  elements[id].addEventListener('change', applyFilters)
);

document.addEventListener('DOMContentLoaded', init);
