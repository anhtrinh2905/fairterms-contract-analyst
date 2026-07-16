export const RETENTION_DAYS = 90;

export function getAnalysisExpiresAt(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);
  return expiresAt;
}
