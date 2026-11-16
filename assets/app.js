/* Hong Kong & Shenzhen recommendations map — no build step, no dependencies. */
(() => {
  'use strict';

  /* ═════════════ Config ═════════════ */
  const cfg = Object.assign({
    title: 'Hong Kong',
    subtitle: '',
    googleMapsApiKey: '',
    mapId: 'DEMO_MAP_ID',
    language: 'en',
    region: 'HK',
    timeZone: 'Asia/Hong_Kong',
    data: {},
    notesLabel: 'Our tips',
    localNameLang: 'zh-Hant-HK',
    useGooglePhotos: true,
    showDeviceTip: true,
    categories: [],
    defaultCategory: { color: '#6b7280', icon: '📍' },
    typeIcons: {},
    tripHeading: 'Getting around',
    defaultMode: 'transit',
    // Where the map starts, and the box that place searches are limited to (Hong Kong + Shenzhen).
    home: { center: { lat: 22.32, lng: 114.17 }, zoom: 11 },
    searchBounds: { north: 22.9, south: 22.1, east: 114.7, west: 113.7 },
  }, window.TRIP_CONFIG || {});

  const ROUTE_PROFILES = [
    { key: 'fast', label: 'Fastest', color: '#2563eb', modifiers: {}, hint: '' },
    { key: 'free', label: 'Toll-free', color: '#0f9d58', modifiers: { avoidTolls: true }, hint: 'In Google Maps, turn on Options → Avoid tolls.' },
    { key: 'local', label: 'Local roads', color: '#8e44ad', modifiers: { avoidHighways: true }, hint: 'In Google Maps, turn on Options → Avoid highways.' },
  ];
  const LEG_COLORS = ['#2563eb', '#0f9d58', '#8e44ad', '#e8710a', '#d13a82', '#0e7490', '#a16207', '#4f46e5'];
  const KEY_HINT = 'Your API key’s website restriction must allow https://chainmailchan.github.io/* (the whole site, not just this folder).';
  const HOME = cfg.home;
  const SEARCH_BOUNDS = cfg.searchBounds;
  const NO_ROUTE_COLOR = '#8a8279';

  // How each leg in the Getting around tab is travelled (the sheet's "mode" column).
  const MODES = {
    transit: { label: 'Public transport', noun: 'public transport', icon: '🚇', travelMode: 'TRANSIT', gmaps: 'transit' },
    walk: { label: 'Walk', noun: 'walking', icon: '🚶', travelMode: 'WALKING', gmaps: 'walking' },
    drive: { label: 'Drive / taxi', noun: 'driving', icon: '🚕', travelMode: 'DRIVING', gmaps: 'driving' },
    none: { label: 'No route — see notes', noun: '', icon: 'ℹ️', travelMode: null, gmaps: 'transit' },
  };

  /* ═════════════ Small helpers ═════════════ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const mqMobile = window.matchMedia('(max-width: 899px)');
  const isMobile = () => mqMobile.matches;

  function h(tag, props, ...kids) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style') for (const [sk, sv] of Object.entries(v)) node.style.setProperty(sk, sv);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  const clean = (v) => (v == null ? '' : String(v).trim());
  const truthy = (v) => /^(y|yes|true|1|x|✓|✔|★|top|must)/i.test(clean(v));
  const switchedOff = (v) => /^(n|no|false|0|off|hide|hidden)$/i.test(clean(v));
  const plainKey = (s) => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const splitList = (v) => clean(v).split(/\s*(?:\r?\n|\|)\s*/).map(clean).filter(Boolean);
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // "MTR", "bus", "Star Ferry" → transit; "taxi", "car" → drive; "walk" → walk; "none", "border" → none.
  function modeKey(v) {
    const s = plainKey(v);
    if (!s) return null;
    if (MODES[s]) return s;
    if (/^(none|no route|manual|n\/a|-|—)$|border|immigration|checkpoint/.test(s)) return 'none';
    if (/\b(transit|public|mtr|metro|subway|train|rail|railway|bus|buses|minibus|tram|ferry|peak tram)\b/.test(s)) return 'transit';
    if (/\b(drive|driving|car|taxi|cab|uber|didi|road)\b/.test(s)) return 'drive';
    if (/\b(walk|walking|on foot|foot)\b/.test(s)) return 'walk';
    return null;
  }
  const defaultMode = ['transit', 'walk', 'drive'].includes(modeKey(cfg.defaultMode)) ? modeKey(cfg.defaultMode) : 'transit';

  function slugify(s) {
    return clean(s).toLowerCase().normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'place';
  }

  // Paragraphs + clickable links, built safely (no innerHTML from data).
  function richText(text) {
    return clean(text).split(/\n{1,}/).filter(Boolean).map((line) => {
      const p = h('p');
      const re = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
      let last = 0; let m;
      while ((m = re.exec(line))) {
        p.append(line.slice(last, m.index));
        p.append(h('a', { href: m[1], target: '_blank', rel: 'noopener' }, prettyUrl(m[1])));
        last = m.index + m[1].length;
      }
      p.append(line.slice(last));
      return p;
    });
  }
  function prettyUrl(u) {
    try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? '/…' : ''); } catch { return u; }
  }

  function fmtDuration(ms) {
    if (ms == null || !isFinite(ms)) return '—';
    const mins = Math.max(1, Math.round(ms / 60000));
    const hrs = Math.floor(mins / 60);
    return hrs ? `${hrs} h ${String(mins % 60).padStart(2, '0')} min` : `${mins} min`;
  }
  function fmtDistance(m) {
    if (m == null) return '—';
    const km = m / 1000;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }
  function fmtMoney(money) {
    try {
      const amount = Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
      const digits = Math.abs(amount - Math.round(amount)) >= 0.005 ? 2 : 0; // HK$5.30, but HK$20
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: money.currencyCode, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
    } catch { return ''; }
  }
  function haversineKm(a, b) {
    const R = 6371; const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad; const dLng = (b.lng - a.lng) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* ═════════════ CSV ═════════════ */
  function parseCSV(text) {
    const rows = []; let row = []; let field = ''; let inQuotes = false;
    const s = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  const normKey = (k) => clean(k).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  function csvToObjects(text) {
    const rows = parseCSV(text).filter((r) => r.some((c) => clean(c) !== ''));
    if (!rows.length) return [];
    const keys = rows[0].map(normKey);
    return rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, clean(r[i])])));
  }
  const pick = (row, ...keys) => { for (const k of keys) if (clean(row[k])) return clean(row[k]); return ''; };

  async function fetchCSV(url, label) {
    if (!url) return [];
    let res;
    const notPublished = /docs\.google\.com/.test(url)
      ? ' This usually means that tab isn’t published: in the sheet, File → Share → Publish to web → Published content and settings → choose “Entire document” (or tick this tab) → Republish.' : '';
    try { res = await fetch(url, { cache: 'no-cache' }); } catch (e) { throw new Error(`Couldn't load ${label} (${url}). ${e.message}.${notPublished}`); }
    if (!res.ok && notPublished) throw new Error(`Couldn't load ${label} (${url}) — HTTP ${res.status}.${notPublished}`);
    if (!res.ok) throw new Error(`Couldn't load ${label} (${url}) — HTTP ${res.status}.`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error(`${label}: the link returned a web page, not CSV. In Google Sheets use File → Share → Publish to web → (choose the tab) → CSV, and copy that link.`);
    return csvToObjects(text);
  }

  /* ═════════════ Coordinates ═════════════ */
  function validLatLng(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat]; // swapped by mistake
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }
  function parseDMS(s) {
    const re = /(\d+)[°º]\s*(\d+)['′]\s*([\d.]+)["″]?\s*([NS])[\s,]*(\d+)[°º]\s*(\d+)['′]\s*([\d.]+)["″]?\s*([EW])/i;
    const m = s.match(re);
    if (!m) return null;
    const dec = (d, mi, se, hemi) => (Number(d) + Number(mi) / 60 + Number(se) / 3600) * (/[SW]/i.test(hemi) ? -1 : 1);
    return validLatLng(dec(m[1], m[2], m[3], m[4]), dec(m[5], m[6], m[7], m[8]));
  }
  function parseCoordText(s) {
    s = clean(s);
    if (!s) return null;
    const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) return validLatLng(Number(m[1]), Number(m[2]));
    return parseDMS(s);
  }
  function coordsFromMapsUrl(url) {
    if (!url) return null;
    let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); // exact pin
    if (m) return validLatLng(Number(m[1]), Number(m[2]));
    m = url.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i);
    if (m) return validLatLng(Number(m[1]), Number(m[2]));
    m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); // map view centre (less precise)
    if (m) return validLatLng(Number(m[1]), Number(m[2]));
    return null;
  }

  /* ═════════════ Media ═════════════ */
  function classifyMedia(raw) {
    const u = clean(raw);
    let m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/))) {
      return { kind: 'youtube', thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&autoplay=1&playsinline=1`, href: u };
    }
    if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=|thumbnail\?(?:.*&)?id=)([\w-]{20,})/))) {
      return { kind: 'drive', id: m[1], thumb: `https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`, large: `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`, embed: `https://drive.google.com/file/d/${m[1]}/preview`, href: u };
    }
    if (/\.(mp4|webm|m4v|mov)(?:[?#].*)?$/i.test(u)) return { kind: 'video', src: u, href: u };
    if (/\.(jpe?g|png|webp|gif|avif|svg)(?:[?#].*)?$/i.test(u) || /(googleusercontent\.com|i\.imgur\.com|images\.unsplash\.com)\//i.test(u)) {
      return { kind: 'image', src: u, href: u };
    }
    let label = 'Open link';
    if (/photos\.app\.goo\.gl|photos\.google\.com/i.test(u)) label = 'Photo album';
    else if (/instagram\.com/i.test(u)) label = 'Instagram';
    else if (/tiktok\.com/i.test(u)) label = 'TikTok';
    return { kind: 'link', href: u, label };
  }

  /* ═════════════ State ═════════════ */
  const state = {
    places: [], byId: new Map(), byLabel: new Map(), legs: [], areaMeta: new Map(), areaOrder: [],
    warnings: [],
    area: 'all', categories: new Set(), types: new Set(), search: '', sort: 'top',
    activeId: null, tab: 'places',
    map: null, mapsReady: false, lib: {}, markers: new Map(),
    allByName: new Map(), routeLayers: [], routeEndMarkers: [], selectedRoute: null, activeLeg: null, routeToken: 0,
  };

  const catConfig = new Map(cfg.categories.map((c, i) => [c.name.toLowerCase(), { ...c, index: i }]));
  function catInfo(name) {
    const c = catConfig.get(clean(name).toLowerCase());
    return c || { name, color: cfg.defaultCategory.color, icon: cfg.defaultCategory.icon, index: 999 };
  }
  const typeIcons = new Map(Object.entries(cfg.typeIcons || {}).map(([k, v]) => [plainKey(k), v]));
  const typeIcon = (t) => typeIcons.get(plainKey(t));
  const iconFor = (p) => typeIcon(p.type) || catInfo(p.category).icon;
  const areaIndex = (a) => { const i = state.areaOrder.indexOf(a); return i === -1 ? 999 : i; };

  /* ═════════════ Data loading ═════════════ */
  function rowCoords(row) {
    return parseCoordText(pick(row, 'coordinates', 'coords', 'latlng', 'lat_lng', 'location'))
      || validLatLng(parseFloat(pick(row, 'lat', 'latitude')), parseFloat(pick(row, 'lng', 'lon', 'long', 'longitude')))
      || coordsFromMapsUrl(pick(row, 'maps_url', 'google_maps_url', 'google_maps', 'url', 'link'));
  }

  function normalizePlace(row, idx, seenIds) {
    const name = pick(row, 'name', 'title', 'place');
    if (!name || name.startsWith('#') || switchedOff(pick(row, 'show', 'keep', 'include'))) return null;
    const mapsUrl = pick(row, 'maps_url', 'google_maps_url', 'google_maps', 'url', 'link');
    const coords = rowCoords(row);
    if (!coords) { state.warnings.push(`“${name}” is hidden — no coordinates found.`); return null; }
    const area = pick(row, 'area', 'region', 'city') || 'Other';
    const category = pick(row, 'category', 'cat') || 'Other';
    const known = catConfig.get(category.toLowerCase());
    let id = slugify(`${name}-${area}`);
    while (seenIds.has(id)) id += '-2';
    seenIds.add(id);
    const p = {
      id, name, area,
      localName: pick(row, 'zh_name', 'chinese_name', 'name_zh', 'local_name', 'ja_name'),
      address: pick(row, 'address', 'addr'),
      category: known ? known.name : category,
      type: pick(row, 'type', 'subcategory', 'sub_category', 'cuisine', 'food_type'),
      lat: coords.lat, lng: coords.lng,
      placeId: pick(row, 'place_id', 'google_place_id', 'placeid'),
      description: pick(row, 'description', 'desc', 'summary', 'about'),
      notes: pick(row, 'notes', 'our_notes', 'personal_notes', 'tips', 'our_tips'),
      photo: pick(row, 'photo', 'image', 'photo_url', 'image_url'),
      media: splitList(pick(row, 'media', 'photos_videos', 'gallery', 'videos', 'photos')),
      top: truthy(pick(row, 'top_pick', 'top', 'highlight', 'must_go', 'favourite', 'favorite')),
      mapsUrl, order: idx,
    };
    p.haystack = [p.name, p.localName, p.address, p.area, p.category, p.type, p.description, p.notes].join(' ').toLowerCase();
    return p;
  }

  // One row of the Routes tab = one leg of the Getting around tab, in row order.
  function normalizeLeg(row) {
    const from = pick(row, 'from', 'start', 'origin');
    const to = pick(row, 'to', 'end', 'destination');
    const name = pick(row, 'name', 'title');
    if (!from && !to && !name) return null;
    if ((name || from || to).startsWith('#') || switchedOff(pick(row, 'show', 'keep', 'include'))) return null;
    const label = name || `${from || '?'} → ${to || '?'}`;
    const modeText = pick(row, 'mode', 'travel_mode', 'how', 'by');
    let mode = modeKey(modeText);
    if (modeText && !mode) state.warnings.push(`Leg “${label}”: mode “${modeText}” isn’t recognised, so it uses ${MODES[defaultMode].noun}. Use transit, walk, drive or none.`);
    mode = mode || defaultMode;
    if (mode !== 'none' && (!from || !to)) { state.warnings.push(`Leg “${label}” is hidden — it needs both “from” and “to” (or mode “none”).`); return null; }
    const via = splitList(pick(row, 'via', 'stops', 'waypoints'));
    if (mode === 'transit' && via.length) state.warnings.push(`Leg “${label}”: “via” stops are ignored for public transport (Google can’t add stops to those routes).`);
    return {
      name: label, autoName: !name, from, to, mode, modeText: MODES[plainKey(modeText)] ? '' : modeText,
      day: pick(row, 'day', 'date', 'when'),
      via,
      description: pick(row, 'description', 'desc', 'summary'),
      notes: pick(row, 'notes', 'our_notes', 'tips'),
      avoidTolls: truthy(pick(row, 'avoid_tolls')),
      avoidHighways: truthy(pick(row, 'avoid_highways')),
      mapsUrl: pick(row, 'maps_url', 'google_maps_url'),
      howTo: splitList(pick(row, 'how_to', 'howto', 'guide', 'info', 'link')).filter((u) => /^https?:\/\//i.test(u)),
      media: splitList(pick(row, 'media', 'photos_videos')),
      summary: '',
    };
  }

  async function loadData() {
    const d = cfg.data || {};
    const [placesRows, legRows, areaRows] = await Promise.all([
      fetchCSV(d.places, 'places list'),
      fetchCSV(d.routes, 'getting around (Routes tab)').catch((e) => { state.warnings.push(e.message); return []; }),
      fetchCSV(d.areas, 'areas list').catch((e) => { state.warnings.push(e.message); return []; }),
    ]);

    const seen = new Set();
    state.places = placesRows.map((r, i) => normalizePlace(r, i, seen)).filter(Boolean);
    state.byId = new Map(state.places.map((p) => [p.id, p]));

    areaRows.forEach((r) => {
      const name = pick(r, 'area', 'name');
      if (!name || name.startsWith('#') || switchedOff(pick(r, 'show', 'keep', 'include'))) return;
      state.areaMeta.set(name, { days: pick(r, 'days', 'suggested_days'), summary: pick(r, 'summary', 'description', 'notes') });
    });
    const usedAreas = [...new Set(state.places.map((p) => p.area))];
    state.areaOrder = [...[...state.areaMeta.keys()].filter((a) => usedAreas.includes(a)), ...usedAreas.filter((a) => !state.areaMeta.has(a)).sort()];

    // Labels for the route pickers (disambiguate duplicate names with the area).
    const nameCount = {};
    state.places.forEach((p) => { nameCount[p.name.toLowerCase()] = (nameCount[p.name.toLowerCase()] || 0) + 1; });
    state.places.forEach((p) => {
      p.label = nameCount[p.name.toLowerCase()] > 1 ? `${p.name} — ${p.area}` : p.name;
      state.byLabel.set(p.label.toLowerCase(), p);
      if (!state.byLabel.has(p.name.toLowerCase())) state.byLabel.set(p.name.toLowerCase(), p);
    });

    // Every named row (shown or hidden) can be a stop on a drive.
    placesRows.forEach((r) => {
      const name = pick(r, 'name', 'title', 'place');
      if (!name || name.startsWith('#')) return;
      const c = rowCoords(r); const key = name.toLowerCase(); const prev = state.allByName.get(key);
      if (!prev || (c && prev.lat == null)) {
        state.allByName.set(key, { name, lat: c ? c.lat : null, lng: c ? c.lng : null, placeId: pick(r, 'place_id', 'google_place_id', 'placeid') });
      }
    });

    state.legs = legRows.map(normalizeLeg).filter(Boolean);
  }

  /* ═════════════ Filtering & sorting ═════════════ */
  function matches(p, { skipCats = false, skipTypes = false, skipArea = false } = {}) {
    if (!skipArea && state.area !== 'all' && p.area !== state.area) return false;
    if (!skipCats && state.categories.size && !state.categories.has(p.category)) return false;
    if (!skipTypes && state.types.size && !state.types.has(p.type)) return false;
    if (state.search) {
      const words = state.search.split(/\s+/).filter(Boolean);
      if (!words.every((w) => p.haystack.includes(w))) return false;
    }
    return true;
  }

  function sortPlaces(list) {
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byCat = (a, b) => catInfo(a.category).index - catInfo(b.category).index || a.category.localeCompare(b.category);
    const sorters = {
      top: (a, b) => (b.top - a.top) || a.order - b.order,
      name: byName,
      area: (a, b) => areaIndex(a.area) - areaIndex(b.area) || byCat(a, b) || byName(a, b),
      type: (a, b) => byCat(a, b) || (a.type || '~').localeCompare(b.type || '~') || byName(a, b),
      near: (a, b) => a.dist - b.dist || byName(a, b),
    };
    if (state.sort === 'near') {
      const c = state.map ? state.map.getCenter() : null;
      const centre = c ? { lat: c.lat(), lng: c.lng() } : HOME.center;
      list.forEach((p) => { p.dist = haversineKm(centre, p); });
    }
    return list.sort(sorters[state.sort] || sorters.top);
  }

  /* ═════════════ Rendering: panel ═════════════ */
  function renderAreas() {
    const bar = $('#areaBar');
    const count = (a) => state.places.filter((p) => a === 'all' || p.area === a).length;
    const chip = (value, label) => h('button', {
      class: 'area-chip', type: 'button', 'aria-pressed': String(state.area === value),
      onclick: () => setArea(value),
    }, label, h('span', { class: 'n' }, count(value)));
    bar.replaceChildren(chip('all', 'All areas'), ...state.areaOrder.map((a) => chip(a, a)));
    // Keep the selected area visible when the chips scroll sideways (phones).
    const on = bar.querySelector('[aria-pressed="true"]');
    if (on && bar.scrollWidth > bar.clientWidth) {
      const r = on.getBoundingClientRect(); const br = bar.getBoundingClientRect();
      if (r.left < br.left || r.right > br.right) bar.scrollLeft += r.left - br.left - 16;
    }

    const info = $('#areaInfo');
    const meta = state.areaMeta.get(state.area);
    if (meta && (meta.summary || meta.days)) {
      info.replaceChildren(
        h('strong', null, state.area, meta.days ? h('span', { class: 'days' }, meta.days) : null),
        ...richText(meta.summary),
      );
      info.hidden = false;
    } else info.hidden = true;
  }

  function renderFilters() {
    // Categories (counts ignore the category filter itself)
    const base = state.places.filter((p) => matches(p, { skipCats: true, skipTypes: true }));
    const cats = [...new Set(state.places.map((p) => p.category))]
      .sort((a, b) => catInfo(a).index - catInfo(b).index || a.localeCompare(b));
    $('#categoryChips').replaceChildren(...cats.map((c) => {
      const n = base.filter((p) => p.category === c).length;
      const on = state.categories.has(c);
      return h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(on), disabled: !n && !on,
        style: { '--c': catInfo(c).color },
        onclick: () => { toggle(state.categories, c); pruneTypes(); update(); },
      }, h('span', { class: 'dot' }), c, h('span', { class: 'n' }, n));
    }));

    // Types — only once a category is chosen, so the list stays short.
    const typeBase = state.places.filter((p) => p.type && matches(p, { skipTypes: true }));
    const types = [...new Set(typeBase.map((p) => p.type))].sort((a, b) => a.localeCompare(b));
    const showTypes = state.categories.size > 0 && types.length > 0;
    $('#typeGroup').hidden = !showTypes;
    if (showTypes) {
      $('#typeChips').replaceChildren(...types.map((t) => h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(state.types.has(t)),
        onclick: () => { toggle(state.types, t); update(); },
      }, typeIcon(t) ? `${typeIcon(t)} ` : '', t,
      h('span', { class: 'n' }, typeBase.filter((p) => p.type === t).length))));
    }
  }
  function toggle(set, v) { if (set.has(v)) set.delete(v); else set.add(v); }
  function pruneTypes() {
    const available = new Set(state.places.filter((p) => matches(p, { skipTypes: true })).map((p) => p.type));
    [...state.types].forEach((t) => { if (!available.has(t)) state.types.delete(t); });
  }

  function renderList() {
    const list = sortPlaces(state.places.filter((p) => matches(p)));
    const ul = $('#placeList');
    $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'place' : 'places'}`;
    $('#placeCount').textContent = list.length;
    const filtered = state.categories.size || state.types.size || state.search;
    $('#clearFilters').hidden = !filtered;

    if (!list.length) {
      ul.replaceChildren(h('li', { class: 'empty' }, state.places.length ? 'No places match these filters.' : 'No places yet — add some to your list (see README).'));
      return list;
    }
    ul.replaceChildren(...list.map((p) => {
      const c = catInfo(p.category);
      const meta = [p.type || p.category, state.area === 'all' ? p.area : null].filter(Boolean).join(' · ');
      const dist = state.sort === 'near' && p.dist != null ? ` · ${p.dist < 10 ? p.dist.toFixed(1) : Math.round(p.dist)} km` : '';
      const btn = h('button', {
        class: `place-item${p.id === state.activeId ? ' is-active' : ''}`, type: 'button', dataset: { id: p.id },
        onclick: () => openPlace(p.id, { fromList: true }),
        onmouseenter: () => hoverMarker(p.id, true),
        onmouseleave: () => hoverMarker(p.id, false),
      },
      h('span', { class: 'pi-icon', style: { '--c': c.color }, 'aria-hidden': 'true' }, iconFor(p)),
      h('span', { class: 'pi-main' },
        h('span', { class: 'pi-name' }, p.name, p.top ? h('span', { class: 'star', title: 'Top pick' }, '★') : null),
        h('span', { class: 'pi-meta' }, meta + dist),
        p.description ? h('span', { class: 'pi-desc' }, p.description) : null));
      return h('li', null, btn);
    }));
    return list;
  }

  function renderDataCheck() {
    const box = $('#dataCheck');
    const wanted = /[?&#]check\b/.test(location.search + location.hash);
    if (state.warnings.length) console.warn('[trip map] Data notes:\n' + state.warnings.join('\n'));
    if (!wanted) { box.hidden = true; return; }
    box.replaceChildren(
      h('strong', null, state.warnings.length ? 'Data check — things to fix:' : 'Data check: no problems found ✓'),
      h('ul', null, state.warnings.map((w) => h('li', null, w))),
    );
    box.hidden = false;
  }

  function update({ fit = false } = {}) {
    renderAreas();
    renderFilters();
    const visible = renderList();
    syncMarkers(visible);
    if (fit) fitToArea();
  }

  /* ═════════════ Map ═════════════ */
  function loadGoogleMaps() {
    return new Promise((resolve, reject) => {
      window.__tripMapReady = resolve;
      window.gm_authFailure = () => showMapNotice('auth');
      const params = new URLSearchParams({
        key: cfg.googleMapsApiKey, v: 'weekly', loading: 'async', callback: '__tripMapReady',
        language: cfg.language || 'en', region: cfg.region || 'HK',
      });
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps could not load (network blocked or offline).'));
      document.head.append(s);
    });
  }

  async function initMap() {
    const [mapsLib, markerLib, coreLib] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('core'),
    ]);
    const { Map: GoogleMap, Polyline, MapTypeControlStyle } = mapsLib;
    const { AdvancedMarkerElement } = markerLib;
    const { ControlPosition, LatLng, LatLngBounds, Point } = coreLib;
    state.lib = { Polyline, AdvancedMarkerElement, LatLng, LatLngBounds, Point };
    state.map = new GoogleMap($('#map'), {
      center: HOME.center, zoom: HOME.zoom,
      mapId: cfg.mapId || 'DEMO_MAP_ID',
      colorScheme: 'FOLLOW_SYSTEM',
      gestureHandling: 'greedy',
      clickableIcons: false,
      fullscreenControl: false,
      streetViewControl: true,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: ControlPosition.TOP_RIGHT,
        style: isMobile() ? MapTypeControlStyle.DROPDOWN_MENU : MapTypeControlStyle.HORIZONTAL_BAR,
      },
    });
    // Ignore the map click that can follow a pin click.
    state.map.addListener('click', () => { if (Date.now() - (state.lastPinClick || 0) > 400) closeCard(); });
    state.map.addListener('idle', () => { if (state.sort === 'near') renderList(); });

    for (const p of state.places) {
      const c = catInfo(p.category);
      const content = h('div', { class: 'pin', style: { '--c': c.color } });
      content.innerHTML = '<svg viewBox="0 0 30 38" aria-hidden="true"><path d="M15 1.2C7.4 1.2 1.6 7 1.6 14.3c0 9.2 11.2 20.6 12.5 21.9a1.3 1.3 0 0 0 1.8 0c1.3-1.3 12.5-12.7 12.5-21.9C28.4 7 22.6 1.2 15 1.2z"/></svg>';
      content.append(h('span', { class: 'glyph' }, iconFor(p)));
      if (p.top) content.append(h('span', { class: 'pin-star', 'aria-hidden': 'true' }, '★'));
      const marker = new AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng }, title: p.name, content, gmpClickable: true, zIndex: p.top ? 2 : 1,
      });
      marker.addEventListener('gmp-click', () => { state.lastPinClick = Date.now(); openPlace(p.id, { pan: true }); });
      state.markers.set(p.id, { marker, content, baseZ: p.top ? 2 : 1 });
    }
    state.mapsReady = true;
  }

  function syncMarkers(visibleList) {
    if (!state.mapsReady) return;
    const visible = new Set(visibleList.map((p) => p.id));
    if (state.activeId) visible.add(state.activeId);
    for (const [id, m] of state.markers) {
      const want = visible.has(id) ? state.map : null;
      if (m.marker.map !== want) m.marker.map = want;
    }
  }

  function fitToArea() {
    if (!state.mapsReady) return;
    const pts = state.places.filter((p) => state.area === 'all' || p.area === state.area);
    if (!pts.length) { state.map.setCenter(HOME.center); state.map.setZoom(HOME.zoom); return; }
    if (pts.length === 1) { state.map.setCenter(pts[0]); state.map.setZoom(14); return; }
    const b = new state.lib.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    state.map.fitBounds(b, mapPadding());
  }

  function mapPadding() {
    if (isMobile()) return { top: 70, right: 40, bottom: 40, left: 40 };
    return { top: 60, right: 60, bottom: 60, left: 60 };
  }

  function hoverMarker(id, on) {
    const m = state.markers.get(id);
    if (m) m.content.classList.toggle('is-hover', on);
  }

  function setActiveMarker(id) {
    for (const [mid, m] of state.markers) {
      const on = mid === id;
      m.content.classList.toggle('is-active', on);
      m.marker.zIndex = on ? 1000 : m.baseZ;
    }
  }

  // Pan only if the pin is hidden behind the card or near the edge.
  function ensureVisible(p) {
    if (!state.mapsReady) return;
    const map = state.map;
    const proj = map.getProjection();
    const bounds = map.getBounds();
    if (!proj || !bounds) { map.panTo(p); return; }
    const scale = 2 ** map.getZoom();
    const nw = proj.fromLatLngToPoint(new state.lib.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()));
    const pt = proj.fromLatLngToPoint(new state.lib.LatLng(p.lat, p.lng));
    const x = (pt.x - nw.x) * scale; const y = (pt.y - nw.y) * scale;
    const el = $('#mapWrap'); const W = el.clientWidth; const H = el.clientHeight;
    const card = $('#card');
    const leftCover = !isMobile() && !card.hidden
      ? card.getBoundingClientRect().right - el.getBoundingClientRect().left + 16 : 0;
    const visible = x > leftCover + 30 && x < W - 30 && y > 50 && y < H - 30;
    if (visible) return;
    // Centre the pin in the uncovered part of the map.
    const dx = leftCover / 2;
    const centre = proj.fromPointToLatLng(new state.lib.Point(pt.x - dx / scale, pt.y));
    map.panTo(centre);
  }

  function showMapNotice(kind, detail) {
    const box = $('#mapNotice');
    let content;
    if (kind === 'nokey') {
      content = [
        h('h2', null, 'Map not switched on yet'),
        h('p', null, 'Add a Google Maps API key in ', h('code', null, 'config.js'), ' to show the map, photos and routes. Step-by-step instructions are in README.md.'),
        h('p', null, 'The list of places already works.'),
      ];
    } else if (kind === 'auth') {
      content = [
        h('h2', null, 'Google Maps refused the API key'),
        h('p', null, 'Check that the key is correct, billing is enabled, and the key allows this website address (README → Step 1).'),
      ];
    } else {
      content = [h('h2', null, 'The map could not load'), h('p', null, detail || 'Please refresh the page.')];
    }
    box.replaceChildren(h('div', { class: 'box' }, content));
    box.hidden = false;
  }

  /* ═════════════ Place card ═════════════ */
  const photoCache = new Map();
  function googlePhoto(placeId) {
    if (!photoCache.has(placeId)) {
      photoCache.set(placeId, (async () => {
        const { Place } = await google.maps.importLibrary('places');
        const place = new Place({ id: placeId });
        await place.fetchFields({ fields: ['photos'] });
        const photo = place.photos && place.photos[0];
        if (!photo) return null;
        const a = photo.authorAttributions && photo.authorAttributions[0];
        return { src: photo.getURI({ maxWidth: 800, maxHeight: 600 }), author: a ? a.displayName : '', authorUri: a ? a.uri : '' };
      })().catch((e) => { console.warn('[trip map] Google photo unavailable for', placeId, e); return null; }));
    }
    return photoCache.get(placeId);
  }

  // Hero photo: your "photo" column → first photo in "media" → Google's photo → icon.
  function heroSource(p) {
    if (p.photo) {
      const m = classifyMedia(p.photo);
      if (m.kind === 'image') return { src: m.src, item: m };
      if (m.kind === 'drive') return { src: m.large, item: m };
      if (m.kind === 'youtube') return { src: m.thumb, item: m };
    }
    const first = p.media.map(classifyMedia).find((m) => m.kind === 'image' || m.kind === 'drive');
    if (first) return { src: first.kind === 'drive' ? first.large : first.src, item: first };
    if (p.placeId && cfg.useGooglePhotos !== false && state.mapsReady) return 'google';
    return null;
  }

  function placeMapsUrl(p) {
    if (p.mapsUrl && /^https?:\/\//i.test(p.mapsUrl)) return p.mapsUrl;
    const q = new URLSearchParams({ api: '1' });
    if (p.placeId) { q.set('query', p.name); q.set('query_place_id', p.placeId); } else q.set('query', `${p.lat},${p.lng}`);
    return `https://www.google.com/maps/search/?${q}`;
  }

  function renderCard(p) {
    const card = $('#card');
    const c = catInfo(p.category);
    const hero = h('div', { class: 'card-hero', style: { '--c': c.color } });
    const setPlaceholder = () => {
      hero.classList.add('is-placeholder');
      hero.classList.remove('clickable');
      hero.replaceChildren(h('div', { class: 'placeholder', 'aria-hidden': 'true' }, iconFor(p)));
    };
    const src = heroSource(p);
    if (src && src !== 'google') {
      hero.append(h('img', { src: src.src, alt: p.name, onerror: setPlaceholder }));
    } else if (src === 'google') {
      hero.classList.add('loading');
      googlePhoto(p.placeId).then((ph) => {
        if (state.activeId !== p.id) return;
        hero.classList.remove('loading');
        if (!ph) { setPlaceholder(); return; }
        hero.replaceChildren(
          h('img', { src: ph.src, alt: p.name, onerror: setPlaceholder }),
          h('div', { class: 'photo-credit' }, 'Photo: ',
            ph.authorUri ? h('a', { href: ph.authorUri, target: '_blank', rel: 'noopener' }, ph.author || 'Google user') : (ph.author || 'Google user'),
            ' · Google Maps'),
        );
      });
    } else setPlaceholder();

    // Gallery of your photos/videos. Tapping the hero opens it full-size too.
    const media = [...new Set([p.photo, ...p.media].filter(Boolean))].map(classifyMedia);
    const viewable = media.filter((m) => m.kind !== 'link');
    const links = media.filter((m) => m.kind === 'link');
    const galleryItems = viewable.length > 1 || (viewable.length === 1 && !(src && src.item)) ? viewable : [];
    if (src && src.item) {
      const idx = Math.max(0, viewable.findIndex((m) => m.href === src.item.href));
      hero.classList.add('clickable');
      hero.setAttribute('role', 'button');
      hero.setAttribute('tabindex', '0');
      hero.setAttribute('aria-label', 'Open photo full-size');
      const openHero = () => openLightbox(viewable, idx, p.name);
      hero.addEventListener('click', openHero);
      hero.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHero(); } });
    }

    const tags = h('div', { class: 'card-tags' },
      h('span', { class: 'tag cat', style: { '--c': c.color } }, h('span', { class: 'dot' }), p.category),
      p.type ? h('span', { class: 'tag' }, p.type) : null,
      h('span', { class: 'tag' }, p.area),
      p.top ? h('span', { class: 'tag top' }, '★ Top pick') : null);

    const body = h('div', { class: 'card-body' },
      tags,
      h('h2', { id: 'cardTitle' }, p.name),
      p.localName && p.localName !== p.name ? h('div', { class: 'local-name', lang: cfg.localNameLang || 'zh-Hant-HK' }, p.localName) : null,
      p.address ? h('div', { class: 'address' }, p.address) : null,
      p.description ? h('div', { class: 'desc' }, richText(p.description)) : null,
      p.notes ? h('div', { class: 'notes' }, h('div', { class: 'notes-label' }, cfg.notesLabel), richText(p.notes)) : null,
      galleryItems.length ? h('div', { class: 'gallery', 'aria-label': 'Photos and videos' },
        galleryItems.map((m, i) => thumbFor(m, () => openLightbox(galleryItems, i, p.name)))) : null,
      links.length ? h('div', { class: 'media-links' }, links.map((m) => h('a', { class: 'btn small', href: m.href, target: '_blank', rel: 'noopener' }, `${m.label} ↗`))) : null,
      h('div', { class: 'card-actions' },
        h('a', { class: 'btn primary', href: placeMapsUrl(p), target: '_blank', rel: 'noopener' }, 'View in Google Maps ↗'),
        h('button', { class: 'btn small', type: 'button', onclick: () => routeWith(p, 'from') }, 'Route from here'),
        h('button', { class: 'btn small', type: 'button', onclick: () => routeWith(p, 'to') }, 'Route to here')));

    card.replaceChildren(
      h('button', { class: 'icon-btn card-close', type: 'button', 'aria-label': 'Close', onclick: () => closeCard() }, '✕'),
      h('button', { class: 'icon-btn card-share', type: 'button', 'aria-label': 'Copy link to this place', title: 'Copy link to this place', onclick: (e) => sharePlace(p, e.currentTarget) }, '🔗'),
      hero, body);
    card.hidden = false;
    card.scrollTop = 0;
  }

  function thumbFor(m, onclick) {
    const label = m.kind === 'video' || m.kind === 'youtube' ? 'Play video' : 'View photo';
    const btn = h('button', { class: 'thumb', type: 'button', 'aria-label': label, onclick });
    if (m.kind === 'video') btn.append(h('video', { src: `${m.src}#t=0.1`, muted: true, playsinline: true, preload: 'metadata' }));
    else btn.append(h('img', { src: m.kind === 'image' ? m.src : m.thumb, alt: '', loading: 'lazy' }));
    if (m.kind === 'video' || m.kind === 'youtube') btn.append(h('span', { class: 'play', 'aria-hidden': 'true' }, '▶'));
    return btn;
  }

  async function sharePlace(p, btn) {
    const url = `${location.origin}${location.pathname}#place=${encodeURIComponent(p.id)}`;
    try {
      if (navigator.share && isMobile()) { await navigator.share({ title: p.name, url }); return; }
      await navigator.clipboard.writeText(url);
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '🔗'; }, 1500);
    } catch { /* user cancelled */ }
  }

  function openPlace(id, { pan = true, fromList = false } = {}) {
    const p = state.byId.get(id);
    if (!p) return;
    state.activeId = id;
    renderCard(p);
    document.querySelectorAll('.place-item').forEach((b) => b.classList.toggle('is-active', b.dataset.id === id));
    if (isMobile()) setSheet(false);
    if (state.mapsReady) {
      syncMarkers(state.places.filter((x) => matches(x)));
      setActiveMarker(id);
      if (pan) {
        if (fromList && state.map.getZoom() < 12) { state.map.setCenter(p); state.map.setZoom(14); }
        // Wait for the card (and on phones, the resized map) before checking visibility.
        requestAnimationFrame(() => setTimeout(() => ensureVisible(p), isMobile() ? 80 : 0));
      }
    }
    updateHash();
  }

  function closeCard() {
    if (!state.activeId) return;
    state.activeId = null;
    $('#card').hidden = true;
    document.querySelectorAll('.place-item.is-active').forEach((b) => b.classList.remove('is-active'));
    if (state.mapsReady) { setActiveMarker(null); syncMarkers(state.places.filter((x) => matches(x))); }
    updateHash();
  }

  /* ═════════════ Lightbox ═════════════ */
  let lb = null;
  function openLightbox(items, index, title) {
    lb = { items, index, title };
    renderLightbox();
    $('#lightbox').hidden = false;
    document.addEventListener('keydown', lbKeys);
  }
  function closeLightbox() {
    $('#lightbox').hidden = true;
    $('#lightbox').replaceChildren();
    document.removeEventListener('keydown', lbKeys);
    lb = null;
  }
  function lbKeys(e) {
    if (!lb) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
    if (e.key === 'ArrowRight') lbStep(1);
    if (e.key === 'ArrowLeft') lbStep(-1);
  }
  function lbStep(d) { if (!lb) return; lb.index = (lb.index + d + lb.items.length) % lb.items.length; renderLightbox(); }
  function renderLightbox() {
    const m = lb.items[lb.index];
    let media;
    if (m.kind === 'image') media = h('img', { src: m.src, alt: lb.title });
    else if (m.kind === 'video') media = h('video', { src: m.src, controls: true, autoplay: true, playsinline: true });
    else media = h('iframe', { src: m.embed, title: lb.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen' });
    const multi = lb.items.length > 1;
    $('#lightbox').replaceChildren(
      h('div', { class: 'lb-top' },
        h('span', null, multi ? `${lb.index + 1} / ${lb.items.length}` : ''),
        h('span', null,
          m.href ? h('a', { class: 'lb-open', href: m.href, target: '_blank', rel: 'noopener' }, 'Open original ↗') : null, ' ',
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: closeLightbox }, '✕'))),
      h('div', { class: 'lb-stage', onclick: (e) => { if (e.target === e.currentTarget) closeLightbox(); } },
        media,
        multi ? h('button', { class: 'lb-nav prev', type: 'button', 'aria-label': 'Previous', onclick: () => lbStep(-1) }, '‹') : null,
        multi ? h('button', { class: 'lb-nav next', type: 'button', 'aria-label': 'Next', onclick: () => lbStep(1) }, '›') : null),
      h('div', { class: 'lb-caption' }, lb.title));
  }

  /* ═════════════ Routes ═════════════ */
  // A stop on a leg: a place from the sheet (shown or hidden), coordinates, or a name/address.
  function resolveLocation(text) {
    const t = clean(text);
    if (!t) return null;
    const p = state.byLabel.get(t.toLowerCase()) || state.allByName.get(t.toLowerCase());
    if (p && p.lat != null) {
      return { label: p.name, query: { lat: p.lat, lng: p.lng }, latLng: { lat: p.lat, lng: p.lng },
        mapsParam: p.placeId ? p.name : `${p.lat},${p.lng}`, placeId: p.placeId, coordsParam: `${p.lat},${p.lng}` };
    }
    const c = parseCoordText(t);
    if (c) return { label: t, query: c, latLng: c, mapsParam: `${c.lat},${c.lng}`, coordsParam: `${c.lat},${c.lng}` };
    const label = p ? p.name : t;
    return { label, query: label, mapsParam: label, coordsParam: label, needsLookup: true };
  }

  // Stops without coordinates (e.g. a hidden row, or a typed name) are found with Google's place search.
  const stopCache = new Map();
  async function resolveForRoute(text) {
    const r = resolveLocation(text);
    if (!r || !r.needsLookup || !state.mapsReady) return r;
    const key = r.label.toLowerCase();
    if (!stopCache.has(key)) {
      stopCache.set(key, (async () => {
        const { Place } = await google.maps.importLibrary('places');
        const { places } = await Place.searchByText({
          textQuery: r.label, fields: ['id', 'location'], maxResultCount: 1,
          locationRestriction: SEARCH_BOUNDS,
          language: cfg.language || 'en', region: (cfg.region || 'HK').toLowerCase(),
        });
        const hit = places && places[0];
        return hit && hit.location ? { lat: hit.location.lat(), lng: hit.location.lng(), placeId: hit.id } : null;
      })().catch(() => null));
    }
    const found = await stopCache.get(key);
    if (!found) return r; // let Google read it as an address
    const latLng = { lat: found.lat, lng: found.lng };
    return { ...r, query: latLng, latLng, placeId: found.placeId, coordsParam: `${found.lat},${found.lng}`, needsLookup: false };
  }
  const resolveStops = (texts) => Promise.all(texts.map(resolveForRoute));

  function directionsUrl(o, d, vias = [], mode = 'drive') {
    const q = new URLSearchParams({ api: '1', travelmode: MODES[mode].gmaps, origin: o.mapsParam, destination: d.mapsParam });
    if (o.placeId) q.set('origin_place_id', o.placeId);
    if (d.placeId) q.set('destination_place_id', d.placeId);
    if (vias.length && mode !== 'transit') q.set('waypoints', vias.map((v) => v.coordsParam).join('|'));
    return `https://www.google.com/maps/dir/?${q}`;
  }

  // Public transport depends on when you leave: "now", or about 10 am if it's night-time at the destination.
  function transitDeparture() {
    try {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: cfg.timeZone || 'Asia/Hong_Kong', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
      return hour >= 6 ? null : new Date(Date.now() + (10 - hour) * 3600e3);
    } catch { return null; }
  }

  // mode: 'drive' | 'transit' | 'walk'. Resolves to { routes, route, tollsKnown }, or null if there's no route.
  const routeCache = new Map();
  function computeRoute(o, d, vias, mode = 'drive', modifiers = {}) {
    const key = JSON.stringify([mode, o.query, d.query, vias.map((v) => v.query), modifiers]);
    if (!routeCache.has(key)) {
      const p = (async () => {
        const { Route } = await google.maps.importLibrary('routes');
        const base = ['path', 'distanceMeters', 'durationMillis', 'viewport'];
        const req = {
          origin: o.query, destination: d.query, travelMode: MODES[mode].travelMode,
          language: cfg.language || 'en', region: (cfg.region || 'HK').toLowerCase(), fields: base,
        };
        // Google can't add stops to public transport routes, so "via" only applies to walking and driving.
        if (vias.length && mode !== 'transit') req.intermediates = vias.map((v) => ({ location: v.query, via: true }));
        const run = async () => { const { routes } = await Route.computeRoutes(req); return routes && routes.length ? routes : null; };
        const wrap = (routes, tollsKnown) => (routes ? { routes, route: routes[0], tollsKnown } : null);
        if (mode === 'transit') {
          req.fields = [...base, 'legs', 'travelAdvisory', 'localizedValues'];
          req.computeAlternativeRoutes = true;
          const dep = transitDeparture();
          if (dep) req.departureTime = dep;
          return wrap(await run(), false);
        }
        if (mode === 'walk') return wrap(await run(), false);
        // Driving: ask for toll estimates, and retry without them in case they aren't available for this key/region.
        if (Object.keys(modifiers).length) req.routeModifiers = modifiers;
        req.fields = [...base, 'travelAdvisory'];
        req.extraComputations = ['TOLLS'];
        try {
          return wrap(await run(), true);
        } catch (firstErr) {
          delete req.extraComputations;
          req.fields = base;
          try { return wrap(await run(), false); } catch (e) { throw firstErr; }
        }
      })();
      p.catch(() => routeCache.delete(key)); // don't cache failures
      routeCache.set(key, p);
    }
    return routeCache.get(key);
  }

  function tollSummary(res) {
    if (!res.tollsKnown) return null;
    const info = res.route.travelAdvisory && res.route.travelAdvisory.tollInfo;
    // Google may not have toll data for Hong Kong / Shenzhen, so "no toll info" isn't shown as "No tolls".
    if (!info) return null;
    const prices = (info.estimatedPrices || []).map(fmtMoney).filter(Boolean);
    return { has: true, text: prices.length ? `Tolls ≈ ${prices.join(' + ')}` : 'Has tolls' };
  }
  function fareText(route) {
    const local = route.localizedValues && route.localizedValues.transitFare;
    if (local) return local;
    const fare = route.travelAdvisory && route.travelAdvisory.transitFare;
    return fare ? fmtMoney(fare) : '';
  }
  // One line per leg: time, then distance and tolls (driving), fare (public transport) or distance (walking).
  function resultLine(mode, res) {
    const r = res.route;
    const toll = mode === 'drive' ? tollSummary(res) : null;
    const fare = mode === 'transit' ? fareText(r) : '';
    return [fmtDuration(r.durationMillis), mode === 'transit' ? null : fmtDistance(r.distanceMeters),
      toll ? toll.text : null, fare ? `Fare ≈ ${fare}` : null].filter(Boolean).join(' · ');
  }
  const pathEnds = (route) => {
    const path = route.path || [];
    const pt = (x) => x && { lat: x.lat, lng: x.lng };
    return { start: pt(path[0]), end: pt(path[path.length - 1]) };
  };

  // Public transport: the rides (line, stops) with the walks between them.
  const VEHICLE_ICONS = {
    SUBWAY: '🚇', METRO_RAIL: '🚇', HEAVY_RAIL: '🚆', COMMUTER_TRAIN: '🚆', RAIL: '🚆', LONG_DISTANCE_TRAIN: '🚆',
    HIGH_SPEED_TRAIN: '🚄', MONORAIL: '🚝', TRAM: '🚋', BUS: '🚌', INTERCITY_BUS: '🚌', TROLLEYBUS: '🚎',
    SHARE_TAXI: '🚐', FERRY: '⛴️', FUNICULAR: '🚞', CABLE_CAR: '🚡', GONDOLA_LIFT: '🚡',
  };
  function transitSteps(route) {
    const out = [];
    (route.legs || []).forEach((leg) => (leg.steps || []).forEach((s) => {
      const td = s.transitDetails;
      if (td) {
        const line = td.transitLine || {}; const v = line.vehicle || {};
        out.push({
          kind: 'ride', icon: VEHICLE_ICONS[v.vehicleType] || '🚍', name: line.shortName || line.name || v.name || 'Transit',
          color: line.color, textColor: line.textColor, headsign: td.headsign || '', stops: td.stopCount,
          from: td.departureStop ? td.departureStop.name : '', to: td.arrivalStop ? td.arrivalStop.name : '',
        });
      } else {
        const last = out[out.length - 1];
        const ms = s.staticDurationMillis || 0;
        if (last && last.kind === 'walk') last.ms += ms; else out.push({ kind: 'walk', ms });
      }
    }));
    return out.filter((s) => s.kind === 'ride' || s.ms >= 60000);
  }
  function stepPills(steps) {
    return h('div', { class: 'step-pills' }, steps.map((s, i) => [
      i ? h('span', { class: 'step-sep', 'aria-hidden': 'true' }, '›') : null,
      s.kind === 'walk' ? h('span', { class: 'step-pill walk' }, `🚶 ${fmtDuration(s.ms)}`)
        : h('span', { class: `step-pill${s.color ? ' lined' : ''}`, style: s.color ? { '--lc': s.color, '--lt': s.textColor || '#fff' } : null }, `${s.icon} ${s.name}`),
    ]));
  }
  function stepList(steps) {
    const rides = steps.filter((s) => s.kind === 'ride');
    if (!rides.length) return null;
    return h('details', { class: 'ro-steps' }, h('summary', null, 'Where to get on and off'),
      h('ol', null, rides.map((s) => h('li', null,
        h('strong', null, `${s.icon} ${s.name}`), s.headsign ? ` towards ${s.headsign}` : '', h('br'),
        `${s.from} → ${s.to}`, s.stops ? ` (${s.stops} ${s.stops === 1 ? 'stop' : 'stops'})` : ''))));
  }

  function clearRoutes() {
    state.routeToken++;
    state.routeLayers.forEach((l) => l.lines.forEach((pl) => pl.setMap(null)));
    state.routeEndMarkers.forEach((m) => { m.map = null; });
    state.routeLayers = []; state.routeEndMarkers = []; state.selectedRoute = null; state.activeLeg = null;
    $('#routeLegend').hidden = true;
    $('#routeResults').replaceChildren();
    $('#tripWhole').classList.remove('is-active');
    $('#tripWhole').textContent = 'Show whole trip';
    $('#tripTotal').hidden = true;
    document.querySelectorAll('.leg-card').forEach((c) => {
      c.classList.remove('is-selected');
      c.querySelector('.leg-head').setAttribute('aria-expanded', 'false');
      const box = c.querySelector('.leg-details'); box.hidden = true; box.replaceChildren();
    });
  }

  function drawRoute(key, route, color) {
    const path = (route.path || []).map((pt) => ({ lat: pt.lat, lng: pt.lng }));
    const { Polyline } = state.lib;
    const casing = new Polyline({ path, strokeColor: '#ffffff', strokeOpacity: 0.9, strokeWeight: 9, zIndex: 10, map: state.map, clickable: false });
    const line = new Polyline({ path, strokeColor: color, strokeOpacity: 0.9, strokeWeight: 5, zIndex: 11, map: state.map });
    line.addListener('click', () => selectRoute(key));
    state.routeLayers.push({ key, lines: [casing, line], casing, line });
  }

  function selectRoute(key) {
    state.selectedRoute = key;
    state.routeLayers.forEach((l, i) => {
      const on = l.key === key;
      l.casing.setOptions({ zIndex: on ? 30 : 10 + i * 2, strokeOpacity: on ? 0.95 : 0.6 });
      l.line.setOptions({ zIndex: on ? 31 : 11 + i * 2, strokeOpacity: on ? 1 : 0.45, strokeWeight: on ? 6 : 4 });
    });
    document.querySelectorAll('[data-route-key]').forEach((n) => {
      const on = n.dataset.routeKey === key;
      if (n.classList.contains('route-option')) n.classList.toggle('is-selected', on);
      else n.setAttribute('aria-pressed', String(on));
    });
  }

  function addMarker(position, text, cls, title) {
    if (!position) return;
    const m = new state.lib.AdvancedMarkerElement({ position, map: state.map, zIndex: 2000, title, content: h('div', { class: `route-end ${cls}` }, text) });
    state.routeEndMarkers.push(m);
  }

  function fitRoutes(results) {
    const b = new state.lib.LatLngBounds();
    results.forEach((r) => { if (r && r.route.viewport) b.union(r.route.viewport); });
    if (!b.isEmpty()) state.map.fitBounds(b, mapPadding());
  }
  function fitPoints(pts) {
    pts = pts.filter(Boolean);
    if (!pts.length) return;
    if (pts.length === 1) { state.map.setCenter(pts[0]); state.map.setZoom(14); return; }
    const b = new state.lib.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    state.map.fitBounds(b, mapPadding());
  }

  function renderLegend(items, note = '') {
    const legend = $('#routeLegend');
    legend.replaceChildren(...[
      note ? h('span', { class: 'legend-note' }, note) : null,
      h('div', { class: 'legend-items' }, items.map((it) => h('button', {
        class: 'legend-item', type: 'button', dataset: { routeKey: it.key }, style: { '--rc': it.color },
        'aria-pressed': 'false', onclick: () => selectRoute(it.key),
      }, h('span', { class: 'sw' }), it.label, h('span', { class: 't' }, it.time)))),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Clear route', title: 'Clear route', onclick: () => clearRoutes() }, '✕'),
    ].filter(Boolean));
    legend.hidden = false;
  }

  function routeError(opts, mode) {
    const err = opts.find((s) => s.err);
    const msg = err ? String(err.err.message || err.err) : '';
    return h('div', { class: 'route-msg error' }, err ? 'Couldn’t calculate a route.' : `No ${MODES[mode].noun} route found.`,
      err ? h('small', null, /referr?er|PERMISSION_DENIED/i.test(msg) ? KEY_HINT
        : `${msg} — if this keeps happening, check that “Routes API” is enabled for your key.`) : null);
  }

  // The options to compare for one leg: fastest / toll-free / local roads when driving,
  // up to three alternatives by public transport, or one walking route.
  const OPTION_COLORS = ['#2563eb', '#0f9d58', '#8e44ad'];
  async function routeOptions(mode, o, d, vias) {
    if (mode === 'drive') {
      return Promise.all(ROUTE_PROFILES.map((pr) => computeRoute(o, d, vias, 'drive', pr.modifiers).then(
        (res) => ({ key: pr.key, label: pr.label, color: pr.color, hint: pr.hint, res }),
        (err) => ({ key: pr.key, label: pr.label, color: pr.color, err }))));
    }
    try {
      const res = await computeRoute(o, d, vias, mode);
      if (!res) return [{ key: `${mode}-0`, label: MODES[mode].label, color: OPTION_COLORS[0] }];
      return res.routes.slice(0, 3).map((route, i, all) => ({
        key: `${mode}-${i}`, label: all.length > 1 ? `Option ${i + 1}` : MODES[mode].label, color: OPTION_COLORS[i],
        res: { routes: res.routes, route, tollsKnown: false },
      }));
    } catch (err) {
      return [{ key: `${mode}-0`, label: MODES[mode].label, color: OPTION_COLORS[0], err }];
    }
  }

  const ROUTE_HINTS = {
    drive: 'Times are typical (no live traffic). Toll estimates come from Google and may not include every discount.',
    transit: 'Public transport options are for leaving now (or about 10 am, if it’s night-time in Hong Kong). Fares come from Google where it knows them.',
    walk: 'Walking times are typical.',
  };

  // Draw the options for one leg and list them in `box`. Returns the shown result, or null if nothing could be drawn.
  async function showComparison({ o, d, vias = [], box, mode = 'drive', preferred = '', mapsUrl = '', onCleared }) {
    clearRoutes();
    closeCard();
    if (onCleared) onCleared();
    const token = state.routeToken;
    box.hidden = false;
    box.replaceChildren(h('div', { class: 'route-msg' }, 'Calculating routes…'));
    const opts = await routeOptions(mode, o, d, vias);
    if (token !== state.routeToken) return null; // something else was chosen meanwhile
    const ok = opts.filter((s) => s.res);
    if (!ok.length) { box.replaceChildren(routeError(opts, mode)); return null; }

    if (mode === 'drive') {
      ok.forEach((s, i) => { // mark options that came back identical to an earlier one
        const twin = ok.slice(0, i).find((t) => Math.abs(t.res.route.distanceMeters - s.res.route.distanceMeters) < 50
          && Math.abs((t.res.route.durationMillis || 0) - (s.res.route.durationMillis || 0)) < 60000);
        if (twin) s.sameAs = twin.label;
      });
    }
    [...ok].reverse().forEach((s) => { if (!s.sameAs) drawRoute(s.key, s.res.route, s.color); });
    const ends = pathEnds(ok[0].res.route);
    addMarker(o.latLng || ends.start, 'A', 'a', o.label);
    addMarker(d.latLng || ends.end, 'B', 'b', d.label);
    fitRoutes(ok.map((s) => s.res));

    const gmaps = mapsUrl || directionsUrl(o, d, vias, mode);
    box.replaceChildren(
      h('div', { class: 'route-options' }, opts.map((s) => {
        if (!s.res) {
          return h('div', { class: 'route-option', style: { '--rc': s.color } },
            h('div', { class: 'ro-head' }, h('span', { class: 'ro-label' }, s.label)),
            h('div', { class: 'ro-meta' }, s.err ? 'Couldn’t calculate this option.' : 'No route found.'));
        }
        const r = s.res.route;
        let meta;
        if (mode === 'drive') {
          const toll = tollSummary(s.res);
          meta = [fmtDistance(r.distanceMeters), toll ? [' · ', h('span', { class: toll.has ? 'toll-yes' : 'toll-no' }, toll.text)] : null];
        } else if (mode === 'transit') {
          const fare = fareText(r);
          meta = fare ? `Fare ≈ ${fare}` : null;
        } else meta = fmtDistance(r.distanceMeters);
        const steps = mode === 'transit' ? transitSteps(r) : [];
        return h('div', { class: 'route-option', style: { '--rc': s.color }, dataset: { routeKey: s.sameAs ? '' : s.key } },
          h('button', { class: 'ro-head', type: 'button', onclick: () => !s.sameAs && selectRoute(s.key) },
            h('span', { class: 'ro-label' }, s.label), h('span', { class: 'ro-time' }, fmtDuration(r.durationMillis))),
          steps.length ? stepPills(steps) : null,
          meta || s.sameAs ? h('div', { class: 'ro-meta' }, meta, s.sameAs ? ` · Same route as ${s.sameAs}` : null) : null,
          steps.length ? stepList(steps) : null,
          h('div', { class: 'ro-foot' },
            h('a', { class: 'btn small', href: gmaps, target: '_blank', rel: 'noopener' }, 'Open in Google Maps ↗'),
            s.hint ? h('span', { class: 'ro-hint' }, s.hint) : null));
      })),
      h('p', { class: 'hint' }, ROUTE_HINTS[mode]));
    renderLegend(ok.filter((s) => !s.sameAs).map((s) => ({ key: s.key, color: s.color, label: s.label, time: fmtDuration(s.res.route.durationMillis) })));
    const shown = ok.find((s) => s.key === preferred && !s.sameAs) || ok[0];
    selectRoute(shown.key);
    if (isMobile()) setSheet(false);
    return shown.res;
  }

  // "Check another route": any two places or addresses.
  async function planRoute() {
    const box = $('#routeResults');
    const mode = MODES[$('#routeMode').value] ? $('#routeMode').value : defaultMode;
    const [o, d] = await resolveStops([$('#routeFrom').value, $('#routeTo').value]);
    if (!o || !d) { box.replaceChildren(h('div', { class: 'route-msg' }, 'Choose a start (A) and an end (B) — pick from the list or type an address.')); return; }
    if (!state.mapsReady) { box.replaceChildren(h('div', { class: 'route-msg error' }, 'Routes need the map to be switched on (Google Maps API key in config.js).')); return; }
    await showComparison({ o, d, box, mode });
  }

  function routeWith(p, which) {
    $(which === 'from' ? '#routeFrom' : '#routeTo').value = p.label;
    setTab('drive');
    $('#otherDrive').open = true;
    const other = $(which === 'from' ? '#routeTo' : '#routeFrom');
    if (clean(other.value)) { closeCard(); planRoute(); }
    else {
      if (isMobile()) { closeCard(); setSheet(true); }
      other.focus();
    }
    $('#otherDrive').scrollIntoView({ block: 'nearest' });
  }

  /* ═════════════ Getting around (Routes tab) ═════════════ */
  const legColor = (i) => LEG_COLORS[i % LEG_COLORS.length];
  const legModifiers = (leg) => Object.assign({}, leg.avoidTolls && { avoidTolls: true }, leg.avoidHighways && { avoidHighways: true });
  const legPreferred = (leg) => (leg.mode !== 'drive' ? `${leg.mode}-0` : leg.avoidHighways ? 'local' : leg.avoidTolls ? 'free' : 'fast');
  const legVias = (leg, vias) => (leg.mode === 'transit' ? [] : vias);

  function renderTrip() {
    $('#tripTitle').textContent = cfg.tripHeading || 'Getting around';
    const list = $('#tripList');
    const legs = state.legs;
    $('#tripWhole').hidden = legs.filter((l) => l.mode !== 'none').length < 2;
    $('#tripIntro').hidden = !legs.length;
    if (!legs.length) {
      list.replaceChildren(h('p', { class: 'hint' }, 'Nothing here yet — add legs to the Routes tab of the sheet, one row per leg.'));
      return;
    }
    list.replaceChildren(...legs.map((leg, i) => {
      const stops = [leg.from, ...leg.via, leg.to].filter(Boolean).map((t) => (resolveLocation(t) || {}).label || t);
      const m = MODES[leg.mode];
      leg.summaryEl = h('div', { class: 'leg-summary', hidden: !leg.summary }, leg.summary);
      const links = [
        ...leg.howTo.map((u) => h('a', { class: 'btn small', href: u, target: '_blank', rel: 'noopener' }, leg.howTo.length > 1 ? `${prettyUrl(u)} ↗` : 'How to ↗')),
        leg.media.length ? h('button', { class: 'btn small', type: 'button',
          onclick: () => openLightbox(leg.media.map(classifyMedia).filter((x) => x.kind !== 'link'), 0, leg.name) }, 'Photos & videos') : null,
      ].filter(Boolean);
      return h('div', { class: `leg-card mode-${leg.mode}`, dataset: { leg: i }, style: { '--rc': leg.mode === 'none' ? NO_ROUTE_COLOR : legColor(i) } },
        h('button', { class: 'leg-head', type: 'button', 'aria-expanded': 'false', onclick: () => showLeg(i) },
          h('span', { class: 'leg-num', 'aria-hidden': 'true' }, i + 1),
          h('span', { class: 'leg-main' },
            leg.day ? h('span', { class: 'leg-day' }, leg.day) : null,
            h('span', { class: 'leg-name' }, leg.name),
            stops.length && !(leg.autoName && !leg.via.length) ? h('span', { class: 'leg-stops' }, stops.join(' → ')) : null,
            h('span', { class: 'mode-pill' }, `${m.icon} ${leg.modeText || m.label}`))),
        leg.summaryEl,
        leg.description ? h('div', { class: 'leg-text' }, richText(leg.description)) : null,
        leg.notes ? h('div', { class: 'notes leg-text' }, h('div', { class: 'notes-label' }, cfg.notesLabel), richText(leg.notes)) : null,
        links.length ? h('div', { class: 'leg-text leg-links' }, links) : null,
        h('div', { class: 'leg-details', hidden: true }));
    }));
  }

  function setLegSummary(leg, res) {
    leg.summary = resultLine(leg.mode, res);
    if (leg.summaryEl) { leg.summaryEl.textContent = leg.summary; leg.summaryEl.hidden = false; }
  }

  async function showLeg(i) {
    const leg = state.legs[i];
    const card = document.querySelector(`.leg-card[data-leg="${i}"]`);
    if (state.activeLeg === i) { clearRoutes(); return; } // tap again to hide
    const box = card.querySelector('.leg-details');
    if (!state.mapsReady) { box.hidden = false; box.replaceChildren(h('div', { class: 'route-msg error' }, 'The map needs a Google Maps API key first.')); return; }
    const markSelected = () => {
      state.activeLeg = i;
      card.classList.add('is-selected');
      card.querySelector('.leg-head').setAttribute('aria-expanded', 'true');
    };
    if (leg.mode === 'none') { // no line on the map: just mark where it starts and ends, if known
      clearRoutes();
      closeCard();
      markSelected();
      const token = state.routeToken;
      const [o, d] = await resolveStops([leg.from, leg.to]);
      if (token !== state.routeToken) return;
      box.hidden = false;
      box.replaceChildren(h('div', { class: 'route-msg' }, 'No route is drawn for this leg — see the notes.',
        leg.mapsUrl ? [' ', h('a', { href: leg.mapsUrl, target: '_blank', rel: 'noopener' }, 'Open the link ↗')] : null));
      addMarker(o && o.latLng, 'A', 'a', o && o.label);
      addMarker(d && d.latLng, 'B', 'b', d && d.label);
      fitPoints([o && o.latLng, d && d.latLng]);
      if (isMobile() && (o || d)) setSheet(false);
      return;
    }
    markSelected();
    const [o, d, ...vias] = await resolveStops([leg.from, leg.to, ...leg.via]);
    if (state.activeLeg !== i) return;
    const res = await showComparison({ o, d, vias: legVias(leg, vias), box, mode: leg.mode, preferred: legPreferred(leg), mapsUrl: leg.mapsUrl, onCleared: markSelected });
    if (res) setLegSummary(leg, res);
  }

  async function showWholeTrip() {
    if (!state.mapsReady) return;
    const btn = $('#tripWhole');
    if (btn.classList.contains('is-active')) { clearRoutes(); return; } // tap again to hide
    clearRoutes();
    closeCard();
    const token = state.routeToken;
    btn.classList.add('is-active');
    btn.textContent = 'Calculating…';
    const legs = state.legs;
    const stops = await Promise.all(legs.map((leg) => resolveStops([leg.from, leg.to, ...leg.via])));
    const results = await Promise.all(legs.map((leg, i) => {
      if (leg.mode === 'none') return { skipped: true };
      const [o, d, ...vias] = stops[i];
      if (!o || !d) return { missing: true };
      return computeRoute(o, d, legVias(leg, vias), leg.mode, leg.mode === 'drive' ? legModifiers(leg) : {})
        .then((res) => (res ? { res } : { missing: true }), (err) => ({ err }));
    }));
    if (token !== state.routeToken) return; // something else was chosen meanwhile
    btn.textContent = 'Hide whole trip';
    let totalMs = 0;
    results.forEach((r, i) => {
      if (!r.res) return;
      drawRoute(`leg-${i}`, r.res.route, legColor(i));
      setLegSummary(legs[i], r.res);
      totalMs += r.res.route.durationMillis || 0;
    });
    // Numbered stops: 1 = where the trip starts, then the end of each leg.
    const pts = [];
    results.forEach((r, i) => {
      const [o, d] = stops[i];
      const ends = r.res ? pathEnds(r.res.route) : {};
      const a = (o && o.latLng) || ends.start; const b = (d && d.latLng) || ends.end;
      if (i === 0) addMarker(a, '1', 'stop', o && o.label);
      addMarker(b, String(i + 2), 'stop', d && d.label);
      pts.push(a, b);
    });
    const drawn = results.filter((r) => r.res);
    if (drawn.length) fitRoutes(drawn.map((r) => r.res)); else fitPoints(pts);
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.length - drawn.length - skipped;
    const total = $('#tripTotal');
    total.textContent = `${drawn.length} ${drawn.length === 1 ? 'leg' : 'legs'} on the map · about ${fmtDuration(totalMs)} of travel in total (typical times).`
      + (skipped ? ` ${skipped} without a route — see ${skipped > 1 ? 'their' : 'its'} notes.` : '')
      + (failed ? ` ${failed} couldn’t be calculated.` : '');
    total.hidden = false;
    renderLegend(legs.map((leg, i) => results[i].res && { key: `leg-${i}`, color: legColor(i), label: leg.day || `Leg ${i + 1}`, time: fmtDuration(results[i].res.route.durationMillis) }).filter(Boolean), 'Whole trip');
    if (isMobile()) setSheet(false);
  }

  /* ═════════════ Panel: tabs, area, mobile sheet ═════════════ */
  function setTab(tab) {
    state.tab = tab;
    ['places', 'drive'].forEach((t) => {
      const on = t === tab;
      $(`#tabBtn${t === 'places' ? 'Places' : 'Drive'}`).setAttribute('aria-selected', String(on));
      $(`#tab${t === 'places' ? 'Places' : 'Drive'}`).hidden = !on;
    });
    $('#panelBody').scrollTop = 0;
  }

  function setArea(area) {
    state.area = area;
    pruneTypes();
    if (state.activeId) {
      const p = state.byId.get(state.activeId);
      if (p && area !== 'all' && p.area !== area) closeCard();
    }
    update({ fit: true });
    updateHash();
  }

  function setSheet(open) {
    $('#app').classList.toggle('sheet-open', open);
    $('#sheetHandle').setAttribute('aria-expanded', String(open));
    $('#sheetHandle').setAttribute('aria-label', open ? 'Show map' : 'Show list');
    $('#sheetToggle').textContent = open ? 'Map' : 'List';
  }
  const sheetOpen = () => $('#app').classList.contains('sheet-open');

  function initSheet() {
    const handle = $('#sheetHandle');
    handle.addEventListener('click', () => setSheet(!sheetOpen()));
    $('#sheetToggle').addEventListener('click', () => setSheet(!sheetOpen()));
    initSheetDrag();
    // On phones, keep the visible map above whatever covers its bottom edge (sheet or card),
    // so the pin you tapped and Google's logo stay in view.
    const card = $('#card');
    const sync = () => {
      const covered = isMobile() && !card.hidden ? card.offsetHeight : null;
      document.documentElement.style.setProperty('--map-bottom', covered ? `${covered}px` : 'var(--peek)');
    };
    new ResizeObserver(sync).observe(card);
    // Collapsed sheet shows exactly its top part (handle, title, areas, tabs).
    const top = $('.panel-top');
    const setPeek = () => { if (isMobile()) document.documentElement.style.setProperty('--peek-h', `${top.offsetHeight}px`); };
    new ResizeObserver(setPeek).observe(top);
    setPeek();
    new MutationObserver(sync).observe(card, { attributes: true, attributeFilter: ['hidden'] });
    mqMobile.addEventListener('change', sync);
  }

  // Phones: drag the top of the sheet (bar, title, areas, tabs) up or down, or pull down from the
  // top of the list, and the sheet follows your finger, then snaps open or closed.
  function initSheetDrag() {
    const panel = $('#panel'); const top = $('.panel-top'); const body = $('#panelBody');
    const probe = h('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: '0', top: '0', width: '1px', height: 'var(--peek)', visibility: 'hidden', 'pointer-events': 'none' } });
    document.body.append(probe);
    let d = null;

    const start = (e, fromBody) => {
      if (!isMobile() || e.touches.length !== 1) { d = null; return; }
      const t = e.touches[0];
      d = { fromBody, x: t.clientX, y: t.clientY, active: false, samples: [] };
    };
    const move = (e) => {
      if (!d) return;
      const t = e.touches[0];
      const dx = t.clientX - d.x; const dy = t.clientY - d.y;
      if (!d.active) {
        if (Math.abs(dy) < 8 || Math.abs(dy) <= Math.abs(dx)) {
          if (Math.abs(dx) > 8) d = null; // sideways: let the area buttons scroll
          return;
        }
        // In the list, only a pull-down from the very top moves the sheet; otherwise it scrolls.
        if (d.fromBody && !(sheetOpen() && body.scrollTop <= 0 && dy > 0)) { d = null; return; }
        d.closed = Math.max(0, panel.offsetHeight - probe.offsetHeight);
        d.base = sheetOpen() ? 0 : d.closed;
        d.active = true;
        panel.style.transition = 'none';
      }
      e.preventDefault();
      d.pos = Math.min(d.closed, Math.max(0, d.base + dy));
      panel.style.transform = `translateY(${d.pos}px)`;
      d.samples.push({ y: t.clientY, t: e.timeStamp });
      if (d.samples.length > 5) d.samples.shift();
    };
    const end = (e) => {
      if (!d) return;
      const was = d; d = null;
      if (!was.active) return; // a tap: let it through
      e.preventDefault(); // no click on whatever the finger lifted over
      const s = was.samples; const a = s[0]; const b = s[s.length - 1];
      const v = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0; // px per ms; negative = upwards
      const open = v < -0.35 ? true : v > 0.35 ? false : was.pos < was.closed / 2;
      panel.style.transition = '';
      panel.style.transform = '';
      setSheet(open);
    };

    top.addEventListener('touchstart', (e) => start(e, false), { passive: true });
    body.addEventListener('touchstart', (e) => start(e, true), { passive: true });
    [top, body].forEach((el) => {
      el.addEventListener('touchmove', move, { passive: false });
      el.addEventListener('touchend', end);
      el.addEventListener('touchcancel', end);
    });
  }

  function initDeviceTip() {
    if (!cfg.showDeviceTip || !isMobile() || storage.get('tripmap.tip') === 'off') return;
    const tip = $('#deviceTip');
    tip.hidden = false;
    $('#deviceTipClose').addEventListener('click', () => { tip.hidden = true; storage.set('tripmap.tip', 'off'); });
    setTimeout(() => { tip.hidden = true; }, 12000);
  }

  /* ═════════════ URL hash (shareable links) ═════════════ */
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    return { area: q.get('area'), place: q.get('place') };
  }
  function updateHash() {
    const q = new URLSearchParams();
    if (state.area !== 'all') q.set('area', state.area);
    if (state.activeId) q.set('place', state.activeId);
    if (/[?&#]check\b/.test(location.hash)) q.set('check', '');
    const s = q.toString().replace(/=(&|$)/g, '$1');
    history.replaceState(null, '', s ? `#${s}` : location.pathname + location.search);
  }

  /* ═════════════ Boot ═════════════ */
  function bindUI() {
    document.title = cfg.title;
    $('#title').textContent = cfg.title;
    $('#subtitle').textContent = cfg.subtitle;
    $('#subtitle').hidden = !cfg.subtitle;

    let t;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = clean(e.target.value).toLowerCase(); pruneTypes(); update(); }, 120);
    });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
    $('#clearFilters').addEventListener('click', () => {
      state.categories.clear(); state.types.clear(); state.search = ''; $('#search').value = ''; update();
    });
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
      setTab(b.dataset.tab);
      if (isMobile() && !sheetOpen()) setSheet(true);
    }));
    $('#tripWhole').addEventListener('click', () => showWholeTrip());
    $('#routeMode').value = defaultMode;
    $('#routeMode').addEventListener('change', () => { if (clean($('#routeFrom').value) && clean($('#routeTo').value)) planRoute(); });
    $('#routeForm').addEventListener('submit', (e) => { e.preventDefault(); document.activeElement.blur(); planRoute(); });
    $('#swapRoute').addEventListener('click', () => {
      const a = $('#routeFrom'); const b = $('#routeTo');
      [a.value, b.value] = [b.value, a.value];
      if (clean(a.value) && clean(b.value)) planRoute();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb) closeCard(); });
    initSheet();
    initDeviceTip();
  }

  function fillPlaceNames() {
    $('#placeNames').replaceChildren(...[...state.places].sort((a, b) => a.label.localeCompare(b.label))
      .map((p) => h('option', { value: p.label }, `${p.area} · ${p.type || p.category}`)));
  }

  async function boot() {
    bindUI();
    try {
      await loadData();
    } catch (e) {
      $('#placeList').replaceChildren(h('li', { class: 'empty' }, e.message));
      console.error(e);
    }
    fillPlaceNames();
    renderTrip();
    const initial = readHash();
    if (initial.area && state.areaOrder.includes(initial.area)) state.area = initial.area;
    update();
    renderDataCheck();

    if (!clean(cfg.googleMapsApiKey)) {
      showMapNotice('nokey');
    } else {
      try {
        await loadGoogleMaps();
        await initMap();
        syncMarkers(state.places.filter((p) => matches(p)));
        fitToArea();
      } catch (e) {
        console.error(e);
        showMapNotice('error', e.message);
      }
    }
    if (initial.place && state.byId.has(initial.place)) {
      const p = state.byId.get(initial.place);
      openPlace(p.id, { pan: false });
      if (state.mapsReady) { state.map.setCenter(p); state.map.setZoom(15); }
    }
  }

  boot();
})();
