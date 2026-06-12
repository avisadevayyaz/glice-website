import type { GliceUser, UserLocation as AuthUserLocation } from "@/features/auth/types";
import type { UserLocation as SocketUserLocation } from "@/features/chat/types";

/** Payload shape from Flutter LocationModel.toJson() */
export type DiscoverLocationPayload = {
  name: string;
  city: string | null;
  region: string | null;
  country: string;
  district: string | null;
  latitude: number;
  longitude: number;
  mapboxId: string;
  fullAddress: string;
  placeFormatted: string;
};

function hasValidCoords(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function coordsFromUserLocation(
  location?: AuthUserLocation,
): { lat: number; lng: number } | null {
  if (!location) return null;

  if (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    hasValidCoords(location.latitude, location.longitude)
  ) {
    return { lat: location.latitude, lng: location.longitude };
  }

  const coords = location.coordinates;
  if (coords && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (hasValidCoords(lat, lng)) return { lat, lng };
  }

  return null;
}

function fromProfileLocation(
  location: AuthUserLocation,
  coords: { lat: number; lng: number },
): DiscoverLocationPayload {
  const text = location.text?.trim() || location.placeFormatted?.trim() || "";
  const name = location.name?.trim() || text || "Current location";
  const city = location.city?.trim() || text || name;
  const fullAddress =
    location.fullAddress?.trim() || location.placeFormatted?.trim() || text || name;

  return {
    name,
    city: city || null,
    region: location.region?.trim() || null,
    country: location.country?.trim() || "Unknown",
    district: location.district?.trim() || null,
    latitude: coords.lat,
    longitude: coords.lng,
    mapboxId: location.mapboxId?.trim() || "",
    fullAddress,
    placeFormatted: location.placeFormatted?.trim() || text || name,
  };
}

async function coordsFromBrowser(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        resolve(hasValidCoords(lat, lng) ? { lat, lng } : null);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/**
 * Resolves discover filter location like Flutter FilterModel + LocationCubit.userLoc.
 */
export async function resolveDiscoverLocation(
  user: GliceUser | null | undefined,
): Promise<DiscoverLocationPayload | null> {
  if (!user) return null;

  const profile = user.location;
  let coords = coordsFromUserLocation(profile);

  if (!coords) {
    coords = await coordsFromBrowser();
  }

  if (!coords) return null;

  if (profile) {
    return fromProfileLocation(profile, coords);
  }

  return {
    name: "Current location",
    city: "Current location",
    region: null,
    country: "Unknown",
    district: null,
    latitude: coords.lat,
    longitude: coords.lng,
    mapboxId: "",
    fullAddress: "Current location",
    placeFormatted: "Current location",
  };
}

/** Chat socket `get_all_convo` location — GeoJSON point from user or browser. */
export async function resolveSocketUserLocation(
  user: GliceUser | null | undefined,
): Promise<SocketUserLocation> {
  const profile = user?.location;
  const coords = coordsFromUserLocation(profile) ?? (await coordsFromBrowser());

  if (!coords) {
    return { type: "Point", coordinates: [0, 0], text: profile?.text?.trim() ?? "" };
  }

  const text =
    profile?.text?.trim() ||
    profile?.placeFormatted?.trim() ||
    profile?.fullAddress?.trim() ||
    "Current location";

  return {
    type: "Point",
    coordinates: [coords.lng, coords.lat],
    text,
  };
}
