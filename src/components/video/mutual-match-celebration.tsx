"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type MutualMatchCelebrationProps = {
  partnerName: string;
  profileUrl?: string;
  userProfileUrl?: string;
  userName?: string;
};

function partnerInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function AvatarBubble({
  name,
  url,
  className,
}: {
  name: string;
  url?: string;
  className?: string;
}) {
  return (
    <div className={`mutual-match-avatar ${className ?? ""}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="mutual-match-avatar-img" />
      ) : (
        partnerInitial(name)
      )}
    </div>
  );
}

export function MutualMatchCelebration({
  partnerName,
  profileUrl,
  userProfileUrl,
  userName = "You",
}: MutualMatchCelebrationProps) {
  const [burst, setBurst] = useState(0);
  const hearts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 17) % 84),
        delay: (i % 5) * 0.12,
        size: 10 + (i % 4) * 4,
      })),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(() => setBurst((b) => b + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      className="mutual-match-celebration"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="status"
      aria-live="polite"
    >
      <div className="mutual-match-confetti" aria-hidden>
        {hearts.map((h) => (
          <motion.span
            key={`${h.id}-${burst}`}
            className="mutual-match-heart"
            style={{ left: `${h.left}%`, fontSize: h.size }}
            initial={{ opacity: 0, y: 40, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], y: [-20, -120], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 1.8, delay: h.delay, ease: "easeOut" }}
          >
            ♥
          </motion.span>
        ))}
      </div>

      <motion.div
        className="mutual-match-card"
        initial={{ scale: 0.82, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        <motion.p
          className="mutual-match-eyebrow"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          It&apos;s a match!
        </motion.p>

        <div className="mutual-match-avatars">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
          >
            <AvatarBubble name={userName} url={userProfileUrl} />
          </motion.div>

          <motion.div
            className="mutual-match-heart-icon"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.25, 1] }}
            transition={{ delay: 0.35, duration: 0.5 }}
            aria-hidden
          >
            <i className="ri-heart-fill" />
          </motion.div>

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
          >
            <AvatarBubble name={partnerName} url={profileUrl} />
          </motion.div>
        </div>

        <motion.h3
          className="mutual-match-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          You and {partnerName} liked each other
        </motion.h3>
        <motion.p
          className="mutual-match-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          Chat is now unlocked — say hello in Messages.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
