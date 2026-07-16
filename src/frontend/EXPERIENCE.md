---
# FairTerms — Experience Spine (EXPERIENCE.md)
# Owns HOW IT WORKS: information architecture, behavior, states, interactions,
# accessibility, and journeys. Cross-references DESIGN.md tokens as {token.name}.
# Peer contract to DESIGN.md — both win on conflict with any mock or import.
status: draft
version: 1
sources:
  - AGENTS.md            # product context + implemented flow
  - RULES.md             # operating + legal-safety rules
  - DESIGN.md            # visual identity (tokens referenced below)
---

# FairTerms Experience Spine

FairTerms is a **preliminary** Vietnamese real-estate contract review assistant — *not a lawyer*. Every experience decision is subordinate to that framing: show evidence, hedge conclusions, keep the disclaimer visible, protect PII.

---

## Foundation

- **Form factor:** Responsive web (Next.js 16 App Router). Primary target desktop (contract reading is a lean-in task), fully usable ≥375px.
- **UI system:** shadcn/ui + Tailwind v4. Behavioral defaults inherit from shadcn primitives; this file specifies only the FairTerms **delta**. Visual tokens live in {DESIGN.md}.
- **Auth states:** three — anonymous, **guest** (3 free uses, quota-tracked), **signed-in** (Google OAuth). Quota and disclaimer messaging are load-bearing, never removed.

---

## Information Architecture

```
/                         Landing (credibility, mission, CTA → app)
/app                      Main workspace (upload → analysis → chat)
/hop-dong-mau             Contract templates (canned example analyses)
/hop-dong-mau/[type]      A specific template's pre-run analysis
/van-ban/[docId]          Document / legal-text reference view
/fairterms/history        Analysis history (list)
  /clause/[id]            Saved single-clause analysis
  /contract/[id]          Saved full-contract analysis
  /compare/[id]           Contract comparison (re-OCR vs saved history)
/chia-se/[token]          Public shared analysis (read-only)
```

**Primary nav (app-sidebar, ≥1024px):** Upload / Workspace · History · Templates. **Secondary/bottom:** account, sign-out (visually separated per DESIGN.md). Mobile: top bar + drawer.

**Two analysis modes inside `/app`:** *ContractMode* (whole document) and *ClauseMode* (single clause). Mode is a segmented control, state preserved on back-navigation.

**Supported checklists:** `mua_ban_can_ho_chung_cu`, `cho_thue_can_ho_chung_cu`. The contract-type picker gates which checklist runs.

---

## Voice and Tone

Vietnamese, plain, calm, never alarmist. Explain risk like a knowledgeable friend, not a courtroom. (Brand *voice personality* lives in {DESIGN.md} Brand & Style; microcopy rules here.)

- **Hedge legal claims:** "Điều khoản này *có thể* bất lợi cho bạn vì…" — never "Điều khoản này vi phạm pháp luật."
- **Persistent disclaimer:** "Công cụ hỗ trợ đánh giá sơ bộ, không thay thế luật sư." Present on every analysis surface.
- **Risk labels:** "Rủi ro cao / trung bình / thấp" — the word always accompanies the {colors.risk-*} color + icon.
- **Empty/guest quota:** "Bạn còn 2/3 lượt dùng thử miễn phí. Đăng nhập để dùng không giới hạn."
- **Errors:** state cause + recovery. "Không đọc được file — thử ảnh rõ hơn hoặc PDF gốc." Never bare "Invalid input."

---

## Component Patterns (behavioral)

Visual specs → {DESIGN.md} Components. Behavior below.

- **`upload-dropzone`** — accepts PDF/PNG/JPG. On drop: validate type/size client-side → optimistic "Đang tải lên" → OCR progress. Guest: check quota *before* upload, surface remaining count. Drag-over highlights with {colors.primary}.
- **`risk-verdict-card`** — expands to reveal plain-language reasoning + `citation-chip`s. Collapsed by default in long lists; the tier (icon + label + left bar) is always visible collapsed.
- **`citation-chip`** — click/Enter opens the cited **source excerpt** inline (or scrolls the source pane into view). This is the trust mechanism — never a dead link.
- **`clause-table`** — sortable (`aria-sort`), filter by risk tier, row → opens clause detail. Virtualize ≥50 rows.
- **`chat-panel`** — RAG agent. Streams tokens; assistant answers carry inline citations. Input disabled + spinner while awaiting. Preserves scroll on new messages unless user scrolled up.
- **`disclaimer-banner`** — persistent, non-focus-stealing, muted surface. Collapsible to a line but never fully removable.
- **compare view** (`/fairterms/history/compare`) — re-OCR an upload, re-run `evaluate_clause`, show **delta verdict** vs a saved history item. No version chain in v1.

---

## State Patterns

Every async surface defines all five states explicitly:

| State | Behavior |
|-------|----------|
| **Empty** | Guidance + primary action (e.g. history empty → "Chưa có phân tích nào — tải hợp đồng đầu tiên"). Never a blank pane. |
| **Loading** | >1s → skeleton/shimmer (OCR, analysis, history). Never a bare long spinner. Progress for multi-step OCR. |
| **Partial/streaming** | Chat + analysis stream incrementally; show what's ready, mark the rest in-progress. |
| **Error** | Cause + recovery path (retry / edit / different file). `role="alert"`. Timeouts get a retry. |
| **Success** | Brief confirmation (checkmark/toast, auto-dismiss 3–5s). |

Guest-quota exhausted is a **first-class state**: block the action, explain, CTA to sign in — do not silently fail.

---

## Interaction Primitives

- **Navigation:** back is predictable, restores scroll + mode + filters (`state-preservation`). Deep links to every analysis/share URL.
- **Motion:** 150–300ms, `ease-out` entering / faster exiting; only 1–2 elements animate per view. Respect `prefers-reduced-motion`. Motion signals cause→effect (verdict card expand, citation open), never decoration.
- **Feedback:** visual response within 100ms on tap/click; buttons disable + spin during async; destructive actions confirm.
- **Forms:** validate on blur, error below field, first invalid field auto-focused on submit, semantic input types.

---

## Accessibility Floor (behavioral)

Visual contrast is covered in {DESIGN.md}; behavior here.

- Full keyboard path through upload → analysis → citation → chat. Tab order matches visual order.
- Icon-only controls carry `aria-label`. Risk conveyed by icon + text, never color alone.
- `citation-chip` and chart data points are keyboard-reachable (not hover-only).
- Focus moves to main content region on route change; focus visible (2–4px ring, {colors.ring}).
- Streaming chat + toasts use `aria-live="polite"`; errors `role="alert"`.
- Supports Dynamic Type / browser zoom without layout break; no horizontal scroll at 375px.

---

## Key Flows

### Flow 1 — Minh reviews a rental contract before signing (core journey)
Minh, a first-time renter, lands on `/`, reads the credibility hero, clicks **"Phân tích hợp đồng"**. Not ready to sign up, he takes the **guest** path (sees "3 lượt miễn phí"). He drags a phone photo of his lease into `upload-dropzone`. OCR runs with a progress skeleton (~seconds). He picks contract type **"Cho thuê căn hộ chung cư"**; the checklist runs. The workspace fills: a `clause-table` with per-row risk badges, sorted so **red (cao)** floats to top.
**Climax beat:** Minh clicks a high-risk clause. The `risk-verdict-card` expands — plain-language reason ("Điều khoản cho phép chủ nhà tăng giá bất kỳ lúc nào…") sitting *beside the exact original excerpt* via a `citation-chip`. He finally *sees why*, not just a color. He opens `chat-panel` and asks "Tôi có thể thương lượng điều này không?" — the RAG agent answers with a cited legal reference. He signs in to save it.

### Flow 2 — Lan compares a revised draft against her saved analysis
Lan already analyzed a purchase contract (in History). The landlord sent a revised draft. From `/fairterms/history/contract/[id]` she chooses **"So sánh"**, re-uploads the new file → re-OCR → re-run. `/fairterms/history/compare/[id]` shows a **delta verdict**: which clauses got riskier/safer.
**Climax beat:** a clause that was **green** last time is now **red** — the delta is unmistakable (icon + label + color + "đã thay đổi"), so Lan knows exactly what the revision slipped in.

### Flow 3 — Guest hits the quota wall
On the 4th attempt, upload is blocked *before* processing. A calm state explains "Bạn đã dùng hết 3 lượt thử" with a single primary CTA to sign in with Google — no dead end, no lost file context where avoidable.

---

## Responsive & Platform

- Breakpoints 375 / 768 / 1024 / 1440. Sidebar ≥1024px; drawer + top bar below.
- Two-pane analysis (source ↔ verdict) stacks vertically on mobile, source-excerpt-first.
- Tables reflow to cards on narrow screens; risk badge stays primary.
- Sticky top bar / mobile CTA reserve safe padding; long contract text keeps 35–60 char measure on mobile.

---

## Inspiration & Anti-patterns

**Lean toward:** compliance dashboards, modern legal-tech, fintech trust surfaces — evidence-forward, calm, provenance beside every claim.
**Avoid:** gamified risk scores, alarmist red everywhere, AI-chat-as-only-interface (chat augments the structured analysis, never replaces it), dismissing the disclaimer, color-only risk signaling.
