# FairTerms Landing — Redesign Plan (Deep-tech Indigo)

> **Hướng đã chốt:** Deep-tech Indigo — giữ hệ indigo `#533afd` hiện có, nâng chất "công nghệ / chuyên nghiệp" theo ngôn ngữ SaaS hiện đại (Linear / Stripe / Vercel).
> **Mục tiêu cảm nhận:** sắc, sạch, mượt, đáng tin — *không* rơi vào "AI-toy" (gradient tím lòe loẹt, motion trang trí).
> **Nguyên tắc bất biến:** giữ toàn bộ nội dung pháp lý, disclaimer, risk-color = màu chức năng luôn kèm icon + text.

---

## 0. Hợp thức hóa với DESIGN.md (LÀM TRƯỚC — nếu không sẽ bị "sửa ngược")

DESIGN.md hiện quy định navy `#1E3A8A` + EB Garamond, và liệt "AI purple/pink gradients" vào **AVOID**. Landing lại dùng indigo. Cần chốt một trong hai:

- **Cách A (khuyến nghị):** thêm mục "Landing marketing surface — exception" vào DESIGN.md, ghi rõ landing dùng hệ indigo Stripe, EB Garamond/navy chỉ áp cho **app surface** (dashboard, phân tích). Tách rõ 2 bối cảnh: *marketing* (indigo, năng động) vs *product* (navy, uy tín). Đây là mô hình rất phổ biến và hợp lý.
- **Cách B:** đổi hẳn DESIGN.md sang indigo cho toàn hệ (rủi ro hơn — app pháp lý nên giữ navy khi người dùng ra quyết định).

→ **Đề xuất: A.** Ranh giới rõ: landing "bán", app "được tin cậy".

---

## 1. Design tokens — tinh chỉnh (không đại phẫu)

File: `landing.css` block `:root` / `[data-theme="dark"]`.

**Giữ nguyên:** indigo scale, radius, breakpoints, reveal infra.

**Nâng cấp:**
| Hạng mục | Hiện tại | Đổi thành | Lý do |
|---|---|---|---|
| Shadow | 4 mức có sẵn | Chuẩn hóa dùng đúng 4 mức, bỏ mọi shadow inline tùy tiện | Elevation nhất quán = tín hiệu "cao cấp" |
| Accent "electric" | chưa có | thêm `--electric: #6366f1`/`--cyan-glow` cho hero mesh + đường truy vết | Điểm nhấn "tech" có kiểm soát |
| Surface tint | `--surface-2` phẳng | thêm 1 layer `--surface-glass: rgba(...)` cho card nổi trên band tối | Chiều sâu |
| Grain | không | thêm `--noise` (data-URI SVG noise ~3% opacity) cho band tối | Tránh bệt màu, trông đắt |
| Heading weight | 300 toàn cục | giữ 300 cho hero, nhưng H2 section 400–500 | 300 quá mảnh ở cỡ nhỏ → thiếu "chắc" |

**Kiểm tra bắt buộc:** tương phản dark-mode độc lập (AA 4.5:1) — `--ink-soft` trên `--paper` dark cần re-check.

---

## 2. Hero — khu vực tác động cao nhất

Cấu trúc giữ nguyên (`hero-mesh`, `hero-mock-wrap`, `mock`). Nâng cấp:

1. **Mesh nền sống động, tinh tế**
   - Thay `hero-mesh` tĩnh bằng 2–3 blob gradient indigo/electric drift rất chậm (transform, không animate màu).
   - Thêm lớp lưới điểm (dot-grid) mờ phía sau mockup → tín hiệu "hệ thống / kỹ thuật".
   - Bọc `@media (prefers-reduced-motion: no-preference)`.

2. **Mockup "sống" — biến ảnh tĩnh thành demo mini** (điểm ăn tiền nhất)
   - Khi mockup vào viewport: các `mock-para` reveal tuần tự stagger 60ms; `mock-traffic` đèn đỏ bật sáng cuối cùng; `mock-score` "3 cảnh báo" count-up.
   - Badge rủi ro (`rbadge cao`) fade+scale nhẹ khi xuất hiện.

3. **Đường "truy vết" vẽ động** (SVG stroke-dashoffset)
   - Nối từ câu đỏ trong `mock-doc` → thẻ `mock-ana` bên phải.
   - Đây là *tính năng lõi* của sản phẩm — show ngay hero là đắt giá nhất.

4. **Trust strip dưới CTA**
   - Chip mono: `BLDS 2015` · `Luật Nhà ở 2023` · `Luật Công chứng` → nền tảng pháp lý thật.
   - (Nếu có số liệu thật) count-up "X điều khoản đã rà soát".

5. **CTA:** giữ 1 primary duy nhất; secondary (Xem tính năng) thành ghost/underline subtle.

---

## 3. Chất liệu & chiều sâu (toàn trang)

- **Nav glass:** đã có `backdrop-blur(14px)`. Thêm: khi `scrolled`, nền tăng opacity + shadow-sm rất nhẹ → tách khỏi nội dung.
- **Feature cards:** hover nâng `translateY(-2px)` + border chuyển `--primary` tint + shadow-md. Icon "vẽ" stroke (stroke-dashoffset) khi reveal.
- **Band tối:** phủ `--noise` + 1 blob glow góc → tránh phẳng bệt.
- **Border hairline + tint** thay vì shadow nặng ở data-heavy sections (comparison, pricing).

---

## 4. Motion system (có ý nghĩa, không trang trí)

Dựa trên `.reveal` sẵn có. Chuẩn hóa:
- **Stagger:** feature grid & showcase rows reveal lệch 40–50ms/item (thêm `transition-delay` theo `--i` inline, hoặc nth-child).
- **Timing:** 150–300ms micro, ≤400ms transition. `ease-out` vào / exit nhanh hơn ~65%.
- **Chỉ animate** `transform`/`opacity`. Không animate width/height/top/left.
- **Accordion FAQ:** hiện dùng `maxHeight: 500` cố định → dễ giật/cắt. Đổi sang đo `scrollHeight` thật hoặc grid-rows `0fr→1fr`.
- Tất cả bọc `prefers-reduced-motion` (đã có sẵn cho reveal — mở rộng cho mesh/stagger/count-up).

---

## 5. Section-by-section

| Section | Việc cần làm |
|---|---|
| **Value (band-dark)** | Thêm noise + glow; value-list icon animate; giữ contrast trắng AA. |
| **Features grid** | Hover polish + icon stroke-draw; stagger reveal; đồng bộ icon stroke-width 1.7. |
| **How it works** | Chuyển 2 `show-row` thành **timeline có đường nối vẽ động** (Upload→Phân tích→Trích dẫn). Trace-line thêm micro-highlight câu gốc. |
| **Comparison** | Cột `us` (FairTerms) nổi bật: nền indigo tint, viền, sticky header khi scroll bảng dài; icon check/x tăng tương phản; hàng hover. |
| **Security** | Thêm hàng **trust badges** dạng huy hiệu SVG (mã hóa · ẩn danh PII · không train); giữ 3 card. |
| **Pricing** | Card free hơi trống → thêm ghost card "Pro — sắp có" để tạo chiều + neo giá trị; micro-detail trên card free. |
| **FAQ** | Fix accordion height; chevron xoay mượt; item hover. |
| **CTA band** | Mesh động subtle; nút "Rà soát ngay" hiện đang `preventDefault` → **sửa để link thật tới `/app`** (bug UX). |
| **Footer** | Giữ; đảm bảo disclaimer luôn hiện (hard rule). |

---

## 6. Accessibility & Performance (guardrails — không được bỏ)

- [ ] Tương phản AA 4.5:1 cả light & dark (đặc biệt `--ink-soft`, text trên band-dark).
- [ ] Focus ring rõ 2–4px mọi element tương tác (nav, btn, faq-q, cards clickable).
- [ ] Risk color luôn kèm icon + text (không dựa màu).
- [ ] `prefers-reduced-motion`: tắt mesh drift, count-up, stagger, trace-draw.
- [ ] Mesh/blob = CSS/SVG inline, không ảnh nặng; lazy phần dưới fold.
- [ ] Không CLS: mockup & mesh reserve space (aspect-ratio).
- [ ] Test 375 / 768 / 1024 / 1440 + landscape.
- [ ] `cursor-pointer` mọi clickable; nav mobile drawer hoạt động.

---

## 7. Thứ tự thực thi (phases)

1. **Phase 0** — Chốt DESIGN.md exception (mục 0). *[cần bạn duyệt]*
2. **Phase 1** — Tokens + shadow/elevation chuẩn hóa + noise/electric (mục 1). Nền tảng.
3. **Phase 2** — Hero: mesh động + mockup sống + trace-draw + trust strip (mục 2). *Ấn tượng đầu.*
4. **Phase 3** — Motion stagger + card polish + FAQ fix + CTA link bug (mục 3,4).
5. **Phase 4** — Comparison + Security + How-it-works timeline + Pricing (mục 5).
6. **Phase 5** — A11y/perf pass + responsive test (mục 6).

Mỗi phase là một PR/commit riêng, verify trực quan trước khi sang phase sau.

---

## Rủi ro / cần xác nhận
- Số liệu "X điều khoản đã rà soát" — có số thật không? Nếu không, bỏ (tránh phóng đại).
- Gói "Pro sắp có" — có kế hoạch thật không? Nếu không, chỉ để ghost placeholder mờ.
- Nút CTA `preventDefault` ở CTA band: xác nhận đây là bug (nên trỏ `/app`).
