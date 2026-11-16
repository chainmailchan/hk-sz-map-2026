# Hong Kong (and Shenzhen) map

An interactive, filterable map of our recommended places in Hong Kong, made for friends planning a trip. Shenzhen will be added later (see *Shenzhen* below).

Live at **https://chainmailchan.github.io/hk-sz-map-2026/** once GitHub Pages is switched on (Step 2).

- **Areas:** narrow the map to one area (e.g. Central & Sheung Wan). The map zooms to it and shows any notes and suggested days for that area.
- **Categories and types:** filter by category (Food, Sights, Accommodation…), then by type (Cha chaan teng, Dim sum…). You can also search (names, Chinese names, addresses, tips) and sort.
- **Pop-ups:** tap a pin to see a photo, name, **Chinese name** (handy to show staff or a taxi driver), address, short description, our tips, any photos or videos, and a **View in Google Maps** button.
- **Getting around:** our legs, in order, each by **public transport**, **on foot** or by **car/taxi**. Tap one to draw it on the map:
  - Public transport: up to three options, with the lines to take (e.g. 🚇 Island Line), where to get on and off, and the fare when Google knows it.
  - Car/taxi: fastest, toll-free and local-roads options.
  - Legs Google can't route (e.g. the border crossing) show as a card with notes and a "How to" link, and no line on the map.
  - **Show whole trip** draws every leg at once. "Check another route" compares any two places.
- **Works on phones:** on a phone the list becomes a pull-up sheet. It is easiest to use on a tablet or computer.

Everything you edit is in **`config.js`** (settings) and the **data lists** (a Google Sheet, or the CSV files in `data/`).

---

## One-time setup

### Step 1: The Google Maps API key

This site **reuses the Japan map's key** (`config.js` → `googleMapsApiKey`). Both sites live under `https://chainmailchan.github.io/`, so if that key's website restriction is `https://chainmailchan.github.io/*` (as the Japan README set it up), **nothing needs changing**. The Japan map is not affected; the two sites just share the key's free monthly allowance and your budget alert.

To check: <https://console.cloud.google.com/> → project **nippon-2026** (probably) → **☰ → APIs & Services → Credentials** → the key starting `AIzaSyCN7F…`:
- **Application restrictions → Websites** includes `https://chainmailchan.github.io/*`. Use the whole site, not a folder: browsers tell Google only *which site* a request comes from, so a folder-level entry blocks place lookups, Google photos and routes (the map itself would still load).
- **API restrictions** ticks **Maps JavaScript API**, **Places API (New)** and **Routes API**.

> The key is visible in the page's source code. That is normal for Google Maps websites. The "Websites" restriction is what stops anyone using it on another site.

### Step 2: Put the site online

This repository has its own address, so your other sites (e.g. `chainmailchan.github.io/nippon-2026/`) are not affected.

1. On GitHub, open this repository → **Settings → Pages**.
2. Under *Source* choose **Deploy from a branch**, then *Branch* **`main`** and **`/ (root)`**, and click **Save**.
3. After a minute or two the site is live at **https://chainmailchan.github.io/hk-sz-map-2026/**.

> The repository is **public**, so anyone with the link can see the site, including your tips. That suits a recommendations list, but don't put anything private in it (booking references, home addresses, etc.). Anything in a *published* sheet tab is public too, including helper columns.

### Step 3: Curate your places in the Google Sheet

The sheet has four tabs: **Read me**, **Places**, **Areas** and **Routes**. Until it's connected, the site uses the CSV files in `data/`.

1. **Curate:** set `show` to yes or no, fix any category or type, and add descriptions and tips.
2. **Fill in missing locations:** open `…/hk-sz-map-2026/tools/lookup.html`. In the Places tab, select all (Ctrl/⌘+A) and copy, then paste into the helper and click **Look up**. Check the matches — **⚠ rows first** (two rows matched to the same place, or a place Google says is closed) — then click **Copy rows for Google Sheets**, click cell **A1** of the Places tab and paste. It fills in `coordinates`, `place_id`, `zh_name` and `address` where they're empty, and leaves everything else as it was.
3. **Publish:** **File → Share → Publish to web.** Under *Link*, choose the **Places** tab and **Comma-separated values (.csv)**, then **Publish**, and copy the link. Do the same for **Areas** and **Routes**.
4. **Connect:** paste the three links into `config.js`:
   ```js
   data: {
     places: 'https://docs.google.com/spreadsheets/d/e/…/pub?gid=0&single=true&output=csv',
     areas:  'https://docs.google.com/…&output=csv',
     routes: 'https://docs.google.com/…&output=csv',
   },
   ```

From then on, edit the Sheet and the site picks up changes **within about 5 minutes**. Google refreshes published sheets on its own schedule.

> **Check your data:** open the site with `?check` on the end (`…/hk-sz-map-2026/?check`). A list at the bottom of the panel shows any rows that are hidden because something is missing, and any leg whose `mode` isn't recognised.

---

## The lists

Column names are not case-sensitive. Only **name**, **area**, **category** and a location are required. Everything else is optional.

### Places

| Column | What to put | Example |
|---|---|---|
| `show` | `no` hides the row without deleting it. Blank or `yes` shows it. | yes |
| `name` | Place name. Starting it with `#` also hides the row. | Lan Fong Yuen |
| `zh_name` | Chinese name, shown under the name. The lookup helper fills in Google's Chinese name. | 蘭芳園 |
| `area` | The area it belongs to. Becomes an area button. | Central & Sheung Wan |
| `category` | One of the categories in `config.js` (Food, Drinks, Shopping, Accommodation, Sights, Theme Parks, Getting around). A new one also works and gets a grey pin. | Food |
| `type` | Sub-type. Used for the second row of filters and the pin icon (icons are in `config.js` → `typeIcons`). | Cha chaan teng |
| `coordinates` | In Google Maps, **right-click the spot → click the numbers** to copy them, then paste. The lookup helper fills it in. | 22.2829, 114.1555 |
| `place_id` | Google's ID for the place. Gives an exact "View in Google Maps" link and Google's photo if you don't add your own. The lookup helper fills it in. | ChIJ… |
| `address` | Shown in the pop-up. The lookup helper fills in Google's address. | 2 Gage St, Central |
| `top_pick` | `yes` to add a ★ and list it first | yes |
| `description` | One or two neutral sentences: what it is | Cha chaan teng known for "pantyhose" milk tea. |
| `notes` | **Your personal tips.** Shown in a highlighted "Our tips" box. Links become clickable. | Go before noon; order the pork chop bun. |
| `photo` | Main photo: `media/file.jpg`, an image link, a Google Drive link, or a YouTube link | media/lan-fong-yuen.jpg |
| `media` | Extra photos and videos, **one per line** (or separated with `\|`) | media/a.jpg ⏎ https://youtu.be/… |
| `maps_url` | Optional: your own Google Maps link (overrides the automatic one). | |
| `search` | For the lookup helper only: what to search for instead of the name — useful for chains with several branches. The site ignores it. | Bakehouse 14 Tai Wong Street East Wan Chai |

Separate `lat` and `lng` columns also work instead of `coordinates`.

### Routes (the Getting around tab)

One row per leg, in trip order. They appear as numbered legs in the **Getting around** tab.

| Column | What to put |
|---|---|
| `show` | `no` hides the leg |
| `day` | Optional label, e.g. "Day 1" or "23 Dec" |
| `name` | e.g. "Hotel → dinner". Leave blank to use "from → to". |
| `mode` | How you travel: **transit** (or MTR, bus, tram, ferry…), **walk**, **drive** (or taxi, car), or **none** for a leg that shouldn't be drawn (e.g. the border crossing). Blank = public transport (`defaultMode` in `config.js`). The word you type is shown on the leg, e.g. "🚇 MTR". |
| `from`, `to` | A place name from the Places tab (switched-off places work too), coordinates, or a name/address — Google finds names that have no coordinates. Optional for `none` legs. |
| `via` | Optional stops to pass through, one per line (walking and driving only — Google can't add stops to public transport routes) |
| `avoid_tolls`, `avoid_highways` | Driving only: `yes` to show the toll-free or local-roads version first |
| `how_to` | Optional link(s) shown as a **How to ↗** button, e.g. an official guide for a border crossing |
| `description`, `notes`, `media`, `maps_url` | Same as for Places |

### Areas (optional)

| Column | What to put |
|---|---|
| `area` | Exactly as written in Places |
| `days` | e.g. "1 day" |
| `summary` | A short note shown when someone picks that area |

Areas appear in the order of this tab. Any area not listed here goes after them, in alphabetical order.

---

## Adding places quickly: the lookup helper

Open **`…/hk-sz-map-2026/tools/lookup.html`**. This page is for you, not your friends.

1. Paste your Places tab (see Step 3), or type place names, one per line (e.g. "Mak's Noodle Wellington Street"), or paste a **Google Takeout export of a Google Maps list** (Title, Note, URL).
2. When typing names, optionally fill in the area and category for the batch, then click **Look up**.
3. Check each match (change it in the drop-down if Google picked the wrong branch). Rows marked **⚠** matched the same place as another row, or Google says the place is closed — check those first.
4. Click **Copy rows for Google Sheets** and paste into the Places tab (cell **A1** if you pasted the whole tab, or column **A** of the first empty row for new names).

Searches are limited to Hong Kong and Shenzhen (`searchBounds` in `config.js`).

---

## Photos and videos (optional)

| What | Best way |
|---|---|
| **Photos** | Upload to the `media/` folder on GitHub (**Add file → Upload files**), then use `media/your-photo.jpg`. Use JPG, roughly 1600 px wide. iPhone HEIC files won't display. |
| **Videos** | Upload to **YouTube as Unlisted** and paste the link. It plays inside the pop-up. Short `.mp4` clips (under ~20 MB) can go in `media/`. |
| Google Drive | Set the file to *Anyone with the link* and paste the link. It works, but less reliably than the two options above. |
| Google Photos albums | Paste the album link. It appears as a "Photo album" button because Google Photos can't be shown inside other sites. |

If a place has no photo of your own but has a `place_id`, the pop-up shows Google's photo with its credit.

---

## Good to know

- **Public transport times** are for leaving now, or about 10 am when it's night-time in Hong Kong (so planning from another time zone still shows daytime services). **Fares** come from Google when it has them.
- **Driving times** are typical, without live traffic. **Tolls:** Google may not have toll data for Hong Kong. When it does, routes show "Tolls ≈ HK$…" or "Has tolls"; otherwise nothing is said about tolls. Taxi fares are not estimated.
- **"Open in Google Maps"** opens directions in the Google Maps app or website, in the leg's travel mode. Google's links can't switch on "avoid tolls" automatically, so for those options the button reminds you to turn it on under *Options*.
- **Share a single place:** the 🔗 button on a pop-up copies a link that opens straight to that place.
- **Preview on your computer:** in this folder run `python3 -m http.server 8000` and open <http://localhost:8000>. Opening `index.html` by double-clicking won't load the lists. Remember to allow `http://localhost:8000/*` on your API key.

### Shenzhen (not added yet)

Known issues to settle before adding Shenzhen places:
- Google services (Maps, and the Sheets links this site loads its data from) are blocked in mainland China without a VPN. Roaming on a non-mainland SIM/eSIM usually gets around this.
- Mainland street maps use shifted (GCJ-02) coordinates, so Shenzhen pins must come from the same source as the map that shows them (e.g. the lookup helper) — not from GPS or other map apps.
- Google's public transport routing in Shenzhen is unconfirmed.

### Files

```
index.html          the page
config.js           ← your settings (API key, data links, categories, colours, icons)
assets/app.js       how it works (no need to edit)
assets/styles.css   how it looks
data/*.csv          the lists until the Google Sheet is connected
media/              your photos and short videos
tools/lookup.html   lookup helper for adding places
```
