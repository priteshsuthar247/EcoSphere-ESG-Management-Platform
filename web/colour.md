# EcoSphere Colour Configuration
# Source of truth: DESIGN.md (Notion-inspired daylight design system)
# Update hex values in THREE places for full theming:
#   1. This file (documentation)
#   2. `tailwind.config.ts` → theme.extend.colors (utility classes: bg-primary, text-ink, …)
#   3. `src/app/globals.css` → :root CSS variables (legacy inline styles / component classes)

---

## Current Palette: Notion Daylight

| Token                  | CSS Variable                  | Hex / Value                          | Usage                                          |
|------------------------|-------------------------------|--------------------------------------|------------------------------------------------|
| Primary (Notion Blue)  | `--color-primary`             | `#0075de`                            | CTAs, links, focus, active nav                 |
| Primary Pressed        | `--color-primary-active`      | `#005bab`                            | Pressed primary button                         |
| Secondary (Deep Indigo)| `--color-secondary`           | `#213183`                            | Hero/night band, dark inverted sections        |
| Tertiary / Sky         | `--color-tertiary`            | `#62aef0`                            | Info accents, secondary links                  |
| Canvas Soft            | `--color-bg`                  | `#f6f5f4`                            | Page background (warm paper)                   |
| Surface White          | `--color-surface`             | `#ffffff`                            | Cards, panels, form fields, nav                |
| Surface Elevated       | `--color-surface-elevated`    | `#ffffff`                            | Elevated cards (with soft shadow)              |
| Hairline               | `--color-border-subtle`       | `#e6e6e6`                            | Card borders, dividers                         |
| Border Medium          | `--color-border-medium`       | `#dddddd`                            | Input borders, hover panels                    |
| Border Muted           | `--color-border-muted`        | `#ececec`                            | Disabled borders                               |
| Ink                    | `--color-text-primary`        | `#000000`                            | Headings, primary body                         |
| Ink Secondary          | `--color-ink-secondary`       | `#31302e`                            | Secondary body copy                            |
| Stone                  | `--color-text-muted`          | `#615d59`                            | Supporting / muted copy                        |
| Ash                    | `--color-text-dim`            | `#a39e98`                            | Captions, metadata, placeholders               |
| Text Inverse           | `--color-text-inverse` / on-primary | `#ffffff`                      | Text on primary blue fills                     |
| Success (Green)        | `--color-success`             | `#1aae39`                            | Affirmative status                             |
| Warning (Orange)       | `--color-warning`             | `#dd5b00`                            | Caution status                                 |
| Error                  | `--color-error`               | `#e03e3e`                            | Errors, destructive                            |
| Info                   | `--color-info`                | `#0075de`                            | Informational                                  |

### Decorative sticker palette (never for CTAs)
| Accent Purple          | `--color-accent-purple`       | `#d6b6f6` |
| Accent Pink            | `--color-accent-pink`         | `#ff64c8` |
| Accent Orange          | `--color-accent-orange`       | `#dd5b00` |
| Accent Teal            | `--color-accent-teal`         | `#2a9d99` |
| Accent Green           | `--color-accent-green`        | `#1aae39` |
| Accent Sky             | `--color-accent-sky`          | `#62aef0` |

---

## Border Radius
| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 4px | Inputs, small tags |
| `--radius-sm` | 5px | Chips, status pills |
| `--radius-md` | 8px | Utility buttons, smaller cards |
| `--radius-lg` | 12px | Feature cards |
| `--radius-full` | 9999px | Primary CTAs, badges |

## Elevation
- Flat: 1px hairline `#e6e6e6`, no shadow
- Soft: layered micro-shadow (see globals.css `--shadow-soft`)
- Elevated: deeper stack (`--shadow-elevated`) for modals

## Typography
**Inter** (NotionInter substitute) for ALL UI text.
Fallback: `Inter, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif`

## How to Change Colours
1. Update hex values in the table above
2. Open `src/app/globals.css` and update the matching `--color-*` CSS variables in the `:root` block
3. Save both files — all components pick up new colours automatically
