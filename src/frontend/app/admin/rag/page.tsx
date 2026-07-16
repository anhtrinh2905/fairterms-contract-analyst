"use client";

import { useEffect, useState } from "react";
import { adminFetchRAGDocuments, adminIngestRAGDocument, adminIngestRAGText } from "@/lib/api/client";
import type { AdminRAGDocInfo } from "@/lib/api/types";

type IngestMode = "file" | "paste";

export default function RAGManagementPage() {
  const [documents, setDocuments] = useState<AdminRAGDocInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [ingestMode, setIngestMode] = useState<IngestMode>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteTitle, setPasteTitle] = useState("van_ban_dan");
  const [pasteContent, setPasteContent] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function loadDocuments() {
    try {
      const docs = await adminFetchRAGDocuments();
      setDocuments(docs);
      setErrorMsg("");
    } catch {
      setErrorMsg("Không thể kết nối với dịch vụ backend RAG.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function fetchDocs() {
      try {
        const docs = await adminFetchRAGDocuments();
        if (active) {
          setDocuments(docs);
          setErrorMsg("");
        }
      } catch (err: unknown) {
        console.error("Failed to load documents:", err);
        if (active) setErrorMsg("Không thể kết nối với dịch vụ backend RAG.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDocs();
    return () => { active = false; };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      let res: { success: boolean; parents: number; children: number };
      if (ingestMode === "file") {
        if (!selectedFile) return;
        res = await adminIngestRAGDocument(selectedFile);
        setSelectedFile(null);
        const input = document.getElementById("rag-file-input") as HTMLInputElement;
        if (input) input.value = "";
      } else {
        if (!pasteContent.trim()) return;
        res = await adminIngestRAGText(pasteTitle.trim() || "van_ban_dan", pasteContent);
        setPasteContent("");
      }

      if (res.success) {
        setSuccessMsg(
          `Nạp thành công! Đã xử lý ${res.parents} đoạn chính và ${res.children} đoạn phụ.`
        );
        await loadDocuments();
      }
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Nạp tài liệu thất bại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header">
        <h2 className="adm-page-title">Cơ sở dữ liệu pháp luật (RAG)</h2>
        <p className="adm-page-sub">
          Nạp văn bản luật định dạng Markdown (.md) hoặc dán nội dung trực tiếp vào ChromaDB vector store.
        </p>
      </div>

      {successMsg && <div className="adm-alert adm-alert--success">{successMsg}</div>}
      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      <div className="adm-3col">
        {/* Upload panel */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Nạp tài liệu mới</span>
          </div>
          <div className="adm-card-body">
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <button
                type="button"
                className={`adm-btn adm-btn--sm ${ingestMode === "file" ? "adm-btn--primary" : "adm-btn--ghost"}`}
                onClick={() => setIngestMode("file")}
              >
                Tải file .md
              </button>
              <button
                type="button"
                className={`adm-btn adm-btn--sm ${ingestMode === "paste" ? "adm-btn--primary" : "adm-btn--ghost"}`}
                onClick={() => setIngestMode("paste")}
              >
                Dán văn bản
              </button>
            </div>

            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {ingestMode === "file" ? (
                <label
                  htmlFor="rag-file-input"
                  className={`adm-upload-zone${dragOver ? " drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setSelectedFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <div className="adm-upload-icon">📄</div>
                  <div>
                    <div className="adm-upload-label">
                      {selectedFile ? selectedFile.name : "Kéo thả file hoặc click để chọn"}
                    </div>
                    <div className="adm-upload-sub" style={{ marginTop: "4px" }}>
                      Chỉ chấp nhận file .md (Markdown)
                    </div>
                  </div>
                  <input
                    id="rag-file-input"
                    type="file"
                    accept=".md"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <>
                  <div>
                    <label className="adm-label">Tên tài liệu</label>
                    <input
                      type="text"
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                      className="adm-input"
                      placeholder="vd: luat_dat_dai_2024"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Nội dung Markdown</label>
                    <textarea
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      className="adm-input"
                      rows={12}
                      placeholder="Dán nội dung văn bản luật định dạng Markdown..."
                      style={{ resize: "vertical", fontFamily: "monospace", lineHeight: 1.5 }}
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={
                  uploading ||
                  (ingestMode === "file" ? !selectedFile : !pasteContent.trim())
                }
                className="adm-btn adm-btn--primary"
              >
                {uploading ? "Đang xử lý..." : "🚀 Nạp vào RAG"}
              </button>
            </form>
          </div>
        </div>

        {/* Document list */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Văn bản luật đã nạp</span>
            {!loading && (
              <span className="adm-badge adm-badge--primary">{documents.length} tài liệu</span>
            )}
          </div>
          <div className="adm-table-wrap">
            {loading ? (
              <div className="adm-empty">Đang tải danh sách tài liệu...</div>
            ) : documents.length === 0 ? (
              <div className="adm-empty">Hiện chưa có tài liệu nào trong ChromaDB.</div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Tên văn bản</th>
                    <th>Số hiệu / Loại</th>
                    <th>Ngày hiệu lực</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.doc_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "13px" }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "2px" }}>
                          {doc.source_file}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px" }}>{doc.so_hieu || "—"}</div>
                        <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                          {doc.loai_van_ban || "Văn bản luật"}
                        </div>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {doc.ngay_hieu_luc
                          ? new Date(doc.ngay_hieu_luc).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
