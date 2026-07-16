-- Remove password-based authentication storage from the OAuth-only user model.
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- Support lookups for guest sessions that converted to authenticated users.
CREATE INDEX "GuestSession_convertedUserId_idx" ON "GuestSession"("convertedUserId");
