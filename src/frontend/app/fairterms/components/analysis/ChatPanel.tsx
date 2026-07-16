"use client";
/* ============================================================
   HopDongAI — Tính năng 5: Hỏi đáp hội thoại trên hợp đồng
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/icons";
import { LawChip } from "../ui/primitives";
import { chat_answers, chat_suggestions, citationFromLabel, phan_tich } from "../../lib/data";

interface ChatMessage {
  role: "bot" | "user";
  text: string;
  refs?: string[];
  laws?: string[];
}

export function ChatPanel({
  open,
  onClose,
  onJump,
}: {
  open: boolean;
  onClose: () => void;
  onJump?: (id: string) => void;
}) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Xin chào! Mình là trợ lý HopDongAI. Hỏi mình bất cứ điều gì về hợp đồng này — mình luôn trả lời kèm trích dẫn điều khoản và căn cứ pháp luật, ưu tiên bảo vệ quyền lợi của bạn (Bên B).",
      refs: [],
      laws: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing]);

  const ask = (q?: string) => {
    const question = (q || input).trim();
    if (!question) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const a = chat_answers[question] || chat_answers.__default__;
      setMsgs((m) => [...m, { role: "bot", text: a.text, refs: a.refs || [], laws: a.laws || [] }]);
      setTyping(false);
    }, 950);
  };

  return (
    <div className={"chat-dock" + (open ? " open" : "")} aria-hidden={!open}>
      <div className="chat-head">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--primary)",
              color: "#fbf8f1",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon.chat style={{ width: 16, height: 16 }} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, fontFamily: "var(--font-display)" }}>
              Hỏi đáp trên hợp đồng
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
              Trả lời kèm trích dẫn · bảo vệ Bên B
            </div>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} style={{ width: 32, height: 32 }}>
          <Icon.x style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"chat-msg " + m.role}>
            <div className="bubble">
              {m.text}
              {m.refs && m.refs.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                  {m.refs.map((rid) => {
                    const pa = phan_tich.find((p) => p.id === rid);
                    return (
                      <button
                        key={rid}
                        className="copy-btn"
                        style={{ padding: "4px 9px", fontSize: 11.5 }}
                        onClick={() => onJump && onJump(rid)}
                      >
                        <Icon.link style={{ width: 12, height: 12 }} /> {pa ? pa.so_dieu : rid}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {m.laws && m.laws.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {m.laws.map((l, j) => (
                    <LawChip key={j} citation={citationFromLabel(l)} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {typing ? (
          <div className="chat-msg bot">
            <div className="bubble">
              <span className="typing">
                <i></i>
                <i></i>
                <i></i>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-sugs">
        {chat_suggestions.map((s, i) => (
          <button key={i} onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về hợp đồng…"
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: "10px 13px" }}
          disabled={!input.trim()}
        >
          <Icon.send style={{ width: 17, height: 17 }} />
        </button>
      </form>
    </div>
  );
}
