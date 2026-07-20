# DNS setup for fairterms.xyz

Domain đăng ký tại **Namecheap**. Server: **AWS EC2** (ap-southeast-1), Elastic IP **`52.77.14.171`**.

Dùng **Namecheap BasicDNS** (mặc định) — chỉ cần thêm A records trỏ về Elastic IP.
Không cần đổi nameserver.

## Thêm A records tại Namecheap

Đăng nhập [namecheap.com](https://www.namecheap.com) → **Domain List** → `fairterms.xyz`
→ **Manage** → tab **Advanced DNS** → mục **Host Records** → **Add New Record**
(chọn Type = A Record). Cột **Host** dùng label (KHÔNG ghi domain đầy đủ):

| Host | Type | Value | TTL |
|------|------|-------|-----|
| `@` | A Record | 52.77.14.171 | Automatic |
| `www` | A Record | 52.77.14.171 | Automatic |
| `dev` | A Record | 52.77.14.171 | Automatic |
| `api-dev` | A Record | 52.77.14.171 | Automatic |
| `api` | A Record | 52.77.14.171 | Automatic |

> - `@` = apex (`fairterms.xyz`), phục vụ frontend main.
> - Xoá record mẫu Namecheap tự thêm (CNAME `www` → parkingpage, hoặc URL Redirect)
>   nếu có — nó chặn A record.
> - **Gắn Elastic IP** cho EC2 để IP không đổi khi reboot; nếu chưa, phải sửa lại
>   toàn bộ A records mỗi lần IP đổi.

## Kiểm tra sau 5–30 phút (Namecheap propagate nhanh)

```bash
dig +short fairterms.xyz            # -> 52.77.14.171
dig +short dev.fairterms.xyz
dig +short api-dev.fairterms.xyz
dig +short api.fairterms.xyz
```

## Cài SSL sau khi DNS propagate

```bash
ssh -F deploy/ssh/config fairterms
sudo bash ~/fairterms/deploy/setup-ssl.sh   # certbot cho cả 5 tên miền
```
