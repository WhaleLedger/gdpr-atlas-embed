// ============================================================
// gdpr.com.tr v2 — dashboard logic
// ============================================================
(function() {
  'use strict';

  const COMPARE_MAX = 4;
  const STATE = {
    lang: 'tr',
    selectedCode: null,
    compared: [],
    pickerSlotIndex: null,
    listFilter: 'all',
    countriesByIso: new Map(),
    coveredIsoSet: new Set(),
    countryFeatures: null
  };

  window.COUNTRIES.forEach(c => {
    STATE.countriesByIso.set(String(parseInt(c.iso_n3, 10)), c);
    STATE.coveredIsoSet.add(String(parseInt(c.iso_n3, 10)));
  });

  // ----- i18n -----
  function applyI18n(lang) {
    STATE.lang = lang;
    document.documentElement.lang = lang;
    document.body.setAttribute('data-lang', lang);
    const dict = window.I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });
    document.title = (lang === 'tr')
      ? "KVKK ve GDPR Atlas: 31 Yetki Alanı Karşılaştırması | gdpr.com.tr"
      : "KVKK & GDPR Atlas: 31-Jurisdiction Comparison | gdpr.com.tr";
    renderCountryList();
    if (STATE.selectedCode) renderRightCard(STATE.selectedCode); else renderEmptyCard();
    renderCompareSlots();
    renderCompareTable();
    if (document.getElementById('picker').classList.contains('open')) renderPickerList();
    try { localStorage.setItem('gdprhub.lang', lang); } catch (_) {}
  }
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => applyI18n(btn.getAttribute('data-lang-btn')));
  });

  // ----- Country list -----
  const listEl = document.getElementById('country-list');
  const listFilterInput = document.getElementById('list-filter');
  const listCountEl = document.getElementById('list-count');

  function frameworkMatches(framework, filter) {
    if (filter === 'all') return true;
    if (filter === 'GDPR') return framework === 'GDPR';
    if (filter === 'GDPR (EEA)') return framework === 'GDPR (EEA)';
    if (filter === 'KVKK') return framework === 'KVKK';
    return true;
  }

  function renderCountryList() {
    const I = window.I18N[STATE.lang];
    const q = (listFilterInput.value || '').toLowerCase().trim();
    const sorted = window.COUNTRIES.slice().sort((a, b) => {
      const an = a[STATE.lang].name;
      const bn = b[STATE.lang].name;
      return an.localeCompare(bn, STATE.lang === 'tr' ? 'tr' : 'en');
    });
    listEl.innerHTML = '';
    let visible = 0;
    sorted.forEach(c => {
      const r = window.resolveCountry(c, STATE.lang);
      const matchesFramework = frameworkMatches(c.framework, STATE.listFilter);
      const matchesSearch = !q || r.name.toLowerCase().includes(q);
      if (!matchesFramework || !matchesSearch) return;
      visible++;

      const row = document.createElement('button');
      row.className = 'country-row' + (STATE.selectedCode === c.code ? ' active' : '');
      row.dataset.code = c.code;

      const isInCompare = STATE.compared.includes(c.code);
      const addClass = isInCompare ? 'cr-add added' : 'cr-add';
      const addTitle = isInCompare ? (STATE.lang === 'tr' ? 'eklendi' : 'added') : (STATE.lang === 'tr' ? 'karşılaştır' : 'compare');

      row.innerHTML =
        '<span class="cr-flag">' + c.flag + '</span>' +
        '<span class="cr-name">' + r.name + '</span>' +
        '<span class="cr-framework">' + c.framework.replace('GDPR (EEA)', 'EEA') + '</span>' +
        '<button class="' + addClass + '" title="' + addTitle + '" aria-label="' + addTitle + '">' + (isInCompare ? '✓' : '+') + '</button>';

      row.addEventListener('click', e => {
        if (e.target.closest('.cr-add')) return;
        openCountry(c.code);
      });
      row.querySelector('.cr-add').addEventListener('click', e => {
        e.stopPropagation();
        if (isInCompare) return;
        addToCompare(c.code);
      });
      listEl.appendChild(row);
    });
    if (visible === 0) {
      const empty = document.createElement('div');
      empty.className = 'list-empty';
      empty.textContent = I.listEmpty;
      listEl.appendChild(empty);
    }
    listCountEl.textContent = visible;
  }
  listFilterInput.addEventListener('input', renderCountryList);
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.listFilter = chip.getAttribute('data-filter');
      renderCountryList();
    });
  });

  // ----- Right card -----
  const cardEmpty = document.getElementById('card-empty');
  const cardBody = document.getElementById('card-body');

  function renderEmptyCard() {
    cardBody.hidden = true;
    cardEmpty.hidden = false;
  }

  function renderRightCard(code) {
    const c = window.COUNTRIES.find(x => x.code === code);
    if (!c) return;
    const r = window.resolveCountry(c, STATE.lang);
    const I = window.I18N[STATE.lang];

    const isInCompare = STATE.compared.includes(code);
    const isFull = STATE.compared.length >= COMPARE_MAX && !isInCompare;
    const btnLabel = isInCompare ? I.pnlAddedCompare : (isFull ? I.pnlFullCompare : I.pnlAddCompare);
    const btnIcon = isInCompare
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    cardBody.innerHTML =
      '<div class="card-flag">' + c.flag + '</div>' +
      '<div class="card-framework">' + c.framework + ' · ' + c.year + '</div>' +
      '<h3 class="card-title">' + r.name + '</h3>' +
      '<div class="card-law">' + r.lawTitle + '</div>' +
      '<button class="card-add-cmp ' + (isInCompare ? 'added' : '') + '" id="card-add-cmp" ' + (isFull ? 'disabled' : '') + '>' + btnIcon + '<span>' + btnLabel + '</span></button>' +
      '<div class="card-summary">' + r.summary + '</div>' +
      '<div class="card-fact-row">' +
        '<div class="card-fact"><div class="card-fact-label">' + I.pnlRegulator + '</div><div class="card-fact-value">' + r.regulator + '</div></div>' +
        '<div class="card-fact"><div class="card-fact-label">' + I.pnlMaxFine + '</div><div class="card-fact-value">' + r.maxFine + '</div></div>' +
      '</div>' +
      '<div class="card-section"><h5>' + I.pnlRights + '</h5><div class="card-tags">' + r.rights.map(x => '<span>' + x + '</span>').join('') + '</div></div>' +
      '<div class="card-section"><h5>' + I.pnlBases + '</h5><div class="card-tags">' + r.bases.map(x => '<span>' + x + '</span>').join('') + '</div></div>' +
      '<div class="card-section"><h5>' + I.pnlExtraterritorial + '</h5><p>' + r.extraterritorial + '</p></div>' +
      '<div class="card-section"><h5>' + I.pnlNotable + '</h5><p>' + r.notable + '</p></div>' +
      '<div class="card-section"><h5>' + I.pnlSource + '</h5><p><a href="' + r.regulatorUrl + '" target="_blank" rel="noopener">' + r.regulatorUrl.replace('https://','') + ' ↗</a></p></div>';

    cardBody.hidden = false;
    cardEmpty.hidden = true;

    const btn = document.getElementById('card-add-cmp');
    if (btn && !isFull) {
      btn.addEventListener('click', () => {
        if (STATE.compared.includes(code)) {
          document.getElementById('compare-table-section').scrollIntoView({ behavior: 'smooth' });
          return;
        }
        addToCompare(code);
        renderRightCard(code);
      });
    }
  }

  function openCountry(code) {
    STATE.selectedCode = code;
    document.querySelectorAll('.country-row.active').forEach(el => el.classList.remove('active'));
    const activeRow = document.querySelector('.country-row[data-code="' + code + '"]');
    if (activeRow) {
      activeRow.classList.add('active');
      activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    renderRightCard(code);
    const c = window.COUNTRIES.find(x => x.code === code);
    if (c && window.__globe) {
      window.__globe.highlight(c.iso_n3);
      window.__globe.rotateTo(c.lat, c.lon);
    }
  }
  window.openCountry = openCountry;

  // ----- Compare -----
  const slotsContainer = document.getElementById('compare-slots');
  const compareTableWrap = document.getElementById('compare-table-wrap');
  const compareEmpty = document.getElementById('compare-empty');
  const compareClearBtn = document.getElementById('compare-clear');
  const compareShowBtn = document.getElementById('compare-show-btn');

  function persistCompare() {
    try { localStorage.setItem('gdprhub.compared', JSON.stringify(STATE.compared)); } catch (_) {}
  }
  function restoreCompare() {
    try {
      const raw = localStorage.getItem('gdprhub.compared');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          STATE.compared = arr.filter(code => window.COUNTRIES.some(c => c.code === code)).slice(0, COMPARE_MAX);
        }
      }
    } catch (_) {}
  }

  function addToCompare(code) {
    if (STATE.compared.includes(code)) return;
    if (STATE.compared.length >= COMPARE_MAX) return;
    STATE.compared.push(code);
    persistCompare();
    renderCompareSlots();
    renderCompareTable();
    renderCountryList();
    if (STATE.selectedCode) renderRightCard(STATE.selectedCode);
  }
  function removeFromCompare(code) {
    STATE.compared = STATE.compared.filter(c => c !== code);
    persistCompare();
    renderCompareSlots();
    renderCompareTable();
    renderCountryList();
    if (STATE.selectedCode) renderRightCard(STATE.selectedCode);
  }
  function clearCompare() {
    STATE.compared = [];
    persistCompare();
    renderCompareSlots();
    renderCompareTable();
    renderCountryList();
    if (STATE.selectedCode) renderRightCard(STATE.selectedCode);
  }
  compareClearBtn.addEventListener('click', clearCompare);
  compareShowBtn.addEventListener('click', () => {
    document.getElementById('compare-table-section').scrollIntoView({ behavior: 'smooth' });
  });

  function renderCompareSlots() {
    const I = window.I18N[STATE.lang];
    slotsContainer.innerHTML = '';
    for (let i = 0; i < COMPARE_MAX; i++) {
      const code = STATE.compared[i];
      const slot = document.createElement('div');
      if (code) {
        const c = window.COUNTRIES.find(x => x.code === code);
        const r = window.resolveCountry(c, STATE.lang);
        slot.className = 'compare-slot filled';
        slot.innerHTML =
          '<span class="slot-flag">' + c.flag + '</span>' +
          '<span class="slot-name">' + r.name + '</span>' +
          '<span class="slot-framework">' + c.framework.replace('GDPR (EEA)', 'EEA') + '</span>' +
          '<button class="slot-remove" aria-label="remove">×</button>';
        slot.querySelector('.slot-remove').addEventListener('click', e => {
          e.stopPropagation();
          removeFromCompare(code);
        });
        slot.addEventListener('click', () => openCountry(code));
      } else {
        slot.className = 'compare-slot empty';
        slot.innerHTML =
          '<span class="slot-plus">+</span>' +
          '<span class="slot-label">' + I.slotAdd + '</span>';
        slot.addEventListener('click', () => openPicker(i));
      }
      slotsContainer.appendChild(slot);
    }
    compareShowBtn.disabled = STATE.compared.length < 2;
    compareClearBtn.classList.toggle('hidden', STATE.compared.length === 0);
  }

  // ----- Picker modal -----
  const picker = document.getElementById('picker');
  const pickerBackdrop = document.getElementById('picker-backdrop');
  const pickerList = document.getElementById('picker-list');
  const pickerFilterInput = document.getElementById('picker-filter');
  const pickerCloseBtn = document.getElementById('picker-close');

  function openPicker(slotIndex) {
    STATE.pickerSlotIndex = slotIndex;
    renderPickerList();
    picker.classList.add('open');
    pickerBackdrop.classList.add('open');
    picker.setAttribute('aria-hidden', 'false');
    setTimeout(() => pickerFilterInput.focus(), 220);
  }
  function closePicker() {
    picker.classList.remove('open');
    pickerBackdrop.classList.remove('open');
    picker.setAttribute('aria-hidden', 'true');
    pickerFilterInput.value = '';
    STATE.pickerSlotIndex = null;
  }
  pickerCloseBtn.addEventListener('click', closePicker);
  pickerBackdrop.addEventListener('click', closePicker);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && picker.classList.contains('open')) closePicker();
  });
  pickerFilterInput.addEventListener('input', () => renderPickerList());

  function renderPickerList() {
    const I = window.I18N[STATE.lang];
    const q = (pickerFilterInput.value || '').toLowerCase().trim();
    const sorted = window.COUNTRIES.slice().sort((a, b) => {
      return a[STATE.lang].name.localeCompare(b[STATE.lang].name, STATE.lang === 'tr' ? 'tr' : 'en');
    });
    pickerList.innerHTML = '';
    let visible = 0;
    sorted.forEach(c => {
      const r = window.resolveCountry(c, STATE.lang);
      const alreadyAdded = STATE.compared.includes(c.code);
      const matches = !q || r.name.toLowerCase().includes(q);
      if (!matches) return;
      visible++;
      const btn = document.createElement('button');
      btn.className = 'picker-item' + (alreadyAdded ? ' disabled' : '');
      btn.innerHTML =
        '<span class="pi-flag">' + c.flag + '</span>' +
        '<span>' + r.name + '</span>' +
        '<span class="pi-framework">' + (alreadyAdded ? (STATE.lang === 'tr' ? 'EKLENDİ' : 'ADDED') : c.framework) + '</span>';
      if (!alreadyAdded) {
        btn.addEventListener('click', () => {
          addToCompare(c.code);
          closePicker();
        });
      }
      pickerList.appendChild(btn);
    });
    if (visible === 0) {
      const e = document.createElement('div');
      e.className = 'picker-empty';
      e.textContent = I.pickerEmpty;
      pickerList.appendChild(e);
    }
  }

  // ----- Compare table -----
  function renderCompareTable() {
    const I = window.I18N[STATE.lang];
    const codes = STATE.compared;
    if (codes.length < 2) {
      compareTableWrap.classList.add('hidden');
      compareTableWrap.innerHTML = '';
      compareEmpty.classList.toggle('hidden', codes.length === 0 ? false : true);
      compareEmpty.style.display = codes.length === 0 ? '' : (codes.length === 1 ? '' : 'none');
      return;
    }
    compareEmpty.classList.add('hidden');
    compareTableWrap.classList.remove('hidden');
    const rows = codes.map(code => {
      const c = window.COUNTRIES.find(x => x.code === code);
      return { c, r: window.resolveCountry(c, STATE.lang) };
    });
    const fieldDefs = [
      { label: I.cmpFramework,        type: 'text', val: o => o.c.framework },
      { label: I.cmpYear,             type: 'text', val: o => String(o.c.year) },
      { label: I.cmpLawTitle,         type: 'text', val: o => o.r.lawTitle },
      { label: I.cmpRegulator,        type: 'text', val: o => o.r.regulator },
      { label: I.cmpMaxFine,          type: 'text', val: o => o.r.maxFine },
      { label: I.cmpRights,           type: 'tags', val: o => o.r.rights },
      { label: I.cmpBases,            type: 'tags', val: o => o.r.bases },
      { label: I.cmpExtraterritorial, type: 'text', val: o => o.r.extraterritorial },
      { label: I.cmpNotable,          type: 'text', val: o => o.r.notable },
      { label: I.cmpSource,           type: 'link', val: o => o.r.regulatorUrl }
    ];
    function normalize(v) {
      if (Array.isArray(v)) return v.slice().sort().join('|');
      return String(v || '').toLowerCase().trim();
    }
    function rowHasDiff(field) {
      const vals = rows.map(o => normalize(field.val(o)));
      return new Set(vals).size > 1;
    }
    const headerCells = rows.map(({ c, r }) =>
      '<th><span class="col-flag">' + c.flag + '</span><span class="col-name">' + r.name + '</span><span class="col-framework">' + c.framework + ' · ' + c.year + '</span></th>'
    ).join('');
    const bodyRows = fieldDefs.map(field => {
      const diff = rowHasDiff(field);
      const cells = rows.map(o => {
        const v = field.val(o);
        let html;
        if (field.type === 'tags' && Array.isArray(v)) {
          html = '<div class="tag-list">' + v.map(t => '<span>' + t + '</span>').join('') + '</div>';
        } else if (field.type === 'link') {
          html = '<a href="' + v + '" target="_blank" rel="noopener">' + String(v).replace('https://','') + ' ↗</a>';
        } else {
          html = String(v || '—');
        }
        return '<td class="' + (diff ? 'diff' : 'same') + '">' + html + '</td>';
      }).join('');
      return '<tr><th>' + field.label + '</th>' + cells + '</tr>';
    }).join('');
    compareTableWrap.innerHTML =
      '<table class="compare-table"><thead><tr><th class="col-label">' +
      (STATE.lang === 'tr' ? 'Alan' : 'Field') +
      '</th>' + headerCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table>';
  }

  // ----- Globe -----
  const TEXTURE_W = 2048;
  const TEXTURE_H = 1024;

  function lonLatToPx(lon, lat) {
    return [((lon + 180) / 360) * TEXTURE_W, ((90 - lat) / 180) * TEXTURE_H];
  }
  function tracePolygon(ctx, ring) {
    if (!ring || ring.length < 3) return;
    let started = false; let prevLon = ring[0][0];
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      if (Math.abs(lon - prevLon) > 180) { ctx.closePath(); started = false; }
      const [x, y] = lonLatToPx(lon, lat);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      prevLon = lon;
    }
  }
  function fillFeature(ctx, feature, fillStyle) {
    const g = feature.geometry; if (!g) return;
    ctx.fillStyle = fillStyle;
    if (g.type === 'Polygon') {
      ctx.beginPath();
      g.coordinates.forEach(ring => tracePolygon(ctx, ring));
      ctx.fill('evenodd');
    } else if (g.type === 'MultiPolygon') {
      g.coordinates.forEach(poly => {
        ctx.beginPath();
        poly.forEach(ring => tracePolygon(ctx, ring));
        ctx.fill('evenodd');
      });
    }
  }
  function strokeFeature(ctx, feature, strokeStyle, lineWidth) {
    const g = feature.geometry; if (!g) return;
    ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round';
    if (g.type === 'Polygon') {
      g.coordinates.forEach(ring => { ctx.beginPath(); tracePolygon(ctx, ring); ctx.stroke(); });
    } else if (g.type === 'MultiPolygon') {
      g.coordinates.forEach(poly => poly.forEach(ring => { ctx.beginPath(); tracePolygon(ctx, ring); ctx.stroke(); }));
    }
  }
  function pointInRing(pt, ring) {
    let inside = false; const x = pt[0], y = pt[1];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }
  // Bounding box for the "core" jurisdictional area: Türkiye + Europe + EEA.
  // Overseas territories of these countries (French Guiana, Réunion, Canary Islands,
  // Greenland, Madeira, Azores etc.) fall outside this box and are kept neutral.
  function isInCoreRegion(lon, lat) {
    return lat >= 33 && lat <= 75 && lon >= -28 && lon <= 45;
  }
  function ringCentroidInRegion(ring) {
    let sx = 0, sy = 0;
    for (let i = 0; i < ring.length; i++) { sx += ring[i][0]; sy += ring[i][1]; }
    return isInCoreRegion(sx / ring.length, sy / ring.length);
  }
  function filterToCoreRegion(feature) {
    const g = feature.geometry;
    if (!g) return null;
    if (g.type === 'Polygon') {
      return ringCentroidInRegion(g.coordinates[0])
        ? feature
        : null;
    }
    if (g.type === 'MultiPolygon') {
      const kept = g.coordinates.filter(poly => ringCentroidInRegion(poly[0]));
      if (kept.length === 0) return null;
      return { ...feature, geometry: { type: 'MultiPolygon', coordinates: kept } };
    }
    return feature;
  }

  function pointInFeature(pt, feature) {
    const g = feature.geometry; if (!g) return false;
    if (g.type === 'Polygon') {
      if (!pointInRing(pt, g.coordinates[0])) return false;
      for (let i = 1; i < g.coordinates.length; i++) if (pointInRing(pt, g.coordinates[i])) return false;
      return true;
    }
    if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        if (!pointInRing(pt, poly[0])) continue;
        let hole = false;
        for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) { hole = true; break; }
        if (!hole) return true;
      }
      return false;
    }
    return false;
  }

  function buildGlobe(features) {
    STATE.countryFeatures = features;
    const canvas3d = document.getElementById('globe-canvas');
    const tooltip = document.getElementById('globe-tooltip');
    const loadingEl = document.getElementById('globe-loading');
    let width = canvas3d.clientWidth, height = canvas3d.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width/height, 0.1, 1000);
    camera.position.set(0, 0, 17);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = TEXTURE_W; baseCanvas.height = TEXTURE_H;
    function renderBaseLayer() {
      const ctx = baseCanvas.getContext('2d');
      ctx.clearRect(0, 0, TEXTURE_W, TEXTURE_H);
      const grad = ctx.createLinearGradient(0, 0, 0, TEXTURE_H);
      grad.addColorStop(0, '#3d2614');
      grad.addColorStop(0.5, '#5a3a20');
      grad.addColorStop(1, '#3d2614');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
      ctx.strokeStyle = 'rgba(40,22,10,0.32)'; ctx.lineWidth = 1;
      for (let lat = -75; lat <= 75; lat += 15) {
        const y = ((90 - lat) / 180) * TEXTURE_H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEXTURE_W, y); ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 15) {
        const x = ((lon + 180) / 360) * TEXTURE_W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEXTURE_H); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 1.6;
      [0, 23.5, -23.5].forEach(lat => {
        const y = ((90 - lat) / 180) * TEXTURE_H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEXTURE_W, y); ctx.stroke();
      });
      // Pass 1: all landmass gets the base sepia.
      features.forEach(f => fillFeature(ctx, f, '#7a5430'));
      // Pass 2: covered countries get amber wash — but only their core-Europe/Turkey parts,
      //         so overseas departments (e.g. French Guiana, Réunion) don't appear "covered".
      features.forEach(f => {
        const iso = String(parseInt(f.id, 10));
        if (!STATE.coveredIsoSet.has(iso)) return;
        const filtered = filterToCoreRegion(f);
        if (filtered) fillFeature(ctx, filtered, '#d9a86a');
      });
      // Borders: all features, with covered countries getting a slightly stronger line.
      features.forEach(f => {
        const iso = String(parseInt(f.id, 10));
        const isCovered = STATE.coveredIsoSet.has(iso);
        strokeFeature(ctx, f, isCovered ? 'rgba(95,42,16,0.75)' : 'rgba(58,36,18,0.55)', isCovered ? 1.1 : 0.7);
      });
      ctx.globalCompositeOperation = 'overlay';
      for (let i = 0; i < 12000; i++) {
        ctx.fillStyle = 'rgba(255,220,170,' + (Math.random() * 0.05) + ')';
        ctx.fillRect(Math.random() * TEXTURE_W, Math.random() * TEXTURE_H, 1, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(TEXTURE_W/2, TEXTURE_H/2, TEXTURE_H*0.3, TEXTURE_W/2, TEXTURE_H/2, TEXTURE_H*0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,10,4,0.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
    }
    renderBaseLayer();

    const liveCanvas = document.createElement('canvas');
    liveCanvas.width = TEXTURE_W; liveCanvas.height = TEXTURE_H;
    const liveCtx = liveCanvas.getContext('2d');
    function compositeTexture(selectedIso) {
      liveCtx.clearRect(0, 0, TEXTURE_W, TEXTURE_H);
      liveCtx.drawImage(baseCanvas, 0, 0);
      if (selectedIso) {
        const norm = String(parseInt(selectedIso, 10));
        const feat = features.find(f => String(parseInt(f.id, 10)) === norm);
        if (feat) {
          fillFeature(liveCtx, feat, '#f0c98f');
          strokeFeature(liveCtx, feat, '#2b1d10', 2.2);
        }
      }
      texture.needsUpdate = true;
    }
    const texture = new THREE.CanvasTexture(liveCanvas);
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    const RADIUS = 5;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 96, 72), new THREE.MeshBasicMaterial({ map: texture }));
    earthGroup.add(earth);
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.06, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0xd4a574, transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false })));
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.18, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xc08b4c, transparent: true, opacity: 0.05, side: THREE.BackSide, depthWrite: false })));

    compositeTexture(null);

    let isDragging = false, prevX = 0, prevY = 0;
    let rotY = 0.3, rotX = 0.0;
    let targetRotY = rotY, targetRotX = rotX;
    let isAnimatingToTarget = false;
    let autoRotate = true;
    const autoVel = 0.0007;

    function rotateTo(lat, lon) {
      let ideal = (-90 - lon) * Math.PI / 180;
      while (ideal - rotY > Math.PI) ideal -= 2 * Math.PI;
      while (ideal - rotY < -Math.PI) ideal += 2 * Math.PI;
      targetRotY = ideal;
      targetRotX = Math.max(-Math.PI/2 + 0.2, Math.min(Math.PI/2 - 0.2, lat * Math.PI / 180));
      isAnimatingToTarget = true;
      autoRotate = false;
    }

    canvas3d.addEventListener('mousedown', e => {
      isDragging = true; prevX = e.clientX; prevY = e.clientY;
      autoRotate = false; isAnimatingToTarget = false;
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI/2 + 0.2, Math.min(Math.PI/2 - 0.2, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });
    canvas3d.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
        autoRotate = false; isAnimatingToTarget = false;
      }
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (!isDragging || e.touches.length !== 1) return;
      rotY += (e.touches[0].clientX - prevX) * 0.005;
      rotX += (e.touches[0].clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI/2 + 0.2, Math.min(Math.PI/2 - 0.2, rotX));
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', () => { isDragging = false; });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredCountry = null;
    function pointerToLatLon(clientX, clientY) {
      const rect = canvas3d.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(earth, false);
      if (intersects.length === 0) return null;
      const local = earth.worldToLocal(intersects[0].point.clone());
      const r = local.length();
      const lat = 90 - (Math.acos(local.y / r) * 180 / Math.PI);
      let lon = Math.atan2(local.z, -local.x) * 180 / Math.PI - 180;
      while (lon < -180) lon += 360;
      while (lon > 180) lon -= 360;
      return [lon, lat];
    }
    function findCountryAt(lonLat) {
      const covered = features.filter(f => STATE.coveredIsoSet.has(String(parseInt(f.id, 10))));
      for (const f of covered) if (pointInFeature(lonLat, f)) return f;
      for (const f of features) if (pointInFeature(lonLat, f)) return f;
      return null;
    }
    function onPointerMove(clientX, clientY) {
      const ll = pointerToLatLon(clientX, clientY);
      if (!ll) { hoveredCountry = null; canvas3d.style.cursor = isDragging ? 'grabbing' : 'grab'; tooltip.classList.remove('show'); return; }
      const feat = findCountryAt(ll);
      if (feat) {
        const iso = String(parseInt(feat.id, 10));
        const country = STATE.countriesByIso.get(iso);
        if (country) {
          const r = window.resolveCountry(country, STATE.lang);
          hoveredCountry = country;
          canvas3d.style.cursor = 'pointer';
          tooltip.innerHTML = '<span class="tt-flag">' + country.flag + '</span>' + r.name +
            '<span class="tt-meta">' + country.framework + ' · ' + country.year + '</span>';
          tooltip.style.left = clientX + 'px';
          tooltip.style.top = clientY + 'px';
          tooltip.classList.add('show');
          return;
        }
      }
      hoveredCountry = null;
      canvas3d.style.cursor = isDragging ? 'grabbing' : 'grab';
      tooltip.classList.remove('show');
    }
    let throttleId = null;
    canvas3d.addEventListener('mousemove', e => {
      if (throttleId) return;
      throttleId = requestAnimationFrame(() => { throttleId = null; onPointerMove(e.clientX, e.clientY); });
    });
    canvas3d.addEventListener('mouseleave', () => { tooltip.classList.remove('show'); hoveredCountry = null; });

    let dragStart = null;
    canvas3d.addEventListener('mousedown', e => { dragStart = { x: e.clientX, y: e.clientY }; });
    canvas3d.addEventListener('click', e => {
      if (!dragStart) return;
      if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 5) return;
      if (hoveredCountry) openCountry(hoveredCountry.code);
    });

    function resize() {
      width = canvas3d.clientWidth; height = canvas3d.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    function animate() {
      requestAnimationFrame(animate);
      if (isAnimatingToTarget) {
        const t = 0.08;
        rotY += (targetRotY - rotY) * t;
        rotX += (targetRotX - rotX) * t;
        if (Math.abs(targetRotY - rotY) < 0.002 && Math.abs(targetRotX - rotX) < 0.002) {
          isAnimatingToTarget = false;
        }
      } else if (autoRotate) {
        rotY += autoVel;
      }
      earthGroup.rotation.y = rotY;
      earthGroup.rotation.x = rotX;
      renderer.render(scene, camera);
    }
    animate();

    window.__globe = {
      highlight: function(iso) { compositeTexture(iso); },
      rotateTo: rotateTo
    };

    loadingEl.classList.add('hidden');
    setTimeout(() => { loadingEl.style.display = 'none'; }, 600);
  }

  function buildFallbackGlobe() {
    const canvas3d = document.getElementById('globe-canvas');
    const loadingEl = document.getElementById('globe-loading');
    let width = canvas3d.clientWidth, height = canvas3d.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width/height, 0.1, 1000);
    camera.position.set(0, 0, 17);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    const group = new THREE.Group();
    scene.add(group);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 48), new THREE.MeshBasicMaterial({ color: 0x7a4e28 }));
    group.add(sphere);
    let rotY = 0.3;
    function resize() { width = canvas3d.clientWidth; height = canvas3d.clientHeight; renderer.setSize(width,height,false); camera.aspect = width/height; camera.updateProjectionMatrix(); }
    window.addEventListener('resize', resize); resize();
    function animate() { requestAnimationFrame(animate); rotY += 0.0007; group.rotation.y = rotY; renderer.render(scene, camera); }
    animate();
    loadingEl.classList.add('hidden');
    window.__globe = { highlight: function(){}, rotateTo: function(){} };
  }

  function hideLoadingWithMessage(msg) {
    const loadingEl = document.getElementById('globe-loading');
    if (!loadingEl) return;
    if (msg) loadingEl.textContent = msg;
    setTimeout(() => { loadingEl.classList.add('hidden'); }, msg ? 1500 : 0);
  }

  function safeBuildFallback(reason) {
    try {
      if (typeof THREE === 'undefined') {
        hideLoadingWithMessage(STATE.lang === 'tr' ? 'Küre yüklenemedi (Three.js).' : 'Globe could not load (Three.js).');
        return;
      }
      buildFallbackGlobe();
    } catch (e) {
      console.error('Fallback globe failed:', e);
      hideLoadingWithMessage(STATE.lang === 'tr' ? 'Küre yüklenemedi.' : 'Globe could not load.');
    }
  }

  function init() {
    console.log('[gdpr-v2] init starting');
    let savedLang = 'tr';
    try { savedLang = localStorage.getItem('gdprhub.lang') || 'tr'; } catch (_) {}
    if (!window.I18N[savedLang]) savedLang = 'tr';
    restoreCompare();
    applyI18n(savedLang);

    console.log('[gdpr-v2] THREE:', typeof THREE, 'topojson:', typeof topojson, 'WORLD_TOPO:', typeof window.WORLD_TOPO);

    // Prefer the inlined topology (file:// safe).
    if (typeof THREE === 'undefined') {
      console.error('[gdpr-v2] Three.js failed to load from CDN.');
      hideLoadingWithMessage(STATE.lang === 'tr' ? 'Küre kütüphanesi yüklenemedi.' : 'Globe library failed to load.');
      return;
    }
    if (typeof window.WORLD_TOPO !== 'undefined' && typeof topojson !== 'undefined') {
      try {
        const fc = topojson.feature(window.WORLD_TOPO, window.WORLD_TOPO.objects.countries);
        console.log('[gdpr-v2] using inlined topology,', fc.features.length, 'features');
        buildGlobe(fc.features);
        return;
      } catch (e) {
        console.error('[gdpr-v2] Inline topo parse failed:', e);
        safeBuildFallback('inline-parse');
        return;
      }
    }
    console.warn('[gdpr-v2] No inline topology; trying CDN fetch');

    const FETCH_TIMEOUT = 6000;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; safeBuildFallback('timeout'); }, FETCH_TIMEOUT);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
      .then(r => { if (!r.ok) throw new Error('fetch failed: ' + r.status); return r.json(); })
      .then(topo => {
        if (timedOut) return;
        clearTimeout(timer);
        if (typeof topojson === 'undefined') throw new Error('topojson-client missing');
        const fc = topojson.feature(topo, topo.objects.countries);
        try { buildGlobe(fc.features); }
        catch (e) { console.error('buildGlobe error:', e); safeBuildFallback('builderr'); }
      })
      .catch(err => {
        if (timedOut) return;
        clearTimeout(timer);
        console.warn('World atlas load failed:', err);
        safeBuildFallback('caught');
      });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
