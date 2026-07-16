"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/app/fairterms/components/ui/LogoMark";

const navSections = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/admin", icon: "▣" },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Người dùng", href: "/admin/users", icon: "◉" },
      { label: "Phản hồi", href: "/admin/feedback", icon: "★" },
      { label: "Checklist hợp đồng", href: "/admin/checklists", icon: "☑" },
      { label: "Văn bản luật (RAG)", href: "/admin/rag", icon: "⊞" },
      { label: "Giám sát LangSmith", href: "/admin/observability", icon: "◈" },
      { label: "Quản lý Cache", href: "/admin/cache", icon: "⬡" },
    ],
  },
  {
    label: "Phát triển",
    items: [
      { label: "RAG Playground", href: "/admin/playground", icon: "⚗" },
      { label: "Cấu hình AI", href: "/admin/ai-config", icon: "✦" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="adm-sidebar">
      {/* Brand */}
      <div className="adm-sidebar-brand">
        <LogoMark size={32} className="adm-sidebar-logo" />
        <div>
          <div className="adm-sidebar-brandname">FairTerms</div>
          <div className="adm-sidebar-brandtag">Admin Portal</div>
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {navSections.map((section) => (
          <div key={section.label} className="adm-sidebar-section">
            <div className="adm-sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`adm-nav-link${isActive ? " active" : ""}`}
                >
                  <span
                    className="adm-nav-icon"
                    style={{
                      fontStyle: "normal",
                      fontSize: "13px",
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="adm-sidebar-footer">
        <Link href="/app" className="adm-back-link">
          <span style={{ fontSize: "13px" }}>←</span>
          Quay lại ứng dụng
        </Link>
      </div>
    </aside>
  );
}
