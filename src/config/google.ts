export function getGoogleClientId(): string | undefined {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return clientId || undefined;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(getGoogleClientId());
}
