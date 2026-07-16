export function getCurrentQuotaPeriod(now = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    periodStart: new Date(year, month, 1, 0, 0, 0, 0),
    periodEnd: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}
