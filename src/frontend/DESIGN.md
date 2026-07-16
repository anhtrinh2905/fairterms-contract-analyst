---
# FairTerms — Design Spine (DESIGN.md)
# Owns HOW IT LOOKS. Wins on conflict with any mock, import, or ad-hoc component.
# Foundation: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui (explicitly approved
# exception to AGENTS.md / RULES.md "no Tailwind/shadcn" rule — user requested a full redesign).
status: draft
version: 1
colors:
  # Brand — Deep-tech Indigo (unified marketing + app; supersedes the earlier navy system)
  primary: "#533AFD"          # Indigo — primary CTA + brand
  primary-foreground: "#FFFFFF"
  secondary: "#ECEBFF"        # pale indigo tint surface
  secondary-foreground: "#2E2B8C"
  accent: "#ECEBFF"           # subtle indigo tint — hover surfaces (no more gold)
  accent-foreground: "#2E2B8C"
  # Surfaces (light)
  background: "#F6F9FC"
  foreground: "#0D253D"
  card: "#FFFFFF"
  card-foreground: "#0D253D"
  muted: "#EEF3F9"
  muted-foreground: "#475569"
  border: "#E3E8EE"
  input: "#CDD6E0"
  ring: "#533AFD"
  # Risk semantics (functional — always paired with icon + text, never color alone)
  risk-high: "#DC2626"        # red
  risk-high-surface: "#FEF2F2"
  risk-high-border: "#FECACA"
  risk-high-text: "#991B1B"
  risk-medium: "#D97706"      # amber
  risk-medium-surface: "#FFFBEB"
  risk-medium-border: "#FDE68A"
  risk-medium-text: "#92400E"
  risk-low: "#15803D"         # green
  risk-low-surface: "#F0FDF4"
  risk-low-border: "#BBF7D0"
  risk-low-text: "#166534"
  destructive: "#DC2626"      # same hue as risk-high; used for irreversible actions
  destructive-foreground: "#FFFFFF"
typography:
  heading: "Space Grotesk"    # display sans — techy character; weight 300 hero → 600–700 section
  body: "Be Vietnam Pro"      # VN-native sans — UI chrome, body, labels, long-form contract text
  mono: "IBM Plex Mono"       # tabular figures: clause numbers, dates, amounts
  base-size: "16px"
  scale: [12, 14, 16, 18, 20, 24, 30, 36, 48]
  line-height-body: 1.6
  line-height-heading: 1.2
rounded:
  base: "0.5rem"              # --radius; shadcn derives sm/md/lg/xl from this
spacing:
  unit: "4px"                 # 4/8 rhythm; tokens: 4 8 12 16 24 32 48 64
components:
  - risk-verdict-badge
  - risk-verdict-card
  - clause-table
  - citation-chip
  - upload-dropzone
  - chat-panel
  - app-sidebar
  - disclaimer-banner
---

# FairTerms Design Spine

**Product:** Vietnamese real-estate contract review SaaS — OCR → checklist risk analysis → legal RAG citations → RAG chat. A *preliminary review assistant, not a lawyer.*

**Foundation (UI system):** Tailwind CSS v4 + shadcn/ui on Next.js 16 App Router. Tokens below map 1:1 to shadcn CSS variables; both spines inherit shadcn defaults and extend only where noted. Fonts loaded via `next/font/google` (self-hosted, `display: swap`), **not** CSS `@import`.

---

## Brand & Style

**Pattern:** Deep-tech Indigo (modern SaaS — Linear / Stripe / Vercel lineage), tempered by the product's high-stakes legal context. Credible and precise, but confident and contemporary rather than institutional.

**Voice of the visuals:** A modern technical product you trust. Indigo brand energy, deep-navy ink, generous whitespace, restrained-but-alive motion, evidence shown plainly (citations, source excerpts, checklist provenance). Marketing surface (landing) leans more energetic; app surface stays calmer — same palette + font, different intensity.

**Do:** indigo brand accents, source-excerpt provenance beside every verdict, subtle glass/mesh, meaningful motion (150–300ms).
**Avoid (anti-patterns):** playful "toy" styling, over-saturated pink gradients, outdated skeuomorphism, hiding credentials/disclaimers, decorative-only motion, emoji as icons.

Icons: **Lucide** only (stroke 1.5–2px, one family). Never emoji as structural icons.

---

## Colors

All colors are semantic tokens. **Never** put raw hex in components — reference the token.

### Light (default)

| Role | Token | Hex |
|------|-------|-----|
| Background | `--background` | `#F6F9FC` |
| Foreground | `--foreground` | `#0D253D` |
| Card / surface | `--card` | `#FFFFFF` |
| Primary (CTA + brand) | `--primary` | `#533AFD` |
| Primary text | `--primary-foreground` | `#FFFFFF` |
| Secondary (tint surface) | `--secondary` | `#ECEBFF` |
| Accent (hover tint) | `--accent` | `#ECEBFF` |
| Muted surface | `--muted` | `#EEF3F9` |
| Muted text | `--muted-foreground` | `#475569` |
| Border / input | `--border` / `--input` | `#E3E8EE` / `#CDD6E0` |
| Focus ring | `--ring` | `#533AFD` |
| Destructive | `--destructive` | `#D6294F` |

### Dark

| Role | Hex |
|------|-----|
| `--background` | `#0A1726` |
| `--foreground` | `#EAF0F7` |
| `--card` | `#122236` |
| `--primary` | `#8B83FF` (lifted indigo, not inverted) |
| `--primary-foreground` | `#0A1726` |
| `--accent` | `#1E2747` |
| `--muted` | `#18304A` |
| `--muted-foreground` | `#A6B6C9` |
| `--border` / `--input` | `#21364E` / `#2E4865` |
| `--ring` | `#8B83FF` |

### Risk semantics (the heart of the product)

Risk is **functional color** → always paired with a **Lucide icon + text label** (WCAG `color-not-only`). Three tiers map to the checklist verdict:

| Tier | Icon | Solid | Surface | Border | Text-on-surface |
|------|------|-------|---------|--------|-----------------|
| **Cao / High** | `ShieldAlert` | `#DC2626` | `#FEF2F2` | `#FECACA` | `#991B1B` |
| **Trung bình / Medium** | `AlertTriangle` | `#D97706` | `#FFFBEB` | `#FDE68A` | `#92400E` |
| **Thấp / Low** | `ShieldCheck` | `#15803D` | `#F0FDF4` | `#BBF7D0` | `#166534` |

> **Collision rule:** the indigo brand palette is hue-distinct from all three risk colors (ruby / amber / green), so no accidental collision. Still, never place a brand accent inside a risk verdict's region — risk color always owns its region.

Dark-mode risk: use the same hue, lighter tone for text/icon on dark surfaces — high `#F87171`, medium `#FBBF24`, low `#4ADE80`; surfaces become low-alpha tints of the hue over `--card`.

All foreground/background pairs above meet **AA 4.5:1**. Verify independently for dark mode.

---

## Typography

- **Headings — Space Grotesk** (display sans). Weight 300 for large hero display (negative tracking `-0.03em`), 600–700 for section headings. Line-height 1.1–1.2. Distinctive, technical, "developer-tool / AI product" character.
- **Body / UI — Be Vietnam Pro** (Vietnamese-native sans). Weight 400 body, 500 labels, 600–700 emphasis. Line-height 1.6. Base **16px** (never smaller for body → avoids iOS auto-zoom). Designed by a Vietnamese foundry — best-in-class diacritic balance (ẫ, ệ, ợ, ỡ) for long-form contract reading.
- **Mono — IBM Plex Mono** with `font-variant-numeric: tabular-nums` for clause numbers, dates, VND amounts, and any data column (prevents layout shift).

**Type scale (px):** 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48.
**Line length:** 60–75 chars desktop, 35–60 mobile — critical for the contract-reading panes.
Load with `next/font/google` + `display: 'swap'`; preload only the two critical faces.

---

## Layout & Spacing

- **Spacing rhythm:** 4/8px system → `4 8 12 16 24 32 48 64`. Density dial 7 (standard, leans compact for data views).
- **Breakpoints:** 375 / 768 / 1024 / 1440. **Mobile-first**, no horizontal scroll.
- **App shell:** left **sidebar** (`app-sidebar`) for primary nav on ≥1024px (upload, history, templates); collapses to a top bar + drawer on mobile. Adaptive-navigation per Material.
- **Content width:** analysis/reading panes `max-w-3xl` for measure; dashboards/tables `max-w-7xl`.
- **Sticky elements** (top bar, mobile CTA) reserve safe padding so content isn't hidden.
- **Two-pane analysis layout** (desktop): source excerpt / original clause on the left, verdict + citation on the right — keeps provenance beside conclusion.

---

## Elevation & Depth

Consistent shadow scale (no random values):
- `sm` — hairline border only (data tables, inputs)
- `md` — cards, verdict cards (`0 1px 3px rgba(15,23,42,.08)`)
- `lg` — popovers, dropdowns
- `xl` — modals/sheets, with a **40–60% black scrim**

Flat + minimal; depth signals interaction layers, not decoration. Borders (not just shadow) separate surfaces so hierarchy survives in dark mode.

---

## Shapes

- `--radius: 0.5rem` base. shadcn derives `sm 0.25 / md 0.375 / lg 0.5 / xl 0.75rem`.
- Buttons, inputs, cards, badges: `rounded-md`→`rounded-lg`. Chips/pills (citations): `rounded-full`.
- One corner language everywhere; no mixing sharp + heavily rounded.

---

## Components (visual specs — behavior lives in EXPERIENCE.md)

- **`risk-verdict-badge`** — pill: tier icon + label (e.g. "Rủi ro cao"), `risk-*-surface` bg, `risk-*-border`, `risk-*-text`. Tabular if it shows a count/score.
- **`risk-verdict-card`** — card with a **left accent bar** in the tier solid color, verdict headline (EB Garamond), plain-language explanation (Lato), and an attached `citation-chip` row. Never rely on the bar color alone — icon + label repeat the tier.
- **`clause-table`** — data table, tabular-nums, sortable with `aria-sort`, low-contrast gridlines (`gray-200`), risk badge per row. Virtualize at 50+ rows.
- **`citation-chip`** — `rounded-full`, mono source ref (e.g. "Điều 12.3"), click → scrolls/opens the cited source excerpt. Keyboard-reachable.
- **`upload-dropzone`** — dashed `--border`, primary on drag-over, shows accepted types (PDF/PNG/JPG) + guest-quota hint; skeleton/progress during OCR (>1s → progressive-loading, not a bare spinner).
- **`chat-panel`** — RAG agent; assistant messages carry inline `citation-chip`s; streaming with visible in-progress state; input ≥44px height.
- **`app-sidebar`** — primary nav, active item highlighted (color + weight + indicator), destructive/logout visually separated at the bottom.
- **`disclaimer-banner`** — persistent, calm (muted surface + `Info` icon): "Công cụ hỗ trợ đánh giá sơ bộ, không thay thế luật sư." Never dismissible into oblivion; keep legal-safety copy visible.

Primary CTA: **one per screen**, filled `--primary`. Secondary actions subordinate (outline/ghost). Destructive actions use `--destructive` + confirmation dialog.

---

## Do's and Don'ts

**Do**
- Show provenance: every verdict sits beside its source excerpt + citation.
- Keep disclaimers and usage-quota messaging visible (legal-safety is a hard rule).
- Reserve red/amber/green exclusively for risk semantics; pair with icon + text.
- 150–300ms transitions, `ease-out` in / faster out; respect `prefers-reduced-motion`.
- `cursor-pointer` + visible focus ring (2–4px) on every interactive element.

**Don't**
- ❌ Playful "toy" styling or over-saturated pink gradients (indigo brand energy is fine; keep it precise).
- ❌ Any brand/accent color near a risk verdict — risk color always wins its region.
- ❌ Color-only meaning, emoji icons, placeholder-only labels.
- ❌ Overconfident legal phrasing in UI copy (voice detail → EXPERIENCE.md).
- ❌ Remove security, validation, quota, or disclaimer logic during the redesign.
