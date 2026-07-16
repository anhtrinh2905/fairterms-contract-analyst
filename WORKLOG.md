### [2026-07-08] Trang quản lý cache Redis cho Admin Portal
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Thêm tính năng xem/xóa cache Redis cho admin, dựa trên lớp cache đã có (`app/services/cache.py`, namespace `checklist:clause`):
- **Backend:** `cache.py` thêm `count_namespace_keys`/`flush_namespace` (SCAN + UNLINK theo batch, không dùng `KEYS` để tránh block Redis production) và `get_redis_stats` (memory, uptime, `keyspace_hits`/`keyspace_misses` từ Redis `INFO`). `admin.py` thêm `GET /admin/cache/overview` và `POST /admin/cache/{namespace}/flush` (bắt buộc gửi đúng tên namespace để xác nhận xóa, theo đúng convention `require_admin_token` + Pydantic response model có sẵn). Test mới `tests/test_admin_cache.py` (7 ca, mirror `test_admin_langsmith.py`).
- **Frontend:** `lib/api/client.ts`/`types.ts` thêm `adminGetCacheOverview`/`adminFlushCacheNamespace` + type khớp 1:1 response backend; `lib/auth/admin-audit.ts` + proxy `app/api/admin/[...path]/route.ts` thêm action `FLUSH_CACHE` vào audit log. Trang mới `app/admin/cache/page.tsx` — thẻ trạng thái Redis (ghi rõ hit/miss là toàn Redis instance, không tách theo namespace), bảng namespace (nhãn, TTL, số key), nút "Xóa cache" mở modal bắt gõ đúng tên namespace để xác nhận (component tự viết, không thêm thư viện ngoài). Thêm `.adm-btn--danger` + `.adm-modal-*` vào `admin.css` (trước đó admin panel chưa có pattern nút nguy hiểm/modal xác nhận nào). Đăng ký mục "Quản lý Cache" vào sidebar + Quick Links `/admin`; sau đó gộp "Quản lý Cache" và "Giám sát LangSmith" từ nhóm "Phát triển" sang nhóm "Quản lý" trong sidebar theo yêu cầu.
**Why:** Đã triển khai cache Redis cho `evaluate-clause` nhưng chưa có cách nào xem/xóa cache thủ công ngoài đổi `PROMPT_VERSION` trong code; cần công cụ vận hành an toàn (có xác nhận, có audit log) cho admin khi cần buộc tính lại cache.
**Outcome:** `pytest tests/test_admin_cache.py` 7/7 pass; `tsc --noEmit` và `npm run lint` sạch. Verify route thật bằng `curl` với `ADMIN_API_TOKEN` thật — Redis đang có 27 key trong `checklist:clause`, hit-rate 43.75%. Verify trang render qua `NEXT_PUBLIC_MOCK_ADMIN=true` tạm thời (đã revert lại `false` sau khi test) vì môi trường không có chromium-cli/Playwright. **Chưa làm:** chưa click-test trực tiếp modal xác nhận trong trình duyệt thật (chỉ verify SSR + logic disable/enable qua code review).

---

### [2026-07-08] Redesign IA app FairTerms: Tổng quan + workspace riêng từng công cụ, thêm so sánh hợp đồng mẫu
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Viết lại `FairTermsApp.tsx` (app shell v3) theo `LANDING_REDESIGN_PLAN.md`, chuyển từ dashboard gộp "Dự án" sang Tổng quan + workspace riêng cho từng công cụ:
- **Sidebar tách riêng (`AppSidebar.tsx`, mới):** rút `LogoMark`, `QuotaBadge`, user-settings popup ra khỏi `FairTermsApp.tsx` để dùng chung giữa app shell (`/app`) và các trang standalone (trang chi tiết so sánh lịch sử). `View` đổi `"projects"` → `"overview"`, thêm view `"templates"`/`"compare"`.
- **`FairTermsApp.tsx`:** thêm `relativeTime()` ("Hôm nay"/"Hôm qua"/"N ngày trước"), `deriveTitle()`/`deriveSubtitle()` gộp logic đặt tên hàng lịch sử dùng chung Tổng quan + từng workspace; mỗi công cụ (điều khoản/hợp đồng/so sánh) có lịch sử riêng + nút "Phân tích mới" thay vì một danh sách "Dự án" chung.
- **So sánh hợp đồng mẫu (`hop-dong-mau/template-compare.ts`, mới):** soạn tay kết quả so sánh dựng sẵn cho cặp "mua-ban" (gốc) → "mua-ban-v2" (đã sửa) dựa trên `contracts.ts`/`template-analysis.ts`, phát lại qua `CompareMode` bằng prop `templateCompareId` — không gọi backend, minh hoạ tính năng so sánh ngay ở trang Hợp đồng mẫu.
- **`CompareMode`/`ClauseMode`/`ContractMode`:** `CompareMode` nhận `templateCompareId` để nhảy thẳng stage `"result"` với dữ liệu mẫu, đổi icon `Icon.copy` → `Icon.compare` (mới, cùng `Icon.contract`/`grid`/`trending` trong `icons.tsx`); `ClauseMode` thêm nút back tuỳ chọn + bọc kết quả trong `.ft-result-scope`; bỏ nút "Quay lại" thừa trong `UploadStage` của `ContractMode`.
- **`hop-dong-mau/page.tsx` + `TemplatesView.tsx`:** chuyển sang component shadcn (`Card`, `Badge`, `Button`, `Separator`) + icon `lucide-react`, bỏ SVG icon viết tay (`DocIcon`/`ShieldIcon`) và import `landing.css` không còn cần.
- **Trang so sánh lịch sử `history/compare/[id]/page.tsx`:** bọc `SessionProvider` + render `AppSidebar` giống app shell (trước đây trang đứng riêng không có sidebar); điều hướng sidebar trên trang standalone chuyển hướng về `/app`.
- **Dọn dẹp:** xoá route demo tạm `(demo)/risk-card-preview/page.tsx`; sửa `admin.css` — đổi `.adm-layout` từ `min-height: 100vh` + `position: sticky` sang `height: 100vh` + `overflow: hidden`/cuộn riêng từng cột (sticky vỡ vì rule `overflow-x: hidden` toàn cục trên `html/body` âm thầm biến `overflow-y` của `body` thành `auto` mà không giới hạn chiều cao, khiến sticky mất mốc viewport thật).
**Why:** IA cũ gộp mọi lịch sử vào một "Dự án" khiến khó phân biệt điều khoản/hợp đồng/so sánh khi danh sách dài; tách sidebar để trang so sánh lịch sử (trước đứng riêng, không có điều hướng) dùng lại được khung app. Trang Hợp đồng mẫu cần demo tính năng so sánh mới mà không tốn quota/backend.
**Outcome:** 18 file thay đổi (+2.623/-1.473 dòng). App shell chạy Tổng quan + 3 workspace (điều khoản/hợp đồng/so sánh) với lịch sử + nút phân tích mới riêng từng cái; trang Hợp đồng mẫu có nút xem ví dụ so sánh chạy client-side thuần. **Chưa làm:** chưa kiểm tra lại toàn bộ luồng trong trình duyệt sau đổi IA (chỉ review code); chưa dọn `landing.css` import thừa ở nơi khác nếu còn.

---

### [2026-07-07] Landing page: trust strip, 3-step flow, trust badges; bỏ chặn click nút "Rà soát ngay"
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Bổ sung các khối tín nhiệm và làm rõ luồng sản phẩm trên `Landing.tsx`:
- **Trust strip ở hero:** dải chip "Căn cứ pháp lý" (BLDS 2015, Luật Nhà ở 2023, Luật Công chứng) — số liệu thật (văn bản luật hệ thống trích dẫn), không phải metric bịa.
- **3-step flow:** khối "Tải hợp đồng → AI soi điều khoản → Trích dẫn truy vết" khớp đúng luồng sản phẩm thật, chèn trước phần "01 · Truy vết".
- **Trust badges cuối trang:** "Mã hóa khi truyền & lưu trữ", "Ẩn danh PII trước phân tích", "Không dùng để huấn luyện".
- **Sửa lỗi tương tác:** bỏ `onClick preventDefault` chặn nút "Rà soát ngay" (link `/app` trước đó không bấm được); bỏ animation `maxHeight` cứng (500px) của FAQ answer gây cắt nội dung dài, để CSS tự xử lý.
**Why:** Landing cũ thiếu tín hiệu tin cậy cụ thể (chỉ có tuyên bố chung chung) và có nút CTA chính bị vô hiệu hoá nhầm từ bản demo trước.
**Outcome:** 3 file thay đổi (+216/-22 dòng), chỉ sửa `Landing.tsx` + CSS liên quan. **Chưa làm:** deferred theo kế hoạch redesign — count-up numbers, hero-trace animation, pricing-ghost (xem `LANDING_REDESIGN_PLAN.md`).

---

### [2026-07-07] Đổi font chính: EB Garamond/Lato → Space Grotesk/Be Vietnam Pro
**Type:** decision
**Who:** TRINH THI LAN ANH
**What:** Thay cặp font heading/body trong `layout.tsx`:
- Heading: `EB_Garamond` → `Space_Grotesk` (`--font-space-grotesk`, wire vào `--font-display`/`--font-heading`).
- Body: `Lato` → `Be_Vietnam_Pro` (`--font-be-vietnam-pro`, wire vào `--font-body`/`--font-sans`) — chọn vì thiết kế riêng cho tiếng Việt, dấu tốt hơn + dễ đọc văn bản dài.
- Bỏ hẳn `Inter` (trước đây giữ lại cho trang chưa migrate khỏi CSS cũ).
- Đồng bộ token màu/spacing giữa `DESIGN.md`, `globals.css`, `fairterms.css`, `landing.css` cho khớp hệ font mới.
**Why:** Cặp EB Garamond/Lato (chọn ở commit trước) không tối ưu cho tiếng Việt bằng Be Vietnam Pro; Space Grotesk giữ được "chất kỹ thuật" (techy) phù hợp sản phẩm AI hơn serif truyền thống.
**Outcome:** 5 file thay đổi (+145/-140 dòng). Font hệ mới build được qua `next/font/google`. **Ghi nhớ:** đây là quyết định cuối — hệ font hiện tại (Space Grotesk + Be Vietnam Pro + IBM Plex Mono) là canonical, không phải bản EB Garamond/Lato ở commit trước đó.

---

### [2026-07-07] Chuyển hệ CSS sang Tailwind v4 + shadcn/ui, khởi tạo DESIGN.md
**Type:** decision
**Who:** TRINH THI LAN ANH
**What:** Đổi nền tảng styling của frontend từ Vanilla CSS sang Tailwind CSS v4 + shadcn/ui (ngoại lệ được duyệt so với quy tắc "không Tailwind/shadcn" cũ trong `AGENTS.md`/`RULES.md` — do yêu cầu redesign toàn diện):
- **`DESIGN.md` (mới, 210 dòng):** design spine — bảng màu (navy `#1E3A8A` + gold accent, risk semantics đỏ/vàng/xanh), typography ban đầu EB Garamond/Lato/IBM Plex Mono, spacing 4px, danh sách component chuẩn (risk-verdict-badge, clause-table, citation-chip, upload-dropzone, chat-panel, app-sidebar...).
- **Cài đặt:** `tailwindcss` v4 + `postcss.config.mjs`, `shadcn` (`components.json`), thêm `components/ui/button.tsx` đầu tiên, `lib/utils.ts` (`cn()`).
- **`globals.css`:** viết lại theo token Tailwind v4 (`@theme`), map 1:1 sang biến shadcn.
- **`layout.tsx`:** thêm 3 font qua `next/font/google` (EB Garamond, Lato, IBM Plex Mono) song song `Inter` cũ (giữ cho trang chưa migrate).
- **`.mcp.json` (mới):** cấu hình MCP server hỗ trợ (component search/design).
- **Khác:** `EXPERIENCE.md` (mới) ghi UX pattern; `LANDING_REDESIGN_PLAN.md` (mới) kế hoạch redesign landing; route demo `(demo)/risk-card-preview` để so sánh `RiskCard` qua các mức rủi ro.
**Why:** Cần redesign UI toàn diện đúng brand FairTerms; Tailwind v4 + shadcn giúp có sẵn thư viện component/token thay vì viết CSS tay như trước, đổi lại phải nới quy tắc cũ của dự án.
**Outcome:** 17 file thay đổi (+7.104/-172 dòng, phần lớn là `package-lock.json`). Nền tảng Tailwind/shadcn cài đặt xong, `DESIGN.md` là nguồn chân lý cho các bước redesign tiếp theo (font/màu ở commit sau còn đổi tiếp).

---

### [2026-07-08] Hoàn thiện Admin Portal FairTerms (deploy-ready)
**Type:** task
**Who:** Nguyễn Thanh Anh Quân -2A202600892
**What:** Hoàn thiện phân hệ Admin Portal để sẵn sàng deploy — đồng bộ brand FairTerms, bảo mật 2 lớp, audit log đầy đủ, chuẩn hóa env:
- **Brand UI:** đổi toàn bộ nhãn `HopDongAI` → `FairTerms` trên layout/sidebar/dashboard; sidebar dùng `LogoMark` (logo light/dark) giống trang user.
- **Bảo mật & proxy:** route `/api/admin/[...path]` proxy tới backend với `x-admin-token`; kiểm tra session admin (`ADMIN_EMAILS`, `tier: admin`); helper SSR `lib/admin/server-backend.ts` gọi `BACKEND_URL_INTERNAL` + `ADMIN_API_TOKEN`.
- **Audit log:** `lib/auth/admin-audit.ts` + ghi tự động qua proxy cho checklist/RAG/AI config; users page dùng helper chung; dashboard hiển thị 10 log gần nhất.
- **Dashboard (FR5):** thêm KPI rà soát hôm nay, tỷ lệ thành công; sửa fetch stats backend (không còn gọi public URL thiếu session).
- **Backend admin API:** `runtime_config.py` lưu cấu hình mô hình vào `logs/admin_runtime_config.json`; `POST /admin/rag/ingest-text` (dán văn bản); ping OpenAI/Gemini thật; load runtime config lúc startup.
- **Frontend admin pages:** RAG tab upload + paste; checklist editor thêm `vi_the` + `protected_party`; AI config ping API thật; chuẩn hóa env admin trong `.env.example`, `deploy/.env.dev.example`, `deploy/.env.main.example`, docker-compose dev/main/local.
**Why:** Admin portal cần đủ tính năng vận hành (user/quota, checklist, RAG, AI config, giám sát) và cấu hình deploy rõ ràng trước khi đưa lên dev/main; brand phải khớp FairTerms phía user.
**Outcome:** `npm run lint` pass (0 errors); `npm run build` pass, tất cả `/admin/*` là Dynamic (ƒ). Backend pytest local bị chặn policy máy dev (`.venv`); cần CI chạy `pytest`. Deploy cần set `ADMIN_EMAILS`, `ADMIN_API_TOKEN` (shared), `BACKEND_URL_INTERNAL` trên frontend container.

### [2026-07-06] OCR BĐS tự động: sniff loại HĐ, prompt riêng, schema mở rộng, sửa lỗi response
**Type:** task
**Who:** Nguyễn Thanh Anh Quân -2A202600892
**What:** Cải thiện độ chính xác OCR/structuring cho hợp đồng BĐS (đất, nhà, QSDĐ) **không yêu cầu user chọn loại HĐ** — upload một lần, backend tự xử lý:
- **Auto-detect loại HĐ (`contract_kind.py`):** sniff từ text trang đầu (PDF/DOCX số qua `extract_contract_text_snippet`) + tên file → `mua_ban_bds`, `mua_ban_dat`, `cho_thue_bds`, `can_ho_chung_cu`, `bds_generic`; trả `detected_contract_kind`, `detection_confidence`, `detection_source` trong `timings_ms`.
- **Prompt OCR theo loại:** `contract_ocr_system_bds.txt` (thửa đất, GCN, giá bán, tiến độ TT, công chứng); căn hộ giữ `contract_ocr_system.txt`; routing tự động trong `gemini_ocr_service.py`.
- **Tham số scan:** mặc định `GEMINI_PDF_DPI=200`; ảnh upload `autocontrast`; retry im lặng (higher quality) khi `ocr_field_validation` nghi ngờ CCCD/số thửa đất/số tiền.
- **Structuring BĐS:** mở rộng `ContractInfo` — `sale_price`, `payment_schedule`, `certificate_*`, `thua_dat_so`, `to_ban_do_so`, `muc_dich_su_dung`; regex local + gap detection BĐS trong `contract_local_structuring.py`; `extract_preamble_slice` theo `contract_kind`; metadata prompt cập nhật; OCR route truyền `contract_kind` sang structuring.
- **Frontend:** `resolveLoaiHopDong()` dùng `detected_contract_kind` từ `timings_ms`; hiển thị giá từ `sale_price` hoặc `rent_price`; types mở rộng optional fields.
- **Đo lường nội bộ:** `scripts/eval_ocr_bds.py` + thư mục `tests/golden/ocr_bds/`; test `test_contract_kind.py`, `test_bds_ocr_structuring.py`.
- **Sửa lỗi production (Docker log):** `ContractStructuredOCRResponse` crash vì `timings_ms: dict[str, int | str]` không chấp nhận `detection_confidence` (float) và `ocr_warnings` (list) → đổi sang `dict[str, Any]` ở `ocr.py` + `gemini_ocr_service.py`.
**Why:** Pipeline OCR/structuring trước đó thiên về căn hộ chung cư (prompt, regex địa chỉ, schema `rent_price` + bảng thiết bị); HĐ mua bán đất/nhà cần trường pháp lý khác (thửa đất, GCN, tiến độ thanh toán). Ràng buộc UX: không thêm wizard/form — mọi định hướng nằm ở server.
**Outcome:** Luồng upload không đổi; backend tự sniff + chọn prompt. Unit test BĐS/kind pass (`python -m pytest`). Fix `timings_ms` xác nhận model chấp nhận payload mới. **Chưa làm:** golden set HĐ BĐS thật (cần file mẫu ẩn danh để đo field F1); checklist riêng `mua_ban_nha`/`mua_ban_dat` (hiện map sang checklist căn hộ gần nhất); re-OCR multi-page scan khi validation fail (chỉ retry single-page/image).

### [2026-07-06] Chia sẻ kết quả phân tích hợp đồng (link public read-only)
**Type:** task
**Who:** Nguyễn Thanh Anh Quân -2A202600892
**What:** Thêm tính năng tạo link chia sẻ kết quả phân tích hợp đồng (kiểu Google Drive “ai có link đều xem”), read-only, PII đã mask:
- **DB (`prisma/schema.prisma` + migration `20260703090000_add_analysis_share`):** bảng `AnalysisShare` — `token` unique (192-bit base64url), `ownerId`, `snapshot` JSONB, `viewCount`, `expiresAt`, `revokedAt`; index theo owner.
- **API Next.js:** `POST /api/share` (chỉ user Google đăng nhập) — validate snapshot, giới hạn 100 link active/owner, chọn hạn 7/30/90 ngày hoặc không hết hạn; `GET /api/share` — danh sách link của owner; `GET /api/share/[token]` — public, trả snapshot; `DELETE /api/share/[token]` — thu hồi (chỉ owner).
- **Snapshot (`lib/analysis/share-snapshot.ts`):** `ContractShareSnapshot` v1 — toàn bộ `ContractData` + `phanTich` + `summary` + `checklistCoverage` tại thời điểm bấm chia sẻ; `buildContractSnapshot()` / `snapshotToPrefilledResult()` / `isContractShareSnapshot()`.
- **Trang public `/chia-se/[token]`:** server component load DB qua `getActiveShareByToken()` (bỏ qua nếu thu hồi/hết hạn/snapshot hỏng); `robots: noindex`; UI **tái sử dụng `ContractMode`** với `readOnly` + `prefilledResult` — cùng layout phân tích (RiskDashboard, 5 Cục, `ClauseWorkspace`, `ContractDocPanel` bên phải), không chat/upload/nút chia sẻ lại.
- **UI tạo link (`ShareDialog.tsx`):** hộp thoại trong `ContractMode` sau khi phân tích xong (chỉ user authenticated, không guest/demo); copy URL `origin/chia-se/{token}`; nút “Dừng chia sẻ”.
- **Tách `ContractDocPanel.tsx`:** panel hợp đồng gốc (zoom, highlight truy vết) dùng chung giữa app và trang share.
- **Sửa lỗi runtime:** trang share 500 vì `ContractMode` gọi `useSession` ngoài `SessionProvider` → bọc `SessionProvider` trong `SharedAnalysisView`, tách `ContractShareButton` (auth chỉ khi cần nút Chia sẻ); chặn `readOnly` gọi `POST /api/analysis/contract` (403 không cần thiết).
**Why:** Người dùng cần gửi kết quả rà soát cho luật sư/đối tác mà không bắt họ đăng nhập; snapshot bất biến đảm bảo nội dung chia sẻ không đổi khi user tiếp tục chỉnh trong app; tái dùng `ContractMode` tránh hai UI lệch nhau.
**Outcome:** Luồng end-to-end chạy local Docker: tạo link → `GET /chia-se/{token}` 200; link public (không cần auth), token khó đoán, có thu hồi/hết hạn. Migration chạy qua `docker-entrypoint.prod.sh`. Deploy cần merge branch `redis` + `AUTH_URL`/`NEXT_PUBLIC_APP_URL` đúng domain. **Lưu ý:** link tạo trước khi thêm `checklistCoverage` vào snapshot có thể thiếu mục “Điều khoản bắt buộc còn thiếu” — tạo lại link sau deploy. **Chưa làm:** chia sẻ chế độ clause-only; rate-limit view; analytics chi tiết; auth bắt buộc để xem (hiện cố ý public qua token).
### [2026-07-05] Trích dẫn pháp lý bấm được: xem toàn văn + tải PDF
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Thêm nút "Xem trong văn bản đầy đủ" vào popup căn cứ pháp lý (`LawPopover`), mở tab mới sang trang tra cứu toàn văn bản luật, có thể tải về PDF:
- **Backend — registry văn bản (`app/rag/documents.py`):** quét `app/rag/data/*.md` lúc khởi động, parse frontmatter, lookup an toàn theo `id` frontmatter hoặc tên file (chỉ dùng làm khoá dict, không ghép path từ input → chặn path traversal). 3 endpoint mới trong `rag.py`: `GET /rag/documents` (danh sách metadata), `GET /rag/documents/{doc_id}` (nội dung đầy đủ), `GET /rag/documents/{doc_id}/download` (PDF).
- **Backend — render PDF (`app/rag/pdf_render.py`):** parse markdown (heading `#`/`##`/`###`) thành HTML tối giản rồi render qua `fitz.Story` — `pymupdf` đã có sẵn trong dependency nên không thêm thư viện PDF mới (tránh weasyprint/wkhtmltopdf cần lib hệ thống nặng, khó cài ổn định trong Docker). Font nhúng sẵn của PyMuPDF (Charis SIL/Noto Serif) hỗ trợ đủ dấu tiếng Việt, không cần cài font hệ thống. Cache bằng `lru_cache` theo `doc_id`; benchmark Luật Đất đai (706KB, 187 trang) render 0.62s.
- **Frontend — trang `/van-ban/[docId]`:** client component `VanBanView.tsx` fetch nội dung từ backend, hiển thị mục lục theo Chương/Điều, tự scroll + highlight đúng Điều/Khoản được trích dẫn (`?dieu=472&khoan=1`), badge trạng thái hiệu lực, nút tải PDF, disclaimer pháp lý.
- **Frontend — resolver (`lib/api/legal-doc-resolver.ts`):** map citation (RAG có `source_file`, hoặc citation chỉ có label như `"BLDS 2015 Điều 472"` từ template/chat) sang link trang văn bản qua bảng alias tên luật + regex bắt Điều/Khoản; ẩn nút khi không resolve được nguồn.
- **Sửa lỗi networking trong Docker:** bản đầu tiên viết trang `/van-ban` là Server Component fetch backend lúc render trên server → lỗi trong stack Docker vì `NEXT_PUBLIC_BACKEND_URL=http://localhost:8010` chỉ đúng khi chạy từ trình duyệt (cổng map ra host), sai khi chạy từ bên trong container frontend (localhost trỏ vào chính nó). Chuyển sang fetch client-side, đúng pattern `frontend.md` (mọi lời gọi backend đều từ client component).
- Bỏ nút "In / Lưu PDF" (`window.print()`) sau khi có nút tải PDF thật, tránh trùng chức năng.
**Why:** Popup căn cứ pháp lý trước đây chỉ hiện trích dẫn rút gọn, không có cách nào đối chiếu văn bản gốc đầy đủ — trong khi `legal-safety.md` khuyến khích người dùng "đối chiếu văn bản luật chính thức" mà không cung cấp phương tiện để làm việc đó.
**Outcome:** 9 test mới (`test_legal_documents.py`) pass; không phá test cũ (3 lỗi còn lại trong `test_evaluator_citation_flow.py` xác nhận có sẵn từ trước qua `git stash`, không liên quan tới thay đổi này). Đã tải PDF thật qua backend chạy trong Docker (135 trang, dấu tiếng Việt hiển thị đúng). `tsc --noEmit`, `npm run lint`, `ruff check` đều sạch. **Chưa làm (ngoài phạm vi):** registry văn bản chỉ scan lúc khởi động — thêm văn bản mới cần restart backend; resolver alias chưa xử lý trích dẫn chéo giữa Nghị định/Thông tư con và luật gốc.

---

### [2026-07-04] Tối ưu toàn bộ prompt agent sang tiếng Anh + benchmark 100 điều khoản bẫy
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Viết lại toàn bộ prompt của các agent (OCR, structuring, phân tích điều khoản, RAG) bằng tiếng Anh để tiết kiệm token, tối ưu qua 3 vòng lặp dựa trên benchmark tự sinh; **giữ nguyên model `gpt-5.4-nano-2026-03-17`**:
- **9 nhóm prompt sang tiếng Anh** (output vẫn tiếng Việt, giữ nguyên tên field JSON): `contract_ocr_system.txt`, 3 file structuring `.txt` + user prompt trong `contract_structuring_service.py`/`gemini_ocr_service.py`, evaluate-clause + coverage trong `checklists/evaluator.py`, `LEGAL_SYSTEM_PROMPT` trong `rag/service.py` (trước đây tiếng Việt không dấu), `_SELECT_CITATIONS_SYSTEM` trong `analysis_llm.py`, `_JUDGE_SYSTEM` trong `rag/grounding.py`, history framing trong `agents/agent.py`. Bump `PROMPT_VERSION = 2` để invalidate Redis cache. Token khung prompt giảm ~11% tổng (coverage −27%, RAG −30%, OCR −25%; riêng evaluate-clause +12% do chủ động thêm rule/example chống lỗi).
- **Sửa 3 lỗi phát hiện qua tự đánh giá:** (1) nano xếp signal `unfair_but_legal` vào `matched_red_flags` → rule trong schema hint + guard `_reroute_findings_by_signal_type()` (kèm dedupe id) trong `evaluator.py`; (2) prompt chọn citation quá gắt khiến 100% finding `insufficient_evidence` → định nghĩa lại "support" (điều luật nêu quyền/nghĩa vụ/nguyên tắc nền tảng của nhận định, không cần khớp tình huống); (3) thêm rule substance-over-form, trigger-condition-decisive (định nghĩa "vế bảo vệ đối ứng"), normal-legal-duty, phân biệt tiền cọc vs tiền thuê + worked example thứ 2 về chế tài đối xứng.
- **Benchmark mới `tests/golden/trap_clauses_100.jsonl`:** 100 điều khoản tự sinh (40 red-flag, 30 unfair, 30 bẫy ngược phải PASS) cho cả 2 loại hợp đồng, có nhãn kỳ vọng (should_flag, expected_signal_ids, expected_type, trap_kind).
- **Harness offline `scripts/eval_prompts.py`:** mode `contracts` (OCR → structuring → evaluate-clause từng điều + coverage, ghi `outputs/prompt_eval/<slug>/`) và mode `traps` (chạy benchmark, tính recall/FPR/signal-hit/type-accuracy); luôn ép `CHECKLIST_CACHE_ENABLED=false`.
- **Kiểm chứng 5 hợp đồng thật** (2 thuê nhà, 2 mua bán chuẩn, 1 mua bán gài bẫy) qua 3 vòng: HĐ gài bẫy bắt 9 findings/6 điều (gồm bẫy sai số diện tích vòng 1 miss); 2 hợp đồng chuẩn gần như sạch (0–2 findings mức thấp).
**Why:** Prompt tiếng Việt tốn token hơn tiếng Anh 25–30% qua tokenizer o200k; các prompt cũ dài dòng, chưa có benchmark đo chất lượng nên không biết prompt sửa tốt lên hay xấu đi. Cần vòng lặp đo được (benchmark bẫy + hợp đồng thật) trước khi chốt.
**Outcome:** Benchmark v4 chốt: **flag_recall 0.971, false_positive_rate 0.00** (30/30 bẫy ngược PASS đúng, kể cả ca thế chấp + phong tỏa giải chấp), signal_hit 0.941, type_accuracy 0.969 (baseline v2 English đầu: 0.929/0.10). Citation flow hết rớt oan (chọn đúng BLDS Đ478/Luật Nhà ở Đ10, vẫn loại claim lạc đề). 121 passed, 1 skipped. Report tại `outputs/prompt_eval/traps_report_v2/v3/v4.json`. **Còn lại (ngoài phạm vi):** corpus thiếu luật thuế → finding thuế bị `insufficient_evidence` dù kết luận đúng; checklist chưa có signal cho đẩy án phí/luật sư sang Bên B và sai số diện tích; 2 miss benchmark là giới hạn checklist/kiến thức luật tinh vi (BLDS 328 hoàn cọc gấp đôi).

---

### [2026-07-04] Redis cache cho đánh giá điều khoản (checklist evaluate-clause)
**Type:** task
**Who:** TRINH THI LAN ANH
**What:** Thêm lớp cache Redis để không phân tích lại điều khoản đã đánh giá:
- **Cache service mới `app/services/cache.py`:** `get_redis_client()` singleton `@lru_cache`, import `redis` lazy; `cache_get`/`cache_set` **fail-open** (Redis lỗi/thiếu → coi như miss/no-op, không raise); `build_cache_key()` chuẩn hoá text (Unicode NFC + gộp khoảng trắng) rồi SHA256.
- **Tích hợp vào `checklists/evaluator.py`:** `evaluate_clause` kiểm cache trước khi gọi LLM; hit → trả thẳng verdict (bỏ qua GPT-4o + RAG). Chỉ `cache_set` sau khi chạy sạch (lỗi LLM raise → không ghi). Thêm hằng `PROMPT_VERSION` nhúng vào key để bump-tay khi sửa prompt/schema. Key nhúng: `loai_hop_dong | phien_ban | PROMPT_VERSION | model | use_v2 | citation_top_k | rerank_top_n | clause_text` → đổi model / bật-tắt v2 tự động đổi key. `evaluate_required_items` (coverage) **không** cache (hit-rate ~0).
- **Config (`core/config.py`) + env:** thêm `REDIS_URL`, `CHECKLIST_CACHE_ENABLED` (mặc định `false`), `CHECKLIST_CACHE_TTL_SECONDS` (30 ngày). Cập nhật `.env.example`, `deploy/.env.dev.example`, `deploy/.env.main.example` (dev/main bật sẵn, trỏ `redis://redis:6379/0`).
- **Docker Compose (local/dev/main):** thêm service `redis:7-alpine` (`--save "" --appendonly no` — không ghi đĩa), backend `depends_on: redis` + `REDIS_URL`. Local publish `127.0.0.1:6379`, dev/main internal.
- **Dependency:** `redis>=5.0.0` vào `pyproject.toml` (+ `uv.lock`).
- **Test `tests/test_checklist_cache.py` (8 ca):** cache hit không gọi lại LLM; biến thể khoảng trắng chung key; clause khác → miss; bump `PROMPT_VERSION` / đổi feature flag → invalidate; Redis lỗi → fail-open; cache tắt → không chạm Redis; lỗi LLM → không cache.
- **Docs:** mục cache + quy tắc bump `PROMPT_VERSION` trong `.agents/rules/backend.md`.
- **Không làm (để phase sau):** cache tầng RAG `retrieve()` theo `truy_van_rag`; endpoint admin flush thủ công; bật Redis persistence (AOF/volume).
**Why:** `evaluate-clause` là API tốn kém nhất (GPT-4o + retrieval, v2 thêm 2 call chọn/verify citation) và chạy song song từng điều khoản; hợp đồng bất động sản VN dùng nhiều điều khoản boilerplate giống nhau nên cache theo từng điều khoản có hit-rate cao. Fingerprint bằng version + model + flag để không bao giờ phục vụ kết quả lỗi thời — yêu cầu an toàn với app pháp lý.
**Outcome:** Cache chạy live trong stack Docker local (`ping True`, backend nhận `REDIS_URL=redis://redis:6379/0`, package `redis` 8.0.1 trong image). 121 passed, 1 skipped (`pytest tests/`); file mới sạch ruff. Cache sống qua deploy CI thông thường (Redis container không bị recreate), mất khi VM reboot / `compose down` do không persistence — chấp nhận vì mất cache chỉ làm chậm, không sai. **Lưu ý vận hành:** deploy có sửa prompt/schema phải bump `PROMPT_VERSION`, nếu không cache cũ phục vụ verdict lỗi thời.

---

### [2026-07-02] OCR ảnh nhiều trang, DOCX/PDF số local, LangSmith, UI upload & hiển thị bảng
**Type:** task
**Who:** Nguyễn Thanh Anh Quân -2A202600892
**What:** Phiên làm việc Cursor (Jul 2) — hoàn thiện pipeline OCR/structuring và cải thiện UX Contract mode:
- **OCR nhiều ảnh (backend):** endpoint `POST /api/ocr/contract/images` và `/images/structured`; `process_contract_images` OCR song song từng ảnh → ghép Markdown (dedup/overlap) → `structure_contract` mặc định `hybrid_safe`. Module mới `contract_image_order.py`: validate `page_order`, auto-sort theo tên file, heuristic trang in / Điều / tiêu đề / chữ ký, `order_confidence` + `order_warnings` khi người dùng upload sai thứ tự. Test `test_contract_image_order.py`, mở rộng `test_endpoints.py`.
- **DOCX & PDF số:** hướng đi “xuất hết nội dung local trước, API chỉ structuring JSON” — `document_extractor` + `contract_local_structuring` giữ bảng Word/PDF số; `GEMINI_STRUCTURING_MODE_DIGITAL=fast_metadata` (chỉ metadata qua Gemini, điều khoản local). Cập nhật `.env.example`, `config.py`, `contract_structuring_service._resolve_mode`.
- **LangSmith:** module `langsmith_tracing.py` (`configure_langsmith`, `trace_llm`); bọc evaluator / `analysis_llm` / RAG service; script `langsmith_report.py`; biến `LANGSMITH_*` trong `.env.example`. Dùng trace đo latency & token cost theo bước (OCR / structuring / checklist).
- **Frontend upload:** component `UploadModeTabs` — hai option cân bằng “Tệp hợp đồng” (PDF·DOCX) vs “Ảnh chụp” (1 hoặc nhiều ảnh). Gộp **một luồng duy nhất cho ảnh** qua `/images/structured`; ô tệp `accept` chỉ `.pdf,.docx`, kéo-thả ảnh vào ô tệp tự chuyển sang luồng ảnh. `ImageUploadStage` hỗ trợ sắp xếp lại thứ tự, hiển thị `orderWarnings`.
- **Hiển thị bảng phụ lục:** `ContractDocPanel` (panel “hợp đồng gen lại cho người đọc”) thêm render bảng “Phụ lục: Thống kê trang thiết bị” từ `data.devices` — trước đó OCR/structuring đã có `appendix_equipment` nhưng panel chỉ render đoạn văn.
- **Phân tích latency:** đọc `backend.log` + LangSmith — OCR+structuring ~20–23s/tệp (Gemini); evaluate-clause ~3–18s/điều khoản (chiếm phần lớn tổng thời gian). Soạn nội dung thuyết trình PPT (độ trễ 3 giai đoạn OCR / structuring / checklist; cost theo trace).
**Why:** Người dùng chụp hợp đồng nhiều trang cần upload đồng thời và ghép đúng thứ tự; DOCX/PDF số cần giữ nguyên bảng thiết bị mà không hallucinate; cần quan sát latency/chi phí thật (LangSmith) thay vì đoán; UI upload trước đây lệch (ảnh ≥2, hai đường vào ảnh) và panel hợp đồng thiếu bảng dù Cục 5 đã có dữ liệu.
**Outcome:** Luồng ảnh 1–N → OCR → Markdown → `hybrid_safe` structured chạy end-to-end; DOCX mẫu xuất được bảng thiết bị trong structuring và hiện ở panel + Cục 5. LangSmith bật được trong Docker local (`LANGSMITH_TRACING=true`). Upload UI đối xứng, ảnh chỉ một endpoint. Chưa đo latency thật luồng ảnh (log chỉ có pytest mock); log còn cảnh báo RAG `retriever.py` (parent `metadata_json=None`) và model `gemini-3.5-flash` 404 — cần xử lý tiếp nếu muốn checklist nhanh và có căn cứ pháp lý ổn định.

---

### [2026-06-25] Hybrid structuring: máy tách điều khoản + Gemini metadata (mức 2)
**Type:** task
**Who:** Nguyễn Thanh Anh Quân -2A202600892
**What:** Thiết kế và triển khai pipeline structuring mới cho mọi loại upload (PDF số, scan, DOC, DOCX), vẫn dùng Gemini OCR cho scan:
- **`contract_local_structuring.py`**: parser thống nhất trên markdown (không route theo `extraction_method`); tách `ĐIỀU` / `CHƯƠNG` / `MỤC` / `PHỤ LỤC`; hỗ trợ khoản `1.1`, `a)`, `a.`, `(a)`, `Điểm a`, bullet; đánh giá “đủ chưa” (`assess_structuring_needs`) — so văn bản vs field trống, phát hiện tách điều khoản yếu (nhiều dòng a/b/c mà gộp một cục); cắt preamble / phần điều khoản cho Gemini; merge kết quả.
- **`contract_structuring_service.py`**: ba chế độ `GEMINI_STRUCTURING_MODE` — `hybrid` (chỉ gọi AI khi thiếu), **`hybrid_safe` (mức 2, mặc định)**: luôn gọi Gemini metadata (đoạn đầu HĐ), regex chỉ tách điều khoản; metadata ưu tiên Gemini (`merge_metadata_prefer_gemini`); fallback `hybrid_clauses` / `llm_full` khi cần. Trả `StructuringOutcome` kèm `structuring_ms`, `structuring_method`, `structuring_llm_calls`.
- **Prompt mới**: `contract_structuring_metadata.txt`, `contract_structuring_clauses.txt`.
- **`ocr.py`**: ghi timing structuring vào `timings_ms`.
- **Cấu hình**: `GEMINI_STRUCTURING_MODE=hybrid_safe` trong `.env`, `.env.example`, `deploy/.env.*.example`.
- **Test**: mở rộng `test_contract_local_structuring.py` (a/b/c, hybrid_safe luôn metadata, merge ưu tiên Gemini); sửa test structuring trong `test_gemini_ocr_service.py`.
- **Thảo luận / không làm**: parallel structuring per-ĐIỀU (Phase 2 cũ — phức tạp, dễ lỗi format); regex metadata thuần (nhanh nhưng dễ thiếu khi mẫu khác); `llm_full` (~30s) khi cần an toàn tối đa.
**Why:** Cần structuring nhanh hơn Gemini monolithic (~30s) nhưng chính xác hơn regex thuần khi hợp đồng viết khác mẫu. Mức 2 giảm lo regex lấy nhầm tiền cọc / địa chỉ / hai bên bằng cách luôn nhờ Gemini cho metadata, trong khi điều khoản vẫn copy verbatim từ máy (không hallucinate nội dung khoản).
**Outcome:** Mặc định `hybrid_safe`: mỗi upload ≥1 lần gọi Gemini structuring (metadata); điều khoản local khi tách được. Response có `structuring_method` (`hybrid_safe`, `hybrid_safe_both`, `llm_full`, …). `pytest` structuring pass. Cần rebuild backend/Docker để áp dụng. Rủi ro còn lại: OCR scan sai chữ → structuring sai theo; format điều khoản quá lạ → `hybrid_safe_both` hoặc `llm_full`.

---

### [2026-06-14] Chuyen OCR hop dong sang Gemini API
**Type:** decision
**Who:** Nguyễn Thanh Anh Quân -2A20200892
**What:** Thay luong OCR cu bang PaddleOCR/VietOCR local trong `backend/services/ocr_service.py` bang Gemini 2.5 Flash-Lite qua `google-genai`. Them render PDF bang PyMuPDF, xu ly anh JPG/JPEG/PNG/PDF, prompt OCR tieng Viet theo cau truc Markdown, strip Markdown de tao plain text, va tra loi loi ro hon khi thieu API key, timeout, rate limit hoac quota. Cap nhat `scripts/test_ocr.py` thanh CLI dung `--file` va tuy chon `--output`, co uoc tinh chi phi theo so trang. Don gon `requirements.txt` va `.env.example`, them bien `GEMINI_API_KEY`, dong thoi bo key/log endpoint that khoi file mau.
**Why:** OCR local bang PaddleOCR/VietOCR nang phu thuoc, kho cai tren Windows va chat luong voi hop dong scan tieng Viet chua on dinh. Dung Gemini API giup giam phu thuoc local, xu ly ca PDF nhieu trang tot hon va de lay ket qua Markdown phu hop cho tai lieu phap ly.
**Outcome:** Module OCR moi san sang chay khi cau hinh `GEMINI_API_KEY`. Da tao output OCR mau cho file hop dong moi va loai bo file ket qua OCR cu `hop_dong_1_ocr_result.md`. Can kiem tra lai truoc khi push cac file mau PDF/Markdown co nen commit khong.

---

### [2026-06-06] Initialize WORKLOG
**Type:** decision
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Set up WORKLOG.md template for the team.
**Why:** Track technical decisions, task assignments, and brainstorming throughout the project.
**Outcome:** Template created and ready for team use.

---

### [2026-06-06] Set up backend skeleton (FastAPI + uv)
**Type:** task
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Khởi tạo `src/backend` — FastAPI project chạy bằng `uv`, Python 3.12. Cài đặt các thư viện cốt lõi: FastAPI, Uvicorn, Anthropic SDK, LangChain Core + Community, ChromaDB, Pydantic Settings. Cấu trúc thư mục gồm `app/`, `agents/`, `rag/`, `api/routes/`, `tests/`.
**Why:** Dự án cần một backend rõ ràng, tách biệt giữa logic Agent và RAG để dễ mở rộng và phân chia công việc trong team.
**Outcome:** Server chạy được, test health pass, API docs tự động tại `/docs`. Viết thêm README hướng dẫn cài đặt và dùng API.

---

### [2026-06-10] Initialize NextJS front-end project and documentation
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Khởi tạo cấu trúc dự án Next.js tại `src/frontend` sử dụng TypeScript, App Router, ESLint và Vanilla CSS (không dùng Tailwind). Cài đặt các hook ghi log AI cho Antigravity IDE và Codex.
**Why:** Xây dựng phần frontend cho ứng dụng HợpĐồngAI giúp người dùng dễ dàng tương tác và phân tích hợp đồng bất động sản.
**Outcome:** Dự án Next.js hoạt động ổn định, biên dịch thành công thông qua `npm run build`. Cấu hình thành công git hooks và tích hợp tính năng tự động ghi log hoạt động AI.
---

### [2026-06-14] Tính năng đánh giá điều khoản hợp đồng theo checklist (GPT-4o)
**Type:** task
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Implement module `app/checklists/` đánh giá điều khoản hợp đồng (cho thuê & mua bán) dựa trên 2 file checklist máy đọc:
- `loader.py` — parse frontmatter + khối YAML `machine_readable` thành dataclass.
- `evaluator.py` — gọi **GPT-4o** đối chiếu điều khoản với checklist, trả về mức rủi ro + căn cứ pháp lý + gợi ý thương lượng.
- API routes `/checklist/types`, `/checklist/{loai_hop_dong}`, `/checklist/evaluate-clause`.
**Why:** Cần công cụ rà soát tự động phát hiện điều khoản rủi ro/bất lợi, có truy vết căn cứ, hỗ trợ người dùng yếu thế khi đọc hợp đồng.
**Outcome:** Đánh giá điều khoản chạy thật với GPT-4o; thêm dependency `openai`, config `openai_model`; test loader pass; cập nhật README.

---

### [2026-06-14] Tách 2 nhóm dấu hiệu: trái luật vs bất lợi-hợp pháp
**Type:** task
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Bổ sung nhóm `unfair_but_legal` (điều khoản KHÔNG trái luật nhưng bất lợi cho bên yếu thế) bên cạnh `red_flags`. Loader parse thêm khối mới (kèm `trai_luat`, `goi_y_thuong_luong`); evaluator tách kết quả thành `matched_red_flags` (kèm căn cứ) và `matched_unfair_clauses` (kèm gợi ý thương lượng). Làm loader chịu lỗi khi checklist thiếu fence đóng ```` ``` ````.
**Why:** Phân biệt rõ "vi phạm pháp luật" với "thỏa thuận hợp pháp nhưng thiệt cho bên yếu" để tránh dán nhãn sai và đưa khuyến nghị đúng bản chất.
**Outcome:** Phân loại đúng trên cả ca chỉ-bất-lợi lẫn ca hỗn hợp.

---

### [2026-06-14] Cố định quy ước Bên A/B & logic chống "sai bên" (checklist v2.0)
**Type:** decision
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Tái cấu trúc checklist lên v2.0: khai báo `quy_uoc_vai_tro` (Bên A = mạnh thế bán/cho thuê, Bên B = yếu thế mua/thuê, `protected_party: ben_b`), gom dấu hiệu theo từng bên, mỗi dấu hiệu gắn `gay_bat_loi_cho` + `dieu_kien_kich_hoat`. Viết lại loader đọc cấu trúc gom-theo-bên; evaluator nạp quy ước A/B **động** theo từng hợp đồng, buộc bước đầu xác định điều khoản nói về bên nào (`dieu_khoan_noi_ve_ben`), suy luận `phan_tich` (MATCH/PASS) trước khi kết luận, và tuân `dieu_kien_kich_hoat` để đối chiếu liên điều khoản.
**Why:** Sửa lỗi Agent gắn cờ sai bên / dương tính giả (vd kết luận "không hoàn tiền" trong khi điều khoản đã có hoàn theo tỷ lệ → mâu thuẫn nội tại).
**Outcome:** Verify thật GPT-4o: nhận đúng vai trò A/B; PASS đúng khi điều khoản đã loại trừ lỗi Bên A hoặc đã đáp ứng gợi ý thương lượng. 8/8 test pass, lint sạch.

---

### [2026-06-14] Thêm tính năng ghi log cho backend
**Type:** task
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Cấu hình logging tập trung cho backend:
- `core/logging.py` — `setup_logging()` đọc `LOG_LEVEL`, định dạng `thời gian | level | module | message`, idempotent; ghi thêm ra file `<LOG_DIR>/backend.log` nếu đặt `LOG_DIR`; đồng bộ logger của uvicorn.
- `api/middleware.py` — `RequestLoggingMiddleware` log mỗi request (method/path/status/thời gian) kèm request-id ngắn, trả về header `X-Request-ID`.
- Thêm logger ở evaluator (gọi GPT-4o), agent (gọi Claude), RAG pipeline (ingest/retrieve), kèm bắt lỗi.
**Why:** Cần theo dõi hành vi backend, đo thời gian xử lý, truy vết lỗi và khớp log client ↔ server khi vận hành/đánh giá.
**Outcome:** Mặc định log ra console; bật `LOG_DIR=logs` ghi thêm file. Verify runtime thật: request + GPT-4o được log đầy đủ. 3 test logging mới, tổng 11/11 pass, lint sạch. Log file (`logs/`, `*.log`) được đưa vào `.gitignore`.

---

### [2026-06-15] Audit tiến độ Legal RAG và knowledge base pháp luật
**Type:** decision
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Rà soát phần việc "tìm văn bản pháp luật → reconstruct thành file `.md` → tìm phương pháp RAG hiệu quả". Codebase hiện đã có backend Legal RAG ở mức POC/khung kỹ thuật: parser Markdown pháp luật, parent-child retrieval, ChromaDB cho child chunks, SQLite cho parent articles, CLI/API ingest, API search/status, auto-populate sample khi KB rỗng, logging và test cho parser/ingest/retrieve/dedup/persistence/no-reingest-on-query. Chạy test backend bằng `uv run pytest tests`: 20/20 test pass.
**Why:** Cần xác định phần đã hoàn thành so với checklist dự án, tránh nhầm giữa "đã có framework RAG chạy được" và "đã có knowledge base pháp luật đầy đủ, có nguồn, sẵn sàng dùng production".
**Outcome:** Kết luận: phương pháp RAG backend đã hoàn thành ở mức nền tảng và đúng hướng parent-child RAG, nhưng task legal data chưa hoàn thành trọn vẹn. Repo mới có 1 file sample `luat_kyd_bds_2023_sample.md`; chưa thấy pipeline tìm/crawl nguồn luật chính thống, reconstruct từ HTML/PDF/raw text sang Markdown, bộ văn bản đầy đủ theo checklist, hay metadata nguồn như `source_url`, ngày crawl, trạng thái hiệu lực/checksum. Với checklist hiện tại, RAG knowledge base chưa phải điều kiện bắt buộc vì evaluator đang dùng checklist Markdown/static signals trực tiếp trong prompt GPT-4o. RAG nên được dùng ở bước bổ trợ: xác minh/trích dẫn căn cứ pháp luật, trả lời follow-up pháp lý, và mở rộng sang nhiều văn bản sau khi P0/P1 ổn định.

---

### [2026-06-17] Hardening PDF reconstructor (progress, metadata, UTF-8, skip existing)
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Cải tiến `src/backend/scripts/reconstruct_pdf.py`:
1.  Biến stable key phụ thuộc vào filename (chứ không phải full path).
2.  Metadata JSON thêm `"source_pdf": "<filename>"`.
3.  Load progress từ existing output files (nếu không có file progress).
4.  Bỏ qua (skip) file nếu output `.md` đã tồn tại (để tránh xử lại).
5.  Chuyển logging sang UTF-8 (tránh lỗi `cp1252` trên Windows) và redirect stderr/stdout ra file để capture đầy đủ ký tự tiếng Việt.
6.  Giữ nguyên API cho API và phục vụ RAG (nếu sau này enable full RAG).
7.  Giữ nguyên CLI: `python scripts/reconstruct_pdf.py <input_path>`. Với thư mục chứa PDF, vẫn dùng mode tương ứng (ví dụ: LLAMA_MODE=fast → xử lý batch). Với input file, xử lý file đó.
**Why:** Đảm bảo progress không bị mất khi chạy lại script, metadata có nguồn gốc, không bị crash trên Windows, và không xử lại file đã làm.
**Outcome:** Chạy thật với một thư mục chứa PDF: script dùng mode LLAMA_MODE, xử lý được các file PDF và tạo ra các file `.md` tương ứng; với mỗi file, tiến trình ghi lại progress và không xử lại nếu đã hoàn thành. Log ra file, không bị lỗi mã hóa.


---

### [2026-06-17] Nâng cấp Legal RAG: hybrid search, citation và query service
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Triển khai kế hoạch nâng cấp RAG trong `implementation_plan.md`: đổi embedding sang `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, thêm BM25 parent index (`rank-bm25`) và hybrid retrieval bằng Reciprocal Rank Fusion, thêm citation formatter, thêm RAG service trả `answer`, `citations`, `confidence`, `status`, mở endpoint `POST /rag/query`, giữ `/rag/search` để tương thích cũ. Cập nhật agent dùng RAG service/OpenAI, checklist evaluator enrich `legal_basis` + `evidence_status`, CLI ingest có `--rebuild`/`--clear`, startup auto-ingest toàn bộ `app/rag/data/*.md` khi index rỗng.
**Why:** RAG cũ chỉ dùng vector search với model English, thiếu citation chuẩn và guardrails pháp lý. Hệ thống cần retrieval tốt hơn cho tiếng Việt và truy vấn keyword-heavy như "Điều 35 Luật Đất đai", đồng thời API cần trả evidence rõ ràng để giảm rủi ro hallucination.
**Outcome:** Rebuild index thành công sau khi sửa lỗi parser tạo `doc_id` trùng và skip Chroma upsert khi file parse ra 0 chunk. Kết quả rebuild: `17` files attempted, `0` failed, `1340` parent documents, `4488` child chunks, BM25 index `1340` docs. Verification: frontend `npm run build` pass; backend scoped lint pass; `uv run pytest tests/test_rag.py tests/test_rag_query.py -q` pass (`7 passed`). Full pytest vẫn còn lỗi ngoài phạm vi RAG ở `tests/test_pdf_reconstructor_guards.py` do import `has_meaningful_text` chưa tồn tại trong `scripts/reconstruct_pdf.py`.

---

### [2026-06-17] Port giao diện FairTerms (landing + app shell) sang Next.js
**Type:** task
**Who:** Trịnh Thị Lan Anh - 2A202600737
**What:** Port toàn bộ design package FairTerms vào `src/frontend`:
- **Landing** (`/`) — trang marketing tiếng Việt: hero, tính năng, FAQ, CTA, dark/light theme, responsive.
- **App shell** (`/app`) — `FairTermsApp` sidebar layout: đăng nhập mock (localStorage), lịch sử dự án, chuyển view clause/contract.
- **Clause mode** — rà soát từng điều khoản: nhập/dán text, hiển thị mức rủi ro, trích dẫn, căn cứ pháp lý, gợi ý thương lượng.
- **Contract mode** — phân tích toàn bộ hợp đồng: upload mock, tóm tắt, bảng rủi ro, timeline, chat hỏi đáp.
- **Auth UI** — `AuthLanding`, `ForgotPassword` (`/auth/forgot-password`), promo panel.
- **Design system** — `fairterms.css` (indigo/deep-navy, semantic risk colors, dark mode qua `data-theme`), `primitives.tsx`, `icons.tsx`, `LogoMark`.
- **Mock data** — `lib/data.ts` (mẫu hợp đồng thuê, điều khoản, căn cứ luật).
- **Assets** — logo light/dark mode; mockup sản phẩm trên landing dựng bằng CSS (không dùng ảnh screenshot).
- **Layout** — font Inter (Vietnamese subset), metadata FairTerms, script init theme trước paint chống flash.
- **ESLint** — nới rule cho thư mục `fairterms/` và `landing/` (unescaped entities, img, hydration-safe localStorage bootstrap).
**Why:** Cần UI sản phẩm hoàn chỉnh, đúng brand FairTerms, làm nền tảng kết nối backend checklist/evaluator và Supabase auth sau này — thay thế scaffold Next.js mặc định.
**Outcome:** 24 file (+6.122 dòng), gỡ `page.module.css` cũ. Landing tại `/`, app tại `/app`, quên mật khẩu tại `/auth/forgot-password`. Hiện dùng mock data + localStorage; chưa nối API backend.

---

### [2026-06-19] Tích hợp NextAuth, Google OAuth, quản lý phiên Guest và tái cấu trúc thư mục Frontend
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Triển khai luồng xác thực người dùng và cấu trúc lại mã nguồn Frontend:
- **Xác thực:** Cấu hình NextAuth tích hợp với Prisma database adapter và PostgreSQL pool configuration. Hỗ trợ Google OAuth đăng nhập cho người dùng.
- **Quản lý Guest:** Thiết lập cơ chế lưu trữ session của Guest, đồng bộ cookies `guest_session` qua API route `POST /api/guest/start` và logic liên kết tài khoản Guest sang tài khoản User sau khi đăng nhập Google OAuth. Đồng bộ hóa localStorage (`fairterms.guestAuth` ↔ `fairterms.auth`) tránh xung đột điều hướng.
- **Tái cấu trúc thư mục:** Di chuyển mã nguồn frontend tại `src/frontend` từ cấu trúc phẳng sang phân chia khoa học theo các thư mục domain cụ thể.
**Why:** Làm nền tảng định danh người dùng và kiểm soát hạn ngạch quét hợp đồng cho cả khách vãng lai lẫn người dùng có đăng nhập.
**Outcome:** Hệ thống xác thực và quản lý session chạy ổn định, đồng bộ trơn tru giữa client và server. Cấu trúc mã nguồn Frontend sạch sẽ và dễ bảo trì.

---

### [2026-06-26] Cập nhật DB schema lưu trữ phân tích, dọn dẹp Guest schema và áp dụng hạn ngạch tháng (quota)
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Cập nhật cơ sở dữ liệu và quản lý hạn ngạch sử dụng LLM:
- **Database Schema:** Cập nhật database schema thông qua Prisma bổ sung các model: `UserQuota`, `ContractAnalysis`, `ClauseAnalysis`, `ContractParty`, `ContractEquipment` và khởi chạy migration tương ứng nhằm lưu trữ lịch sử phân tích.
- **Dọn dẹp mã nguồn:** Loại bỏ toàn bộ references liên quan tới Guest schema cũ nhằm tối giản database schema.
- **Hạn ngạch (Quota):** Viết các helper quản lý chu kỳ quota (quota period) và lưu trữ (retention helpers), triển khai logic giới hạn và kiểm soát hạn ngạch tháng (monthly usage quota).
- **Dependency:** Cài đặt package `dotenv` để sửa lỗi build frontend bị fail.
**Why:** Lưu trữ lâu dài các bản phân tích hợp đồng/điều khoản vào DB thay vì bộ nhớ tạm, đồng thời giới hạn số lượt quét hàng tháng của mỗi người dùng để kiểm soát chi phí sử dụng API của LLM.
**Outcome:** Prisma migration chạy thành công, hệ thống quản lý quota hoạt động chính xác. Fix lỗi build frontend hoàn tất.

---

### [2026-07-01] Triển khai API Routes lưu trữ kết quả phân tích & Lịch sử phân tích trên Frontend
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Kết nối Frontend với cơ sở dữ liệu và tối ưu hóa quy trình deploy:
- **API Routes:** Xây dựng các API routes Next.js App Router: `/api/analysis/clause` (persistence), `/api/analysis/clause/[id]` (update), `/api/analysis/contract` (persistence), `/api/analysis/contract/[id]` (update), và `/api/analysis/history` (lấy lịch sử kèm bộ lọc).
- **Tích hợp UI:** Thay thế mock data trong các Client Component (`FairTermsApp.tsx`, `ClauseMode.tsx`, `ContractMode.tsx`) bằng các cuộc gọi API thực tế tới database.
- **Tối ưu Docker & CI/CD:** Cấu hình Next.js build cache trong Docker (`docker-compose.local.yml`) giúp giảm thời gian build khi chạy container. Sửa lỗi định dạng YAML và cập nhật các bước deploy trong file workflow `.github/workflows/deploy-dev.yml`.
**Why:** Đồng bộ hóa dữ liệu phân tích từ client lên database để người dùng có thể lưu trữ, cập nhật và tra cứu lại lịch sử quét của họ một cách liền mạch.
**Outcome:** Các luồng phân tích đơn lẻ và toàn bộ hợp đồng chạy thành công với database thật. Deploy script trên môi trường dev hoạt động ổn định và tối ưu thời gian build.

---

### [2026-07-05] Loại bỏ chức năng Đăng nhập dưới quyền Guest (Guest login)
**Type:** decision
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Loại bỏ hoàn toàn tùy chọn đăng nhập với tư cách khách (guest mode) khỏi ứng dụng:
- Xóa bỏ nút "Login as Guest" và các logic liên quan khỏi Landing page, AuthLanding, và FairTermsApp.
- Dọn dẹp các tệp tin cấu hình và cập nhật `.gitignore`.
**Why:** Tập trung kiểm soát hạn ngạch quét chặt chẽ hơn và yêu cầu định danh người dùng qua tài khoản Google, ngăn chặn việc lạm dụng quá mức tài nguyên LLM/OCR qua tài khoản vô danh.
**Outcome:** Giao diện đăng nhập tinh gọn hơn. Các tính năng cốt lõi chỉ khả dụng sau khi người dùng đã đăng nhập Google OAuth.

---

### [2026-07-07] Quản lý & xóa lịch sử phân tích (batch/single delete) + Giải quyết merge conflicts từ dev
**Type:** task
**Who:** Nguyễn Đình Bảo Long - 2A202600981
**What:** Triển khai tính năng quản lý lịch sử rà soát (xóa đơn lẻ, xóa hàng loạt) và giải quyết các xung đột merge sau rebase:
- **API Xóa lịch sử (`src/frontend/app/api/analysis/history/route.ts`):** Endpoint `DELETE` hỗ trợ xóa một hoặc nhiều bản ghi phân tích hợp đồng/điều khoản cùng lúc bằng transaction Prisma. Thiết lập Cascade Delete tại database để tự động dọn dẹp các điều khoản liên quan khi xóa hợp đồng.
- **UI Quản lý & Hoạt ảnh xóa:** Bổ sung nút "Quản lý" ở tiêu đề danh sách "Gần đây" trong `FairTermsApp.tsx` để kích hoạt chế độ chọn nhiều mục; thiết kế nút xóa thùng rác động với nắp mở khi hover chuột; thiết lập hoạt ảnh slide-out height và mờ dần khi xóa.
- **Hộp thoại Confirm & Toast Custom:** Xây dựng modal xác nhận xóa phủ mờ kính (backdrop-blur) và thanh Toast thông báo kết quả linh hoạt theo ngữ cảnh ("Xóa phân tích điều khoản thành công", "Xóa phân tích hợp đồng thành công", "Xóa các mục đã chọn thành công").
- **Khắc phục lỗi Layout Overlapping:** Bổ sung `flex-shrink: 0` cho `.project-item-wrapper` trong `fairterms.css` để ngăn chặn Flexbox tự động bóp nghẹt chiều cao các dòng lịch sử khi danh sách dài vượt quá `max-height`.
- **Giải quyết Merge Conflicts:** Rebase code mới nhất từ dev và giải quyết triệt để xung đột trong `FairTermsApp.tsx` và `page.tsx` (contract history) để tích hợp hoàn hảo tính năng so sánh hợp đồng (`compare`) mới của dev với giao diện quản lý lịch sử. Dọn dẹp các cảnh báo linter để đảm bảo build sạch.
**Why:** Giúp người dùng chủ động quản lý quyền riêng tư bằng cách xóa các bản quét nhạy cảm khỏi hệ thống, đồng thời sửa lỗi giao diện và đảm bảo code đồng nhất sau khi đồng bộ với nhánh dev chính.
**Outcome:** Toàn bộ tính năng xóa, chọn nhiều, popup custom, và toast chạy mượt mà local; lint frontend đạt 100% pass; nhánh `fix-history` đã được commit và push lên remote `origin`.

---

### [2026-07-08] OCR ảnh/PDF scan: vision probe + siết filter CHCC (chỉ cho thuê/mua bán)
**Type:** task
**Who:** Nguyễn Thanh Anh Quân
**What:** Sửa pipeline OCR/nhận diện loại hợp đồng để tránh reject sai khi file ảnh/PDF scan có tên generic:
- Thêm cơ chế vision probe (OCR trang/ảnh đầu) để suy ra loại hợp đồng khi local snippet rỗng (ảnh, PDF scan, PDF mixed trang 1 scan).
- Loại bỏ gate pre-OCR sai cho các luồng cần probe để OCR chạy đến post-gate.
- Đổi branding lỗi từ `HopDongAI` → `FairTerms`.
- Siết `ensure_supported_apartment_contract` chỉ chấp nhận hợp đồng **cho thuê căn hộ chung cư** hoặc **mua bán căn hộ chung cư**; mọi trường hợp còn lại (đất/nhà riêng/mặt bằng/loại khác) bị chặn 422.
- Thêm/ cập nhật unit tests để đảm bảo không chạy pre-OCR gate cho multi-image và đảm bảo các case chặn/mở đúng.
**Why:** OCR ảnh/PDF scan đang bị reject sai loại do detect dựa tên file + không có nội dung local; đồng thời cần đảm bảo app chỉ hỗ trợ đúng 2 nhóm hợp đồng theo yêu cầu.
**Outcome:** `pytest` phần OCR/contract kind pass (các test liên quan chạy xanh); logic backend align với UX “CHCC cho thuê/mua bán”.

