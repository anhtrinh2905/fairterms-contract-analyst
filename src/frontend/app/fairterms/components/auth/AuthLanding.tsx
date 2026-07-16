"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Icon } from "../ui/icons";
import { LogoMark } from "../ui/LogoMark";
import { AuthPromoPanel } from "./AuthPromoPanel";

export function AuthLanding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginGoogle = async () => {
    setError("");
    setLoading(true);

    try {
      await signIn("google", { callbackUrl: "/app" });
    } catch {
      setLoading(false);
      setError("Không thể bắt đầu đăng nhập Google. Vui lòng thử lại.");
    }
  };

  return (
    <div className="auth-stage">
      <div className="auth-left">
        <div className="auth-logo">
          <LogoMark size={34} />
          <span className="auth-logo-name">
            Fair<b>Terms</b>
          </span>
        </div>

        <div className="auth-panel">
          <div className="auth-card rise">
            <h1 className="auth-title">Đăng nhập</h1>
            <p className="auth-card-sub">
              Đăng nhập bằng Google để lưu lịch sử phân tích và đồng bộ trên các thiết bị.
            </p>

            <div className="auth-cw-label">Tiếp tục với:</div>
            <button type="button" className="auth-google-btn" onClick={loginGoogle} disabled={loading}>
              {loading ? <span className="auth-spinner" /> : <Icon.google style={{ width: 20, height: 20 }} />}
              <span>Google</span>
            </button>

            {error && <div className="auth-error">{error}</div>}

            <p className="auth-fine">
              Khi tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của FairTerms.
            </p>
          </div>
        </div>

        <div className="auth-copy">© 2026 FairTerms.</div>
      </div>

      <AuthPromoPanel />
    </div>
  );
}
