"use client";
/* ============================================================
   HopDongAI — Panel hiển thị hợp đồng gốc (cột phải)
   Tách từ ContractMode để dùng lại cho trang chia sẻ read-only.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { Party } from "@/app/fairterms/lib/data";
import { isPlaceholderValue } from "@/lib/api/mappers";
import type { ContractData } from "@/lib/contractData";

const MISSING_DOTS = "..........";
const MISSING_DOTS_LONG = "................................";

function partyValue(value: string | null | undefined): string | null {
  if (isPlaceholderValue(value)) return null;
  return value!.trim();
}

function PartyDocSection({ party, marginBottom = 16 }: { party: Party; marginBottom?: number }) {
  const hoTen = partyValue(party.ho_ten);
  const cccd = partyValue(party.cccd);
  const ngayCap = partyValue(party.ngay_cap);
  const noiCap = partyValue(party.noi_cap);
  const diaChi = partyValue(party.dia_chi);
  const sdt = partyValue(party.sdt);

  return (
    <div style={{ marginBottom }}>
      <div style={{ fontWeight: 700 }}>{party.nhan.toUpperCase()}:</div>
      <div>
        Họ và tên: {hoTen ? <strong>{hoTen}</strong> : MISSING_DOTS}
      </div>
      <div>
        CCCD số:{" "}
        {cccd ? (
          <>
            {cccd}
            {ngayCap ? `    Ngày cấp: ${ngayCap}` : `    Ngày cấp: ${MISSING_DOTS}`}
            {noiCap ? `    Nơi cấp: ${noiCap}` : `    Nơi cấp: ${MISSING_DOTS}`}
          </>
        ) : (
          MISSING_DOTS
        )}
      </div>
      <div>Địa chỉ thường trú: {diaChi ?? MISSING_DOTS_LONG}</div>
      <div>Điện thoại liên hệ: {sdt ?? MISSING_DOTS}</div>
    </div>
  );
}

export function ContractDocPanel({ data, highlightId }: { data: ContractData; highlightId?: string | null }) {
  const [zoom, setZoom] = useState(100);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightId || !scrollAreaRef.current) return;
    const el = document.getElementById("doc-" + highlightId);
    if (!el) return;
    const container = scrollAreaRef.current;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop + elRect.top - containerRect.top - container.clientHeight / 2 + elRect.height / 2;
    container.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
  }, [highlightId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper-2, #f2f2f4)" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        flexShrink: 0,
        gap: 12,
      }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {data.fileName || data.documentTitle}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setZoom(z => Math.max(60, z - 10))}
            style={{ width: 26, height: 26, border: "1px solid var(--line-strong)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", color: "var(--ink)", fontFamily: "inherit" }}
          >−</button>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", minWidth: 40, textAlign: "center" }}>{zoom}%</span>
          <button
            onClick={() => setZoom(z => Math.min(150, z + 10))}
            style={{ width: 26, height: 26, border: "1px solid var(--line-strong)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", color: "var(--ink)", fontFamily: "inherit" }}
          >+</button>
        </div>
      </div>

      {/* Document scroll area */}
      <div ref={scrollAreaRef} style={{ flex: 1, overflowY: "auto", padding: "20px 14px" }}>
        <div style={{
          maxWidth: 680,
          margin: "0 auto",
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
          borderRadius: 3,
          padding: `${44 * zoom / 100}px ${52 * zoom / 100}px ${52 * zoom / 100}px`,
          fontSize: 14 * zoom / 100,
          lineHeight: 1.75,
          fontFamily: "'Times New Roman', Times, serif",
          color: "#111",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 22 * zoom / 100 }}>
            <div style={{ fontWeight: 700, letterSpacing: ".04em", marginBottom: 4 }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div style={{ fontStyle: "italic", textDecoration: "underline", marginBottom: 18 }}>
              Độc lập - Tự do - Hạnh phúc
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1em", marginBottom: 6 }}>
              {data.documentTitle.toUpperCase()}
            </div>
            {data.contractInfo.so_hd && data.contractInfo.so_hd !== "—" && (
              <div>Số: {data.contractInfo.so_hd}</div>
            )}
          </div>

          {/* Opening */}
          {data.contractInfo.ngay_ky && data.contractInfo.ngay_ky !== "—" && (
            <p style={{ textAlign: "center", fontStyle: "italic", margin: "0 0 16px" }}>
              Hôm nay, {data.contractInfo.ngay_ky},
            </p>
          )}
          <p style={{ margin: "0 0 16px" }}>Chúng tôi gồm các bên dưới đây:</p>

          {/* Bên A */}
          <PartyDocSection party={data.benA} />

          {/* Bên B */}
          <PartyDocSection party={data.benB} marginBottom={20} />

          <p style={{ margin: "0 0 24px" }}>
            Hai bên cùng thỏa thuận và thống nhất ký kết {data.contractInfo.loai} với các điều khoản cụ thể như sau:
          </p>

          {/* Điều khoản */}
          {data.contract.map(art => (
            <div key={art.so_dieu} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase", marginTop: 20, marginBottom: 8 }}>
                {art.so_dieu}: {art.tieu_de}
              </div>
              {art.paragraphs.filter(p => p.text.trim()).map(p => (
                <p
                  key={p.id}
                  id={"doc-" + p.id}
                  style={{
                    margin: "0 0 8px",
                    borderRadius: 3,
                    padding: "2px 4px",
                    background: p.id === highlightId ? "rgba(250, 200, 50, 0.35)" : "transparent",
                    transition: "background 0.4s",
                  }}
                >
                  {p.text}
                </p>
              ))}
            </div>
          ))}

          {/* Phụ lục: bảng thống kê trang thiết bị */}
          {data.devices.length > 0 && (() => {
            const hasDvt = data.devices.some((d) => d.dvt);
            return (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                Phụ lục: Thống kê trang thiết bị
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "left", width: "6%" }}>#</th>
                    <th style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "left" }}>Hạng mục bàn giao</th>
                    {hasDvt && (
                      <th style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "center", width: "10%" }}>ĐVT</th>
                    )}
                    <th style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "center", width: "14%" }}>Số lượng</th>
                    <th style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "left", width: "28%" }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devices.map((d, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #333", padding: "4px 8px" }}>{i + 1}</td>
                      <td style={{ border: "1px solid #333", padding: "4px 8px" }}>{d.ten}</td>
                      {hasDvt && (
                        <td style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "center" }}>{d.dvt ?? "—"}</td>
                      )}
                      <td style={{ border: "1px solid #333", padding: "4px 8px", textAlign: "center" }}>{d.so_luong}</td>
                      <td style={{ border: "1px solid #333", padding: "4px 8px" }}>{d.tinh_trang}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
