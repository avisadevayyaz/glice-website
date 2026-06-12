"use client";

import { MutualMatchCelebration } from "@/components/video/mutual-match-celebration";
import type { FeedbackPhase } from "@/features/video/types";
import { motion } from "framer-motion";

type VideoFeedbackPanelProps = {
  partnerName: string;
  profileUrl?: string;
  userName?: string;
  userProfileUrl?: string;
  phase: FeedbackPhase;
  mutualMatch: boolean;
  onLike: () => void;
  onPass: () => void;
  onSkip: () => void;
};

function partnerInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function VideoFeedbackPanel({
  partnerName,
  profileUrl,
  userName,
  userProfileUrl,
  phase,
  mutualMatch,
  onLike,
  onPass,
  onSkip,
}: VideoFeedbackPanelProps) {
  if (mutualMatch || phase === "matched") {
    return (
      <MutualMatchCelebration
        partnerName={partnerName}
        profileUrl={profileUrl}
        userName={userName}
        userProfileUrl={userProfileUrl}
      />
    );
  }

  return (
    <motion.div
      className="hero-panel-overlay hero-panel-overlay--feedback"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="hero-feedback-card">
        <div className="hero-feedback-profile">
          <motion.div
            className="hero-feedback-avatar"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {profileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileUrl} alt="" className="hero-feedback-avatar-img" />
            ) : (
              partnerInitial(partnerName)
            )}
          </motion.div>
          <p className="hero-feedback-name">{partnerName}</p>
        </div>

        <p className="hero-feedback-eyebrow">Did you hit it off?</p>
        <h3 className="hero-feedback-title">Like or pass to continue</h3>
        <p className="hero-feedback-desc">
          You&apos;ll see a match celebration if you both liked each other.
        </p>
        <div className="hero-feedback-actions">
          <motion.button
            type="button"
            className="hero-feedback-btn hero-feedback-btn--pass"
            onClick={onPass}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <i className="ri-close-line" aria-hidden />
            Pass
          </motion.button>
          <motion.button
            type="button"
            className="hero-feedback-btn hero-feedback-btn--like"
            onClick={onLike}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            <i className="ri-heart-fill" aria-hidden />
            Like
          </motion.button>
        </div>
        <button type="button" className="hero-feedback-skip" onClick={onSkip}>
          Skip feedback
        </button>
      </div>
    </motion.div>
  );
}
