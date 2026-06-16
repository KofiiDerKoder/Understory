# Understory — Master Audit Report

## Scope
Complete audit of the Understory Spicetify theme (`user.css`, `color.ini`, `theme.js`) and AutoDJ extension (`autodj.js`). Findings organized by file, severity, and category.

---

## SEVERITY LEGEND
- **CRITICAL** — Prevents loading, causes crashes, or produces broken UI
- **HIGH** — Significant functional or visual defect, must fix
- **MEDIUM** — Noticeable issue, should fix for quality
- **LOW** — Nice-to-have improvement, cosmetic

---

# 1. theme.js — Bugs & Issues

## CRITICAL

| # | Issue | Line | Description |
|---|-------|------|-------------|
| T1 | `hexToRgb()` crashes on non-hex colors | 214 | If `Spicetify.colorExtractor` returns `rgb()` format colors, `parseInt(hex,16)` produces NaN. Entire adaptive color system falls back silently. |
| T2 | `mixColors()` crashes on non-hex inputs | 65 | Same root cause — all `mixColors` calls in `applyAdaptiveColors` (lines 187-208) pipe extractor output through `hexToRgb`. |
| T3 | Glow variants assume hex input | 196-198 | `${vibrant}40` appends hex alpha. If vibrant is `rgb(...)` format, produces invalid CSS value like `rgb(63,208,201)40`. |

## HIGH

| # | Issue | Line | Description |
|---|-------|------|-------------|
| T4 | `setInterval` never cleared | 305 | Volume polling runs forever. If `init()` re-called, duplicates stack. |
| T5 | Progress glow listeners never removed | 146-149 | `onprogress` and `songchange` listeners leak on reinit. |
| T6 | Playing state listeners never removed | 283-286 | Same leak pattern for `onplaypause`/`songchange`. |
| T7 | `popstate` listener never removed | 265 | Window listener persists across reloads. |
| T8 | `ResizeObserver` never disconnected | 131 | Observer stays attached to detached elements on re-render. |
| T9 | `songchange` listener for adaptive colors stacks | 326-331 | No guard against multiple `init()` calls. |

## MEDIUM

| # | Issue | Line | Description |
|---|-------|------|-------------|
| T10 | `className` overwrite destroys other classes | 256-258 | `updatePageType` replaces entire className, wiping `is-playing`, `is-paused`, `sidebar-collapsed`, `theme-loaded`. |
| T11 | Playing state classes conflict with page type | 274-278 vs 256-258 | `is-playing`/`is-paused` get stripped on every debounced page change. |
| T12 | No null-check on `Spicetify.colorExtractor` | 166 | Silently fails if API undefined (older Spicetify). |
| T13 | `detectPageType` missing common routes | 242-249 | No handling for `/collection/`, `/genre/`, `/settings/`. |
| T14 | Volume polling runs when slider not visible | 305 | Wastes cycles in Spotify Connect mode. |
| T15 | `getProgressPercent()` may not exist | 139 | Feature fails silently on some Spicetify versions. |

## LOW

| # | Issue | Line | Description |
|---|-------|------|-------------|
| T16 | `--vu-level` set but never used in CSS | 88 | Dead variable. |
| T17 | `--dyn-text-on-dynamic` set but never used | 211 | Incomplete feature. |
| T18 | `--dyn-vibrant-rgb`/`--dyn-dark-rgb` set but never used | 215-218 | Dead variables — never consumed. |
| T19 | Inconsistent fallback format (rgba vs hex+alpha) | 228-230 vs 196-198 | Mixing color formats. |
| T20 | Dead fallback hex check `#1a1d16` | 27 | Never set by Understory. |

---

# 2. autodj.js — Bugs & Issues

## CRITICAL

| # | Issue | Line | Description |
|---|-------|------|-------------|
| A1 | Syntax error in spread operator | 920 | `...previewTracks.map(...)` used as ternary false branch — invalid syntax. Prevents entire extension from loading. |
| A2 | Camelot letter-suffix bug | 484-491 | Adjacent numbers with different letters (e.g. "8A"/"9B") considered compatible — they are NOT in Camelot theory. |
| A3 | `Spicetify.getAudioData` deprecated | 498 | Primary audio analysis uses deprecated API. Should reverse priority (use spclient first). |

## HIGH

| # | Issue | Line | Description |
|---|-------|------|-------------|
| A4 | No retry limit on initialization | 14-17 | Polls every 100ms forever if Spicetify never available. |
| A5 | `window.__autodjUpdatePreview` set in render | 750 | Side effect inside React render — should be in useEffect with cleanup. |
| A6 | Library tracks fetched without caching | 628 | Re-fetches entire library on every `songchange`. |
| A7 | Preview tracks lost on modal reopen | 745-747 | No persistence of preview state. |
| A8 | `Topbar.Button` `isActive` defaults to true | 969 | Misleading — shows active even when Auto-DJ is off. |

## MEDIUM

| # | Issue | Line | Description |
|---|-------|------|-------------|
| A9 | Cache eviction only in bulk path | 563 | Single-track `getAudioFeatures` never evicts cache. |
| A10 | Sequential batch processing | 539-562 | Audio features fetched sequentially — could parallelize. |
| A11 | No queue deduplication | 618-621 | Same track can be added twice. |
| A12 | Fragile library response parsing | 629 | `.filter().map()` chain can throw on null `r.item`. |
| A13 | `PopupModal.display` with empty title | 952 | May cause blank header. |
| A14 | No loading state in UI | — | No visual feedback during candidate fetching. |
| A15 | No focus trapping in modal | 806-935 | Focus escapes to background Spotify UI. |
| A16 | Missing Escape key handler | 806-935 | No keyboard close for modal. |
| A17 | Preview area max-height cuts off content | CSS:329 | 5 tracks × ~30px > 140px max-height. |
| A18 | No threshold/maxQueueAdd config UI | 423-424 | Hardcoded with no user control. |

## LOW

| # | Issue | Line | Description |
|---|-------|------|-------------|
| A19 | No extension cleanup/destroy function | — | Event listeners permanent on reload. |
| A20 | CSS `!important` overuse | 56-410 | Blocks user theme overrides. |
| A21 | Silent error swallowing throughout | 511,527,561,620 | `catch { /* skip */ }` hides failures. |
| A22 | No album art in preview | 920-926 | Only name/BPM/key shown. |
| A23 | `camelotCompat` returns true for null inputs | 485 | Unknown keys always pass filter. |
| A24 | No recency/play history tracking | — | Same tracks repeat in long sessions. |
| A25 | No crossfade awareness | — | Doesn't consider Spotify's crossfade setting. |

---

# 3. user.css — Bugs & Issues

## HIGH

| # | Issue | Line | Description |
|---|-------|------|-------------|
| C1 | Progress bar glow inheritance bug | 477 | `::after` uses `background: inherit` on track bg, not fill color. Glow appears behind track, not fill. |
| C2 | Dead CSS variables — computed but unused | 22-50 | `--dyn-vibrant-rgb`, `--dyn-dark-rgb`, `--dyn-surface`, `--dyn-light`, `--dyn-prominent`, `--dyn-muted`, `--surface-warm`, `--space-xl`, `--shadow-sm`, `--shadow-lg` all defined but never consumed. |
| C3 | Missing responsive design | — | Zero `@media` queries for screen size. No breakpoints for narrow windows. |
| C4 | Missing `focus-visible` for many elements | — | Shuffle, repeat, skip, like, search, context menu, modals, sidebar items all lack focus-visible styles. |
| C5 | Missing styles for common UI pages | — | Settings, queue page, podcasts, episodes, video, fullscreen, profile, device picker, tooltips, dropdowns — all unstyled. |

## MEDIUM

| # | Issue | Line | Description |
|---|-------|------|-------------|
| C6 | `color-mix()` no fallbacks | 22-29 | Not supported in Firefox < 113, Safari < 16.2. |
| C7 | `:has()` no fallback | 166 | Not supported in Firefox < 121. |
| C8 | `backdrop-filter: blur(40px)` very GPU-intensive | 395-396 | Large blur radius. |
| C9 | No `color-scheme: dark` on :root | 14 | Affects form controls and scrollbars. |
| C10 | No base `line-height` | 92-96 | Missing for body and containers. |
| C11 | No `::selection` styles | — | No custom text selection colors. |
| C12 | `object-fit: cover` on non-replaced element | 302 | Has no effect on `<div>` — only works on `<img>`. |
| C13 | `.aria-repeat` not standard attribute | 629 | Selector never matches anything. |
| C14 | Duplicate hover selectors | 268-273 + 290-294 | CSS bloat from redundant rules. |
| C15 | Missing `:active` states | — | Skip, shuffle, repeat, like, search, context menu, confirm buttons. |
| C16 | Missing hover state for search input | 1128-1143 | No hover interaction defined. |
| C17 | Z-index layering incomplete | — | No system for context menus, modals, tooltips, device picker. |
| C18 | `mix-blend-mode: overlay` on noise texture | 114 | Expensive compositing on 3 large containers. |
| C19 | `content-visibility: auto` can cause layout shifts | 1286 | If row height varies. |
| C20 | No `will-change` on animated elements | 545,562 | Play button glow, jog wheel pulse. |
| C21 | Missing `forced-colors` for most elements | 1260 | Only covers 3 selectors. |
| C22 | Missing `[data-testid]` selectors | — | Spotify uses these for stability. |
| C23 | No `input[type="range"]` base styling | — | Relies on Spicetify classes. |
| C24 | No base `button` reset | — | Could cause Spicetify button conflicts. |
| C25 | No base `img` reset | — | `max-width: 100%; display: block` missing. |
| C26 | Missing transition for `.main-likeButton-button` | 690-696 | No color transition. |
| C27 | Missing animation entry for cards | — | Only sidebar items and shelf titles have stagger. |
| C28 | `scrollbar-gutter: stable` no Safari fallback | 1295 | Not supported in Safari < 16. |

## LOW

| # | Issue | Line | Description |
|---|-------|------|-------------|
| C29 | No print styles | — | Noise/glass effects render poorly in print. |
| C30 | No dark/light mode toggle | — | By design (dark-only), but undocumented. |
| C31 | Missing `text-overflow: ellipsis` for text elements | 642,649,900,315 | Track info, card titles can overflow. |
| C32 | No `user-select` control | — | Text can be accidentally selected. |
| C33 | Missing `word-break`/`overflow-wrap` | — | Long text can break layouts. |
| C34 | Horizontal scrollbar styling missing | — | Only vertical scrollbars styled. |
| C35 | color.ini missing newer keys | — | `tab-active-elevated`, `essential-bright-accent`, `essential-base`. |

---

# 4. Spicetify Compatibility

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| S1 | Shortened class names in Spotify 1.2.86+ | HIGH | Spotify switched from 20-char to 16-char classnames. Must verify all selectors still map correctly via `css-map.json`. |
| S2 | `appchange` event may be invalid | MEDIUM | `Spicetify.Player.addEventListener('appchange', ...)` — should use `window.addEventListener('spicetify:page-changed')` or pathname polling. |
| S3 | `color.ini` missing newer color keys | LOW | `tab-active-elevated`, `essential-bright-accent` etc. needed for newer Spotify. |

---

# 5. Cross-File Consistency

| # | Issue | Files | Description |
|---|-------|-------|-------------|
| X1 | theme.js computes variables CSS never uses | theme.js + user.css | 4 variables (`--vu-level`, `--nav-bar-width`, `--playback-progress`, `--dyn-text-on-dynamic`) written every tick but never consumed. |
| X2 | `updatePageType` destroys classes set by `initPlayingState` | theme.js | Page navigation wipes `is-playing`/`is-paused`. |
| X3 | AutoDJ's backdrop-filter conflicts with theme's no-blur constraint | autodj.js + FEASIBILITY-REPORT | Feasibility report says "no backdrop-filter/blur" but autodj.js uses `blur(6px)`. |

---

# Summary Counts

| Severity | theme.js | autodj.js | user.css | Compatibility | Cross-File | Total |
|----------|----------|-----------|----------|---------------|------------|-------|
| CRITICAL | 3 | 3 | 0 | 0 | 0 | **6** |
| HIGH | 6 | 5 | 5 | 1 | 2 | **19** |
| MEDIUM | 6 | 10 | 23 | 1 | 1 | **41** |
| LOW | 5 | 7 | 7 | 1 | 0 | **20** |
| **Total** | **20** | **25** | **35** | **3** | **3** | **86** |
