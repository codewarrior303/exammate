/** Select the same linked Google identity for Drive and Calendar operations. */
export function getPrimaryGoogleAccount<T extends { providerId: string }>(
  accounts: T[] | null | undefined,
): T | undefined {
  return accounts?.find((account) => account.providerId === "google");
}
