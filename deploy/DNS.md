# DNS setup for c2-app-145.io.vn

Server: **AWS EC2** (ap-southeast-1), Elastic IP **`52.77.14.171`**.
Domain dùng nameserver **Tenten** — chỉ cần thêm/sửa A records trỏ về Elastic IP.

## Thêm A records tại Tenten (khuyến nghị cho MVP)

Đăng nhập [domain.tenten.vn](https://domain.tenten.vn) → chọn `c2-app-145.io.vn` →
quản lý DNS → thêm/sửa các bản ghi **A** → `52.77.14.171`:

| Host | Type | Value |
|------|------|-------|
| `@` | A | 52.77.14.171 |
| `www` | A | 52.77.14.171 |
| `dev` | A | 52.77.14.171 |
| `api-dev` | A | 52.77.14.171 |
| `api` | A | 52.77.14.171 |

> Nếu trước đây đã đổi NS sang Google Cloud DNS, đổi lại về NS Tenten (hoặc cập
> nhật A records trong Cloud DNS sang `52.77.14.171`). Để dứt điểm khỏi GCP, nên
> dùng thẳng A records tại Tenten như trên.

## Kiểm tra sau 15–60 phút

```bash
nslookup c2-app-145.io.vn        # -> 52.77.14.171
nslookup dev.c2-app-145.io.vn
nslookup api-dev.c2-app-145.io.vn
nslookup api.c2-app-145.io.vn
```

## Cài SSL sau khi DNS propagate

```bash
ssh -F deploy/ssh/config fairterms
sudo bash ~/fairterms/deploy/setup-ssl.sh
```
