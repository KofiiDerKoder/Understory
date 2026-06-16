/**
 * Understory Settings — Custom App
 * 
 * Settings page for the Understory theme and AutoDJ extension.
 * Appears in the Spotify sidebar as "Understory".
 */

(function () {
    'use strict';

    if (!Spicetify?.React || !Spicetify?.LocalStorage) {
        setTimeout(arguments.callee, 100);
        return;
    }

    const { React, LocalStorage, PopupModal, showNotification, Platform } = Spicetify;
    const { useState, useEffect, useCallback, createElement: h } = React;

    // ── Storage Helpers ──────────────────────────────────────────

    const STORAGE_PREFIX = 'understory:';

    function loadSetting(key, defaultValue) {
        const raw = LocalStorage.get(STORAGE_PREFIX + key);
        if (raw === null) return defaultValue;
        try { return JSON.parse(raw); } catch { return raw; }
    }

    function saveSetting(key, value) {
        LocalStorage.set(STORAGE_PREFIX + key, JSON.stringify(value));
    }

    // ── Theme Colors ─────────────────────────────────────────────

    const THEME_COLORS = {
        bg: '#11140f',
        surface: '#1c2118',
        card: '#242b1f',
        border: '#33402c',
        text: '#e9ede4',
        subtext: '#96a38c',
        accent: '#3fd0c9',
        deck: '#e8a23d',
        content: '#9fe84a',
        pads: '#ef6aaf',
    };

    // ── Reusable Components ──────────────────────────────────────

    function SectionHeader({ title, subtitle }) {
        return h('div', { style: { marginBottom: '16px' } },
            h('h2', {
                style: {
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: THEME_COLORS.text,
                    margin: '0 0 4px 0',
                    letterSpacing: '0.02em',
                }
            }, title),
            subtitle ? h('p', {
                style: {
                    fontSize: '0.8rem',
                    color: THEME_COLORS.subtext,
                    margin: '0',
                }
            }, subtitle) : null
        );
    }

    function Toggle({ label, description, storageKey, defaultValue, onChange }) {
        const [enabled, setEnabled] = useState(() => loadSetting(storageKey, defaultValue));

        const toggle = () => {
            const next = !enabled;
            setEnabled(next);
            saveSetting(storageKey, next);
            if (onChange) onChange(next);
        };

        return h('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: `1px solid ${THEME_COLORS.border}`,
            }
        },
            h('div', { style: { flex: 1 } },
                h('div', {
                    style: {
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: THEME_COLORS.text,
                    }
                }, label),
                description ? h('div', {
                    style: {
                        fontSize: '0.75rem',
                        color: THEME_COLORS.subtext,
                        marginTop: '2px',
                    }
                }, description) : null
            ),
            h('button', {
                onClick: toggle,
                'aria-checked': enabled,
                role: 'switch',
                style: {
                    background: enabled ? THEME_COLORS.accent : THEME_COLORS.border,
                    border: 'none',
                    borderRadius: '12px',
                    padding: '4px',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                    marginLeft: '12px',
                }
            },
                h('span', {
                    style: {
                        position: 'absolute',
                        top: '2px',
                        left: enabled ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }
                })
            )
        );
    }

    function Slider({ label, storageKey, defaultValue, min, max, step, unit, onChange }) {
        const [value, setValue] = useState(() => loadSetting(storageKey, defaultValue));

        const update = (e) => {
            const v = Number(e.target.value);
            setValue(v);
            saveSetting(storageKey, v);
            if (onChange) onChange(v);
        };

        return h('div', {
            style: {
                padding: '14px 0',
                borderBottom: `1px solid ${THEME_COLORS.border}`,
            }
        },
            h('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                }
            },
                h('span', {
                    style: {
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: THEME_COLORS.text,
                    }
                }, label),
                h('span', {
                    style: {
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: THEME_COLORS.accent,
                        fontVariantNumeric: 'tabular-nums',
                    }
                }, `${value}${unit || ''}`)
            ),
            h('input', {
                type: 'range',
                min, max, step, value,
                onChange: update,
                style: {
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: THEME_COLORS.border,
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: THEME_COLORS.accent,
                }
            })
        );
    }

    function Select({ label, description, storageKey, defaultValue, options, onChange }) {
        const [value, setValue] = useState(() => loadSetting(storageKey, defaultValue));

        const update = (e) => {
            const v = e.target.value;
            setValue(v);
            saveSetting(storageKey, v);
            if (onChange) onChange(v);
        };

        return h('div', {
            style: {
                padding: '14px 0',
                borderBottom: `1px solid ${THEME_COLORS.border}`,
            }
        },
            h('div', { style: { marginBottom: '6px' } },
                h('label', {
                    style: {
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: THEME_COLORS.text,
                        display: 'block',
                    }
                }, label),
                description ? h('div', {
                    style: {
                        fontSize: '0.75rem',
                        color: THEME_COLORS.subtext,
                        marginTop: '2px',
                    }
                }, description) : null
            ),
            h('select', {
                value, onChange: update,
                style: {
                    width: '100%',
                    padding: '10px 12px',
                    background: THEME_COLORS.surface,
                    color: THEME_COLORS.text,
                    border: `1px solid ${THEME_COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    outline: 'none',
                }
            },
                options.map(opt =>
                    h('option', { key: opt.value, value: opt.value }, opt.label)
                )
            )
        );
    }

    function ColorPicker({ label, storageKey, defaultValue, onChange }) {
        const [value, setValue] = useState(() => loadSetting(storageKey, defaultValue));

        const update = (e) => {
            const v = e.target.value;
            setValue(v);
            saveSetting(storageKey, v);
            if (onChange) onChange(v);
        };

        return h('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: `1px solid ${THEME_COLORS.border}`,
            }
        },
            h('span', {
                style: {
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: THEME_COLORS.text,
                }
            }, label),
            h('div', {
                style: { display: 'flex', alignItems: 'center', gap: '8px' }
            },
                h('span', {
                    style: {
                        fontSize: '0.75rem',
                        color: THEME_COLORS.subtext,
                        fontFamily: 'var(--font-mono)',
                    }
                }, value),
                h('input', {
                    type: 'color',
                    value,
                    onChange: update,
                    style: {
                        width: '32px',
                        height: '32px',
                        border: `2px solid ${THEME_COLORS.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'none',
                        padding: '0',
                    }
                })
            )
        );
    }

    function Button({ label, onClick, variant, style: customStyle }) {
        const baseStyle = {
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        };

        const variants = {
            primary: {
                background: THEME_COLORS.accent,
                color: THEME_COLORS.bg,
            },
            secondary: {
                background: 'transparent',
                color: THEME_COLORS.text,
                border: `1px solid ${THEME_COLORS.border}`,
            },
            danger: {
                background: '#ef6aaf',
                color: '#fff',
            },
        };

        return h('button', {
            onClick,
            style: { ...baseStyle, ...variants[variant || 'primary'], ...customStyle },
        }, label);
    }

    function Card({ children, style: customStyle }) {
        return h('div', {
            style: {
                background: THEME_COLORS.card,
                border: `1px solid ${THEME_COLORS.border}`,
                borderRadius: '8px',
                padding: '20px',
                ...customStyle,
            }
        }, children);
    }

    function Badge({ children, color }) {
        return h('span', {
            style: {
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600',
                background: color || THEME_COLORS.accent,
                color: THEME_COLORS.bg,
            }
        }, children);
    }

    // ── Theme Settings Section ───────────────────────────────────

    function ThemeSettings() {
        return h('div', null,
            h(SectionHeader, {
                title: 'Theme Settings',
                subtitle: 'Customize the Understory forest-inspired theme',
            }),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.accent }, 'COLORS'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Accent palette')
                ),
                h(ColorPicker, {
                    label: 'Sidebar Accent',
                    storageKey: 'theme:accent-sidebar',
                    defaultValue: '#3fd0c9',
                }),
                h(ColorPicker, {
                    label: 'Deck Accent',
                    storageKey: 'theme:accent-deck',
                    defaultValue: '#e8a23d',
                }),
                h(ColorPicker, {
                    label: 'Content Accent',
                    storageKey: 'theme:accent-content',
                    defaultValue: '#9fe84a',
                }),
                h(ColorPicker, {
                    label: 'Pads Accent',
                    storageKey: 'theme:accent-pads',
                    defaultValue: '#ef6aaf',
                }),
            ),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.deck }, 'DISPLAY'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Visual effects')
                ),
                h(Toggle, {
                    label: 'Adaptive Album Art Colors',
                    description: 'Tint the UI based on current track album art',
                    storageKey: 'theme:adaptive-colors',
                    defaultValue: true,
                }),
                h(Toggle, {
                    label: 'Noise Texture Overlay',
                    description: 'Subtle organic texture on surfaces',
                    storageKey: 'theme:noise-texture',
                    defaultValue: true,
                }),
                h(Toggle, {
                    label: 'Progress Bar Glow',
                    description: 'Glow effect behind the playback progress bar',
                    storageKey: 'theme:progress-glow',
                    defaultValue: true,
                }),
                h(Toggle, {
                    label: 'Playing State Animations',
                    description: 'Breathing glow on play button and equalizer bars',
                    storageKey: 'theme:playing-animations',
                    defaultValue: true,
                }),
            ),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.content }, 'SIDEBAR'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Channel strip behavior')
                ),
                h(Slider, {
                    label: 'Sidebar Collapse Threshold',
                    storageKey: 'theme:sidebar-collapse-width',
                    defaultValue: 121,
                    min: 72,
                    max: 200,
                    step: 1,
                    unit: 'px',
                }),
                h(Toggle, {
                    label: 'LED Indicator Strip',
                    description: 'Teal glow on active playlist item',
                    storageKey: 'theme:led-indicator',
                    defaultValue: true,
                }),
            ),
        );
    }

    // ── AutoDJ Settings Section ──────────────────────────────────

    function AutoDJSettings() {
        const [autoDJEnabled, setAutoDJEnabled] = useState(() => loadSetting('autodj:enabled', false));

        return h('div', null,
            h(SectionHeader, {
                title: 'AutoDJ Settings',
                subtitle: 'Intelligent queue sequencer powered by mood, energy, and harmony',
            }),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: autoDJEnabled ? THEME_COLORS.content : THEME_COLORS.subtext }, autoDJEnabled ? 'ACTIVE' : 'OFF'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Queue automation')
                ),
                h(Toggle, {
                    label: 'Enable Auto-DJ',
                    description: 'Automatically fill queue when tracks run low',
                    storageKey: 'autodj:enabled',
                    defaultValue: false,
                    onChange: (v) => setAutoDJEnabled(v),
                }),
            ),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.pads }, 'MOOD'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Queue personality')
                ),
                h(Select, {
                    label: 'Default Mood',
                    description: 'Affects energy, danceability, and valence ranges',
                    storageKey: 'autodj:mood',
                    defaultValue: 'mix',
                    options: [
                        { value: 'chill', label: 'Chill — Low energy, relaxed vibes' },
                        { value: 'focus', label: 'Focus — Instrumental, steady rhythm' },
                        { value: 'party', label: 'Party — High energy, danceable' },
                        { value: 'workout', label: 'Workout — Intense, fast tempo' },
                        { value: 'sleep', label: 'Sleep — Ambient, minimal' },
                        { value: 'mix', label: 'Mix — Balanced variety' },
                    ],
                }),
                h(Slider, {
                    label: 'Energy Level',
                    storageKey: 'autodj:energy',
                    defaultValue: 50,
                    min: 0,
                    max: 100,
                    step: 5,
                    unit: '%',
                }),
            ),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.deck }, 'MIXING'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Harmonic sequencing')
                ),
                h(Toggle, {
                    label: 'Camelot Key Matching',
                    description: 'Match tracks by musical key harmony (Camelot wheel)',
                    storageKey: 'autodj:key-match',
                    defaultValue: true,
                }),
                h(Select, {
                    label: 'BPM Tolerance',
                    description: 'Maximum BPM difference from current track',
                    storageKey: 'autodj:bpm-range',
                    defaultValue: '10',
                    options: [
                        { value: '5', label: '±5 BPM — Tight match' },
                        { value: '10', label: '±10 BPM — Moderate' },
                        { value: '15', label: '±15 BPM — Loose' },
                        { value: '20', label: '±20 BPM — Very loose' },
                    ],
                }),
                h(Select, {
                    label: 'Track Source',
                    description: 'Where to find candidate tracks',
                    storageKey: 'autodj:source',
                    defaultValue: 'hybrid',
                    options: [
                        { value: 'hybrid', label: 'Hybrid — Library + Recommendations' },
                        { value: 'library', label: 'Library — Your saved tracks only' },
                        { value: 'recommendations', label: 'Recommendations — Spotify suggestions' },
                    ],
                }),
            ),

            h(Card, { style: { marginBottom: '16px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
                    h(Badge, { color: THEME_COLORS.accent }, 'QUEUE'),
                    h('span', { style: { fontSize: '0.85rem', color: THEME_COLORS.subtext } }, 'Fill behavior')
                ),
                h(Slider, {
                    label: 'Queue Low Threshold',
                    description: 'Auto-fill when queue has fewer than this many tracks',
                    storageKey: 'autodj:threshold',
                    defaultValue: 2,
                    min: 1,
                    max: 10,
                    step: 1,
                    unit: ' tracks',
                }),
                h(Slider, {
                    label: 'Max Tracks Per Fill',
                    description: 'Maximum tracks added per auto-fill',
                    storageKey: 'autodj:max-queue-add',
                    defaultValue: 5,
                    min: 1,
                    max: 15,
                    step: 1,
                    unit: ' tracks',
                }),
            ),
        );
    }

    // ── About Section ────────────────────────────────────────────

    function AboutSection() {
        return h('div', null,
            h(SectionHeader, {
                title: 'About Understory',
                subtitle: 'A forest-inspired DJ controller theme for Spicetify',
            }),

            h(Card, { style: { marginBottom: '16px', textAlign: 'center', padding: '32px 20px' } },
                h('div', {
                    style: {
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: THEME_COLORS.text,
                        marginBottom: '8px',
                    }
                }, 'Understory'),
                h('div', {
                    style: {
                        fontSize: '0.85rem',
                        color: THEME_COLORS.subtext,
                        marginBottom: '16px',
                    }
                }, 'v2.0 — Forest-Inspired DJ Controller'),
                h('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '16px',
                    }
                },
                    h(Badge, { color: THEME_COLORS.accent }, 'Theme'),
                    h(Badge, { color: THEME_COLORS.deck }, 'AutoDJ'),
                    h(Badge, { color: THEME_COLORS.content }, 'Adaptive'),
                    h(Badge, { color: THEME_COLORS.pads }, 'Accessible'),
                ),
                h('div', {
                    style: {
                        fontSize: '0.8rem',
                        color: THEME_COLORS.subtext,
                        lineHeight: '1.6',
                    }
                },
                    h('div', null, 'Dark forest palette with teal, amber, lime, and pink accents'),
                    h('div', null, 'Album-art-adaptive color system'),
                    h('div', null, 'DJ controller-inspired playback controls'),
                    h('div', null, 'Intelligent AutoDJ queue sequencer'),
                ),
            ),

            h(Card, null,
                h('div', {
                    style: {
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: THEME_COLORS.text,
                        marginBottom: '12px',
                    }
                }, 'Links'),
                h('div', {
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }
                },
                    h('a', {
                        href: 'https://github.com/KofiiDerKoder/Understory',
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: {
                            color: THEME_COLORS.accent,
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                        }
                    }, 'Theme — GitHub'),
                    h('a', {
                        href: 'https://github.com/KofiiDerKoder/Understory-AutoDJ',
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: {
                            color: THEME_COLORS.accent,
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                        }
                    }, 'AutoDJ — GitHub'),
                ),
            ),
        );
    }

    // ── Main Settings Page ───────────────────────────────────────

    function SettingsPage() {
        const [activeTab, setActiveTab] = useState('theme');

        const tabs = [
            { id: 'theme', label: 'Theme' },
            { id: 'autodj', label: 'AutoDJ' },
            { id: 'about', label: 'About' },
        ];

        return h('div', {
            style: {
                padding: '32px 40px',
                maxWidth: '640px',
                minHeight: '100vh',
            }
        },
            // Header
            h('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px',
                }
            },
                h('div', {
                    style: {
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${THEME_COLORS.accent}, ${THEME_COLORS.deck})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }
                },
                    h('svg', {
                        width: '20',
                        height: '20',
                        viewBox: '0 0 24 24',
                        fill: THEME_COLORS.bg,
                    },
                        h('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' })
                    )
                ),
                h('div', null,
                    h('h1', {
                        style: {
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            color: THEME_COLORS.text,
                            margin: '0',
                        }
                    }, 'Understory Settings'),
                    h('div', {
                        style: {
                            fontSize: '0.75rem',
                            color: THEME_COLORS.subtext,
                        }
                    }, 'Theme & AutoDJ Configuration')
                )
            ),

            // Tabs
            h('div', {
                style: {
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '24px',
                    background: THEME_COLORS.surface,
                    borderRadius: '8px',
                    padding: '4px',
                }
            },
                ...tabs.map(tab =>
                    h('button', {
                        key: tab.id,
                        onClick: () => setActiveTab(tab.id),
                        style: {
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeTab === tab.id ? THEME_COLORS.card : 'transparent',
                            color: activeTab === tab.id ? THEME_COLORS.text : THEME_COLORS.subtext,
                            fontSize: '0.85rem',
                            fontWeight: activeTab === tab.id ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: activeTab === tab.id ? THEME_COLORS.shadow : 'none',
                        }
                    }, tab.label)
                )
            ),

            // Tab Content
            activeTab === 'theme' ? h(ThemeSettings) : null,
            activeTab === 'autodj' ? h(AutoDJSettings) : null,
            activeTab === 'about' ? h(AboutSection) : null,
        );
    }

    // ── Main Entry ───────────────────────────────────────────────

    function render() {
        return h(SettingsPage);
    }

    // Expose render for Spicetify
    window.__understorySettingsRender = render;

})();
