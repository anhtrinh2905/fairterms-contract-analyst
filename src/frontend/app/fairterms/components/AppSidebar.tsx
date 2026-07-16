"use client";
/* ============================================================
   HopDongAI — Sidebar dùng chung cho app-shell (SPA /app) và các
   trang standalone (lịch sử, kết quả so sánh…) cần hiển thị cùng
   khung điều hướng. Tách khỏi FairTermsApp.tsx để tái sử dụng.
   ============================================================ */
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "./ui/icons";
import { LogoMark } from "./ui/LogoMark";
import QuotaBadge from "./QuotaBadge";

export type View = "overview" | "clause" | "contract" | "templates" | "compare";

export type AppAuth = {
  name: string;
  email?: string;
  plan?: "pro" | "biz" | "free" | string;
};

/* ---------- User settings popup ---------- */
function UserSettingsPopup({
  auth,
  onLogout,
  onClose,
  anchorRef,
}: {
  auth: AppAuth;
  onLogout: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const initial = (auth.name || "U").trim().charAt(0).toUpperCase();
  const planLabel = auth.plan === "pro" ? "Cá nhân" : auth.plan === "biz" ? "Doanh nghiệp" : "Miễn phí";
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({ bottom: 130, left: 8, width: 224 });

  useLayoutEffect(() => {
    if (anchorRef && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPopupStyle({
        bottom: window.innerHeight - r.top + 8,
        left: r.left,
        width: Math.max(r.width, 224),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={onClose} />
      <div className="user-popup" style={popupStyle}>
        <div className="up-email">{auth.email}</div>

        <div className="up-sep" />
        <button
          className="up-plan-row"
          onClick={() => {
            alert("Nâng cấp gói đang phát triển.");
            onClose();
          }}
        >
          <div className="up-plan-av">{initial}</div>
          <div className="up-plan-info">
            <span className="up-plan-name">{auth.name}</span>
            <span className="up-plan-sub">{planLabel}</span>
          </div>
          <Icon.chevron style={{ width: 14, height: 14, color: "var(--ink-faint)", transform: "rotate(-90deg)" }} />
        </button>

        <div className="up-sep" />
        <button
          className="up-item"
          onClick={() => {
            alert("Nâng cấp gói dịch vụ.");
            onClose();
          }}
        >
          <Icon.bolt style={{ width: 15, height: 15 }} /> Nâng cấp gói
        </button>

        <div className="up-sep" />
        <button
          className="up-item"
          onClick={() => {
            alert("Điều khoản sử dụng FairTerms.");
            onClose();
          }}
        >
          <Icon.doc style={{ width: 15, height: 15 }} /> Điều khoản sử dụng
        </button>
        <button
          className="up-item"
          onClick={() => {
            alert("Chính sách bảo mật FairTerms.");
            onClose();
          }}
        >
          <Icon.shield style={{ width: 15, height: 15 }} /> Chính sách bảo mật
        </button>

        <div className="up-sep" />
        <button
          className="up-item danger"
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          <Icon.logout style={{ width: 15, height: 15 }} /> Đăng xuất
        </button>
      </div>
    </>
  );
}

/* ---------- Sidebar ---------- */
export function AppSidebar({
  auth,
  view,
  setView,
  onLogout,
}: {
  auth: AppAuth;
  view: View;
  setView: (v: View) => void;
  onLogout: () => void;
}) {
  const [showPopup, setShowPopup] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);

  return (
    <aside className="app-sidebar" style={{ position: "relative" }}>
      {/* Brand */}
      <div className="sb-brand" onClick={() => setView("overview")} style={{ cursor: "pointer" }}>
        <LogoMark size={27} className="sb-logo" />
        <span className="sb-brand-name">
          Fair<b>Terms</b>
        </span>
      </div>

      {/* Overview */}
      <div className="sb-section">
        <button className={"sb-nav-item" + (view === "overview" ? " active" : "")} onClick={() => setView("overview")}>
          <Icon.grid style={{ width: 16, height: 16 }} />
          <span>Tổng quan</span>
        </button>
      </div>

      {/* Tools */}
      <nav className="sb-nav">
        <div className="sb-nav-label">Công cụ</div>
        <button className={"sb-nav-item" + (view === "clause" ? " active" : "")} onClick={() => setView("clause")}>
          <Icon.clause style={{ width: 16, height: 16 }} />
          <span>Phân tích điều khoản</span>
        </button>
        <button className={"sb-nav-item" + (view === "contract" ? " active" : "")} onClick={() => setView("contract")}>
          <Icon.contract style={{ width: 16, height: 16 }} />
          <span>Phân tích hợp đồng</span>
        </button>
        <button className={"sb-nav-item" + (view === "compare" ? " active" : "")} onClick={() => setView("compare")}>
          <Icon.compare style={{ width: 16, height: 16 }} />
          <span>So sánh hợp đồng</span>
        </button>

        <div className="sb-nav-label" style={{ marginTop: 10 }}>
          Tài nguyên
        </div>
        <button className={"sb-nav-item" + (view === "templates" ? " active" : "")} onClick={() => setView("templates")}>
          <Icon.template style={{ width: 16, height: 16 }} />
          <span>Hợp đồng mẫu</span>
        </button>
      </nav>

      <div style={{ flex: 1 }} />

      <QuotaBadge />

      {/* Footer */}
      <div className="sb-foot">
        <>
          {showPopup && (
            <UserSettingsPopup auth={auth} onLogout={onLogout} onClose={() => setShowPopup(false)} anchorRef={chipRef} />
          )}
          <button ref={chipRef} className="sb-user-chip" onClick={() => setShowPopup((v) => !v)}>
            <span className="sb-av">{(auth.name || "U").trim().charAt(0).toUpperCase()}</span>
            <div className="sb-user-info">
              <div className="sb-user-name">{auth.name}</div>
              <div className="sb-user-sub">{auth.email}</div>
            </div>
            <Icon.chevron style={{ width: 14, height: 14, color: "var(--ink-faint)", transform: "rotate(-90deg)", flexShrink: 0 }} />
          </button>
        </>
      </div>
    </aside>
  );
}
