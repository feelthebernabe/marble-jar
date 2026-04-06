/**
 * Get the current date as YYYY-MM-DD in a specific timezone.
 * Used for marble dedup (one marble per user per day per jar).
 */
export function getUserDayDate(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}
