# Mission Impossipoints — Technical Documentation

## Overview

A Hebrew (RTL) family rewards PWA for kids. Kids complete missions (chores) and log behavioral successes to earn points, which they redeem for prizes. Parents manage everything through a PIN-protected panel.

**Live URL:** https://mission-impossipoints.vercel.app  
**Repo:** https://github.com/eliyseror/mission-impossipoints  
**Firebase Project:** `kids-rewards-c00ed`

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no build step, no framework
- **Backend:** Firebase Firestore (compat SDK v10.12)
- **Hosting:** Vercel (static)
- **PWA:** Service worker + manifest for offline/install

## File Structure

```
mission-impossipoints/
├── index.html              # Single page shell (header, main, nav, modal, toast)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (network-first, cache fallback)
├── firestore.rules         # Firestore security rules (open read/write)
├── css/
│   └── style.css           # All styling (~1700 lines, dark theme, RTL)
├── js/
│   ├── firebase-config.js  # Firebase init
│   ├── store.js            # Data layer — all Firestore CRUD
│   └── app.js              # UI logic — state, rendering, events (~1400 lines)
└── icons/
    ├── icon-192.svg
    └── icon-512.svg
```

## Architecture

- **Single-page app** — `<main id="main">` gets its `innerHTML` replaced on navigation
- **State object** — Global `state` holds current screen, loaded data, UI state
- **Event delegation** — One click handler on `<main>` routes all `[data-action]` clicks
- **No auth** — Firestore rules are fully open; parent access gated by client-side 4-digit PIN

## Navigation (Bottom Nav)

| Tab | Screen | Description |
|-----|--------|-------------|
| 🏠 בית | `dashboard` | Overview tiles with quick links |
| ⭐ פרסים | `rewards` | Kids list → kid missions → prize shop |
| 🏆 הצלחות | `successes` | Behavioral success tracking (per kid, daily) |
| 🛒 קניות | `shopping` | Family shopping list with presets |
| ☰ עוד | `more` | Tasks, Messages, Calendar, Parent Panel |

### Sub-screens
- `kid` — Individual kid's missions (from rewards)
- `shop-kid` — Prize shop for a specific kid
- `pin` — PIN entry screen
- `parent` — Parent control panel (PIN-protected)
- `calendar` — Family calendar (accessible from "more" and dashboard tiles)

## Firestore Collections

| Collection | Doc ID | Fields |
|-----------|--------|--------|
| `config` | `settings` | `pin` (string) |
| `config` | `dailySpecial` | `choreId`, `date` |
| `config` | `successPoints` | `{ [kidId]: { [typeId]: number } }` |
| `kids` | auto | `name`, `icon`, `points`, `createdAt` |
| `chores` | auto | `name`, `points`, `timeOfDay`, `active` |
| `prizes` | auto | `name`, `cost`, `active` |
| `history` | auto | `kidId`, `kidName`, `itemId`, `itemName`, `type`, `points`, `status`, `createdAt` |
| `successes` | `{kidId}_{type}_{date}` | `kidId`, `type`, `date`, `count` |
| `weeklyMissions` | auto | `kidId`, `title`, `points`, `weekStart`, `done`, `createdAt` |
| `shopping` | auto | `name`, `category`, `checked`, `createdAt` |
| `tasks` | auto | `title`, `assignedTo`, `priority`, `dueDate`, `done`, `createdAt` |
| `events` | auto | `title`, `date`, `time`, `member`, `color`, `createdAt` |
| `meals` | `{date}_{type}` | `date`, `type`, `description`, `updatedAt` |
| `messages` | auto | `text`, `author`, `pinned`, `createdAt` |

## Key Features

### 1. Missions (Chores) — Grouped by Time of Day

Chores have a `timeOfDay` field: `'morning'`, `'afternoon'`, or `'evening'`.

**Constants:**
```javascript
const TIME_SECTORS = [
  { id: 'morning', label: 'בוקר', icon: '🌅' },
  { id: 'afternoon', label: 'צהריים', icon: '☀️' },
  { id: 'evening', label: 'ערב', icon: '🌙' }
];
```

- Kid screen groups missions under time sector headers
- Parent panel chore list also grouped by sector
- Add/edit chore modal has a time-of-day picker
- Existing chores without `timeOfDay` default to `'morning'`

### 2. Duplicate Prevention (Anti-Spam)

Kids can't submit the same chore multiple times:
- **UI level:** Button immediately disabled + text changes to ⏳ on click
- **Client state check:** Checks `state.pending` for existing pending request (same kid + chore)
- **Database guard:** `Store.addRequest` queries Firestore for existing pending record before inserting

### 3. Successes (הצלחות) — Behavioral Tracking

Five character-based success types kids can log throughout the day:

```javascript
const SUCCESS_TYPES = [
  { id: 'stop', name: 'מר עצור', icon: '🛑', desc: 'עצרתי והתאפקתי', points: 5 },
  { id: 'investigator', name: 'מר בודק/ת', icon: '🔍', desc: 'בדקתי וחקרתי', points: 5 },
  { id: 'timer', name: 'מר טיימר', icon: '⏳', desc: 'השתמשתי בטיימר', points: 5 },
  { id: 'effort', name: 'מר מאמץ', icon: '💪', desc: 'התאמצתי פיזית', points: 5 },
  { id: 'friendship', name: 'מר חברות', icon: '🤝', desc: 'הייתי חבר/ה טוב/ה', points: 5 }
];
```

**How it works:**
- Kid taps 🏆 tab → sees all 5 characters with daily count
- Taps "הצלחתי!" → counter increments, points added immediately (no parent approval)
- Data stored as `successes/{kidId}_{type}_{date}` with a `count` field
- Resets daily (each date has its own document)
- If multiple kids: chips at top to switch between them

**Points are configurable per kid:**
- Parent panel → 🏆 הצלחות tab
- Each kid has their own +/− controls per success type
- Stored in `config/successPoints` as `{ kidId: { typeId: points } }`
- Helper: `getSuccessPoints(typeId, kidId)` returns configured or default (5)

### 4. Weekly Personal Missions (משימות אישיות)

Per-kid weekly missions set by parents. Different from regular chores — these are unique goals tailored to each child.

**Data model:** `weeklyMissions` collection
- Fields: `kidId`, `title`, `points`, `weekStart` (YYYY-MM-DD of Sunday), `done`, `createdAt`
- Week starts on Sunday (day 0). Missions are filtered by `weekStart === currentWeekStart()`

**Parent panel:** 🎖️ אישיות tab
- Shows each kid as a card with their current week's missions
- Add/edit/delete missions per kid
- Each mission has a title and point value

**Kid screen:**
- Shows under "🎖️ משימות אישיות השבוע" section (only if they have missions)
- Kid taps "בוצע! ✓" to complete — points added immediately (no approval)
- Completed missions show with strikethrough and ✓ badge
- Each mission can only be completed once (done=true)

**Weekly reset:** Missions don't auto-delete. Each week parents create new missions with the new `weekStart`. Old missions stay in DB but don't show (different weekStart).

### 5. Daily Special (משימת היום)

One chore per day gets a bonus (+5 points). Auto-rotates daily based on day-of-year. Parents can override in settings.

### 5. Prize Shop

Kids redeem points for prizes. Points deducted immediately, no approval needed for redemptions.

### 6. Parent Panel (מרכז הפיקוד)

PIN-protected. Tabs:
- **אישור** — Approve/reject pending chore completions
- **ילדים** — Add/edit/delete kids
- **משימות** — Manage chores (with time-of-day)
- **פרסים** — Manage prizes
- **אישיות** — Weekly personal missions per kid (add/edit/delete)
- **הצלחות** — Configure success points per kid
- **נקודות** — Manual point adjustment (+10, +25, -10, custom, reset)
- **שבועי** — Weekly progress report per kid
- **הגדרות** — Daily special, change PIN, lock panel

## UI Patterns

- **Rendering:** Template literals → `innerHTML` on `<main>`
- **Events:** Delegation via `[data-action]` attributes on clickable elements
- **Modals:** `showModal(html)` / `closeModal()` with overlay
- **Toasts:** `toast(msg)` shows a 2.5s notification
- **Celebrations:** `celebrate('stars'|'big')` — emoji particle explosion
- **Sounds:** Web Audio API synth tones (`playSound(name)`)
- **Haptics:** `navigator.vibrate(30)` on success

## Service Worker

- Network-first with cache fallback
- Firebase SDK and Firestore API requests are excluded from caching
- Cache name must be bumped (`impossipoints-vN`) on each deploy to invalidate

## Important Notes

- **No Firestore indexes needed** — Queries are either single-field or use doc ID lookups
- **RTL layout** — Hebrew, uses Heebo font, `dir="rtl"` on `<html>`
- **Mobile-first** — Max-width 500px, safe-area insets, no zoom
- **Offline-capable** — PWA with service worker, but Firestore calls need connectivity
