/**
 * Understory Theme - JavaScript Features
 *
 * A dark, forest-inspired DJ controller theme for Spicetify.
 * v2 — Full adaptive color system with album art extraction.
 *
 * Features:
 * 1. VU Meter - Volume slider color changes green→yellow→red
 * 2. Sidebar Tracking - Tracks nav-bar width, toggles collapsed state
 * 3. Progress Glow - Dynamic glow based on playback position
 * 4. Adaptive Colors - Album art extraction tints entire UI
 * 5. Page-Aware Theming - Different styles per page type
 * 6. Playing State - Syncs playing/paused state to CSS classes
 */

(function () {
    'use strict';

    // ─── Fix 3: CLEANUP system for memory leak prevention ─────────────
    const CLEANUP = { listeners: [], observers: [], intervals: [] };

    function runCleanup() {
        CLEANUP.listeners.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        CLEANUP.listeners = [];
        CLEANUP.observers.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        CLEANUP.observers = [];
        CLEANUP.intervals.forEach(id => { clearInterval(id); });
        CLEANUP.intervals = [];
    }

    function storeListenerCleanup(fn) { CLEANUP.listeners.push(fn); }
    function storeObserverCleanup(fn) { CLEANUP.observers.push(fn); }
    function storeIntervalCleanup(id) { CLEANUP.intervals.push(id); }

    // ─── Utility: Wait for Element ──────────────────────────────────────
    function waitForElement(selector, callback, timeout = 10000) {
        const el = document.querySelector(selector);
        if (el) return callback(el);

        let disconnected = false;
        const observer = new MutationObserver(() => {
            if (disconnected) return;
            const el = document.querySelector(selector);
            if (el) {
                disconnected = true;
                observer.disconnect();
                callback(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        if (timeout > 0) {
            setTimeout(() => {
                if (!disconnected) {
                    disconnected = true;
                    observer.disconnect();
                }
            }, timeout);
        }
    }

    // ─── Utility: Debounce ──────────────────────────────────────────────
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    // ─── Fix 1: Normalize any color format to hex ──────────────────────
    function normalizeToHex(color) {
        if (!color) return color;
        color = color.trim();
        if (color.startsWith('#')) return color;
        const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]);
            const g = parseInt(rgbaMatch[2]);
            const b = parseInt(rgbaMatch[3]);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        return color;
    }

    // ─── Utility: Parse hex to RGB ──────────────────────────────────────
    function hexToRgb(hex) {
        hex = normalizeToHex(hex);
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    // ─── Fix 2: Convert any color to hex+alpha ─────────────────────────
    function toHexAlpha(color, alphaHex) {
        const hex = normalizeToHex(color);
        return `${hex}${alphaHex}`;
    }

    // ─── Utility: Mix two colors ────────────────────────────────────────
    function mixColors(hex1, hex2, weight) {
        const c1 = hexToRgb(hex1);
        const c2 = hexToRgb(hex2);
        const r = Math.round(c1.r * (1 - weight) + c2.r * weight);
        const g = Math.round(c1.g * (1 - weight) + c2.g * weight);
        const b = Math.round(c1.b * (1 - weight) + c2.b * weight);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    // ─── Utility: Darken a color ────────────────────────────────────────
    function darken(hex, amount) {
        return mixColors(hex, '#000000', amount);
    }

    // ─── Utility: Lighten a color ───────────────────────────────────────
    function lighten(hex, amount) {
        return mixColors(hex, '#ffffff', amount);
    }

    // ─── 1. VU Meter Volume Slider ─────────────────────────────────────
    async function updateVUMeter() {
        try {
            const volume = await Spicetify.Player.getVolume();
            document.documentElement.style.setProperty('--vu-level', volume);

            let color;
            if (volume < 0.5) {
                const t = volume * 2;
                const r = Math.round(159 + (232 - 159) * t);
                const g = Math.round(232 + (162 - 232) * t);
                const b = Math.round(74 + (61 - 74) * t);
                color = `rgb(${r}, ${g}, ${b})`;
            } else {
                const t = (volume - 0.5) * 2;
                const r = Math.round(232 + (232 - 232) * t);
                const g = Math.round(162 + (74 - 162) * t);
                const b = Math.round(61 + (74 - 61) * t);
                color = `rgb(${r}, ${g}, ${b})`;
            }
            document.documentElement.style.setProperty('--vu-color', color);
        } catch (e) { /* Fallback */ }
    }

    // ─── 2. Sidebar Resize Tracking ────────────────────────────────────
    function initSidebarTracking() {
        waitForElement('.Root__nav-bar', (navBar) => {
            let rafId = null;

            const observer = new ResizeObserver((entries) => {
                if (rafId) cancelAnimationFrame(rafId);

                rafId = requestAnimationFrame(() => {
                    for (const entry of entries) {
                        const width = entry.contentRect.width;
                        document.documentElement.style.setProperty('--nav-bar-width', `${width}px`);

                        if (width < 121) {
                            document.documentElement.classList.add('sidebar-collapsed');
                        } else {
                            document.documentElement.classList.remove('sidebar-collapsed');
                        }
                    }
                    rafId = null;
                });
            });

            observer.observe(navBar);
            storeObserverCleanup(() => observer.disconnect());
        });
    }

    // ─── 3. Progress Bar Glow ──────────────────────────────────────────
    function initProgressGlow() {
        function updateProgress() {
            try {
                const progress = Spicetify.Player.getProgressPercent();
                if (!isNaN(progress)) {
                    document.documentElement.style.setProperty('--playback-progress', progress);
                }
            } catch (e) { /* Fallback */ }
        }

        if (Spicetify.Player.addEventListener) {
            Spicetify.Player.addEventListener('onprogress', updateProgress);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('onprogress', updateProgress));
            Spicetify.Player.addEventListener('songchange', updateProgress);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('songchange', updateProgress));
        }

        updateProgress();
    }

    // ─── 4. Adaptive Album Art Colors ──────────────────────────────────
    let lastTrackUri = null;

    async function applyAdaptiveColors() {
        try {
            const data = Spicetify.Player.data;
            if (!data || !data.item) return;

            const trackUri = data.item.uri;
            if (trackUri === lastTrackUri) return;
            lastTrackUri = trackUri;

            const colors = await Spicetify.colorExtractor(trackUri);
            if (!colors) return;

            const root = document.documentElement;
            const base = '#11140f';

            // Raw extracted colors — normalize to hex for consistent handling
            const vibrant = normalizeToHex(colors.VIBRANT) || '#3fd0c9';
            const darkVibrant = normalizeToHex(colors.DARK_VIBRANT) || '#1c2118';
            const lightVibrant = normalizeToHex(colors.LIGHT_VIBRANT) || '#9fe84a';
            const prominent = normalizeToHex(colors.PROMINENT) || '#e8a23d';
            const muted = normalizeToHex(colors.DESATURATED) || '#8b9582';

            // Set raw colors
            root.style.setProperty('--dyn-vibrant', vibrant);
            root.style.setProperty('--dyn-dark', darkVibrant);
            root.style.setProperty('--dyn-light', lightVibrant);
            root.style.setProperty('--dyn-prominent', prominent);
            root.style.setProperty('--dyn-muted', muted);

            // Derived adaptive surfaces
            root.style.setProperty('--dyn-bg', mixColors(base, darkVibrant, 0.35));
            root.style.setProperty('--dyn-surface', mixColors('#1c2118', darkVibrant, 0.25));
            root.style.setProperty('--dyn-card', mixColors('#242b1f', darkVibrant, 0.2));
            root.style.setProperty('--dyn-border', mixColors('#33402c', vibrant, 0.15));

            // Adaptive accent — blend extracted vibrant with the theme's teal
            root.style.setProperty('--dyn-accent', mixColors('#3fd0c9', vibrant, 0.4));

            // Glow variants — Fix 2: use toHexAlpha for safe conversion
            root.style.setProperty('--dyn-glow', toHexAlpha(vibrant, '40'));
            root.style.setProperty('--dyn-glow-strong', toHexAlpha(vibrant, '80'));
            root.style.setProperty('--dyn-glow-subtle', toHexAlpha(vibrant, '1a'));

            // Sidebar tint — very subtle
            root.style.setProperty('--dyn-sidebar', mixColors(base, darkVibrant, 0.15));

            // Player bar tint
            root.style.setProperty('--dyn-player', mixColors('#1c2118', darkVibrant, 0.3));

            // Progress bar gradient
            root.style.setProperty('--dyn-progress-start', mixColors(vibrant, '#e8a23d', 0.3));
            root.style.setProperty('--dyn-progress-end', vibrant);

            // Text on adaptive surfaces — ensure contrast
            root.style.setProperty('--dyn-text-on-dynamic', lightVibrant);

            // RGB variants for rgba() usage
            const vibrantRgb = hexToRgb(vibrant);
            root.style.setProperty('--dyn-vibrant-rgb', `${vibrantRgb.r}, ${vibrantRgb.g}, ${vibrantRgb.b}`);

            const darkRgb = hexToRgb(darkVibrant);
            root.style.setProperty('--dyn-dark-rgb', `${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}`);

        } catch (e) {
            // Fix 9: Fallback to static palette — consistent hex format
            const root = document.documentElement;
            root.style.setProperty('--dyn-bg', '#11140f');
            root.style.setProperty('--dyn-surface', '#1c2118');
            root.style.setProperty('--dyn-card', '#242b1f');
            root.style.setProperty('--dyn-border', '#33402c');
            root.style.setProperty('--dyn-accent', '#3fd0c9');
            root.style.setProperty('--dyn-glow', '#3fd0c940');
            root.style.setProperty('--dyn-glow-strong', '#3fd0c980');
            root.style.setProperty('--dyn-glow-subtle', '#3fd0c91a');
            root.style.setProperty('--dyn-sidebar', '#11140f');
            root.style.setProperty('--dyn-player', '#1c2118');
            root.style.setProperty('--dyn-progress-start', '#c4912e');
            root.style.setProperty('--dyn-progress-end', '#3fd0c9');
            root.style.setProperty('--dyn-text-on-dynamic', '#9fe84a');
            root.style.setProperty('--dyn-vibrant-rgb', '63, 208, 201');
            root.style.setProperty('--dyn-dark-rgb', '28, 33, 24');
        }
    }

    // ─── 5. Page-Aware Theming ─────────────────────────────────────────
    function detectPageType(path) {
        if (path.startsWith('/playlist/')) return 'playlist';
        if (path.startsWith('/album/')) return 'album';
        if (path.startsWith('/artist/')) return 'artist';
        if (path.startsWith('/show/')) return 'podcast';
        if (path.startsWith('/search')) return 'search';
        if (path.startsWith('/home') || path === '/') return 'home';
        // Fix 6: Add missing route detection
        if (path.startsWith('/collection/')) return 'collection';
        if (path.startsWith('/genre/')) return 'genre';
        if (path.startsWith('/settings')) return 'settings';
        return 'other';
    }

    const updatePageType = debounce(() => {
        const path = window.location.pathname;
        const pageType = detectPageType(path);

        // Fix 4: Use classList to avoid destroying other classes
        const pageTypes = ['playlist', 'album', 'artist', 'podcast', 'search', 'home', 'other', 'collection', 'genre', 'settings'];
        pageTypes.forEach(t => document.documentElement.classList.remove(`page-type-${t}`));
        document.documentElement.classList.add(`page-type-${pageType}`);
    }, 100);

    function initPageAwareTheming() {
        if (Spicetify.Player.addEventListener) {
            Spicetify.Player.addEventListener('appchange', updatePageType);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('appchange', updatePageType));
        }
        window.addEventListener('popstate', updatePageType);
        storeListenerCleanup(() => window.removeEventListener('popstate', updatePageType));
        updatePageType();
    }

    // ─── 6. Playing State Sync ─────────────────────────────────────────
    function initPlayingState() {
        function updatePlayingState() {
            try {
                if (Spicetify.Player.isPlaying()) {
                    document.documentElement.classList.add('is-playing');
                    document.documentElement.classList.remove('is-paused');
                } else {
                    document.documentElement.classList.remove('is-playing');
                    document.documentElement.classList.add('is-paused');
                }
            } catch (e) { /* Fallback */ }
        }

        if (Spicetify.Player.addEventListener) {
            Spicetify.Player.addEventListener('onplaypause', updatePlayingState);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('onplaypause', updatePlayingState));
            Spicetify.Player.addEventListener('songchange', updatePlayingState);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('songchange', updatePlayingState));
        }

        updatePlayingState();
    }

    // ─── 7. Volume Change Tracking ─────────────────────────────────────
    function initVolumePolling() {
        // Fix 5: Prefer event-based approach, keep setInterval as fallback
        if (Spicetify.Player.addEventListener) {
            const volumeHandler = () => updateVUMeter();
            Spicetify.Player.addEventListener('volumechange', volumeHandler);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('volumechange', volumeHandler));
        }

        // Fallback polling with cleanup
        let lastVolume = -1;

        async function checkVolume() {
            try {
                const volume = await Spicetify.Player.getVolume();
                if (volume !== lastVolume) {
                    lastVolume = volume;
                    updateVUMeter();
                }
            } catch (e) { /* Fallback */ }
        }

        const id = setInterval(checkVolume, 500);
        storeIntervalCleanup(id);
    }

    // ─── Initialize ────────────────────────────────────────────────────
    function init() {
        // Fix 3: Clean up any previous listeners/observers/intervals
        runCleanup();

        // VU Meter
        if (Spicetify.Player && Spicetify.Player.addEventListener) {
            initVolumePolling();
        }
        updateVUMeter();

        // Sidebar tracking
        initSidebarTracking();

        // Progress glow
        initProgressGlow();

        // Playing state
        initPlayingState();

        // Adaptive colors on song change
        if (Spicetify.Player.addEventListener) {
            const songChangeHandler = () => {
                lastTrackUri = null;
                applyAdaptiveColors();
            };
            Spicetify.Player.addEventListener('songchange', songChangeHandler);
            storeListenerCleanup(() => Spicetify.Player.removeEventListener('songchange', songChangeHandler));
        }

        // Apply initial adaptive colors
        applyAdaptiveColors();

        // Page-aware theming
        initPageAwareTheming();

        // Theme loaded class
        requestAnimationFrame(() => {
            document.body.classList.add('theme-loaded');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
