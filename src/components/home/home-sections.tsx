import { FaqSection } from "@/components/marketing/faq-section";
import Image from "next/image";

const PHONE_SHOTS = [7, 2, 8, 3, 4, 5, 6, 9];

export function HomeSections() {
  return (
    <>
      <section className="px-6">
        <div className="mx-auto max-w-7xl">
          <div className="hairline-t hairline-b grid grid-cols-2 gap-y-3 py-6 md:grid-cols-3">
            <div className="flex items-center justify-center gap-3 text-sm text-textMuted">
              <i className="ri-flag-2-line text-lg text-textMuted" aria-hidden="true" />
              <span>Report &amp; block built-in</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-textMuted">
              <i
                className="ri-shield-check-line text-lg text-textMuted"
                aria-hidden="true"
              />
              <span>Active moderation</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-textMuted">
              <i
                className="ri-map-pin-user-line text-lg text-textMuted"
                aria-hidden="true"
              />
              <span>Privacy-first location</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-14 max-w-2xl">
            <h2 className="display-2 balance mt-4">
              Built for real-time social discovery.
            </h2>
            <p className="lede balance mt-5">
              Every feature is designed around consent, presence, and safety —
              so connections feel mutual from the very first frame.
            </p>
          </div>

          <div className="bento">
            <div className="p-8 panel panel-hover b-tall reveal relative flex flex-col justify-between overflow-hidden ">
              <div>
                <div className="step-num mb-6">
                  <i className="ri-vidicon-line text-xl" />
                </div>
                <h3 className="display-3 mb-3">Random live video</h3>
                <p className="max-w-md leading-relaxed text-textMuted">
                  One tap puts you face-to-face with someone new. Quick actions —
                  like, super like, skip — keep the flow human and effortless.
                </p>
              </div>
              <div className="mt-8 flex gap-2">
                <span className="chip">
                  <i className="ri-flashlight-line" />
                  Instant pairing
                </span>
                <span className="chip">
                  <i className="ri-shuffle-line" />
                  Randomized
                </span>
              </div>
            </div>

            <div className="panel panel-hover b-half reveal p-7">
              <div className="step-num mb-5">
                <i className="ri-user-heart-line text-xl" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Mutual match chat</h3>
              <p className="text-[.95rem] leading-relaxed text-textMuted">
                Messaging only opens when both people opt in. No cold inboxes, no
                spam.
              </p>
            </div>

            <div className="panel panel-hover b-half reveal p-7">
              <div className="step-num mb-5">
                <i className="ri-map-pin-2-line text-xl" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Nearby discovery</h3>
              <p className="text-[.95rem] leading-relaxed text-textMuted">
                Distance-aware matching that respects privacy by default.
              </p>
            </div>

            <div className="panel panel-hover b-third reveal p-7">
              <div className="step-num mb-5">
                <i className="ri-shield-star-line text-xl" />
              </div>
              <h3 className="mb-2 text-base font-semibold">Verified-adult only</h3>
              <p className="text-sm leading-relaxed text-textMuted">
                18+ enforced. Suspected underage accounts removed on review.
              </p>
            </div>

            <div className="panel panel-hover b-third reveal p-7">
              <div className="step-num mb-5">
                <i className="ri-flag-line text-xl" />
              </div>
              <h3 className="mb-2 text-base font-semibold">Report &amp; block</h3>
              <p className="text-sm leading-relaxed text-textMuted">
                Single-tap safety tools throughout the entire experience.
              </p>
            </div>

            <div className="panel panel-hover b-third reveal p-7">
              <div className="step-num mb-5">
                <i className="ri-eye-off-line text-xl" />
              </div>
              <h3 className="mb-2 text-base font-semibold">No silent tracking</h3>
              <p className="text-sm leading-relaxed text-textMuted">
                Location used only for matching context, never sold or shared.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-16 max-w-2xl">
            <h2 className="display-2 balance mt-4">Three steps. No friction.</h2>
          </div>

          <div className="relative">
            <div className="absolute top-[44px] right-[8%] left-[8%] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" />

            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="reveal">
                <div className="mb-5 flex items-center gap-4">
                  <div className="step-num">01</div>
                  <span className="text-xs tracking-[0.2em] text-textMuted uppercase">
                    Connect
                  </span>
                </div>
                <h3 className="balance mb-3 text-2xl font-semibold">
                  Start a live video
                </h3>
                <p className="max-w-sm leading-relaxed text-textMuted">
                  Tap once to begin a random live session and meet someone new in
                  real time — no warm-up, no waiting.
                </p>
              </div>
              <div className="reveal">
                <div className="mb-5 flex items-center gap-4">
                  <div className="step-num">02</div>
                  <span className="text-xs tracking-[0.2em] text-textMuted uppercase">
                    Choose
                  </span>
                </div>
                <h3 className="balance mb-3 text-2xl font-semibold">
                  Match by consent
                </h3>
                <p className="max-w-sm leading-relaxed text-textMuted">
                  Use like, super like, or skip after each call. Chat unlocks only
                  when interest is mutual.
                </p>
              </div>
              <div className="reveal">
                <div className="mb-5 flex items-center gap-4">
                  <div className="step-num">03</div>
                  <span className="text-xs tracking-[0.2em] text-textMuted uppercase">
                    Continue
                  </span>
                </div>
                <h3 className="balance mb-3 text-2xl font-semibold">Chat, safely</h3>
                <p className="max-w-sm leading-relaxed text-textMuted">
                  Take it further with messaging while keeping report and block
                  tools one tap away at all times.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="downloads" className="section">
        <div className="relative mx-auto max-w-4xl">
          <div className="panel reveal relative overflow-hidden p-10 text-center md:p-16">
            <h2 className="display-2 balance mt-5 mb-5">Download Glice.</h2>
            <p className="lede balance mx-auto mb-10 max-w-xl">
              Glice is available on Google Play. The iOS App Store release is
              coming soon.
            </p>

            <div className="mx-auto flex max-w-lg flex-col justify-center gap-3 sm:flex-row">
              <a
                href="https://play.google.com/store/apps/details?id=com.glice.app"
                className="store-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="store-icon" aria-hidden="true">
                  <i className="ri-google-play-fill" />
                </span>
                <div className="leading-tight">
                  <div className="text-[.7rem] tracking-widest text-textMuted uppercase">
                    Get it on
                  </div>
                  <div className="text-sm font-semibold text-textMain">
                    Google Play
                  </div>
                </div>
              </a>
              <span className="store-btn is-disabled" aria-disabled="true">
                <span className="store-icon" aria-hidden="true">
                  <i className="ri-apple-fill" />
                </span>
                <div className="leading-tight">
                  <div className="text-[.7rem] tracking-widest text-textMuted uppercase">
                    Coming soon
                  </div>
                  <div className="text-sm font-semibold text-textMain">
                    App Store
                  </div>
                </div>
              </span>
            </div>

            <div className="mt-10 inline-flex items-center gap-2 text-sm text-textMuted">
              <i className="ri-shield-check-line text-textMuted" />
              <span>Rated Mature 17+ · 100+ downloads on Google Play</span>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </>
  );
}
