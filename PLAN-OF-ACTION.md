# Understory — Plan of Action

## Feasibility Matrix

Each fix is categorized by:
- **Method**: How to implement it
- **Risk**: Impact of breaking something
- **Dependencies**: What it depends on
- **Estimated Lines**: Approximate code changes

---

## Phase 1: CRITICAL BUGS (Must fix — breaks functionality)

### 1.1 theme.js — hexToRgb/mixColors crash on non-hex colors
- **Method**: Add `normalizeColor()` utility that detects hex vs rgb format, converts everything to hex before processing. Add validation in `hexToRgb()` to handle both formats.
- **Risk**: Low — isolated utility function
- **Dependencies**: None
- **Lines**: ~25

### 1.2 theme.js — Glow variants assume hex input
- **Method**: Convert `vibrant` to hex before appending alpha. Use a `toHexAlpha(color, alpha)` utility that detects format and handles both.
- **Risk**: Low — follows from 1.1
- **Dependencies**: 1.1
- **Lines**: ~10

### 1.3 autodj.js — Syntax error in spread operator (line 920)
- **Method**: Replace ternary with array-based conditional: `...(previewTracks.length === 0 ? [emptyChild] : previewTracks.map(...))`
- **Risk**: Low — isolated fix
- **Dependencies**: None
- **Lines**: ~5

### 1.4 autodj.js — Camelot letter-suffix bug
- **Method**: In `camelotCompat()`, extract the letter suffix and verify it matches for adjacent/wrap-around comparisons. Only `A↔A` and `B↔B` are compatible at adjacent positions.
- **Risk**: Medium — changes queue selection behavior (intentional fix)
- **Dependencies**: None
- **Lines**: ~8

### 1.5 autodj.js — Deprecated getAudioData API
- **Method**: Reverse the try/catch order in `getAudioFeatures()`: try `spclient` endpoint first, fall back to `getAudioData`.
- **Risk**: Medium — may change which tracks get analyzed
- **Dependencies**: None
- **Lines**: ~15

---

## Phase 2: HIGH SEVERITY (Functional defects)

### 2.1 theme.js — Event listener/observer memory leaks
- **Method**: Create a `cleanup()` function that stores all listener references and observer references, then call cleanup at the start of `init()` and before re-attaching. Use a pattern:
```js
const CLEANUP = { listeners: [], observers: [], intervals: [] };
function storeCleanup(type, cleanup) { CLEANUP[type].push(cleanup); }
function runCleanup() { CLEANUP.listeners.forEach(fn => fn()); ... }
```
- **Risk**: Medium — restructures init flow
- **Dependencies**: None
- **Lines**: ~40

### 2.2 theme.js — className overwrite destroys other classes
- **Method**: Replace `className` manipulation with `classList` operations:
```js
document.documentElement.classList.remove('page-type-playlist', 'page-type-album', ...);
document.documentElement.classList.add(`page-type-${pageType}`);
```
- **Risk**: Low — cleaner approach
- **Dependencies**: None
- **Lines**: ~10

### 2.3 theme.js — Volume polling with setInterval
- **Method**: Replace `setInterval(checkVolume, 500)` with `Spicetify.Player.addEventListener('volumechange', updateVUMeter)` if available, falling back to polling only when the event isn't available.
- **Risk**: Low — uses official API when available
- **Dependencies**: 2.1 (cleanup function)
- **Lines**: ~15

### 2.4 autodj.js — No retry limit on initialization
- **Method**: Add a `MAX_RETRIES` counter (100 = 10 seconds). After max retries, log warning and stop polling.
- **Risk**: Low — prevents infinite loop
- **Dependencies**: None
- **Lines**: ~5

### 2.5 autodj.js — Topbar.Button isActive defaults to true
- **Method**: Change the last argument from `true` to `false` (or `CONFIG.enabled`).
- **Risk**: Low
- **Dependencies**: None
- **Lines**: ~1

### 2.6 autodj.js — Library tracks not cached
- **Method**: Add a `libraryCache` variable with TTL (5 minutes). Only re-fetch if cache is expired.
- **Risk**: Low — pure performance improvement
- **Dependencies**: None
- **Lines**: ~15

### 2.7 user.css — Progress bar glow inheritance bug
- **Method**: Change the `::after` selector from `.x-progressBar-progressBarBg::after` to `.x-progressBar-fillColor::after` so the glow inherits from the fill color, not the track background.
- **Risk**: Low — visual fix
- **Dependencies**: None
- **Lines**: ~5

### 2.8 user.css — Missing responsive design
- **Method**: Add `@media` queries at key breakpoints (768px, 1024px) for: sidebar collapse, card grid, now-playing bar stacking, shelf titles.
- **Risk**: Medium — new CSS, must test thoroughly
- **Dependencies**: None
- **Lines**: ~40

### 2.9 user.css — Missing focus-visible styles
- **Method**: Add `:focus-visible` rules for all interactive elements: shuffle, repeat, skip, like, search, context menu items, modal buttons, sidebar items, shortcuts, queue items.
- **Risk**: Low — additive CSS
- **Dependencies**: None
- **Lines**: ~30

### 2.10 user.css — Missing styles for common UI pages
- **Method**: Add targeted styles for: settings page, queue page layout, podcast episodes, device picker, tooltips, dropdowns.
- **Risk**: Medium — new CSS
- **Dependencies**: None
- **Lines**: ~30

---

## Phase 3: MEDIUM SEVERITY (Quality improvements)

### 3.1 user.css — Add `color-scheme: dark` to :root
- **Lines**: ~1

### 3.2 user.css — Add base `line-height` to body
- **Lines**: ~1

### 3.3 user.css — Add `::selection` styles
- **Lines**: ~5

### 3.4 user.css — Fix `object-fit: cover` on non-replaced element
- **Method**: Remove `object-fit` from `.main-yourLibraryX-listRowEntityImage` div, keep only on nested `img`.
- **Lines**: ~2

### 3.5 user.css — Fix `.aria-repeat` selector to valid selector
- **Method**: Change to `.main-repeatButton-button[aria-label*="repeat"]` or similar valid attribute selector.
- **Lines**: ~2

### 3.6 user.css — Remove duplicate hover selectors
- **Method**: Consolidate the two sets of hover rules for playlist items.
- **Lines**: ~-5 (reduction)

### 3.7 user.css — Add missing `:active` states
- **Method**: Add `:active` for skip, shuffle, repeat, like, search, context menu, confirm buttons.
- **Lines**: ~20

### 3.8 user.css — Add hover state for search input
- **Lines**: ~3

### 3.9 user.css — Add z-index layering system
- **Method**: Define a `:root` block with z-index tokens, apply to relevant elements.
- **Lines**: ~15

### 3.10 user.css — Reduce backdrop-filter blur from 40px to 20px
- **Lines**: ~1

### 3.11 user.css — Add `will-change` to animated elements
- **Lines**: ~3

### 3.12 user.css — Add `forced-colors` support for more elements
- **Lines**: ~15

### 3.13 user.css — Add `text-overflow: ellipsis` to text elements
- **Lines**: ~10

### 3.14 user.css — Add base `button` and `img` resets
- **Lines**: ~5

### 3.15 user.css — Add color-mix fallbacks (or document browser requirements)
- **Method**: Add `@supports` queries or fallback values for `color-mix()`.
- **Lines**: ~20

### 3.16 autodj.js — Add Escape key handler for modal
- **Lines**: ~8

### 3.17 autodj.js — Add focus trapping in modal
- **Lines**: ~15

### 3.18 autodj.js — Add loading state UI
- **Lines**: ~20

### 3.19 autodj.js — Add queue deduplication
- **Method**: Before adding tracks, filter out URIs already in `Player.Queue.nextTracks`.
- **Lines**: ~10

### 3.20 autodj.js — Add album art to preview
- **Lines**: ~15

### 3.21 autodj.js — Add error logging (replace silent catch)
- **Method**: Replace `catch { /* skip */ }` with `catch (e) { console.warn('[Auto-DJ]', e); }`.
- **Lines**: ~15

### 3.22 autodj.js — Fix `window.__autodjUpdatePreview` to use useEffect
- **Lines**: ~8

### 3.23 autodj.js — Fix `camelotCompat` null handling
- **Method**: Return `false` instead of `true` when either key is null.
- **Lines**: ~2

### 3.24 theme.js — Add missing route detection
- **Method**: Add cases for `/collection/`, `/genre/`, `/settings/` in `detectPageType`.
- **Lines**: ~5

### 3.25 theme.js — Wire up dead CSS variables or remove JS computation
- **Method**: Either add CSS rules that consume `--playback-progress`, `--nav-bar-width`, etc., or remove the JS that sets them. Recommendation: keep the variables but add one or two subtle CSS uses.
- **Lines**: ~10

### 3.26 user.css — Add `will-change` and `contain` improvements
- **Lines**: ~5

### 3.27 user.css — Add `text-overflow` to track info, card titles
- **Lines**: ~8

---

## Phase 4: LOW SEVERITY (Polish)

### 4.1 user.css — Add `user-select` control for track lists
### 4.2 user.css — Add `word-break`/`overflow-wrap` for long text
### 4.3 user.css — Add horizontal scrollbar styling
### 4.4 color.ini — Add newer color keys
### 4.5 autodj.js — Add recency tracking (cooldown map)
### 4.6 autodj.js — Add crossfade awareness
### 4.7 theme.js — Remove dead fallback hex check
### 4.8 user.css — Add `content-visibility` fallback handling

---

## Execution Strategy

### Subagent Assignments

| Subagent | Phase | Files | Focus |
|----------|-------|-------|-------|
| Agent A | 1.1-1.2, 2.1-2.3, 3.24-3.25 | theme.js | Core JS bugs and improvements |
| Agent B | 1.3-1.5, 2.4-2.6, 3.16-3.23 | autodj.js | Extension bugs and improvements |
| Agent C | 2.7-2.10, 3.1-3.15, 4.1-4.4 | user.css + color.ini | CSS bugs and improvements |
| Agent D | (verification) | All files | Cross-file consistency checks |

### Execution Order
1. **Phase 1 first** — all critical bugs (parallel across agents)
2. **Phase 2 next** — all high severity fixes (parallel across agents)
3. **Phase 3** — medium severity improvements (parallel across agents)
4. **Phase 4** — low severity polish (parallel across agents)
5. **Verification pass** — cross-file consistency, final review

### Edge Cases to Handle

1. **Spicetify API availability**: All JS changes must guard against `Spicetify` being undefined
2. **Color format detection**: hexToRgb must handle `#hex`, `rgb()`, `rgba()` formats
3. **Reinit safety**: All listeners/observers must be cleaned up before re-attaching
4. **CSS specificity**: New styles must not conflict with existing `!important` rules
5. **Browser compatibility**: color-mix, :has(), backdrop-filter need fallbacks
6. **Performance**: New CSS must not add expensive properties (compositing, layout thrashing)
7. **Accessibility**: All new interactive elements need keyboard and screen reader support
8. **Spotify version changes**: Selectors should prefer `data-testid` over class names where available
9. **Modal lifecycle**: Focus trapping must handle modal open/close correctly
10. **Cache invalidation**: Library cache must expire and handle concurrent access

### Items CUT from Execution (Too Risky / Low ROI)
- ~~3.15 color-mix fallbacks~~ — Document browser requirements instead of 20+ lines of @supports
- ~~3.9 z-index system~~ — Too risky with Spicetify's own z-index management
- ~~3.26 contain improvements~~ — Already exists, minor additions not worth risk
- ~~4.2 word-break~~ — Very edge case
- ~~4.3 horizontal scrollbar~~ — Very edge case
- ~~4.7 dead fallback hex~~ — Harmless dead code, not worth touching

### Items MODIFIED
- 2.8 responsive design: Focus on 768px breakpoint only, keep minimal
- 2.10 missing UI pages: Only settings + queue pages, skip podcasts/video/fullscreen
- 3.13 text-overflow: Only track info + card titles, not everywhere

### Final Execution Count: ~32 items (down from 45+)

### Testing Strategy
- Visual inspection for CSS changes
- Spicetify reload for JS changes
- Test with/without Understory theme for AutoDJ
- Test sidebar collapse/expand
- Test page navigation (playing state persistence)
- Test AutoDJ with various mood/energy settings
- Test modal keyboard navigation
