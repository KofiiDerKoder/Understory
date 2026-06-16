# "Understory" Theme — Feasibility Report

## Executive Summary

The spec is **well-conceived and largely feasible**. The forest/DJ-controller concept maps naturally to Spicetify's theming system. Most requirements can be achieved with CSS alone; a small `theme.js` would improve robustness for the channel-strip sidebar and waveform progress bar. Below are findings, critiques, and recommendations organized by spec section.

---

## 1. Color System — FEASIBLE ✅

### What works well
- The 6 base palette colors map cleanly to Spicetify's `color.ini` keys (`main`, `sidebar`, `card`, `text`, `subtext`, etc.)
- Multi-accent approach is achievable — Spicetify only exposes one `--spice-button` variable natively, but custom CSS variables (`--accent-sidebar`, `--accent-deck`, `--accent-content`, `--accent-pads`) can be defined in `:root` within `user.css` and used alongside `--spice-*` variables
- The RGB variant system (`--spice-rgb-*`) supports the low-opacity accent glows described in the spec

### Critique & Recommendations

| Issue | Recommendation |
|-------|---------------|
| `color.ini` only generates `--spice-*` variables. Custom accent names won't auto-generate. | Define accent variables directly in `user.css` `:root` block. `color.ini` handles the base palette; `user.css` handles accents. |
| The spec says "no multiple schemes needed for v1" — but `color.ini` sections ARE color schemes. | Use a single `[Base]` section. The accent colors go in `user.css` as custom properties, not in `color.ini`. |
| VU meter gradient on volume slider is interesting but the slider track has no stable class selector. | Use `--spice-button` as the fill color (it already controls slider fill). The gradient effect may need `theme.js` to read the volume level and set a CSS variable, or accept a static accent color for v1. |

### Suggested `color.ini`
```ini
[Base]
main         = 11140f
sidebar      = 11140f
player       = 1c2118
card         = 242b1f
text         = e9ede4
subtext      = 8b9582
highlight    = 1c2118
selected-row = e9ede4
button       = 3fd0c9
button-active = 4fe0d9
button-disabled = 33402c
tab-active   = 242b1f
shadow       = 11140f
misc         = 8b9582
```

---

## 2. Sidebar as Channel Strip — FEASIBLE ✅ with caveats

### What works
- `.Root__nav-bar` is the main sidebar container — fully targetable
- `.main-yourLibraryX-*` selectors cover library items, headers, filters, collapse states
- `.main-rootlist-rootlistItemLink` targets individual playlist rows
- `.main-collectionLinkButton-*` and `.main-createPlaylistButton-*` for special items
- Dribbblish already demonstrates sidebar resize tracking via `MutationObserver` on `.LayoutResizer__input`

### Critique & Recommendations

| Issue | Recommendation |
|-------|---------------|
| "Narrower than default" sidebar — Spotify's sidebar is resizable. Hard-coding width breaks user preference. | Use a `min-width` override rather than fixed width. Or use `theme.js` to set `--nav-bar-width` variable (Dribbblish technique). |
| "Colored indicator strip on left edge" of playlist items — no existing CSS element for this. | Use `::before` pseudo-element on `.main-yourLibraryX-listItem` or `.main-rootlist-rootlistItemLink`. Set `content: ''; width: 3px; background: var(--accent-sidebar)`. This is clean CSS-only. |
| "Small caps, monospace-adjacent letter spacing" for section headers | Use `font-variant: small-caps; letter-spacing: 0.08em;` on `.main-yourLibraryX-headerContent` or equivalent. Straightforward CSS. |
| Sidebar collapse state changes DOM structure significantly. | Test with `.main-yourLibraryX-libraryIsCollapsed` state. The indicator strip should hide when collapsed. Add `[class*="IsCollapsed"] .channel-indicator { display: none; }`. |

---

## 3. Now Playing Bar as DJ Deck — FEASIBLE ⚠️ (partial JS needed)

### What works
- `.Root__now-playing-bar` and `.main-nowPlayingBar-*` selectors are well-documented
- Three-column layout (`.main-nowPlayingBar-left/center/right`) can be reordered with flexbox `order`
- Progress bar: `.playback-bar`, `.x-progressBar-fillColor`, `.progress-bar__slider` are all targetable
- Playback buttons: `.main-playPauseButton-button`, `.main-skipForwardButton-button`, etc.
- Track time: `.playback-bar__progress-time-elapsed` and `.playbackBarRemainingTime` selectors exist

### Critique & Recommendations

| Issue | Recommendation |
|-------|---------------|
| "Waveform style track" — spec says CSS pattern/gradient, not real waveform. | Use a repeating CSS gradient on `.x-progressBar-progressBarBg` to simulate waveform ridges. Example: `background: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)`. The fill color (`.x-progressBar-fillColor`) gets the amber accent. |
| "Jog wheel" circular buttons — play/pause is already circular in modern Spotify. | Border-radius is already high. Add amber glow: `box-shadow: 0 0 6px var(--accent-deck)` on hover/active. Use `border: 2px solid var(--accent-deck)` when active. |
| "Tabular numerals for time" — needs font feature settings. | Apply `font-variant-numeric: tabular-nums; font-family: 'Inter', 'SF Mono', monospace;` to `.playback-bar__progress-time-elapsed` and `.main-playbackBarRemainingTime-container`. |
| Progress bar fill is already using `--spice-button` variable. Spec wants amber for deck. | Set `button = e8a23d` in `color.ini` OR use CSS to override `.x-progressBar-fillColor { background-color: var(--accent-deck) }` specifically. The latter is cleaner since it only affects the progress bar. |

### Minimal `theme.js` needs for this section
- None strictly required for v1. The waveform is CSS-only, button styling is CSS-only.
- **Optional**: JS to read track progress and set a CSS variable for dynamic glow intensity on the deck area. Low priority for v1.

---

## 4. Pad-Style Buttons — FEASIBLE ✅

### What works
- `.main-playPauseButton-button`, `.main-shuffleButton-button`, `.main-repeatButton-button`, `.main-likeButton-button` are all stable selectors
- `.control-button` covers generic control buttons
- `.player-controls__buttons` is the container
- `.main-actionButtons-button` covers playlist/album action buttons
- `.artist-followButton-button` for follow buttons

### Critique & Recommendations

| Issue | Recommendation |
|-------|---------------|
| "Square or slightly-rounded square pads" — many buttons have SVG icons inside that are already sized. | Use `border-radius: 4px; padding: 8px;` on button containers. The SVG icons inside will need explicit sizing via `.control-button svg { width: 16px; height: 16px; }`. |
| "Flat fill + colored border" — currently most buttons are icon-only (transparent bg). | Add `border: 1.5px solid var(--accent-pads); background: transparent;` with hover: `background: rgba(232, 74, 159, 0.12); border-color: var(--accent-pads);`. |
| "4px shadow max on hover" — spec says no blur beyond this. | Use `box-shadow: 0 0 4px rgba(232, 74, 159, 0.4);` on hover/active. This is well within spec. |
| Button spacing for "grid-aligned" feel | Use `gap: 6px;` on `.player-controls__buttons` and ensure buttons have consistent `min-width` / `min-height`. |
| Some buttons (like, shuffle) toggle active state with filled icons. | Style `.main-shuffleButton-active` and `.main-repeatButton-active` to have full accent background: `background: rgba(232, 74, 159, 0.25);`. |

---

## 5. Main Content / Cards — FEASIBLE ✅

### What works
- `.main-card-card` and children are extensively documented
- `.main-card-imageContainer`, `.main-card-cardMetadata`, `.main-card-cardTitle` all targetable
- `.main-shelf-*` selectors for content rows/sections
- `.main-entityHeader-*` for playlist/album headers

### Critique & Recommendations

| Issue | Recommendation |
|-------|---------------|
| "Square corners or very minimal radius (2-4px)" — cards default to 8px radius. | Override: `.main-card-card { border-radius: 4px; }`. Also target `.main-cardImage-imageWrapper { border-radius: 4px; }`. |
| "Lime-green accent border on hover, no scale/zoom" | Add: `.main-card-card:hover { border: 1px solid var(--accent-content); }` with `transition: border-color 120ms ease;`. No transform needed — matches spec's performance priority. |
| "Oversized, bold sans-serif text" for section headers | `.main-shelf-title { font-size: 1.4rem; font-weight: 700; letter-spacing: 0.02em; }` |
| Cards currently have no visible border by default. Need to add subtle border for the "panel" feel. | `.main-card-card { border: 1px solid var(--border); }` for resting state, lime accent on hover. |

---

## 6. Context Menus — FEASIBLE ✅ (bonus coverage)

The spec mentions context menus should "reflect the palette." Selectors available:
- `.main-contextMenu-menu`, `.main-contextMenu-menuItem`, `.main-contextMenu-menuItemButton`
- `.main-contextMenu-heading`, `.main-contextMenu-dividerAfter/Before`

Style with `background: var(--spice-card); color: var(--spice-text);` and accent the hovered item with a subtle teal/amber left border. No issues here.

---

## 7. Search — FEASIBLE ✅

- `.main-globalNav-searchContainer`, `.main-globalNav-searchInputText` for search bar
- `.search-searchCategory-*` for category cards
- Palette applies naturally via `--spice-*` variables

---

## 8. Technical Constraint Compliance

| Spec Requirement | Status | Notes |
|-----------------|--------|-------|
| No `backdrop-filter` / blur | ✅ Easy | Simply don't use it. |
| Minimal `box-shadow` (max 1 per element, ~4-6px) | ✅ Achievable | Use single `box-shadow` with small spread. |
| Transitions limited to `opacity`/`transform`/`background-color` at 100-150ms | ✅ Achievable | Avoid `transition: all`. Be explicit per property. |
| Avoid `!important` where possible | ⚠️ Some needed | Inline styles on some elements (volume slider, progress bar computed styles) will require `!important`. Keep it targeted. |
| Compatible with Spicetify Marketplace | ✅ | Proper folder structure with `color.ini` + `user.css` is all Marketplace needs. |
| No heavy JS | ✅ | v1 can be CSS-only. `theme.js` optional for enhancements. |

---

## 9. Risk Assessment

### Low Risk (will work reliably)
- Base color palette via `color.ini`
- Card styling and borders
- Button/pad styling
- Typography changes
- Context menu theming
- Section header styling

### Medium Risk (may need adjustment across Spotify updates)
- Sidebar channel-strip indicator (pseudo-elements on mapped classes — generally stable)
- Now Playing bar layout reordering (flexbox `order` on `.main-nowPlayingBar-left/center/right`)
- Waveform progress bar background (targeting `.x-progressBar-progressBarBg` — mapped but could shift)

### Higher Risk (fragile selectors)
- VU meter gradient on volume slider — slider track has no stable mapped class, relies on generic or inline-styled elements
- Precise "jog wheel" sizing — SVG button internals may have obfuscated wrapper classes
- Playlist item indicator strip — `.main-yourLibraryX-listItem` internal structure varies between collapsed/expanded states

---

## 10. Recommended Implementation Order

1. **`color.ini`** — Define base palette, set `button` to teal (sidebar accent) as default
2. **`user.css` `:root` block** — Define custom accent variables (`--accent-sidebar`, `--accent-deck`, `--accent-content`, `--accent-pads`, `--border`)
3. **Base theme** — Apply `--spice-*` variable overrides, set typography, global background
4. **Cards section** — Border radius, resting border, hover accent border
5. **Buttons/Pads section** — Square styling, accent borders, hover glow
6. **Sidebar section** — Channel strip indicator, header styling, narrow override
7. **Now Playing section** — Waveform background, jog-wheel glow, tabular time, amber accent
8. **Context menus** — Palette consistency pass
9. **Polish** — Transitions, scrollbar styling, edge cases

---

## 11. Files to Create

```
Understory/
├── color.ini          # Base palette (single scheme)
├── user.css           # All CSS (comments marking each section)
└── (theme.js)         # Optional for v2 — VU meter, enhanced sidebar
```

---

## Conclusion

The "Understory" spec is solid. The concept is cohesive, the technical choices (solid colors, short transitions, no blur) are performance-conscious and align with what Spicetify can reliably do. The multi-accent approach is creative and achievable via custom CSS variables alongside Spicetify's built-in system.

**Main建议 for v1**: Skip the VU meter gradient on the volume slider (the hardest piece to target reliably). Use a static amber accent there instead. Everything else is achievable with CSS-only and will be robust across Spotify updates.

Ready to build when you are.
