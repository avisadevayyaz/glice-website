import type { VideoFilterInput } from "../types";
import type { DiscoverLocationPayload } from "./discover-location";

const BACKEND_UNLIMITED_DISTANCE = 999_999_999;

/** Mirrors Flutter FilterModel.gender / AppUtils.capitalizeWords — e.g. Any, Man, Woman */
function mapGender(gender: VideoFilterInput["gender"]): string {
  switch (gender) {
    case "Women":
      return "Woman";
    case "Men":
      return "Man";
    default:
      return "Any";
  }
}

/** Mirrors Flutter FilterModel.toJsonForCameraScreen */
export function buildDiscoverFilter(
  input: VideoFilterInput,
  distanceMaxThreshold: number,
  location?: DiscoverLocationPayload | null,
) {
  const atMax = input.maxDistance >= distanceMaxThreshold;
  const maxDistanceOut = atMax
    ? BACKEND_UNLIMITED_DISTANCE
    : input.maxDistance;

  return {
    minAge: input.minAge,
    maxAge: input.maxAge,
    interest: "Any",
    minDistance: 1,
    maxDistance: maxDistanceOut,
    lookingFor: mapGender(input.gender),
    location: location ?? null,
  };
}
