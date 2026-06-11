"use client";

import Link from "next/link";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "How does random live video chat work on Glice?",
    answer:
      "You can start a live random video session directly from the app and get connected to another available user in real time. After each session, you can choose Like, Super Like, or Skip. The flow is built for quick discovery without swipe-heavy interaction.",
  },
  {
    question: "When does chat become available between two users?",
    answer:
      "Chat unlocks only after a mutual match. That means both users must show interest before messaging is enabled. This consent-first model helps reduce spam and unwanted outreach.",
  },
  {
    question: "What is the difference between Like, Super Like, and Skip?",
    answer:
      "Like indicates interest after a call or profile interaction. Super Like is a stronger signal that highlights higher interest. Skip simply moves you forward without opening any connection with that user.",
  },
  {
    question: "How does Nearby discovery use location data?",
    answer: (
      <>
        Nearby uses in-app location data to show users around your selected area. The
        feature is designed to support local discovery while keeping location
        handling controlled within the app experience. For full details, review our{" "}
        <Link href="/privacy-policy" className="link-accent underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
  {
    question: "How do I report or block a user?",
    answer:
      "Open the user profile or chat actions and use the block/report options. Reports are reviewed by our moderation workflow, and confirmed violations can lead to restrictions or account removal. If there is immediate risk, contact local authorities first.",
  },
  {
    question: "Can I delete my account and personal data?",
    answer:
      "Yes. You can request account deletion from app settings or by contacting support. Once processed, access is removed and data handling follows our legal and privacy retention requirements.",
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="section pt-0">
      <div className="mx-auto max-w-3xl px-6">
        <div className="reveal mb-10 text-center">
          <h2 className="display-2 balance mt-4">
            Frequently asked questions.
          </h2>
        </div>

        <div className="reveal space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={item.question}
                className={`faq-item${isOpen ? " is-open" : ""}`}
              >
                <button
                  className="faq-trigger"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <span>{item.question}</span>
                  <span className="plus">
                    <i className="ri-add-line" />
                  </span>
                </button>
                <div
                  className="faq-content"
                  style={{ maxHeight: isOpen ? "500px" : "0px" }}
                >
                  <div>{item.answer}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
