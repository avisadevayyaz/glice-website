"use client";

import { HistoryHeaderButton } from "@/components/layout/history-header-button";
import { HomeProfileMenu } from "@/components/layout/home-profile-menu";
import { MessagesBadgeButton } from "@/components/layout/messages-badge-button";

export function HomeHeaderActions() {
  return (
    <div className="home-header-actions">
      <HistoryHeaderButton />
      <MessagesBadgeButton variant="icon" showLabel={false} />
      <HomeProfileMenu />
    </div>
  );
}
