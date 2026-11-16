/*
 * ─────────────────────────────────────────────────────────────
 *  SETTINGS — the only file you need to edit (besides your data).
 *  See README.md for step-by-step instructions.
 * ─────────────────────────────────────────────────────────────
 */
window.TRIP_CONFIG = {
  // Shown at the top of the page and in the browser tab.
  title: 'Hong Kong — Our Picks',
  subtitle: 'Our favourite places, sorted by area and type. Tap a pin or a place for details.',

  // Google Maps API key (the same key as the Japan map; README → "Step 1").
  googleMapsApiKey: 'AIzaSyCN7FIZXtOPoDHG0L9_rBLTBpMVrtHO5xg',

  // Leave as DEMO_MAP_ID unless you create your own Map ID in Google Cloud.
  mapId: 'DEMO_MAP_ID',

  // Map labels in English, results biased to Hong Kong; public transport times use Hong Kong time.
  language: 'en',
  region: 'HK',
  timeZone: 'Asia/Hong_Kong',

  // Where the map starts, and the box place searches are limited to (Hong Kong + Shenzhen).
  home: { center: { lat: 22.32, lng: 114.17 }, zoom: 11 },
  searchBounds: { north: 22.9, south: 22.1, east: 114.7, west: 113.7 },

  // 2) Where your lists live. These can be files in this repo (default)
  //    or "Publish to web → CSV" links from a Google Sheet (README → "Step 3").
  data: {
    // Published tabs of the Google Sheet "Hong Kong & Shenzhen map (places)".
    places: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsDwe1uMh3hPqbGJR0-DNq_hOvXco0s9oQFmS4eTg-jbkAmf0282eYiMQ8au_ZEAmO4vyT85wKMxJ-/pub?gid=0&single=true&output=csv', // Places tab
    areas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsDwe1uMh3hPqbGJR0-DNq_hOvXco0s9oQFmS4eTg-jbkAmf0282eYiMQ8au_ZEAmO4vyT85wKMxJ-/pub?gid=1&single=true&output=csv',  // Areas tab
    routes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsDwe1uMh3hPqbGJR0-DNq_hOvXco0s9oQFmS4eTg-jbkAmf0282eYiMQ8au_ZEAmO4vyT85wKMxJ-/pub?gid=2&single=true&output=csv', // Routes tab (Getting around)
  },

  // Heading for your personal notes inside each place's pop-up.
  notesLabel: 'Our tips',

  // Language of the zh_name column (shown under the name — handy to show staff or a taxi driver).
  localNameLang: 'zh-Hant-HK',

  // If a place has a place_id but no photo of your own, show Google's photo.
  useGooglePhotos: true,

  // Show a one-time "best on tablet/computer" tip on phones.
  showDeviceTip: true,

  // Categories: order here = order of the filter buttons.
  // Any category in your data that isn't listed still works (grey pin).
  categories: [
    { name: 'Food',           color: '#c8402f', icon: '🥢' },
    { name: 'Drinks',         color: '#9a3b8c', icon: '🍸' },
    { name: 'Shopping',       color: '#5b5fc7', icon: '🛍️' },
    { name: 'Accommodation',  color: '#1e7a8c', icon: '🛏️' },
    { name: 'Sights',         color: '#2f8a4c', icon: '🏙️' },
    { name: 'Theme Parks',    color: '#d13a82', icon: '🎢' },
    { name: 'Getting around', color: '#5f6b7a', icon: '🚇' },
  ],
  defaultCategory: { color: '#6b7280', icon: '📍' },

  // Optional: a pin icon per "type" (overrides the category icon).
  typeIcons: {
    'Cha chaan teng': '🍳', 'Dim sum': '🥟', 'Wonton noodles': '🍜', 'Noodles': '🍜', 'Congee': '🥣',
    'Roast meat': '🍖', 'Siu mei': '🍖', 'Claypot rice': '🍲', 'Hot pot': '🍲', 'Seafood': '🦀',
    'Cantonese': '🥢', 'Dai pai dong': '🥢', 'Burger': '🍔', 'Japanese': '🍱',
    'Bakery': '🥐', 'Egg tarts': '🥧', 'Dessert': '🍮', 'Milk pudding': '🍮', 'Shaved ice': '🍧', 'Kakigori': '🍧',
    'Ice cream': '🍦', 'Café': '☕', 'Coffee': '☕', 'Milk tea': '🧋', 'Bar': '🍸', 'Cocktails': '🍸',
    'Mall': '🛍️', 'Market': '🧺',
    'Hotel': '🏨', 'Serviced apartment': '🏢',
    'Viewpoint': '🌄', 'Promenade': '🌃', 'Museum': '🏛️', 'Temple': '🛕', 'Park': '🌳', 'Beach': '🏖️',
    'Attraction': '🎠', 'Ferry': '⛴️', 'Tram': '🚋', 'Station': '🚉', 'Airport': '✈️',
  },

  // Getting around tab: its legs come from the Routes tab of the sheet.
  tripHeading: 'Getting around',
  // How a leg is travelled when its "mode" cell is blank: 'transit', 'walk' or 'drive'.
  defaultMode: 'transit',
};
