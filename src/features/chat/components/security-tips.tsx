"use client";

import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "glice_chat_security_dismissed";

export function SecurityTips() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (collapsed) return null;

  return (
    <div
      className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--hair-2)",
        color: "var(--muted)",
      }}
    >
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
      <p className="flex-1 leading-relaxed">
        Stay safe — never share passwords or payment details.{" "}
        <Link href="/safety-tips" className="font-medium text-[var(--primary)]">
          Safety tips
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          setCollapsed(true);
          try {
            localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="text-[var(--muted)] hover:text-[var(--text)]"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
