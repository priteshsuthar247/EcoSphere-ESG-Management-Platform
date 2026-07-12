# EcoSphere Colour Configuration
# Source of truth: terminalui-design-system-DESIGN.md (TerminalUI Design System)
# Update hex values here AND the matching CSS variables in src/app/globals.css

---

## Current Palette: TerminalUI Hacker Green

| Token                  | CSS Variable                  | Hex / Value                          | Usage                                          |
|------------------------|-------------------------------|--------------------------------------|------------------------------------------------|
| Primary (Green)        | `--color-primary`             | `#00FF41`                            | Commands, active states, success, borders      |
| Secondary (Amber)      | `--color-secondary`           | `#FF6600`                            | Warnings, highlights, prompts                  |
| Tertiary (Cyan)        | `--color-tertiary`            | `#00BFFF`                            | Links, info, selection accents                 |
| Background             | `--color-bg`                  | `#0D0D0D`                            | Terminal background, page base                 |
| Surface                | `--color-surface`             | `#141414`                            | Panel backgrounds, card fills                  |
| Surface Elevated       | `--color-surface-elevated`    | `#1A1A1A`                            | Elevated cards, hover panels                   |
| Success                | `--color-success`             | `#00FF41`                            | Exit code 0, passed tests                      |
| Warning                | `--color-warning`             | `#FF6600`                            | Deprecation notices, caution                   |
| Error                  | `--color-error`               | `#FF0040`                            | Exit errors, failed processes                  |
| Info                   | `--color-info`                | `#00BFFF`                            | Informational output, hints                    |
| Border Subtle          | `--color-border-subtle`       | `#222222`                            | Panels, default containers                     |
| Border Medium          | `--color-border-medium`       | `#444444`                            | Active inputs, hover panels                    |
| Border Muted           | `--color-border-muted`        | `#333333`                            | Disabled borders                               |
| Text Primary           | `--color-text-primary`        | `#00FF41`                            | Main terminal output text                      |
| Text Muted             | `--color-text-muted`          | `#8B8B8B`                            | Labels, secondary text                         |
| Text Dim               | `--color-text-dim`            | `#555555`                            | Metadata, line numbers, disabled               |
| Text Inverse           | `--color-text-inverse`        | `#0D0D0D`                            | Text on green/filled backgrounds               |

---

## Border Radius
All elements: **0px** — sharp corners are non-negotiable per TerminalUI spec.

## Elevation
No shadows. Elevation via border colour only:
- Subtle: `1px solid #222222`
- Medium: `1px solid #444444`
- Focus / Active: `1px solid #00FF41`
- Error: `1px solid #FF0040`

## Typography
**JetBrains Mono** for ALL text — mixing in sans-serif breaks the terminal illusion.

## How to Change Colours
1. Update hex values in the table above
2. Open `src/app/globals.css` and update the matching `--color-*` CSS variables in the `:root` block
3. Save both files — all components will pick up new colours automatically
