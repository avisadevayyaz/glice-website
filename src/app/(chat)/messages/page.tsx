import { ChatShell } from "@/features/chat/components/chat-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Messages",
};

function ChatFallback() {
  return (
    <div className="flex min-h-0 flex-1 p-4">
      <div className="w-full max-w-sm space-y-3 border-r border-border pr-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatShell />
    </Suspense>
  );
}
