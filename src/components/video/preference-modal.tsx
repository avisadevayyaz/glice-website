"use client";

import type { CSSProperties } from "react";
import {
  PREF_AGE_MAX,
  PREF_AGE_MIN,
  PREF_DISTANCE_MAX,
  PREF_DISTANCE_MIN,
  PREF_DISTANCE_STEP,
  ageTrackPercent,
  clampAge,
  clampDistance,
  normalizeAgeRange,
} from "@/features/video/lib/pref-bounds";

type PreferenceModalProps = {
  open: boolean;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  onClose: () => void;
  onDone: (values: {
    minAge: number;
    maxAge: number;
    maxDistance: number;
  }) => void;
  onMinAgeChange: (value: number) => void;
  onMaxAgeChange: (value: number) => void;
  onMaxDistanceChange: (value: number) => void;
};

function distanceLabel(km: number) {
  if (km >= PREF_DISTANCE_MAX) return "500+ km";
  return `${km} km`;
}

export function PreferenceModal({
  open,
  minAge,
  maxAge,
  maxDistance,
  onClose,
  onDone,
  onMinAgeChange,
  onMaxAgeChange,
  onMaxDistanceChange,
}: PreferenceModalProps) {
  const safeMin = clampAge(minAge);
  const safeMax = clampAge(maxAge);
  const displayMin = Math.min(safeMin, safeMax);
  const displayMax = Math.max(safeMin, safeMax);
  const minTrack = ageTrackPercent(displayMin);
  const maxTrack = ageTrackPercent(displayMax);
  const safeDistance = clampDistance(maxDistance);
  const distanceFill =
    ((safeDistance - PREF_DISTANCE_MIN) /
      (PREF_DISTANCE_MAX - PREF_DISTANCE_MIN)) *
    100;

  const setMinAge = (value: number) => {
    const next = clampAge(value);
    onMinAgeChange(next);
    if (next > clampAge(maxAge)) onMaxAgeChange(next);
  };

  const setMaxAge = (value: number) => {
    const next = clampAge(value);
    onMaxAgeChange(next);
    if (next < clampAge(minAge)) onMinAgeChange(next);
  };

  const handleDone = () => {
    const ages = normalizeAgeRange(minAge, maxAge);
    const distance = clampDistance(maxDistance);
    if (ages.minAge !== minAge) onMinAgeChange(ages.minAge);
    if (ages.maxAge !== maxAge) onMaxAgeChange(ages.maxAge);
    if (distance !== maxDistance) onMaxDistanceChange(distance);
    onDone({ minAge: ages.minAge, maxAge: ages.maxAge, maxDistance: distance });
  };

  return (
    <div
      className={`modal-backdrop${open ? " is-open" : ""}`}
      aria-hidden={!open}
      role="dialog"
      aria-labelledby="preferenceModalTitle"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pref-modal">
        <button
          type="button"
          className="auth-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <i className="ri-close-line" />
        </button>

        <div className="pref-modal-header">
          <div className="pref-modal-icon" aria-hidden>
            <i className="ri-equalizer-3-line" />
          </div>
          <div>
            <h2 id="preferenceModalTitle">Preferences</h2>
            <p className="auth-modal-sub pref-modal-sub">
              Set who you want to match with.
            </p>
          </div>
        </div>

        <div className="pref-modal-summary" aria-live="polite">
          <span className="pref-modal-summary-chip">
            <i className="ri-calendar-line" aria-hidden />
            Ages {displayMin}–{displayMax}
          </span>
          <span className="pref-modal-summary-chip">
            <i className="ri-map-pin-line" aria-hidden />
            Within {distanceLabel(safeDistance)}
          </span>
        </div>

        <section className="pref-modal-section" aria-labelledby="prefAgeHeading">
          <div className="pref-modal-section-head">
            <h3 id="prefAgeHeading" className="pref-modal-section-title">
              <i className="ri-user-smile-line" aria-hidden />
              Age range
            </h3>
            <span className="pref-modal-section-meta">
              {displayMin} – {displayMax}
            </span>
          </div>

          <div
            className="pref-age-track"
            aria-hidden
            style={
              {
                "--pref-age-start": `${minTrack}%`,
                "--pref-age-end": `${maxTrack}%`,
              } as CSSProperties
            }
          >
            <span className="pref-age-track-rail" />
            <span className="pref-age-track-fill" />
            <span
              className="pref-age-track-thumb pref-age-track-thumb--min"
              style={{ left: `${minTrack}%` }}
            />
            <span
              className="pref-age-track-thumb pref-age-track-thumb--max"
              style={{ left: `${maxTrack}%` }}
            />
          </div>

          <div className="pref-age-grid">
            <div className="pref-field">
              <label className="pref-field-label" htmlFor="prefMinAge">
                Min age
              </label>
              <div className="pref-stepper">
                <button
                  type="button"
                  className="pref-stepper-btn"
                  aria-label="Decrease minimum age"
                  disabled={safeMin <= PREF_AGE_MIN}
                  onClick={() => setMinAge(safeMin - 1)}
                >
                  <i className="ri-subtract-line" aria-hidden />
                </button>
                <input
                  type="number"
                  className="pref-stepper-input"
                  id="prefMinAge"
                  min={PREF_AGE_MIN}
                  max={PREF_AGE_MAX}
                  value={safeMin}
                  inputMode="numeric"
                  onChange={(event) => setMinAge(Number(event.target.value))}
                  onBlur={() => setMinAge(safeMin)}
                />
                <button
                  type="button"
                  className="pref-stepper-btn"
                  aria-label="Increase minimum age"
                  disabled={safeMin >= PREF_AGE_MAX}
                  onClick={() => setMinAge(safeMin + 1)}
                >
                  <i className="ri-add-line" aria-hidden />
                </button>
              </div>
            </div>

            <div className="pref-field">
              <label className="pref-field-label" htmlFor="prefMaxAge">
                Max age
              </label>
              <div className="pref-stepper">
                <button
                  type="button"
                  className="pref-stepper-btn"
                  aria-label="Decrease maximum age"
                  disabled={safeMax <= PREF_AGE_MIN}
                  onClick={() => setMaxAge(safeMax - 1)}
                >
                  <i className="ri-subtract-line" aria-hidden />
                </button>
                <input
                  type="number"
                  className="pref-stepper-input"
                  id="prefMaxAge"
                  min={PREF_AGE_MIN}
                  max={PREF_AGE_MAX}
                  value={safeMax}
                  inputMode="numeric"
                  onChange={(event) => setMaxAge(Number(event.target.value))}
                  onBlur={() => setMaxAge(safeMax)}
                />
                <button
                  type="button"
                  className="pref-stepper-btn"
                  aria-label="Increase maximum age"
                  disabled={safeMax >= PREF_AGE_MAX}
                  onClick={() => setMaxAge(safeMax + 1)}
                >
                  <i className="ri-add-line" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="pref-modal-section"
          aria-labelledby="prefDistanceHeading"
        >
          <div className="pref-modal-section-head">
            <h3 id="prefDistanceHeading" className="pref-modal-section-title">
              <i className="ri-radar-line" aria-hidden />
              Max distance
            </h3>
            <span className="pref-modal-section-meta pref-modal-section-meta--accent">
              {distanceLabel(safeDistance)}
            </span>
          </div>

          <div className="pref-distance-slider">
            <div
              className="pref-distance-track"
              aria-hidden
              style={
                { "--pref-distance-fill": `${distanceFill}%` } as CSSProperties
              }
            >
              <span className="pref-distance-track-rail" />
              <span className="pref-distance-track-fill" />
            </div>
            <input
              type="range"
              className="pref-distance-range"
              id="prefMaxDistance"
              min={PREF_DISTANCE_MIN}
              max={PREF_DISTANCE_MAX}
              step={PREF_DISTANCE_STEP}
              value={safeDistance}
              onChange={(event) =>
                onMaxDistanceChange(clampDistance(Number(event.target.value)))
              }
            />
          </div>

          <div className="pref-distance-scale" aria-hidden>
            <span>{PREF_DISTANCE_MIN} km</span>
            <span>250 km</span>
            <span>{PREF_DISTANCE_MAX}+ km</span>
          </div>
        </section>

        <button type="button" className="pref-modal-done" onClick={handleDone}>
          <i className="ri-check-line" aria-hidden />
          Done
        </button>
      </div>
    </div>
  );
}
