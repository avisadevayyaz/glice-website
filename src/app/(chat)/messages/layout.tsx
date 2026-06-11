import { ChatTopbar } from "@/features/chat/components/chat-topbar";
import { ConnectionIsland } from "@/features/chat/components/connection-island";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Viewport } from "next";
import type { ReactNode } from "react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function ChatMessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="chat-app">
        <ConnectionIsland />
        <ChatTopbar />
        {children}
      </div>
    </TooltipProvider>
  );
}