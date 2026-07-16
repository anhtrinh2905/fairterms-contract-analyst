"""Load and parse contract checklists (schema v2.0 — role-aware).

Each checklist is a Markdown file with two machine-readable parts:
  1. YAML frontmatter (between the leading `---` fences) holding metadata and
     `quy_uoc_vai_tro` — the fixed Bên A / Bên B role convention.
  2. A fenced ```yaml block under "PHẦN 3" grouping everything BY PARTY:
       ben_a: nghia_vu_bat_buoc + dau_hieu_lam_quyen
       ben_b: quyen_can_bao_dam  + dau_hieu_ganh_qua_muc
     Each signal carries `loai` (red_flag|unfair_but_legal), `gay_bat_loi_cho`
     and optionally `dieu_kien_kich_hoat` (when to MATCH vs PASS).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

CHECKLIST_DIR = Path(__file__).resolve().parent.parent / "data" / "checklists"

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
# Tolerate a missing closing fence: capture until the next ``` or end of file.
_YAML_BLOCK_RE = re.compile(r"```yaml\n(.*?)(?:\n```|\Z)", re.DOTALL)

# Keys per party section.
_REQUIRED_KEYS = ("nghia_vu_bat_buoc", "quyen_can_bao_dam")
_SIGNAL_KEYS = ("dau_hieu_lam_quyen", "dau_hieu_ganh_qua_muc")


@dataclass
class Role:
    """One contracting party (Bên A or Bên B)."""

    key: str  # "ben_a" | "ben_b"
    ma: str  # e.g. "ben_ban", "ben_thue"
    ten: str  # display name
    vi_the: str  # "manh_the" | "yeu_the"


@dataclass
class RoleConvention:
    ben_a: Role
    ben_b: Role
    protected_party: str  # which party the agent always protects, e.g. "ben_b"

    def party(self, key: str) -> Role:
        return self.ben_a if key == "ben_a" else self.ben_b

    @property
    def protected(self) -> Role:
        return self.party(self.protected_party)


@dataclass
class RequiredItem:
    """A mandatory obligation (Bên A) or right (Bên B)."""

    id: str
    ten: str
    bat_buoc: bool
    thuoc_ben: str  # "ben_a" | "ben_b"
    nhom: str  # source key: nghia_vu_bat_buoc | quyen_can_bao_dam


@dataclass
class Signal:
    """A red flag or unfair-but-legal clause, tagged with role context."""

    id: str
    loai: str  # "red_flag" | "unfair_but_legal"
    muc_rui_ro: str
    mo_ta: str
    thuoc_ben: str  # party section the signal lives under
    nhom: str  # dau_hieu_lam_quyen | dau_hieu_ganh_qua_muc
    gay_bat_loi_cho: str  # which party is harmed, e.g. "ben_b"
    tu_khoa: list[str] = field(default_factory=list)
    can_cu: list[str] = field(default_factory=list)
    # Curated retrieval query: legal concepts behind the signal, written by a
    # human reviewer. The v2 citation flow anchors RAG search on this instead
    # of the hand-typed `can_cu` article numbers.
    truy_van_rag: str = ""
    goi_y_thuong_luong: str = ""
    trai_luat: bool = False
    kieu: str | None = None
    dieu_kien_kich_hoat: str | None = None

    @property
    def is_red_flag(self) -> bool:
        return self.loai == "red_flag"


@dataclass
class Checklist:
    checklist_id: str
    loai_hop_dong: str
    ten_hien_thi: str
    phien_ban: str
    luu_y: str
    van_ban_phap_luat_tham_chieu: list[str]
    convention: RoleConvention
    required_items: list[RequiredItem]
    signals: list[Signal]

    def red_flags(self) -> list[Signal]:
        return [s for s in self.signals if s.loai == "red_flag"]

    def unfair_clauses(self) -> list[Signal]:
        return [s for s in self.signals if s.loai == "unfair_but_legal"]

    def signals_about(self, thuoc_ben: str) -> list[Signal]:
        return [s for s in self.signals if s.thuoc_ben == thuoc_ben]


def _parse_required(d: dict, thuoc_ben: str, nhom: str) -> RequiredItem:
    return RequiredItem(
        id=d["id"],
        ten=d.get("ten", ""),
        bat_buoc=bool(d.get("bat_buoc", False)),
        thuoc_ben=thuoc_ben,
        nhom=nhom,
    )


def _parse_signal(d: dict, thuoc_ben: str, nhom: str) -> Signal:
    return Signal(
        id=d["id"],
        loai=d.get("loai", "red_flag"),
        muc_rui_ro=d.get("muc_rui_ro", ""),
        mo_ta=d.get("mo_ta", ""),
        thuoc_ben=thuoc_ben,
        nhom=nhom,
        gay_bat_loi_cho=d.get("gay_bat_loi_cho", ""),
        tu_khoa=list(d.get("tu_khoa", []) or []),
        can_cu=list(d.get("can_cu", []) or []),
        truy_van_rag=d.get("truy_van_rag", "") or "",
        goi_y_thuong_luong=d.get("goi_y_thuong_luong", ""),
        trai_luat=bool(d.get("trai_luat", False)),
        kieu=d.get("kieu"),
        dieu_kien_kich_hoat=d.get("dieu_kien_kich_hoat"),
    )


def _parse_convention(frontmatter: dict, machine: dict) -> RoleConvention:
    quv = frontmatter.get("quy_uoc_vai_tro", {}) or {}

    def role(key: str) -> Role:
        # Frontmatter is authoritative; fall back to the machine block.
        src = quv.get(key) or machine.get(key) or {}
        return Role(
            key=key,
            ma=src.get("ma", ""),
            ten=src.get("ten", ""),
            vi_the=src.get("vi_the", ""),
        )

    return RoleConvention(
        ben_a=role("ben_a"),
        ben_b=role("ben_b"),
        protected_party=quv.get("protected_party", "ben_b"),
    )


def _parse(text: str) -> Checklist:
    fm_match = _FRONTMATTER_RE.search(text)
    if not fm_match:
        raise ValueError("Checklist missing YAML frontmatter")
    frontmatter = yaml.safe_load(fm_match.group(1)) or {}

    block_match = _YAML_BLOCK_RE.search(text)
    if not block_match:
        raise ValueError("Checklist missing machine_readable yaml block")
    machine = yaml.safe_load(block_match.group(1)) or {}

    required: list[RequiredItem] = []
    signals: list[Signal] = []
    for party_key in ("ben_a", "ben_b"):
        party = machine.get(party_key, {}) or {}
        for req_key in _REQUIRED_KEYS:
            for d in party.get(req_key, []) or []:
                required.append(_parse_required(d, party_key, req_key))
        for sig_key in _SIGNAL_KEYS:
            for d in party.get(sig_key, []) or []:
                signals.append(_parse_signal(d, party_key, sig_key))

    return Checklist(
        checklist_id=frontmatter.get("checklist_id", ""),
        loai_hop_dong=frontmatter.get("loai_hop_dong", ""),
        ten_hien_thi=frontmatter.get("ten_hien_thi", ""),
        phien_ban=str(frontmatter.get("phien_ban", "")),
        luu_y=frontmatter.get("luu_y", ""),
        van_ban_phap_luat_tham_chieu=list(frontmatter.get("van_ban_phap_luat_tham_chieu", [])),
        convention=_parse_convention(frontmatter, machine),
        required_items=required,
        signals=signals,
    )


@lru_cache(maxsize=None)
def _load_all() -> dict[str, Checklist]:
    """Parse every checklist file once, keyed by `loai_hop_dong`."""
    checklists: dict[str, Checklist] = {}
    for path in sorted(CHECKLIST_DIR.glob("*.md")):
        checklist = _parse(path.read_text(encoding="utf-8"))
        checklists[checklist.loai_hop_dong] = checklist
    return checklists


def list_checklists() -> list[Checklist]:
    return list(_load_all().values())


def get_checklist(loai_hop_dong: str) -> Checklist | None:
    return _load_all().get(loai_hop_dong)
