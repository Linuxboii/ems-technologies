# Welcome Page — Visual Redesign Spec

Date: 2026-06-18

## Goal

Replace the current minimalist "Project Atlas" hero (`src/pages/Welcome.jsx`) with a
warm, editorial **welcome-letter** page that faithfully reproduces `avlokai.pdf` — a
personal note from Sushanth (Founder, Avlokai) to the client, Mr. Vikram.

This is the companion to the already-approved backend/auth spec
(`2026-06-17-backend-auth-design.md`). The Welcome page is the **public front door**;
all other portal pages stay behind login.

## Scope decisions (locked with user)

- **Fidelity:** Replica of the PDF **+ light motion** (scroll-reveal fade-ins, hover polish).
- **Style scope:** The warm editorial aesthetic is **isolated to the Welcome page only**.
  Inner pages (SOP / Deliverables / Timeline / Payment / Login / Account) keep the existing
  minimalist mono "Swiss" design system. No global token changes.
- **Login entry:** A subtle `Enter your portal →` link near the letter's P.S./footer,
  linking to `/login`. (Navbar also carries a login link — backend spec's job.)

## Non-goals

- No change to the global design tokens in `src/index.css` (`--color-*`, `.card`, `.btn-*`).
- No new component library or CSS framework — plain scoped CSS module / scoped class names.
- No backend dependency — Welcome is static, public, renders without a session.
- No reuse of the warm theme on other pages.

## Visual design system (scoped to Welcome only)

All tokens below are **local** to the Welcome page — defined under a `.welcome-letter`
root scope (CSS custom properties on that container), never on `:root`. This guarantees
zero bleed into the mono portal theme.

### Color
| Token | Value | Use |
|-------|-------|-----|
| `--w-bg` | `#faf7f0` | page cream background |
| `--w-paper` | `#fbf9f3` | card / panel surface (slightly lifted) |
| `--w-ink` | `#1a1714` | primary warm-black text |
| `--w-ink-soft` | `#5c554c` | secondary body text |
| `--w-muted` | `#9a9186` | mono labels, footer |
| `--w-accent` | `#c1502e` | terracotta — name, kicker, links, accents |
| `--w-accent-soft` | `#e8d9cf` | hairlines, card borders, seal |
| `--w-line` | `#e3ddd0` | rules / dividers |

Contrast: `--w-ink` (#1a1714) on `--w-bg` ≈ 13:1; `--w-accent` (#c1502e) on cream ≈ 4.6:1 (AA for large text — used on display/label sizes only, never small body).

### Type (loaded via one scoped `@import`, only on Welcome)
- **Display serif:** `Playfair Display` (400–700, ital) — headline "Welcome aboard, Mr. Vikram.", card titles.
- **Body serif:** `EB Garamond` (400–600, ital) — lede + body paragraphs + drop cap.
- **Handwriting:** `Caveat` (400–700) — "a warm hello —" kicker, "Sushanth" signature, "P.S." line.
- **Mono label:** `JetBrains Mono` (400–500) — "SEE MORE · KNOW MORE · DO MORE", "A LITTLE NOTE FOR MR. VIKRAM", "NO. 01", footer strip.

Fonts loaded with `display=swap`. Font `@import` lives in the Welcome CSS file so the mono
portal pages don't pay for these fonts.

## Layout (top → bottom, matches PDF)

A single centered "paper" column (max-width ~960px) on the cream page, framed by thin
**corner brackets** (top-left, top-right, bottom-left, bottom-right L-shapes in `--w-accent-soft`).

1. **Top bar** — left: Avlokai logo mark + "Avlok*Ai*" wordmark, with mono tagline
   "SEE MORE · KNOW MORE · DO MORE" beneath. Right (mono, muted, right-aligned):
   "A LITTLE NOTE / FOR MR. VIKRAM".
2. **Kicker** — handwriting, accent: "a warm hello —".
3. **Headline** — display serif, two lines: "Welcome aboard," (ink) / "Mr. Vikram." (accent italic).
4. **Lede** — italic body serif, 2 lines, the "genuinely glad…" sentence.
5. **Accent diamond + hairline rule** — small terracotta diamond ◆ then a thin full-width line.
6. **Body** — 3 paragraphs of body serif with a **drop cap** on the first ("I"). Bold spans
   on "genuinely great", "Mr. Vikram", "see more, know more, and do more".
7. **Value cards** — 3-column grid (`NO. 01 / 02 / 03`): mono number label, serif title,
   body description. Cards: `--w-paper` bg, `--w-accent-soft` border, generous padding.
   - 01 Warmth first — "Real people, real replies…"
   - 02 Craft, not corners — "We sweat the details…"
   - 03 In it together — "Your wins are our wins…"
8. **Signature block** — "Here's to a great one together," (italic serif) → "Sushanth"
   (large handwriting) → "SUSHANTH K" (mono caps) → "Founder · Avlokai" (italic) →
   "sushanth@avlokai.com · avlokai.com" (accent mono).
9. **Seal badge** — bottom-right circular dashed seal: "Avlokai / 2026" + "GLAD YOU'RE HERE".
10. **Footer** — thin rule, then P.S. line (handwriting): "P.S. — seriously, *welcome aboard.* ✦"
    and mono footer strip "WELCOME · AVLOKAI · 2026".
11. **Portal CTA** — subtle, near the P.S.: `Enter your portal →` link → `/login`
    (accent text, animated arrow nudge on hover). This is the only interactive nav on the page.

## Motion (light, respects reduced-motion)

- On load / scroll into view: staggered fade-in-up of the major blocks
  (kicker → headline → lede → body → cards → signature), 30–50ms stagger, ~400ms ease-out.
  Reuse the existing `useScrollReveal` hook + `fade-in-up`/`stagger` classes pattern where it fits;
  add scoped equivalents if the existing classes carry mono-theme styling.
- Hover: value cards lift border color to `--w-accent`; "Enter your portal" arrow translates +4px.
- `@media (prefers-reduced-motion: reduce)`: all reveals/transitions disabled, content shown statically.
- Transform/opacity only (no layout-animating properties).

## Responsive

- Breakpoints 375 / 768 / 1024.
- ≥1024: full layout, 3-col cards, corner brackets visible.
- 768–1023: paper column fluid, cards stay 3-col or wrap to 2, slightly reduced display size.
- <768: single column; cards stack to 1-col; corner brackets simplified/hidden; top bar stacks
  (logo block above the "A LITTLE NOTE" block); headline `clamp()` down; seal scales/relocates
  inline above footer. No horizontal scroll. Body text ≥16px.
- Display headline uses `clamp(2.4rem, 7vw, 4.2rem)`.

## Components / files

- `src/pages/Welcome.jsx` — rewritten; composes the sections above. Self-contained, no props.
- `src/pages/Welcome.css` (new) — scoped styles + font `@import`, all selectors under
  `.welcome-letter`. Imported by `Welcome.jsx`.
- Logo: reuse the Avlokai mark from the PDF/existing assets if present in `src/assets`;
  otherwise render the wordmark in type (no fabricated raster logo). Verify what exists before building.
- Icons (diamond ◆, arrow, ✦): use Lucide (`Diamond`/`Sparkle`/`ArrowRight`) or inline SVG —
  not emoji — per design-system rule `no-emoji-icons`. (The ✦ in the PDF is a glyph; use a Lucide `Sparkle` to stay crisp.)
- Navbar behavior on `/`: Navbar is shared. On the Welcome route it should not visually fight
  the warm theme — keep the existing Navbar but ensure it reads acceptably over cream
  (verify; minor scoped tweak only if it clashes — no redesign).

## Accessibility

- Single `<h1>` = "Welcome aboard, Mr. Vikram." (visually two lines, one heading).
- Decorative glyphs (diamond, seal, brackets) `aria-hidden`.
- "Enter your portal" is a real `<Link>` with visible focus ring (scoped, not removed).
- Color never the sole carrier of meaning (cards have number + title + text).
- Contrast verified (see Color table); terracotta only on large/label text.

## Testing (manual, matches repo convention)

- `npm run dev`, open `/`: visual diff against `avlokai.pdf` at 1440 / 768 / 375.
- Confirm fonts load (Playfair / EB Garamond / Caveat / JetBrains Mono), terracotta accent correct.
- Confirm reveals play once, and are disabled under OS "reduce motion".
- Confirm `Enter your portal →` routes to `/login`.
- Navigate `/` → `/sop` and back: confirm warm theme does NOT leak into mono pages
  (inspect that `--w-*` vars and Welcome fonts are absent outside `.welcome-letter`).
- Keyboard: Tab reaches the portal link with a visible focus ring.

## Open items resolved during brainstorming

- Fidelity: replica + light motion.
- Theme scope: Welcome-only; global mono tokens untouched; CSS scoped under `.welcome-letter`.
- Login entry: subtle `Enter your portal →` near P.S. (+ navbar login from backend spec).
- Fonts: Playfair Display (display), EB Garamond (body), Caveat (hand), JetBrains Mono (labels).
- Palette: terracotta `#c1502e` on cream `#faf7f0`, warm-black `#1a1714`.
