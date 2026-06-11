"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatRouteEffect } from "@/components/site/chat-route-effect";
import { SiteEffects } from "@/components/site/site-effects";
import { UiSessionProvider } from "@/components/site/ui-session-provider";
import { ChatSocketInitializer } from "@/features/chat/hooks/use-chat-init";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <UiSessionProvider>
        <ChatSocketInitializer />
        <ChatRouteEffect />
        <SiteEffects />
        {children}
      </UiSessionProvider>
    </QueryClientProvider>
  );
}
