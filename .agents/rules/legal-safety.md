---
description: "Legal safety, privacy, and copywriting for the LegalTech product"
activation: always-on
---

# Legal safety & privacy

## Product role

**Allowed:**
- Preliminary contract review support
- Explain clause content in plain Vietnamese
- Suggest questions to ask before signing
- Cite contract excerpts and relevant legal articles

**Not allowed:**
- Claim to be a lawyer / provide formal legal advice
- Assert a contract is valid or void
- Advise "you should sign" / "you should not sign"
- Invent laws, article numbers, penalties, or deadlines

## Standard disclaimer

Keep this in the analysis UI (Vietnamese user-facing copy):

> Kết quả phân tích này chỉ mang tính chất tham khảo và hỗ trợ rà soát sơ bộ. Sản phẩm không thay thế tư vấn pháp lý từ luật sư. Với hợp đồng có giá trị lớn hoặc tình huống phức tạp, bạn nên tham khảo luật sư bất động sản trước khi ký.

Do not remove the disclaimer from analysis UI.

## Contract citation rules

- Every risk finding must include `trich_dan` from the contract
- If a clause is **missing** from the contract: `ket_luan: PASS`, state clearly that the clause was not found
- Do not guess price, dates, or parties if not present in the text

## Legal citation rules (RAG)

- Prefer retrieved context over model memory
- Always name the law and article
- Insufficient basis → say so explicitly; set `confidence: low` / `insufficient_evidence`
- Do not invent "Điều 999"

## Refusing professional legal questions

Safe pattern when the user asks "Should I sign?" or "Can I sue?":

> Câu hỏi này liên quan đến tư vấn pháp lý chuyên nghiệp mà hệ thống không thể cung cấp. Hệ thống chỉ có thể giúp bạn hiểu nội dung hợp đồng và các điểm cần chú ý. Bạn nên liên hệ luật sư bất động sản để được tư vấn cụ thể.

## Privacy

Contracts contain PII (name, ID number, phone, address, contract value):

- Hash IP/UA (`lib/security/hash.ts`); never store raw values
- Mask PII in UI via `maskPii()` in mappers
- **Do not log** full contract text, full prompts, or AI responses containing PII
- **Do not commit** real contracts to the repo or fixtures
- Anonymize test samples: `[TÊN BÊN A]`, `[SỐ CCCD]`, etc.

## Vietnamese copy — preferred

- "Phân tích sơ bộ"
- "Điểm cần chú ý"
- "Điều khoản có thể bất lợi"
- "Trích dẫn từ hợp đồng"
- "Kết quả tham khảo"

## Copy — avoid

- "AI luật sư"
- "Tư vấn pháp lý chắc chắn"
- "Hợp đồng này hợp pháp/không hợp pháp"
- "Bạn nên ký / không nên ký"
- "Đảm bảo không rủi ro"

## LLM prompts

System prompts must include:

- Role: Vietnamese real-estate contract analysis assistant
- Analyze only from provided content
- Require citations
- No legal advice
- Explain in simple Vietnamese
- Low temperature (0) for analysis

Prompt files:

- OCR: `app/services/contract_ocr_system.txt`
- Structuring: `app/services/contract_structuring_system.txt`
