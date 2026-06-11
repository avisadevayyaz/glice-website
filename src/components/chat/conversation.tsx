"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ChatConversation({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

export const ChatConversationContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}
    {...props}
  >
    {children}
  </div>
));
ChatConversationContent.displayName = "ChatConversationContent";
