import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getServerSessionUser } from "@/features/auth/lib/get-server-session";
import { Providers } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Glice - Live Random Video Chat. Real Connections.",
    template: "%s - Glice",
  },
  description:
    "Glice is a live random video chat and social discovery app with mutual matching, nearby discovery, and safer conversations.",
  icons: {
    icon: "/icons/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getServerSessionUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={initialUser ? "is-logged-in" : undefined}>
        <Providers initialUser={initialUser}>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
