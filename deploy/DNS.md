# DNS setup for c2-app-145.io.vn

Domain hiện dùng nameserver **Tenten** (`ns-b1.tenten.vn`, ...).  
Đã tạo zone **Google Cloud DNS** với đủ A records trỏ `35.198.241.72`.

## Cách 1 — Đổi NS sang Google Cloud DNS (khuyến nghị, đã cấu hình sẵn)

Đăng nhập [domain.tenten.vn](https://domain.tenten.vn) → chọn `c2-app-145.io.vn` → **Đổi Name Server** → thay bằng:

```
ns-cloud-d1.googledomains.com
ns-cloud-d2.googledomains.com
ns-cloud-d3.googledomains.com
ns-cloud-d4.googledomains.com
```

Sau 15–60 phút, kiểm tra:

```bash
nslookup dev.c2-app-145.io.vn
nslookup api-dev.c2-app-145.io.vn
```

Rồi cài SSL trên server:

```bash
ssh -F deploy/ssh/config fairterms
sudo bash ~/fairterms/deploy/setup-ssl.sh
```

## Cách 2 — Giữ NS Tenten, thêm A records thủ công

Tại Tenten DNS, thêm các bản ghi **A** → `35.198.241.72`:

| Host | Type | Value |
|------|------|-------|
| `@` | A | 35.198.241.72 |
| `www` | A | 35.198.241.72 |
| `dev` | A | 35.198.241.72 |
| `api-dev` | A | 35.198.241.72 |
| `api` | A | 35.198.241.72 |

## A records đã có trong Cloud DNS (zone `fairterms-zone`)

- `c2-app-145.io.vn`
- `www.c2-app-145.io.vn`
- `dev.c2-app-145.io.vn`
- `api-dev.c2-app-145.io.vn`
- `api.c2-app-145.io.vn`
