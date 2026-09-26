# Vocalyze design system

Adapted from the Buddy.works style on Refero
(https://styles.refero.design/style/1329b661-39d8-4f0b-a12a-11ed13671ccb).
All tokens live in `src/app/globals.css` (`:root` for CSS variables, `@theme inline` for Tailwind utilities).

**North star:** an engineering blueprint on graph paper. A near-white drafting surface with a faint grid, near-black ink, one fluorescent lime action color, and iridescent gradient strokes used only as decoration.

## Color

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Lime Spark | `#bfff5a` | `bg-lime` | **Only** primary action fill (CTA, active highlight). Never large fills. One lime button per view. |
| Cobalt Signal | `#1a67fd` | `text-cobalt` | Links, logo mark, active nav indicator. |
| Paper White | `#fcfcfd` | `bg-paper` | Canvas, cards, inputs. |
| Obsidian | `#0a0d16` | `text-obsidian` / `bg-obsidian` | Display type, dark bands. |
| Carbon | `#151720` | `text-carbon` | Body text, active tab fill. |
| Midnight Ink | `#1d2130` | `text-ink` | Nav text, icons, primary text. |
| Pewter | `#6b6d72` | `text-pewter` | Helper text, eyebrows. |
| Slate Edge | `#d5d9e8` | `border-edge` | Card and input borders. |
| Mist Gray | `#ebeef7` | `border-mist` / `bg-mist` | Dividers, subtle fills. |

Decorative accents (cyan `#46d8ff`, mint `#19f79a`, citron `#e5ed38`, orchid `#ff9dec`, amber `#ffc650`) only appear as card arc strokes, glows, and the headline brushstroke. They are never used for text, icons, or borders. Never use `#000` for text.

## Type

- **IBM Plex Sans** 400/500/600/700: display 80px/0.9/-3.6px, heading 48px/1/-1px, heading-sm 22px/1.43/-0.26px, subheading 18px/1.45, body 16px.
- **IBM Plex Mono** 12px/500, 2px tracking, uppercase, pewter: `.eyebrow` labels only.
- Body text is always left-aligned. Centering is for headlines, eyebrows, and logo strips.

## Shape and space

- 8px base unit; scale 8/16/24/32/40/48/72/96/120. Page max width 1200px, section gap 80px, card padding 24px.
- Radius: buttons 56px (pill), cards 24px, small cards 14px, nav/tab pills 44px, images 8px.

## Components (`src/components/ui`)

- **Button**: `primary` (lime, obsidian text, glass-bead inset shadow), `dark` (carbon fill), `outline` (1px current-color border, for dark bands), `ghost` (nav links).
- **Card**: 24px radius, paper fill, layered hairline shadow with an optional hue glow (`glow-cyan|lime|orchid|mint|amber|citron`) and top-arc stroke (`.arc`).
- **PillTabs**: capsule container; the active tab fills carbon with paper text.
- **Brushstroke**: `.brush` under 1–2 headline keywords only.
- **Grid paper**: `.grid-paper` on hero and feature sections, with `.grid-paper-fade` for edges.

## Data viz

- Sentiment is diverging: negative `#e34948`, neutral `#b8bcc9` (gray midpoint), positive `#2a78d6`. Always show a legend and tooltips.
- Magnitude (theme counts) uses a single hue: cobalt bars.
- Urgency uses the fixed status palette (good `#0ca30c`, warning `#fab219`, serious `#ec835a`, critical `#d03b3b`), always paired with a label or icon and never used for a series.
- Gridlines are Mist, axes Pewter. There are no dual axes.
