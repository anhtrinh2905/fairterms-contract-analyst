/* ============================================================
   HopDongAI — Inline icons (currentColor), ported from components.jsx
   ============================================================ */
import type { SVGProps, JSX } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const Icon: Record<string, (p: IconProps) => JSX.Element> = {
  clause: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7" /><path d="M11 8v4.2M11 15h.01" /><path d="m21 21-4.35-4.35" /></svg>
  ),
  doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  ),
  contract: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="2.5" width="13" height="17" rx="1.6" /><path d="M6.2 7.5h6.6M6.2 11h6.6M6.2 14.5h4" /><circle cx="16.3" cy="16.3" r="4.2" /><path d="m14.4 16.3 1.4 1.4 2.6-3" /><path d="m19.4 19.4 2.4 2.4" /></svg>
  ),
  warn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3.5 21 19H3L12 3.5Z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5 10 17.5 19 7" /></svg>
  ),
  scale: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v18M7 21h10M12 3 5 6m7-3 7 3" /><path d="M5 6 2.5 12.5a3 3 0 0 0 5 0L5 6Zm14 0-2.5 6.5a3 3 0 0 0 5 0L19 6Z" /></svg>
  ),
  copy: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
  ),
  compare: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1.6" y="2" width="9" height="12" rx="1.6" /><rect x="13.4" y="10" width="9" height="12" rx="1.6" /><path d="M10.6 6h2a2 2 0 0 1 2 2v2" /><path d="M13.4 18h-2a2 2 0 0 1-2-2v-2" /></svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4m0 0 4 4m-4-4-4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
  ),
  sun: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" /></svg>
  ),
  moon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
  ),
  chat: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20.5l1.3-5.5A8 8 0 1 1 21 12Z" /></svg>
  ),
  send: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
  ),
  eye: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  ),
  link: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 15 15 9" /><path d="M11 6.5 13 5a4 4 0 0 1 6 6l-2 1.5M13 17.5 11 19a4 4 0 0 1-6-6l2-1.5" /></svg>
  ),
  x: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6 18 18M18 6 6 18" /></svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6" /></svg>
  ),
  spark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-15.6-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>
  ),
  mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  ),
  lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.6 3.6-5.6 7-5.6s6.3 2 7 5.6" /></svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" /><path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" /></svg>
  ),
  monitor: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  ),
  folder: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" /></svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
  ),
  bolt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>
  ),
  edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5 17.5 10.5" /></svg>
  ),
  template: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" /><path d="M7 11h6M7 14h4" /></svg>
  ),
  google: (p) => (
    <svg viewBox="0 0 24 24" {...p}><path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2.06H12v3.9h5.4a4.6 4.6 0 0 1-2 3.03v2.5h3.23c1.9-1.74 2.97-4.3 2.97-7.37Z" /><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.82V7.5H3.07a10 10 0 0 0 0 9l3.34-2.6Z" /><path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.99 14.69 2 12 2A10 10 0 0 0 3.07 7.5l3.34 2.58C7.2 7.8 9.4 6.04 12 6.04Z" /></svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
  ),
  grid: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="8" height="8" rx="1.6" /><rect x="13" y="3" width="8" height="8" rx="1.6" /><rect x="3" y="13" width="8" height="8" rx="1.6" /><rect x="13" y="13" width="8" height="8" rx="1.6" /></svg>
  ),
  trending: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="trash-icon" {...p}>
      <g className="trash-lid" style={{ transformOrigin: "12px 6px", transition: "transform 0.2s ease-out" }}>
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </g>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};
