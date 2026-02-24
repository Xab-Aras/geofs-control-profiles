// ==UserScript==
// @name         GeoFS Control Profiles
// @namespace    https://github.com/Xab-Aras/geofs-control-profiles
// @version      1.0.0
// @description  Save and switch multiple control/joystick profiles in GeoFS by storing settings snapshots in localStorage.
// @author       Xabaras
// @match        *://geo-fs.com/*
// @match        *://www.geo-fs.com/*
// @downloadURL  https://raw.githubusercontent.com/Xab-Aras/geofs-control-profiles/main/geofs-control-profiles.user.js
// @updateURL    https://raw.githubusercontent.com/Xab-Aras/geofs-control-profiles/main/geofs-control-profiles.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const APP_KEY = 'settings';                 // GeoFS main settings key (confirmed)
  const STORE_PREFIX = 'gcp_profile_';        // our profiles prefix
  const UI_STATE_KEY = 'gcp_ui_state_v1';     // position/minimized state

  // ---------- helpers ----------
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function safeDel(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }

  function nowLabel() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function listProfiles() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORE_PREFIX)) continue;
      const name = k.slice(STORE_PREFIX.length);
      const metaRaw = safeGet(`${k}__meta`);
      let meta = {};
      try { if (metaRaw) meta = JSON.parse(metaRaw); } catch {}
      out.push({ key: k, name, meta });
    }
    out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return out;
  }

  function toast(msg, isError = false) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position = 'fixed';
    t.style.right = '20px';
    t.style.bottom = '20px';
    t.style.zIndex = '1000000';
    t.style.padding = '10px 12px';
    t.style.borderRadius = '10px';
    t.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    t.style.fontSize = '13px';
    t.style.maxWidth = '320px';
    t.style.color = 'white';
    t.style.background = isError ? 'rgba(180, 40, 40, 0.95)' : 'rgba(0, 0, 0, 0.85)';
    t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function ensureSettingsPresent() {
    const s = safeGet(APP_KEY);
    if (!s) {
      toast('GeoFS settings not found yet. Open GeoFS and try again.', true);
      return null;
    }
    // quick sanity check (optional)
    if (!s.trim().startsWith('{')) {
      toast('GeoFS settings format looks unexpected.', true);
      return null;
    }
    return s;
  }

  // ---------- UI ----------
  function loadUIState() {
    const raw = safeGet(UI_STATE_KEY);
    if (!raw) return { x: null, y: null, minimized: false };
    try {
      const s = JSON.parse(raw);
      return { x: s.x ?? null, y: s.y ?? null, minimized: !!s.minimized };
    } catch {
      return { x: null, y: null, minimized: false };
    }
  }

  function saveUIState(state) {
    safeSet(UI_STATE_KEY, JSON.stringify(state));
  }

  function createUI() {
    const uiState = loadUIState();

    const panel = document.createElement('div');
    panel.id = 'gcp_panel';
    panel.style.position = 'fixed';
    panel.style.top = uiState.y != null ? `${uiState.y}px` : '120px';
    panel.style.right = uiState.x == null ? '20px' : 'auto';
    panel.style.left = uiState.x != null ? `${uiState.x}px` : 'auto';
    panel.style.width = '260px';
    panel.style.zIndex = '999999';
    panel.style.background = 'rgba(0,0,0,0.80)';
    panel.style.color = 'white';
    panel.style.borderRadius = '14px';
    panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    panel.style.userSelect = 'none';
    panel.style.overflow = 'hidden';

    const header = document.createElement('div');
    header.style.padding = '10px 12px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '10px';
    header.style.cursor = 'move';
    header.style.background = 'rgba(255,255,255,0.06)';

    const title = document.createElement('div');
    title.innerHTML = `<div style="font-weight:700; font-size:13px; line-height:1.1">GeoFS Control Profiles</div>
                       <div style="font-size:11px; opacity:.8">v1.0.0</div>`;

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';

    const btnMin = document.createElement('button');
    btnMin.textContent = uiState.minimized ? '▢' : '—';
    const btnClose = document.createElement('button');
    btnClose.textContent = '✕';

    for (const b of [btnMin, btnClose]) {
      b.style.border = 'none';
      b.style.background = 'rgba(255,255,255,0.10)';
      b.style.color = 'white';
      b.style.borderRadius = '10px';
      b.style.padding = '6px 8px';
      b.style.cursor = 'pointer';
      b.style.fontSize = '12px';
    }

    controls.appendChild(btnMin);
    controls.appendChild(btnClose);
    header.appendChild(title);
    header.appendChild(controls);

    const body = document.createElement('div');
    body.style.padding = '12px';
    body.style.display = uiState.minimized ? 'none' : 'block';

    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.gap = '8px';
    row1.style.marginBottom = '10px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Profile name (e.g. Airbus Stick)';
    nameInput.style.flex = '1';
    nameInput.style.padding = '8px 10px';
    nameInput.style.borderRadius = '10px';
    nameInput.style.border = '1px solid rgba(255,255,255,0.18)';
    nameInput.style.background = 'rgba(0,0,0,0.25)';
    nameInput.style.color = 'white';
    nameInput.style.outline = 'none';
    nameInput.style.fontSize = '12px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.padding = '8px 10px';
    saveBtn.style.borderRadius = '10px';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.background = 'rgba(255,255,255,0.14)';
    saveBtn.style.color = 'white';
    saveBtn.style.fontSize = '12px';
    saveBtn.style.fontWeight = '600';

    row1.appendChild(nameInput);
    row1.appendChild(saveBtn);

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '8px 10px';
    select.style.borderRadius = '10px';
    select.style.border = '1px solid rgba(255,255,255,0.18)';
    select.style.background = 'rgba(0,0,0,0.25)';
    select.style.color = 'white';
    select.style.outline = 'none';
    select.style.fontSize = '12px';
    select.style.marginBottom = '10px';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load & Reload';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export JSON';

    for (const b of [loadBtn, delBtn, exportBtn]) {
      b.style.flex = '1';
      b.style.padding = '8px 10px';
      b.style.borderRadius = '10px';
      b.style.border = 'none';
      b.style.cursor = 'pointer';
      b.style.background = 'rgba(255,255,255,0.12)';
      b.style.color = 'white';
      b.style.fontSize = '12px';
      b.style.fontWeight = '600';
    }

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    actions.appendChild(exportBtn);

    body.appendChild(row1);
    body.appendChild(select);
    body.appendChild(actions);

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    function refreshSelect() {
      const profiles = listProfiles();
      select.innerHTML = '';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = profiles.length ? 'Select a profile…' : 'No profiles saved yet';
      select.appendChild(opt0);

      for (const p of profiles) {
        const o = document.createElement('option');
        o.value = p.key;
        const suffix = p.meta?.savedAt ? ` (${p.meta.savedAt})` : '';
        o.textContent = `${p.name}${suffix}`;
        select.appendChild(o);
      }
    }

    // actions
    saveBtn.onclick = () => {
      const s = ensureSettingsPresent();
      if (!s) return;

      const rawName = (nameInput.value || '').trim();
      const name = rawName || `Profile ${nowLabel()}`;
      const key = `${STORE_PREFIX}${name}`;

      if (!safeSet(key, s)) {
        toast('Failed to save profile (storage error).', true);
        return;
      }
      safeSet(`${key}__meta`, JSON.stringify({ savedAt: nowLabel() }));
      nameInput.value = '';
      refreshSelect();
      toast(`Saved: ${name}`);
    };

    loadBtn.onclick = () => {
      const key = select.value;
      if (!key) return toast('Select a profile first.', true);

      const profile = safeGet(key);
      if (!profile) return toast('Profile not found.', true);

      if (!safeSet(APP_KEY, profile)) return toast('Failed to apply profile.', true);

      toast('Profile applied. Reloading…');
      location.reload();
    };

    delBtn.onclick = () => {
      const key = select.value;
      if (!key) return toast('Select a profile first.', true);

      const name = key.slice(STORE_PREFIX.length);
      const ok = safeDel(key) & safeDel(`${key}__meta`);
      if (!ok) return toast('Delete failed.', true);

      refreshSelect();
      toast(`Deleted: ${name}`);
    };

    exportBtn.onclick = async () => {
      const key = select.value;
      if (!key) return toast('Select a profile first.', true);
      const profile = safeGet(key);
      if (!profile) return toast('Profile not found.', true);

      try {
        await navigator.clipboard.writeText(profile);
        toast('Profile JSON copied to clipboard.');
      } catch {
        // fallback: open a prompt for manual copy
        window.prompt('Copy the JSON:', profile);
      }
    };

    // minimize/close
    btnMin.onclick = () => {
      const minimized = body.style.display !== 'none';
      body.style.display = minimized ? 'none' : 'block';
      btnMin.textContent = minimized ? '▢' : '—';

      const rect = panel.getBoundingClientRect();
      saveUIState({ x: rect.left, y: rect.top, minimized });
    };

    btnClose.onclick = () => {
      panel.remove();
      toast('GeoFS Control Profiles hidden (reload to show again).');
    };

    // draggable header
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    header.addEventListener('mousedown', (e) => {
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, startLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, startTop + dy));

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      panel.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      const rect = panel.getBoundingClientRect();
      const minimized = body.style.display === 'none';
      saveUIState({ x: rect.left, y: rect.top, minimized });
    });

    refreshSelect();
  }

  // Wait for GeoFS page to be usable
  window.addEventListener('load', () => {
    setTimeout(createUI, 2500);
  });
})();
