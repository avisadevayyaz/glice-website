export type GoogleProfile = {
  email: string;
  name: string;
  picture: string;
  sub: string;
};

export function parseGoogleCredential(credential: string): GoogleProfile {
  const [, payload] = credential.split(".");
  if (!payload) {
    throw new Error("Invalid Google credential");
  }

  const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };

  if (!decoded.email) {
    throw new Error("Google account did not return an email address");
  }

  return {
    email: decoded.email,
    name: decoded.name ?? "",
    picture: decoded.picture ?? "",
    sub: decoded.sub ?? "",
  };
}
