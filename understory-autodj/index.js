/**
 * Understory AutoDJ — Custom App
 * 
 * Intelligent queue sequencer that fills and sequences your queue
 * based on mood, energy, BPM compatibility, and key harmony.
 * 
 * Replaces the autodj.js extension with a full custom app experience.
 */

(function () {
    'use strict';

    // ── Wait for Spicetify ───────────────────────────────────────

    if (!Spicetify?.React || !Spicetify?.Player || !Spicetify?.Platform) {
        setTimeout(arguments.callee, 100);
        return;
    }

    const { React, Player, CosmosAsync, LocalStorage, showNotification, Platform, PopupModal } = Spicetify;
    const { useState, useEffect, useCallback, useRef, useMemo, createElement: h } = React;

    // ── Constants ────────────────────────────────────────────────

    const STORAGE_PREFIX = 'autodj:';
    const MAX_CACHE_SIZE = 200;
    const LIBRARY_CACHE_TTL = 5 * 60 * 1000;

    // ── Theme Colors ─────────────────────────────────────────────

    const C = {
        accent:     '#3fd0c9',
        highlight:  '#e8a23d',
        energy:     '#ef6aaf',
        success:    '#9fe84a',
        text:       '#e9ede4',
        subtext:    '#96a38c',
        bg:         '#11140f',
        surface:    '#1c2118',
        card:       '#242b1f',
        border:     '#33402c',
    };

    // ── Storage Helpers ──────────────────────────────────────────

    function load(key, def) {
        const raw = LocalStorage.get(STORAGE_PREFIX + key);
        if (raw === null) return def;
        try { return JSON.parse(raw); } catch { return raw; }
    }

    function save(key, val) {
        LocalStorage.set(STORAGE_PREFIX + key, JSON.stringify(val));
    }

    // ── Utility: Debounce ────────────────────────────────────────

    function debounce(fn, ms) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    // ── Utility: Parse hex to RGB ────────────────────────────────

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    // ── Mood Presets ─────────────────────────────────────────────

    const MOODS = {
        chill:    { label: 'Chill',    desc: 'Low energy, relaxed vibes',    energy: [0.2, 0.4], danceability: [0.3, 0.5], valence: [0.3, 0.6] },
        focus:    { label: 'Focus',    desc: 'Instrumental, steady rhythm',  energy: [0.3, 0.5], instrumentalness: [0.5, 1.0], valence: [0.3, 0.6] },
        party:    { label: 'Party',    desc: 'High energy, danceable',       energy: [0.7, 1.0], danceability: [0.7, 1.0], valence: [0.6, 1.0] },
        workout:  { label: 'Workout',  desc: 'Intense, fast tempo',          energy: [0.8, 1.0], tempo: [120, 160], danceability: [0.5, 1.0] },
        sleep:    { label: 'Sleep',    desc: 'Ambient, minimal',             energy: [0.0, 0.2], acousticness: [0.5, 1.0], valence: [0.1, 0.4] },
        mix:      { label: 'Mix',      desc: 'Balanced variety',             energy: [0.3, 0.7], danceability: [0.4, 0.8], valence: [0.4, 0.7] },
    };

    // ── Camelot Wheel ────────────────────────────────────────────

    const CAMELOT = {
        '0,0': '5A',  '0,1': '8B',  '1,0': '12A', '1,1': '3B',
        '2,0': '7A',  '2,1': '10B', '3,0': '2A',  '3,1': '5B',
        '4,0': '9A',  '4,1': '12B', '5,0': '4A',  '5,1': '7B',
        '6,0': '11A', '6,1': '2B',  '7,0': '6A',  '7,1': '9B',
        '8,0': '1A',  '8,1': '4B',  '9,0': '8A',  '9,1': '11B',
        '10,0': '3A', '10,1': '6B', '11,0': '10A','11,1': '1B',
    };

    function getCamelot(key, mode) { return CAMELOT[`${key},${mode}`] || null; }

    function camelotCompat(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        const letterA = a.slice(-1);
        const letterB = b.slice(-1);
        const na = parseInt(a);
        const nb = parseInt(b);
        if (na === nb) return letterA === letterB;
        if (Math.abs(na - nb) === 1 || Math.abs(na - nb) === 11) {
            return letterA === letterB;
        }
        return false;
    }

    // ── Audio Analysis ───────────────────────────────────────────

    const analyzedTracks = new Map();

    function evictCache() {
        if (analyzedTracks.size > MAX_CACHE_SIZE) {
            const n = Math.floor(MAX_CACHE_SIZE * 0.2);
            let i = 0;
            for (const k of analyzedTracks.keys()) {
                if (i >= n) break;
                analyzedTracks.delete(k);
                i++;
            }
        }
    }

    async function getAudioFeatures(uri) {
        if (analyzedTracks.has(uri)) return analyzedTracks.get(uri);
        try {
            const id = uri.split(':').pop();
            const r = await CosmosAsync.get(`https://spclient.wg.spotify.com/audio-attributes/v1/audio-features/${id}?format=json`);
            if (r) {
                const f = {
                    tempo: r.tempo || 0, key: r.key || -1, mode: r.mode || 0,
                    energy: r.energy || 0.5, danceability: r.danceability || 0.5,
                    valence: r.valence || 0.5, acousticness: r.acousticness || 0.5,
                    instrumentalness: r.instrumentalness || 0, speechiness: r.speechiness || 0,
                    liveness: r.liveness || 0, loudness: r.loudness || -10,
                };
                f.camelot = getCamelot(f.key, f.mode);
                analyzedTracks.set(uri, f);
                return f;
            }
        } catch (e) { console.warn('[Auto-DJ]', e); }
        return null;
    }

    async function getBulkAudioFeatures(uris) {
        const results = new Map();
        const toFetch = uris.filter(u => !analyzedTracks.has(u));
        for (const u of uris) {
            if (analyzedTracks.has(u)) results.set(u, analyzedTracks.get(u));
        }
        const BATCH = 50;
        for (let i = 0; i < toFetch.length; i += BATCH) {
            const batch = toFetch.slice(i, i + BATCH);
            const ids = batch.map(u => u.split(':').pop()).join(',');
            try {
                const r = await CosmosAsync.get(`https://spclient.wg.spotify.com/audio-attributes/v1/audio-features?ids=${ids}`);
                if (r?.audio_features) {
                    for (let j = 0; j < batch.length; j++) {
                        const f = r.audio_features[j];
                        if (f) {
                            const parsed = {
                                tempo: f.tempo || 0, key: f.key || -1, mode: f.mode || 0,
                                energy: f.energy || 0.5, danceability: f.danceability || 0.5,
                                valence: f.valence || 0.5, acousticness: f.acousticness || 0.5,
                                instrumentalness: f.instrumentalness || 0, speechiness: f.speechiness || 0,
                                liveness: f.liveness || 0, loudness: f.loudness || -10,
                            };
                            parsed.camelot = getCamelot(parsed.key, parsed.mode);
                            analyzedTracks.set(batch[j], parsed);
                            results.set(batch[j], parsed);
                        }
                    }
                }
            } catch { /* skip */ }
        }
        evictCache();
        return results;
    }

    // ── Track Scoring ────────────────────────────────────────────

    function scoreTrack(candidate, currentFeatures, mood, config) {
        let score = 0;
        const moodCfg = MOODS[mood] || MOODS.mix;

        if (currentFeatures?.tempo && candidate.tempo) {
            const diff = Math.abs(candidate.tempo - currentFeatures.tempo);
            score += Math.max(0, 1 - (diff / config.bpmRange)) * 0.3;
        }

        if (config.keyMatch && currentFeatures?.camelot && candidate.camelot) {
            score += (camelotCompat(currentFeatures.camelot, candidate.camelot) ? 1 : 0.3) * 0.3;
        }

        const [minE, maxE] = moodCfg.energy;
        const tgt = config.energy;
        const eMin = Math.max(minE, tgt - 0.15);
        const eMax = Math.min(maxE, tgt + 0.15);
        if (candidate.energy >= eMin && candidate.energy <= eMax) {
            score += 0.25;
        } else {
            const dist = candidate.energy < eMin ? eMin - candidate.energy : candidate.energy - eMax;
            score += Math.max(0, 0.25 - dist * 0.5);
        }

        let moodMatches = 0, moodChecks = 0;
        for (const [feat, range] of Object.entries(moodCfg)) {
            if (feat === 'tempo') continue;
            if (candidate[feat] !== undefined) {
                moodChecks++;
                if (candidate[feat] >= range[0] && candidate[feat] <= range[1]) moodMatches++;
            }
        }
        if (moodChecks > 0) score += (moodMatches / moodChecks) * 0.15;

        return score;
    }

    // ── Queue Management ─────────────────────────────────────────

    function getQueueLength() {
        try { return Player?.Queue?.nextTracks?.length || 0; } catch { return 0; }
    }

    function getCurrentTrack() {
        const d = Player.data;
        if (!d?.item) return null;
        return { uri: d.item.uri, name: d.item.name, artist: d.item.metadata?.artist_name, image: d.item.metadata?.image_url };
    }

    async function addTracksToQueue(tracks) {
        const existingUris = new Set();
        try {
            const nextTracks = Player?.Queue?.nextTracks || [];
            nextTracks.forEach(t => existingUris.add(t.uri));
        } catch { /* skip */ }
        for (const t of tracks) {
            if (existingUris.has(t.uri)) continue;
            try { await Spicetify.addToQueue([{ uri: t.uri }]); } catch { /* skip */ }
        }
    }

    // ── Track Sources ────────────────────────────────────────────

    let libraryCache = null;
    let libraryCacheTime = 0;

    async function getLibraryTracks() {
        if (libraryCache && Date.now() - libraryCacheTime < LIBRARY_CACHE_TTL) {
            return libraryCache;
        }
        try {
            const r = await CosmosAsync.get("sp://core-collection/unstable/@/list/tracks/all?responseFormat=protobufJson");
            const tracks = r?.item?.filter(t => t.trackMetadata?.playable).map(t => ({
                uri: t.trackMetadata.link, name: t.trackMetadata.title, artist: t.trackMetadata.artistName,
                image: t.trackMetadata.coverUri?.replace('spotify:image:', 'https://i.scdn.co/image/') || '',
            })) || [];
            libraryCache = tracks;
            libraryCacheTime = Date.now();
            return tracks;
        } catch { return []; }
    }

    async function getRecommendations(seedUri) {
        try {
            const id = seedUri.split(':').pop();
            const r = await CosmosAsync.get(`https://api.spotify.com/v1/recommendations?seed_tracks=${id}&limit=20`);
            return r?.tracks || [];
        } catch { return []; }
    }

    async function getCandidateTracks(currentUri, source) {
        let candidates = [];
        if (source === 'library' || source === 'hybrid') {
            candidates = [...candidates, ...await getLibraryTracks()];
        }
        if (source === 'recommendations' || source === 'hybrid') {
            candidates = [...candidates, ...await getRecommendations(currentUri)];
        }
        const seen = new Set([currentUri]);
        return candidates.filter(t => {
            if (!t.uri || seen.has(t.uri)) return false;
            seen.add(t.uri);
            return true;
        });
    }

    // ── Smart Sequencer ──────────────────────────────────────────

    async function selectAndQueueTracks(config) {
        const current = getCurrentTrack();
        if (!current) return { added: 0, tracks: [] };

        const currentFeatures = await getAudioFeatures(current.uri);
        const candidates = await getCandidateTracks(current.uri, config.source);
        if (candidates.length === 0) return { added: 0, tracks: [] };

        const candidateUris = candidates.slice(0, 50).map(c => c.uri);
        await getBulkAudioFeatures(candidateUris);

        const scored = [];
        for (const c of candidates.slice(0, 50)) {
            const f = analyzedTracks.get(c.uri);
            if (f) scored.push({ ...c, features: f, score: scoreTrack(f, currentFeatures, config.mood, config) });
        }

        scored.sort((a, b) => b.score - a.score);
        const selected = scored.slice(0, config.maxQueueAdd);

        if (selected.length > 0) {
            await addTracksToQueue(selected);
            showNotification(`Auto-DJ: added ${selected.length} track${selected.length > 1 ? 's' : ''}`);
        }

        return { added: selected.length, tracks: selected };
    }

    // ── Reusable UI Components ───────────────────────────────────

    function Toggle({ label, description, value, onChange }) {
        return h('div', {
            style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: `1px solid ${C.border}`,
            }
        },
            h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: '0.9rem', fontWeight: '500', color: C.text } }, label),
                description ? h('div', { style: { fontSize: '0.75rem', color: C.subtext, marginTop: '2px' } }, description) : null
            ),
            h('button', {
                onClick: () => onChange(!value),
                role: 'switch', 'aria-checked': value,
                style: {
                    background: value ? C.accent : C.border, border: 'none', borderRadius: '12px',
                    padding: '4px', width: '44px', height: '24px', cursor: 'pointer',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: '12px',
                }
            },
                h('span', {
                    style: {
                        position: 'absolute', top: '2px', left: value ? '22px' : '2px',
                        width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }
                })
            )
        );
    }

    function Slider({ label, value, onChange, min, max, step, unit }) {
        return h('div', {
            style: { padding: '14px 0', borderBottom: `1px solid ${C.border}` }
        },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
                h('span', { style: { fontSize: '0.9rem', fontWeight: '500', color: C.text } }, label),
                h('span', { style: { fontSize: '0.85rem', fontWeight: '600', color: C.accent, fontVariantNumeric: 'tabular-nums' } },
                    `${value}${unit || ''}`)
            ),
            h('input', {
                type: 'range', min, max, step, value, onChange: (e) => onChange(Number(e.target.value)),
                style: { width: '100%', height: '6px', borderRadius: '3px', background: C.border, outline: 'none', cursor: 'pointer', accentColor: C.accent }
            })
        );
    }

    function Select({ label, description, value, onChange, options }) {
        return h('div', { style: { padding: '14px 0', borderBottom: `1px solid ${C.border}` } },
            h('div', { style: { marginBottom: '6px' } },
                h('label', { style: { fontSize: '0.9rem', fontWeight: '500', color: C.text, display: 'block' } }, label),
                description ? h('div', { style: { fontSize: '0.75rem', color: C.subtext, marginTop: '2px' } }, description) : null
            ),
            h('select', {
                value, onChange: (e) => onChange(e.target.value),
                style: {
                    width: '100%', padding: '10px 12px', background: C.surface, color: C.text,
                    border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
                }
            },
                options.map(opt => h('option', { key: opt.value, value: opt.value }, opt.label))
            )
        );
    }

    function Badge({ children, color }) {
        return h('span', {
            style: {
                display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                fontSize: '0.7rem', fontWeight: '600', background: color || C.accent, color: C.bg,
            }
        }, children);
    }

    function Card({ children, style }) {
        return h('div', {
            style: { background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '20px', ...style }
        }, children);
    }

    // ── Main App Component ───────────────────────────────────────

    function AutoDJApp() {
        // Config state
        const [enabled, setEnabled] = useState(() => load('enabled', false));
        const [mood, setMood] = useState(() => load('mood', 'mix'));
        const [energy, setEnergy] = useState(() => load('energy', 50));
        const [keyMatch, setKeyMatch] = useState(() => load('keyMatch', true));
        const [bpmRange, setBpmRange] = useState(() => load('bpmRange', '10'));
        const [source, setSource] = useState(() => load('source', 'hybrid'));
        const [threshold, setThreshold] = useState(() => load('threshold', 2));
        const [maxQueueAdd, setMaxQueueAdd] = useState(() => load('maxQueueAdd', 5));

        // UI state
        const [isRunning, setIsRunning] = useState(false);
        const [queueLength, setQueueLength] = useState(0);
        const [currentTrack, setCurrentTrack] = useState(null);
        const [previewTracks, setPreviewTracks] = useState([]);
        const [lastAdded, setLastAdded] = useState(0);

        // Refs
        const lastTrackUri = useRef(null);
        const monitorRef = useRef(null);

        // Config object for sequencer
        const config = useMemo(() => ({
            mood, energy: energy / 100, keyMatch, bpmRange: Number(bpmRange),
            source, threshold, maxQueueAdd,
        }), [mood, energy, keyMatch, bpmRange, source, threshold, maxQueueAdd]);

        // Save config changes
        const updateConfig = useCallback((key, value, setter) => {
            setter(value);
            save(key, value);
        }, []);

        // Update current track info
        const updateCurrentTrack = useCallback(() => {
            const track = getCurrentTrack();
            setCurrentTrack(track);
            setQueueLength(getQueueLength());
        }, []);

        // Manual fill queue
        const handleFillQueue = useCallback(async () => {
            if (isRunning) return;
            setIsRunning(true);
            try {
                const result = await selectAndQueueTracks(config);
                setPreviewTracks(result.tracks);
                setLastAdded(result.added);
                setQueueLength(getQueueLength());
            } catch (e) {
                console.error('[Auto-DJ]', e);
                showNotification('Auto-DJ error — check console');
            } finally {
                setIsRunning(false);
            }
        }, [isRunning, config]);

        // Queue monitor
        useEffect(() => {
            if (!enabled) return;

            const handler = async () => {
                const track = getCurrentTrack();
                if (!track || track.uri === lastTrackUri.current) return;
                lastTrackUri.current = track.uri;
                setCurrentTrack(track);
                setQueueLength(getQueueLength());

                if (getQueueLength() <= threshold) {
                    setIsRunning(true);
                    try {
                        const result = await selectAndQueueTracks(config);
                        setPreviewTracks(result.tracks);
                        setLastAdded(result.added);
                        setQueueLength(getQueueLength());
                    } catch (e) {
                        console.error('[Auto-DJ]', e);
                    } finally {
                        setIsRunning(false);
                    }
                }
            };

            Player.addEventListener('songchange', handler);
            return () => Player.removeEventListener('songchange', handler);
        }, [enabled, config, threshold]);

        // Update queue length periodically
        useEffect(() => {
            const interval = setInterval(() => {
                setQueueLength(getQueueLength());
            }, 2000);
            return () => clearInterval(interval);
        }, []);

        // Initial track info
        useEffect(() => {
            updateCurrentTrack();
        }, []);

        // ── Render ───────────────────────────────────────────────

        return h('div', {
            style: { padding: '32px 40px', maxWidth: '720px', minHeight: '100vh' }
        },

            // Header
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' } },
                h('div', {
                    style: {
                        width: '40px', height: '40px', borderRadius: '8px',
                        background: enabled ? `linear-gradient(135deg, ${C.accent}, ${C.success})` : C.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.3s',
                    }
                },
                    h('svg', { width: '20', height: '20', viewBox: '0 0 24 24', fill: C.bg },
                        h('path', { d: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' })
                    )
                ),
                h('div', { style: { flex: 1 } },
                    h('h1', { style: { fontSize: '1.3rem', fontWeight: '700', color: C.text, margin: '0' } }, 'Auto-DJ'),
                    h('div', { style: { fontSize: '0.75rem', color: C.subtext } },
                        enabled ? 'Active — monitoring queue' : 'Paused')
                ),
                h(Badge, { color: enabled ? C.success : C.subtext }, enabled ? 'ON' : 'OFF')
            ),

            // Now Playing Card
            currentTrack ? h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    currentTrack.image ? h('img', {
                        src: currentTrack.image, alt: '',
                        style: { width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }
                    }) : null,
                    h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontSize: '0.9rem', fontWeight: '600', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            currentTrack.name),
                        h('div', { style: { fontSize: '0.8rem', color: C.subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            currentTrack.artist)
                    ),
                    h('div', { style: { textAlign: 'right' } },
                        h('div', { style: { fontSize: '0.75rem', color: C.subtext } }, 'Queue'),
                        h('div', { style: { fontSize: '1.1rem', fontWeight: '700', color: C.accent, fontVariantNumeric: 'tabular-nums' } },
                            queueLength)
                    )
                )
            ) : h(Card, { style: { marginBottom: '16px', textAlign: 'center', padding: '24px' } },
                h('div', { style: { color: C.subtext, fontSize: '0.9rem' } }, 'No track playing')
            ),

            // Enable Toggle + Fill Button
            h(Card, { style: { marginBottom: '16px' } },
                h(Toggle, {
                    label: 'Enable Auto-DJ',
                    description: 'Automatically fill queue when tracks run low',
                    value: enabled,
                    onChange: (v) => updateConfig('enabled', v, setEnabled),
                }),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
                    h('button', {
                        onClick: handleFillQueue,
                        disabled: isRunning,
                        style: {
                            flex: 1, padding: '12px', borderRadius: '6px', border: 'none',
                            background: isRunning ? C.border : C.accent, color: C.bg,
                            fontSize: '0.85rem', fontWeight: '600', cursor: isRunning ? 'wait' : 'pointer',
                            transition: 'background 0.15s',
                        }
                    }, isRunning ? 'Filling...' : 'Fill Queue Now'),
                    h('button', {
                        onClick: () => {
                            setQueueLength(getQueueLength());
                            showNotification(`Queue: ${getQueueLength()} tracks`);
                        },
                        style: {
                            padding: '12px 16px', borderRadius: '6px', border: `1px solid ${C.border}`,
                            background: 'transparent', color: C.text, fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer',
                        }
                    }, 'Refresh')
                )
            ),

            // Mood Presets
            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                    h(Badge, { color: C.energy }, 'MOOD'),
                    h('span', { style: { fontSize: '0.85rem', color: C.subtext } }, 'Queue personality')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                    ...Object.entries(MOODS).map(([key, m]) =>
                        h('button', {
                            key,
                            onClick: () => updateConfig('mood', key, setMood),
                            style: {
                                padding: '8px 16px', borderRadius: '20px',
                                border: `1.5px solid ${mood === key ? C.accent : C.border}`,
                                background: mood === key ? C.accent : 'transparent',
                                color: mood === key ? C.bg : C.subtext,
                                fontSize: '0.8rem', fontWeight: mood === key ? '600' : '500',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }
                        }, m.label)
                    )
                ),
                h('div', { style: { marginTop: '8px', fontSize: '0.75rem', color: C.subtext } },
                    MOODS[mood]?.desc)
            ),

            // Energy Slider
            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                    h(Badge, { color: C.highlight }, 'ENERGY'),
                    h('span', { style: { fontSize: '0.85rem', color: C.subtext } }, 'Intensity level')
                ),
                h(Slider, {
                    label: 'Energy',
                    value: energy,
                    onChange: (v) => updateConfig('energy', v, setEnergy),
                    min: 0, max: 100, step: 5, unit: '%',
                })
            ),

            // Mixing Settings
            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                    h(Badge, { color: C.accent }, 'MIXING'),
                    h('span', { style: { fontSize: '0.85rem', color: C.subtext } }, 'Harmonic sequencing')
                ),
                h(Toggle, {
                    label: 'Camelot Key Matching',
                    description: 'Match tracks by musical key harmony',
                    value: keyMatch,
                    onChange: (v) => updateConfig('keyMatch', v, setKeyMatch),
                }),
                h(Select, {
                    label: 'BPM Tolerance',
                    description: 'Maximum BPM difference from current track',
                    value: bpmRange,
                    onChange: (v) => updateConfig('bpmRange', v, setBpmRange),
                    options: [
                        { value: '5', label: '±5 BPM — Tight' },
                        { value: '10', label: '±10 BPM — Moderate' },
                        { value: '15', label: '±15 BPM — Loose' },
                        { value: '20', label: '±20 BPM — Very loose' },
                    ],
                }),
                h(Select, {
                    label: 'Track Source',
                    description: 'Where to find candidate tracks',
                    value: source,
                    onChange: (v) => updateConfig('source', v, setSource),
                    options: [
                        { value: 'hybrid', label: 'Hybrid — Library + Recommendations' },
                        { value: 'library', label: 'Library — Your saved tracks' },
                        { value: 'recommendations', label: 'Recommendations — Spotify suggestions' },
                    ],
                })
            ),

            // Queue Settings
            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                    h(Badge, { color: C.success }, 'QUEUE'),
                    h('span', { style: { fontSize: '0.85rem', color: C.subtext } }, 'Fill behavior')
                ),
                h(Slider, {
                    label: 'Queue Low Threshold',
                    description: 'Auto-fill when queue has fewer than this many tracks',
                    value: threshold,
                    onChange: (v) => updateConfig('threshold', v, setThreshold),
                    min: 1, max: 10, step: 1, unit: ' tracks',
                }),
                h(Slider, {
                    label: 'Max Tracks Per Fill',
                    description: 'Maximum tracks added per auto-fill',
                    value: maxQueueAdd,
                    onChange: (v) => updateConfig('maxQueueAdd', v, setMaxQueueAdd),
                    min: 1, max: 15, step: 1, unit: ' tracks',
                })
            ),

            // Preview
            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                    h(Badge, { color: C.highlight }, 'UP NEXT'),
                    h('span', { style: { fontSize: '0.85rem', color: C.subtext } }, `Added ${lastAdded} tracks`)
                ),
                previewTracks.length === 0
                    ? h('div', { style: { padding: '16px', textAlign: 'center', color: C.subtext, fontSize: '0.85rem', fontStyle: 'italic' } },
                        'Click "Fill Queue Now" to see upcoming tracks')
                    : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' } },
                        ...previewTracks.map((t, i) =>
                            h('div', {
                                key: i,
                                style: {
                                    display: 'flex', alignItems: 'center', padding: '8px 12px',
                                    background: C.surface, borderRadius: '6px', gap: '10px',
                                }
                            },
                                t.image ? h('img', {
                                    src: t.image, alt: '',
                                    style: { width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }
                                }) : null,
                                h('div', { style: { flex: 1, minWidth: 0 } },
                                    h('div', { style: { fontSize: '0.85rem', fontWeight: '500', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                                        t.name || 'Unknown'),
                                    h('div', { style: { fontSize: '0.75rem', color: C.subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                                        t.artist || '')
                                ),
                                h('span', { style: { fontSize: '0.75rem', color: C.subtext, fontVariantNumeric: 'tabular-nums' } },
                                    `${Math.round(t.features?.tempo || 0)} BPM`),
                                h('span', { style: { fontSize: '0.75rem', fontWeight: '600', color: C.accent, minWidth: '24px', textAlign: 'right' } },
                                    t.features?.camelot || '--')
                            )
                        )
                    )
            ),
        );
    }

    // ── Main Entry ───────────────────────────────────────────────

    function render() {
        return h(AutoDJApp);
    }

    window.__autodjRender = render;

})();
