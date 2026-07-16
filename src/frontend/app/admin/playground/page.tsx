"use client";

import { useState } from "react";
import { adminSearchTestRAG } from "@/lib/api/client";
import type { AdminRAGSearchResult } from "@/lib/api/types";

export default function RAGPlaygroundPage() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<AdminRAGSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setSearched(true);
    try {
      const res = await adminSearchTestRAG(query, topK);
      setResults(res);
    } catch (err: unknown) {
      console.error("Search failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Truy vấn kiểm thử RAG thất bại.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header">
        <h2 className="adm-page-title">RAG Playground</h2>
        <p className="adm-page-sub">
          Tìm kiếm ngữ nghĩa trực tiếp trên ChromaDB — kiểm tra chất lượng trích xuất và điểm tương đồng.
        </p>
      </div>

      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      {/* Query form */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Truy vấn vector store</span>
        </div>
        <div className="adm-card-body">
          <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập câu hỏi hoặc từ khóa cần tra cứu (ví dụ: 'điều khoản đặt cọc', 'chậm bàn giao nhà')..."
              className="adm-input"
              rows={3}
              required
              style={{ resize: "vertical", lineHeight: "1.5" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label className="adm-label" style={{ marginBottom: 0, whiteSpace: "nowrap" }}>
                Số kết quả (top_k):
              </label>
              <select
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                className="adm-select"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="adm-btn adm-btn--primary"
                style={{ marginLeft: "auto" }}
              >
                {loading ? "Đang truy vấn..." : "🔍 Tìm kiếm"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      {(searched || results.length > 0) && (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Kết quả tìm kiếm</span>
            {!loading && searched && (
              <span className="adm-badge adm-badge--primary">{results.length} chunks</span>
            )}
          </div>
          <div style={{ padding: "16px" }}>
            {loading ? (
              <div className="adm-empty">Đang truy vấn vector store và tính toán similarity scores...</div>
            ) : results.length === 0 ? (
              <div className="adm-empty">Không tìm thấy đoạn trích luật nào phù hợp.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {results.map((res, i) => {
                  const scoreBadge =
                    res.score > 0.75
                      ? "adm-badge--green"
                      : res.score > 0.5
                      ? "adm-badge--amber"
                      : "adm-badge--red";

                  return (
                    <div key={i} className="adm-result-item">
                      <div className="adm-result-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="adm-badge adm-badge--primary">Chunk #{i + 1}</span>
                          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
                            {res.doc_id}
                          </span>
                          {res.article && (
                            <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                              📍 {res.article}
                            </span>
                          )}
                        </div>
                        <span className={`adm-badge ${scoreBadge}`}>
                          Score: {res.score.toFixed(4)}
                        </span>
                      </div>
                      <p className="adm-result-text" style={{ whiteSpace: "pre-wrap" }}>
                        {res.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!searched && (
        <div
          style={{
            padding: "16px 20px",
            background: "var(--paper-2)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            fontSize: "13px",
            color: "var(--ink-soft)",
          }}
        >
          <strong style={{ color: "var(--ink)" }}>Hướng dẫn:</strong>{" "}
          Score &gt; 0.75 = 🟢 Rất khớp · 0.5–0.75 = 🟡 Tương đối · &lt; 0.5 = 🔴 Không khớp. Dùng để kiểm tra chất lượng vector embedding sau khi nạp tài liệu mới.
        </div>
      )}
    </div>
  );
}
