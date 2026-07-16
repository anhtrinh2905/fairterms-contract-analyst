"use client";

import { useEffect, useState } from "react";
import { adminGetAIConfig, adminSaveAIConfig, adminPingOpenAI, adminPingGemini } from "@/lib/api/client";
import type { AdminAIConfigSave } from "@/lib/api/types";

export default function AIConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Config states
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("gpt-4o");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [geminiStructuringModel, setGeminiStructuringModel] = useState("gemini-2.5-flash");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [concurrencyLimit, setConcurrencyLimit] = useState(10);

  // Ping states
  const [pingingOpenAI, setPingingOpenAI] = useState(false);
  const [pingingGemini, setPingingGemini] = useState(false);
  const [openaiLatency, setOpenaiLatency] = useState<number | null>(null);
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const config = await adminGetAIConfig();
        if (active) {
          setOpenaiConfigured(config.openai_api_key_configured);
          setGeminiConfigured(config.gemini_api_key_configured);
          setDefaultModel(config.default_model);
          setGeminiModel(config.gemini_model);
          setGeminiStructuringModel(config.gemini_structuring_model);
          setEmbeddingModel(config.embedding_model);
          setConcurrencyLimit(config.concurrency_limit);
        }
      } catch (err: unknown) {
        console.error("Failed to load AI config:", err);
        if (active) setErrorMsg("Không thể tải cấu hình AI từ backend.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadConfig();
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload: AdminAIConfigSave = {
        default_model: defaultModel,
        gemini_model: geminiModel,
        gemini_structuring_model: geminiStructuringModel,
        embedding_model: embeddingModel,
        concurrency_limit: concurrencyLimit,
      };
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();

      await adminSaveAIConfig(payload);
      setSuccessMsg("Cập nhật cấu hình AI thành công!");
      setOpenaiKey("");
      setGeminiKey("");

      const config = await adminGetAIConfig();
      setOpenaiConfigured(config.openai_api_key_configured);
      setGeminiConfigured(config.gemini_api_key_configured);
    } catch (err: unknown) {
      console.error("Failed to save config:", err);
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  const pingOpenAI = async () => {
    setPingingOpenAI(true);
    setOpenaiLatency(null);
    try {
      const result = await adminPingOpenAI();
      setOpenaiLatency(result.latency_ms);
    } catch {
      setOpenaiLatency(-1);
    } finally {
      setPingingOpenAI(false);
    }
  };

  const pingGemini = async () => {
    setPingingGemini(true);
    setGeminiLatency(null);
    try {
      const result = await adminPingGemini();
      setGeminiLatency(result.latency_ms);
    } catch {
      setGeminiLatency(-1);
    } finally {
      setPingingGemini(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--ink-soft)", fontSize: "14px", padding: "32px" }}>Đang tải thông số AI...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header">
        <h2 className="adm-page-title">Cấu hình Mô hình AI & Quản lý API</h2>
        <p className="adm-page-sub">
          Quản lý API key, thiết lập mô hình AI mặc định và kiểm soát hiệu suất hoạt động của hệ thống.
          Cấu hình mô hình được lưu vào volume logs trên server; API key nên cấu hình qua biến môi trường khi deploy.
        </p>
      </div>

      {successMsg && <div className="adm-alert adm-alert--success">{successMsg}</div>}
      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      {/* Provider status bar */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Trạng thái AI Providers</span>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="adm-provider-card">
            <div>
              <div className="adm-provider-name">OpenAI (GPT-4o)</div>
              <div className="adm-provider-endpoint">api.openai.com/v1 · model: {defaultModel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className={`adm-badge ${openaiConfigured ? "adm-badge--green" : "adm-badge--red"}`}>
                {openaiConfigured ? "● Configured" : "○ Not set"}
              </span>
              {openaiLatency !== null && (
                <span className="adm-provider-latency" style={{ color: openaiLatency > 0 ? "var(--risk-khong)" : "var(--risk-cao)" }}>
                  {openaiLatency > 0 ? `${openaiLatency} ms` : "Error"}
                </span>
              )}
              <button
                type="button"
                onClick={pingOpenAI}
                disabled={pingingOpenAI}
                className="adm-btn adm-btn--ghost adm-btn--sm"
              >
                {pingingOpenAI ? "Đang ping..." : "Ping"}
              </button>
            </div>
          </div>

          <div className="adm-provider-card">
            <div>
              <div className="adm-provider-name">Google Gemini</div>
              <div className="adm-provider-endpoint">generativelanguage.googleapis.com · model: {geminiModel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className={`adm-badge ${geminiConfigured ? "adm-badge--green" : "adm-badge--red"}`}>
                {geminiConfigured ? "● Configured" : "○ Not set"}
              </span>
              {geminiLatency !== null && (
                <span className="adm-provider-latency" style={{ color: geminiLatency > 0 ? "var(--risk-khong)" : "var(--risk-cao)" }}>
                  {geminiLatency > 0 ? `${geminiLatency} ms` : "Error"}
                </span>
              )}
              <button
                type="button"
                onClick={pingGemini}
                disabled={pingingGemini}
                className="adm-btn adm-btn--ghost adm-btn--sm"
              >
                {pingingGemini ? "Đang ping..." : "Ping"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Config form: 2 columns */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="adm-2col">
          {/* API Credentials */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">API Credentials</span>
            </div>
            <div className="adm-card-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="adm-label" style={{ marginBottom: 0 }}>OpenAI API Key</label>
                  <span className={`adm-badge ${openaiConfigured ? "adm-badge--green" : "adm-badge--red"}`}>
                    {openaiConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                  </span>
                </div>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={openaiConfigured ? "••••••••••••••• (để trống = giữ nguyên)" : "Nhập sk-... API Key"}
                  className="adm-input"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="adm-label" style={{ marginBottom: 0 }}>Gemini API Key</label>
                  <span className={`adm-badge ${geminiConfigured ? "adm-badge--green" : "adm-badge--red"}`}>
                    {geminiConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                  </span>
                </div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={geminiConfigured ? "••••••••••••••• (để trống = giữ nguyên)" : "Nhập AIza... API Key"}
                  className="adm-input"
                />
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Thiết lập Mô hình</span>
            </div>
            <div className="adm-card-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="adm-label">Mô hình phân tích (OpenAI)</label>
                <select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} className="adm-select" style={{ width: "100%" }}>
                  <option value="gpt-4o">gpt-4o (Được đề xuất)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (Tốc độ cao)</option>
                  <option value="gpt-4-turbo">gpt-4-turbo (Legacy)</option>
                </select>
              </div>

              <div>
                <label className="adm-label">Mô hình OCR (Gemini)</label>
                <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="adm-select" style={{ width: "100%" }}>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Mặc định)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Độ chính xác cao)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy)</option>
                </select>
              </div>

              <div>
                <label className="adm-label">Mô hình Structuring (Gemini)</label>
                <select value={geminiStructuringModel} onChange={(e) => setGeminiStructuringModel(e.target.value)} className="adm-select" style={{ width: "100%" }}>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="adm-label">Embedding Model</label>
                  <select value={embeddingModel} onChange={(e) => setEmbeddingModel(e.target.value)} className="adm-select" style={{ width: "100%" }}>
                    <option value="text-embedding-3-small">3-small</option>
                    <option value="text-embedding-3-large">3-large</option>
                  </select>
                </div>
                <div>
                  <label className="adm-label">Concurrency limit</label>
                  <input
                    type="number"
                    value={concurrencyLimit}
                    onChange={(e) => setConcurrencyLimit(parseInt(e.target.value, 10))}
                    className="adm-input"
                    min={1}
                    max={50}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} className="adm-btn adm-btn--primary">
            {saving ? "Đang lưu..." : "💾 Lưu cấu hình"}
          </button>
        </div>
      </form>
    </div>
  );
}
