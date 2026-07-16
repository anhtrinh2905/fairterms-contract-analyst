import { randomBytes } from "node:crypto";

/** Token chia sẻ ngẫu nhiên, không đoán được (192-bit, base64url). */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Giới hạn hợp lệ cho thời hạn chia sẻ (ngày). null = không hết hạn. */
export const SHARE_EXPIRY_DAYS = [7, 30, 90] as const;
export type ShareExpiryDays = (typeof SHARE_EXPIRY_DAYS)[number] | null;

export function shareExpiresAt(
  days: ShareExpiryDays,
  now = new Date(),
): Date | null {
  if (days === null) return null;
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}
