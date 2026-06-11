"use client";

import { getGoogleClientId } from "@/config/google";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function GoogleAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return children;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
