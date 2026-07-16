"use client";

import { useEffect, useState } from "react";

interface FeedbackWidgetProps {
  analysisType: "clause" | "contract" | "compare";
  analysisId: string;
}

const STAR_LABELS: Record<number, string> = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Tạm được",
  4: "Tốt",
  5: "Rất tốt",
};

export function FeedbackWidget({ analysisType, analysisId }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkFeedback() {
      try {
        const res = await fetch(
          `/api/feedback?analysisType=${analysisType}&analysisId=${analysisId}`
        );
        if (res.ok && active) {
          const data = await res.json();
          if (data && typeof data.rating === "number") {
            setRating(data.rating);
            setIsSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Failed to check feedback status:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    checkFeedback();
    return () => {
      active = false;
    };
  }, [analysisType, analysisId]);

  const handleSubmit = async () => {
    if (rating === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType,
          analysisId,
          rating,
        }),
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const errData = await res.json();
        setError(errData.error || "Gửi đánh giá thất bại.");
      }
    } catch {
      setError("Đã xảy ra lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "var(--radius-m, 12px)",
        border: "1px solid var(--line, #e2e8f0)",
        backgroundColor: "var(--surface, #fff)",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        margin: "24px 0",
        textAlign: "center",
        transition: "all 0.3s ease",
      }}
    >
      {isSubmitted ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "20px", color: "#10B981" }}>✅</div>
          <h4
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--ink, #1e293b)",
              margin: 0,
            }}
          >
            Cảm ơn bạn đã đánh giá!
          </h4>
          <p
            style={{
              fontSize: "14px",
              color: "var(--ink-faint, #64748b)",
              margin: 0,
              maxWidth: "480px",
              marginInline: "auto",
            }}
          >
            Đánh giá của bạn sẽ là cơ sở để chúng tôi phát triển FairTerms tốt hơn.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "4px",
              marginTop: "8px",
              fontSize: "20px",
              color: "#F59E0B",
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star}>{rating && star <= rating ? "★" : "☆"}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <h4
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--ink, #1e293b)",
                margin: "0 0 4px 0",
              }}
            >
              Bạn thấy FairTerms hoạt động thế nào?
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ink-faint, #64748b)",
                margin: 0,
              }}
            >
              Hãy cho chúng tôi biết nhé
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                fontSize: "30px",
                color: "#F59E0B",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled =
                  hoveredRating !== null ? star <= hoveredRating : rating !== null && star <= rating;
                const isHovered = hoveredRating !== null && star <= hoveredRating;
                return (
                  <span
                    key={star}
                    style={{
                      cursor: "pointer",
                      transition: "transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      display: "inline-block",
                      transform: isHovered ? "scale(1.18)" : "scale(1)",
                    }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => setRating(star)}
                  >
                    {isFilled ? "★" : "☆"}
                  </span>
                );
              })}
            </div>

            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#D97706",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                visibility: hoveredRating || rating ? "visible" : "hidden",
                transition: "opacity 0.15s ease",
              }}
            >
              {STAR_LABELS[hoveredRating || rating || 0] || ""}
            </span>
          </div>

          {rating !== null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "6px 20px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
              {error && (
                <span style={{ fontSize: "12.5px", color: "var(--accent-red, #ef4444)" }}>
                  {error}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
