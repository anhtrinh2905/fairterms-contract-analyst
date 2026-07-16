"use client";
/* ============================================================
   FairTerms — Marketing landing (ported from FairTerms.html + site/landing.js)
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../fairterms/components/ui/LogoMark";


/* Icon sprite — hidden defs, referenced by <use href="#i-…"> */
function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M7 21h10M12 3 5 6m7-3 7 3" /><path d="M5 6 2.5 12.5a3 3 0 0 0 5 0L5 6Zm14 0-2.5 6.5a3 3 0 0 0 5 0L19 6Z" /></symbol>
        <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></symbol>
        <symbol id="i-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M14 4v5h5" /><path d="M8 13h7M8 17h5" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6 18 18M18 6 6 18" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-15.6-2.8 2.8M8.4 15.6l-2.8 2.8" /></symbol>
        <symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 21 19H3L12 3.5Z" /><path d="M12 10v4M12 17h.01" /></symbol>
        <symbol id="i-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 15 15 9" /><path d="M11 6.5 13 5a4 4 0 0 1 6 6l-2 1.5M13 17.5 11 19a4 4 0 0 1-6-6l2-1.5" /></symbol>
        <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20.5l1.3-5.5A8 8 0 1 1 21 12Z" /></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></symbol>
        <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5 17.5 10.5" /></symbol>
        <symbol id="i-compare" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1.6" y="2" width="9" height="12" rx="1.6" /><rect x="13.4" y="10" width="9" height="12" rx="1.6" /><path d="M10.6 6h2a2 2 0 0 1 2 2v2" /><path d="M13.4 18h-2a2 2 0 0 1-2-2v-2" /></symbol>
        <symbol id="i-burger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16" /></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" /></symbol>
        <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></symbol>
        <symbol id="i-in" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.7 8.65 22 10.7 22 14v7h-4v-6.2c0-1.48-.03-3.4-2.07-3.4-2.07 0-2.39 1.62-2.39 3.29V21H9V9Z" /></symbol>
        <symbol id="i-fb" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.54-1.5h1.64V3.6c-.28-.04-1.26-.12-2.4-.12-2.37 0-4 1.45-4 4.1v2.3H7.9V13h2.71v8h2.89Z" /></symbol>
        <symbol id="i-yt" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.8C19.4 5 12 5 12 5s-7.4 0-8.9.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.8C4.6 19 12 19 12 19s7.4 0 8.9-.5a2.5 2.5 0 0 0 1.7-1.8C23 15.2 23 12 23 12ZM9.8 15.1V8.9l5.3 3.1-5.3 3.1Z" /></symbol>
      </defs>
    </svg>
  );
}

const FAQ_ITEMS = [
  {
    q: "FairTerms là gì?",
    a: (
      <>
        FairTerms là trợ lý AI rà soát hợp đồng bằng tiếng Việt. Bạn tải lên hợp đồng thuê / mua căn hộ (hoặc dán
        một điều khoản), FairTerms phát hiện <b>điều khoản bất lợi, trái luật hay thiếu sót</b>, kèm trích dẫn truy
        vết và căn cứ điều luật để bạn hiểu rõ trước khi ký.
      </>
    ),
  },
  {
    q: "FairTerms có thay thế luật sư không?",
    a: (
      <>
        <b>Không.</b> FairTerms là công cụ hỗ trợ rà soát, giúp bạn hiểu hợp đồng và đặt câu hỏi đúng. Với giao dịch
        quan trọng, bạn vẫn nên tham khảo luật sư hoặc chuyên gia pháp lý. Mọi kết quả đều kèm lưu ý này.
      </>
    ),
  },
  {
    q: "Dữ liệu của tôi có an toàn không?",
    a: (
      <>
        Có. Thông tin cá nhân (CCCD, SĐT, địa chỉ) được <b>ẩn danh trước khi phân tích</b>. Tài liệu được mã hóa,
        không dùng để huấn luyện mô hình, và bạn có thể xóa lịch sử bất cứ lúc nào.
      </>
    ),
  },
  {
    q: "FairTerms hỗ trợ loại hợp đồng nào?",
    a: (
      <>
        Hiện tập trung vào <b>hợp đồng thuê &amp; mua bán căn hộ chung cư</b> — loại phổ biến và nhiều rủi ro nhất với
        người dân. Hệ thống đang mở rộng sang hợp đồng lao động, vay mượn và dịch vụ.
      </>
    ),
  },
  {
    q: "Tôi bắt đầu thế nào?",
    a: (
      <>
        Rất nhanh. Bấm <b>Dùng thử miễn phí</b>, tải lên hợp đồng (PDF / DOCX / ảnh) hoặc dán một điều khoản —
        FairTerms bắt đầu phân tích ngay, không cần cài đặt.
      </>
    ),
  },
];

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number>(0);

  // nav scrolled border
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll-reveal + enable reveal animations
  useEffect(() => {
    document.body.classList.add("anim-on");
    const root = rootRef.current;
    if (!root) return;
    const reveals = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !reveals.length) {
      reveals.forEach((r) => r.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    reveals.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);



  const closeMenu = () => setMenuOpen(false);

  return (
    <div ref={rootRef}>
      <IconSprite />

      {/* ===== Nav ===== */}
      <header className={"nav" + (scrolled ? " scrolled" : "") + (menuOpen ? " menu-open" : "")}>
        <div className="wrap row">
          <a className="brand" href="#top" aria-label="FairTerms">
            <LogoMark size={36} />
            <span className="name">
              Fair<b>Terms</b>
            </span>
          </a>
          <nav className="nav-links" aria-label="Chính">
            <a href="#features" onClick={closeMenu}>Tính năng</a>
            <a href="#compare" onClick={closeMenu}>So sánh</a>
            <a href="#security" onClick={closeMenu}>Bảo mật</a>
            <a href="#pricing" onClick={closeMenu}>Bảng giá</a>
            <a href="/hop-dong-mau" onClick={closeMenu}>Hợp đồng mẫu</a>
            <a href="#faq" onClick={closeMenu}>Câu hỏi</a>
          </nav>
          <div className="nav-cta">
            <a
              className="login"
              href="/app"
              style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 14px" }}
            >
              Đăng nhập
            </a>
            <button className="nav-burger" aria-label="Mở menu" onClick={() => setMenuOpen((v) => !v)}>
              <svg><use href="#i-burger" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="hero">
          <div className="hero-mesh"></div>
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-pill-row">
                <span className="pill">
                  <span className="dot"></span>Chuyên tiếng Việt · Luật Việt Nam · Bảo mật PII
                </span>
              </div>
              <h1>
                Hiểu rõ mọi điều khoản,
                <br />
                <em>trước khi đặt bút ký.</em>
              </h1>
              <p className="hero-sub">
                FairTerms rà soát hợp đồng thuê / mua căn hộ của bạn, phát hiện điều khoản{" "}
                <b>bất lợi, trái luật hay thiếu sót</b> — kèm trích dẫn truy vết và căn cứ điều luật. Luôn đứng về
                phía bạn.
              </p>

              {/* product mockup */}
              <div className="hero-mock-wrap reveal">
                <div className="hero-mock-glow"></div>
                <div className="mock">
                  <div className="mock-bar">
                    <span className="mock-dots">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <span className="mock-url">
                      <svg><use href="#i-lock" /></svg>fairterms.vn/phan-tich
                    </span>
                  </div>
                  <div className="mock-body">
                    <div className="mock-doc">
                      <div className="mock-doc-title">HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ · 25/2025/HĐTCH</div>
                      <div className="mock-art">ĐIỀU 4 · ĐẶT CỌC VÀ THANH TOÁN</div>
                      <p className="mock-para r-cao">
                        <span className="flag">
                          <svg><use href="#i-warn" /></svg>
                        </span>
                        <span style={{ color: "#0a305e" }}>
                          Bên A có quyền giữ toàn bộ tiền đặt cọc (02 tháng tiền thuê) nếu Bên B chấm dứt hợp đồng
                          trước hạn vì <em>bất kỳ lý do nào</em>, kể cả lý do bất khả kháng.
                        </span>
                      </p>
                      <div className="mock-art">ĐIỀU 6 · ĐƠN PHƯƠNG CHẤM DỨT</div>
                      <p className="mock-para r-tb">
                        <span className="flag">
                          <svg><use href="#i-warn" /></svg>
                        </span>
                        <span style={{ color: "#0a305e" }}>
                          Bên A được đơn phương chấm dứt hợp đồng và yêu cầu Bên B bàn giao căn hộ trong vòng 03 ngày
                          mà không cần bồi thường.
                        </span>
                      </p>
                      <div className="mock-art">ĐIỀU 7 · BÀN GIAO &amp; HIỆN TRẠNG</div>
                      <p className="mock-para r-ok">
                        <span style={{ color: "#0a305e" }}>
                          Hai bên lập biên bản bàn giao ghi rõ hiện trạng, chỉ số điện nước tại thời điểm nhận căn hộ.
                        </span>
                      </p>
                    </div>
                    <div className="mock-side">
                      <div className="mock-score">
                        <div className="mock-traffic">
                          <i className="red on"></i>
                          <i className="amber"></i>
                          <i className="green"></i>
                        </div>
                        <div className="mock-score-meta">
                          <div className="lvl">Rủi ro cao</div>
                          <div className="cap tnum">3 cảnh báo · 2 điều khoản trái luật</div>
                        </div>
                      </div>
                      <div className="mock-side-h">Phân tích điều khoản</div>
                      <div className="mock-ana">
                        <div className="mock-ana-top">
                          <span className="rbadge cao">
                            <span className="d"></span>Rủi ro cao
                          </span>
                        </div>
                        <p>
                          Giữ cọc khi Bên B gặp <b>bất khả kháng</b> là trái quy định — bên vi phạm do sự kiện khách
                          quan không phải chịu trách nhiệm.
                        </p>
                        <span className="lawchip">
                          <svg><use href="#i-scale" /></svg>BLDS 2015 · Điều 351, 156
                        </span>
                      </div>
                      <div className="mock-ana tb">
                        <div className="mock-ana-top">
                          <span className="rbadge tb">
                            <span className="d"></span>Trung bình
                          </span>
                        </div>
                        <p>Thời hạn báo trước 03 ngày quá ngắn so với thông lệ &amp; gây bất lợi cho Bên B.</p>
                        <span className="lawchip">
                          <svg><use href="#i-scale" /></svg>Luật Nhà ở 2023 · Điều 172
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-actions">
                <a className="btn btn-primary btn-lg" href="/app">
                  Rà soát hợp đồng của tôi{" "}
                  <svg width="17" height="17"><use href="#i-arrow" /></svg>
                </a>
              </div>

              {/* Trust strip — real legal foundations the analysis cites (not fabricated metrics) */}
              <div className="hero-trust-strip reveal">
                <span className="tlabel">Căn cứ pháp lý</span>
                <span className="tchip"><svg><use href="#i-scale" /></svg>BLDS 2015</span>
                <span className="tchip"><svg><use href="#i-scale" /></svg>Luật Nhà ở 2023</span>
                <span className="tchip"><svg><use href="#i-scale" /></svg>Luật Công chứng</span>
              </div>

              <p className="hero-guest-note">
                <a href="#features" style={{ color: "var(--ink-faint)", fontWeight: 500 }}>
                  Xem tính năng ↓
                </a>
              </p>
            </div>
          </div>
        </section>


        {/* ===== Value: side with you ===== */}
        <section className="sec band-dark" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="value-grid">
              <div className="reveal">
                <div className="eyebrow">Always on your side</div>
                <h2 style={{ fontSize: "clamp(30px,4vw,46px)", marginTop: 14, color: "#fff" }}>
                  Bộ não pháp lý luôn đứng về phía bạn
                </h2>
                <p style={{ fontSize: 17.5, color: "var(--ink-soft)", marginTop: 18, lineHeight: 1.6, maxWidth: "46ch" }}>
                  Không như chatbot chung chung, FairTerms được thiết kế để bảo vệ{" "}
                  <b style={{ color: "#fff" }}>bên yếu thế</b> — người thuê, người mua. Mỗi cảnh báo soi đúng câu chữ
                  trong hợp đồng và đối chiếu điều luật.
                </p>
                <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: 30 }}>
                  <a className="btn btn-primary btn-lg" href="/app">
                    Bắt đầu miễn phí <svg width="17" height="17"><use href="#i-arrow" /></svg>
                  </a>
                </div>
              </div>
              <ul className="value-list reveal">
                <li>
                  <span className="value-ic"><svg><use href="#i-link" /></svg></span>
                  <div>
                    <strong>Trích dẫn truy vết</strong>
                    <span>Bấm vào mỗi cảnh báo để nhảy đúng câu trong hợp đồng + điều luật áp dụng.</span>
                  </div>
                </li>
                <li>
                  <span className="value-ic"><svg><use href="#i-shield" /></svg></span>
                  <div>
                    <strong>Ưu tiên Bên B</strong>
                    <span>Phân tích từ góc nhìn người thuê / mua — chỉ ra mọi điều bất cân xứng.</span>
                  </div>
                </li>
                <li>
                  <span className="value-ic"><svg><use href="#i-eye" /></svg></span>
                  <div>
                    <strong>Ẩn danh PII</strong>
                    <span>Số CCCD, số điện thoại, địa chỉ được che trước khi đưa vào phân tích.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== Features grid ===== */}
        <section className="sec" id="features">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">Tính năng · Capabilities</div>
              <h2>Mọi việc một luật sư rà hợp đồng sẽ làm</h2>
              <p>Từ phát hiện rủi ro đến gợi ý chỉnh sửa — FairTerms làm trong vài giây, bằng tiếng Việt.</p>
            </div>
            <div className="feat-grid">
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-warn" /></svg></div>
                <h3>Phát hiện điều khoản bất lợi</h3>
                <p>Soi từng điều khoản, gắn mức rủi ro Cao / Trung bình / Thấp và giải thích vì sao bất lợi cho bạn.</p>
              </div>
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-scale" /></svg></div>
                <h3>Đối chiếu điều luật</h3>
                <p>Tham chiếu Bộ luật Dân sự, Luật Nhà ở, Luật Công chứng… để biết điều khoản có trái luật hay không.</p>
              </div>
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-link" /></svg></div>
                <h3>Trích dẫn truy vết</h3>
                <p>Mỗi cảnh báo dẫn ngược về đúng câu trong hợp đồng — không phỏng đoán, có bằng chứng.</p>
              </div>
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-eye" /></svg></div>
                <h3>Ẩn danh PII</h3>
                <p>Thông tin cá nhân được che (CCCD, SĐT, địa chỉ) trước khi phân tích — riêng tư theo mặc định.</p>
              </div>
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-edit" /></svg></div>
                <h3>Gợi ý chỉnh sửa</h3>
                <p>Đề xuất cách viết lại điều khoản công bằng hơn, sẵn sàng sao chép để đàm phán lại.</p>
              </div>
              <div className="feat-card reveal">
                <div className="feat-ic"><svg><use href="#i-compare" /></svg></div>
                <h3>So sánh các version của hợp đồng</h3>
                <p>Đối chiếu bản đã chỉnh sửa với phiên bản gốc để xem từng thay đổi có lợi hay bất lợi cho bạn.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Feature showcase rows ===== */}
        <section className="sec band-soft">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">Cách hoạt động · How it works</div>
              <h2>Xem chính sản phẩm làm việc</h2>
            </div>

            {/* 3-step flow — matches the real product path */}
            <div className="flow-steps reveal">
              <div className="flow-step">
                <div className="flow-ic"><svg><use href="#i-doc" /></svg></div>
                <span className="flow-n tnum">1</span>
                <h4>Tải hợp đồng</h4>
                <p>Kéo thả PDF · DOCX · ảnh — OCR tự nhận dạng nội dung.</p>
              </div>
              <div className="flow-step">
                <div className="flow-ic"><svg><use href="#i-spark" /></svg></div>
                <span className="flow-n tnum">2</span>
                <h4>AI soi điều khoản</h4>
                <p>Chấm rủi ro từng điều &amp; đối chiếu luật Việt Nam.</p>
              </div>
              <div className="flow-step">
                <div className="flow-ic"><svg><use href="#i-link" /></svg></div>
                <span className="flow-n tnum">3</span>
                <h4>Trích dẫn truy vết</h4>
                <p>Mỗi cảnh báo dẫn về đúng câu gốc + căn cứ điều luật.</p>
              </div>
            </div>

            <div className="show-row reveal">
              <div className="show-text">
                <div className="eyebrow muted">01 · Truy vết</div>
                <h3>Mọi cảnh báo đều chỉ đúng câu chữ</h3>
                <p>
                  FairTerms không trả lời chung chung. Mỗi nhận định được neo vào đoạn văn cụ thể trong hợp đồng và
                  điều luật tương ứng — bạn luôn biết &ldquo;vì sao&rdquo;.
                </p>
                <ul className="mini-list">
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Bấm cảnh báo → nhảy tới câu gốc</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Tra cứu điều luật ngay trong trang</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Sao chép trích dẫn để gửi luật sư</li>
                </ul>
              </div>
              <div className="show-visual">
                <div className="trace-line src">
                  <svg width="15" height="15" style={{ flex: "0 0 auto", color: "var(--risk-cao)", marginTop: 1 }}>
                    <use href="#i-warn" />
                  </svg>
                  <span style={{ color: "rgb(10, 48, 94)" }}>
                    &ldquo;…Bên A có quyền giữ toàn bộ tiền đặt cọc nếu Bên B chấm dứt vì <b>bất kỳ lý do nào</b>…&rdquo;
                  </span>
                </div>
                <div className="trace-arrow"><svg><use href="#i-arrow" /></svg></div>
                <div className="trace-line note">
                  <span>
                    <b style={{ color: "var(--ink)" }}>Trái BLDS 2015 Điều 351 &amp; 156</b> — bên vi phạm do sự kiện
                    bất khả kháng không phải chịu trách nhiệm. Điều khoản này nên loại trừ trường hợp khách quan.
                  </span>
                </div>
              </div>
            </div>

            <div className="show-row flip reveal">
              <div className="show-text">
                <div className="eyebrow muted">02 · Riêng tư</div>
                <h3>Ẩn danh PII trước khi phân tích</h3>
                <p>
                  Số CCCD, số điện thoại, địa chỉ thường trú được tự động che. Nội dung pháp lý vẫn được giữ nguyên để
                  phân tích chính xác — còn danh tính của bạn thì không bị lộ.
                </p>
                <ul className="mini-list">
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Che tự động, ngay trên thiết bị</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Không dùng dữ liệu để huấn luyện</li>
                </ul>
              </div>
              <div className="show-visual">
                <div className="pii-row">
                  <span className="k">Họ và tên</span>
                  <span className="v">
                    Nguyễn Thị Lan <span className="mask">A***</span>
                  </span>
                </div>
                <div className="pii-row">
                  <span className="k">Số CCCD</span>
                  <span className="mask">079•••••1234</span>
                </div>
                <div className="pii-row">
                  <span className="k">Điện thoại</span>
                  <span className="mask">093• ••• 432</span>
                </div>
                <div className="pii-row">
                  <span className="k">Địa chỉ</span>
                  <span className="mask">••• Lê Văn Việt, TP. Thủ Đức</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Comparison ===== */}
        <section className="sec" id="compare">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">So sánh · Comparison</div>
              <h2>FairTerms khác gì ChatGPT &amp; Claude?</h2>
              <p>Các trợ lý chung rất giỏi soạn văn bản. FairTerms được xây riêng cho hợp đồng &amp; luật Việt Nam.</p>
            </div>
            <div className="cmp reveal">
              <div className="cmp-row head">
                <div>Khả năng</div>
                <div className="us">FairTerms</div>
                <div>ChatGPT</div>
                <div>Claude</div>
              </div>
              {[
                ["Hiểu ngôn ngữ pháp lý tiếng Việt", "yes", "part", "part"],
                ["Căn cứ điều luật VN (BLDS, Luật Nhà ở)", "yes", "no", "no"],
                ["Trích dẫn truy vết đúng câu trong hợp đồng", "yes", "no", "part"],
                ["Đứng về phía bên thuê / mua", "yes", "no", "no"],
                ["Ẩn danh PII trước khi phân tích", "yes", "no", "no"],
                ["Dashboard rủi ro & checklist thiếu sót", "yes", "no", "no"],
              ].map((row, i) => {
                const cell = (v: string, us = false) => (
                  <div className={"cmp-cell" + (us ? " us" : "")}>
                    {v === "yes" ? (
                      <span className="ic-yes"><svg><use href="#i-check" /></svg></span>
                    ) : v === "no" ? (
                      <span className="ic-no"><svg><use href="#i-x" /></svg></span>
                    ) : (
                      <span className="ic-part">Một phần</span>
                    )}
                  </div>
                );
                return (
                  <div className="cmp-row" key={i}>
                    <div className="cmp-feat">{row[0]}</div>
                    {cell(row[1], true)}
                    {cell(row[2])}
                    {cell(row[3])}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== Security ===== */}
        <section className="sec band-dark" id="security">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">Bảo mật &amp; dữ liệu · Security</div>
              <h2 style={{ color: "#fff" }}>Hợp đồng của bạn luôn riêng tư</h2>
              <p>FairTerms được thiết kế với quyền riêng tư &amp; kiểm soát là cốt lõi.</p>
            </div>
            <div className="sec-grid">
              <div className="sec-card reveal">
                <div className="sec-ic"><svg><use href="#i-eye" /></svg></div>
                <h3>Riêng tư theo mặc định</h3>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>Không dùng dữ liệu của bạn để huấn luyện mô hình.</span></div>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>PII được ẩn danh trước khi phân tích.</span></div>
              </div>
              <div className="sec-card reveal">
                <div className="sec-ic"><svg><use href="#i-lock" /></svg></div>
                <h3>Bảo vệ bằng mã hóa</h3>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>Tài liệu được mã hóa khi truyền &amp; lưu trữ.</span></div>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>Phiên phân tích tự xóa theo yêu cầu.</span></div>
              </div>
              <div className="sec-card reveal">
                <div className="sec-ic"><svg><use href="#i-shield" /></svg></div>
                <h3>Bạn nắm quyền kiểm soát</h3>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>Bạn sở hữu toàn bộ tài liệu &amp; kết quả.</span></div>
                <div className="chk"><span className="ck"><svg><use href="#i-check" /></svg></span><span>Xóa lịch sử bất cứ lúc nào.</span></div>
              </div>
            </div>
            <div className="trust-badges reveal">
              <span className="trust-badge"><svg><use href="#i-lock" /></svg>Mã hóa khi truyền &amp; lưu trữ</span>
              <span className="trust-badge"><svg><use href="#i-eye" /></svg>Ẩn danh PII trước phân tích</span>
              <span className="trust-badge"><svg><use href="#i-shield" /></svg>Không dùng để huấn luyện</span>
            </div>
          </div>
        </section>

        {/* ===== Pricing ===== */}
        <section className="sec band-soft" id="pricing">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">Bảng giá · Pricing</div>
              <h2>Dùng miễn phí ngay hôm nay</h2>
              <p>Không cần đăng ký thẻ — bắt đầu ngay trong vài giây.</p>
            </div>
            <div className="price-grid reveal" style={{ gridTemplateColumns: "1fr", maxWidth: 460 }}>
              <div className="price">
                <div className="tier">Miễn phí</div>
                <div className="amt tnum">
                  0<small> đ</small>
                </div>
                <div className="per">cho mọi người dùng</div>
                <div className="price-cta">
                  <a className="btn btn-primary" href="/app">Bắt đầu miễn phí</a>
                </div>
                <ul>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>5 lượt phân tích hợp đồng đầy đủ / tháng</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>10 lượt phân tích điều khoản / tháng</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Trích dẫn truy vết &amp; căn cứ điều luật</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Ẩn danh thông tin cá nhân (PII)</li>
                  <li><span className="ck"><svg><use href="#i-check" /></svg></span>Hỗ trợ PDF · DOCX · ảnh (OCR)</li>
                </ul>
              </div>
            </div>
            <p className="reveal" style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "var(--ink-faint)" }}>
              Các gói trả phí với lượt phân tích không giới hạn &amp; tính năng nâng cao sẽ sớm ra mắt.
            </p>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="sec" id="faq">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">Câu hỏi · FAQ</div>
              <h2>Mọi điều bạn cần biết</h2>
            </div>
            <div className="faq reveal">
              {FAQ_ITEMS.map((item, i) => {
                const open = faqOpen === i;
                return (
                  <div className={"faq-item" + (open ? " open" : "")} key={i}>
                    <button className="faq-q" onClick={() => setFaqOpen(open ? -1 : i)}>
                      {item.q}
                      <span className="ico"><svg><use href="#i-plus" /></svg></span>
                    </button>
                    <div className="faq-a">
                      <div className="faq-a-inner">{item.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CTA band ===== */}
        <section className="cta-band band-dark">
          <div className="cta-mesh"></div>
          <div className="wrap reveal">
            <h2>Sẵn sàng rà soát hợp đồng của bạn?</h2>
            <p>Hiểu rõ từng điều khoản trong vài giây — miễn phí cho hợp đồng đầu tiên.</p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href="/app">
                Rà soát ngay <svg width="17" height="17"><use href="#i-arrow" /></svg>
              </a>
              <a className="btn btn-on-dark btn-lg" href="/app">
                Đăng nhập
              </a>
            </div>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer className="foot">
          <div className="wrap">
            <div className="foot-grid">
              <div className="foot-brand">
                <a className="brand" href="#top">
                  <LogoMark size={36} />
                  <span className="name">
                    Fair<b>Terms</b>
                  </span>
                </a>
                <p>Bộ não pháp lý đứng về phía bạn — hiểu rõ mọi điều khoản trước khi đặt bút ký.</p>
              </div>
              <div className="foot-col">
                <h4>Sản phẩm</h4>
                <a href="/app">Phân tích một điều khoản</a>
                <a href="/app">Phân tích cả hợp đồng</a>
                <a href="#features">Tính năng</a>
                <a href="#pricing">Bảng giá</a>
              </div>
              <div className="foot-col">
                <h4>Tài nguyên</h4>
                <a href="/hop-dong-mau">Hợp đồng mẫu</a>
                <a href="#compare">So sánh với LLM</a>
                <a href="#security">Bảo mật &amp; dữ liệu</a>
                <a href="#faq">Câu hỏi thường gặp</a>
                <a href="/app">Bắt đầu</a>
              </div>
              <div className="foot-col">
                <h4>Công ty</h4>
                <a href="#top">Về FairTerms</a>
                <a href="#top">Liên hệ</a>
                <a href="#top">Điều khoản</a>
                <a href="#top">Chính sách bảo mật</a>
              </div>
            </div>
            <div className="foot-bot">
              <span className="cr">© 2026 FairTerms. Mọi quyền được bảo lưu.</span>
              <div className="foot-social">
                <a href="#top" aria-label="LinkedIn"><svg><use href="#i-in" /></svg></a>
                <a href="#top" aria-label="Facebook"><svg><use href="#i-fb" /></svg></a>
                <a href="#top" aria-label="YouTube"><svg><use href="#i-yt" /></svg></a>
              </div>
            </div>
            <p className="foot-note">
              <svg><use href="#i-info" /></svg>
              <span>
                FairTerms là công cụ hỗ trợ rà soát do AI tạo ra, <b>không phải tư vấn pháp lý</b>. Mọi quyết định ký
                kết nên tham khảo thêm luật sư hoặc chuyên gia.
              </span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
