import type { GliceUser } from "@/features/auth/types";
import { reportRoutes } from "@/features/report/api/routes";
import { apiClient } from "@/lib/api-client";
import { normalizeIceServers } from "../lib/normalize-ice-servers";
import type { SparkDatingConfig, SparkPlanQuota } from "../types";

const ICE_ROUTE = "/configuration/api/get_ice";
const PLAN_FEATURES_ROUTE = "/membership_history/api/get_features";
const MEMBERSHIP_PLANS_ROUTE = "/membership_plan/api/get_all";

type IceResponse = {
  iceServers?: RTCIceServer[];
};

type RestrictionsBody = {
  sparkDating?: {
    maxWaitTime?: number;
    sparkDatingRounds?: number;
    roundExpireTime?: number;
  };
  distance?: {
    max?: number;
  };
};

type PlanFeaturesBody = {
  sparkDating?: {
    amount?: number;
  };
  adReward?: {
    sparkDating?: {
      amount?: number;
    };
  };
};

type MembershipPlanRow = {
  id?: string;
  category?: string;
  price?: number;
};

const DEFAULT_CONFIG: SparkDatingConfig = {
  maxWaitTime: 90,
  sparkDatingRounds: 3,
  roundExpireTime: 120,
  distanceMaxThreshold: 100,
};

/** Mirrors Flutter PlanFeature._mergeAmountWithUnlimited */
function mergeSparkAmount(base: number, reward: number): number {
  if (base === -1) return -1;
  return base + reward;
}

function parseSparkAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && "amount" in raw) {
    const amount = (raw as { amount?: unknown }).amount;
    if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  }
  return 0;
}

let cachedFreePlanId: string | null = null;
let cachedIceServers: RTCIceServer[] | null = null;
let iceFetchedAt = 0;

/** Cloudflare TURN credentials expire — refresh at least every 4 minutes. */
const ICE_CACHE_MS = 4 * 60 * 1000;

export function invalidateIceServerCache() {
  cachedIceServers = null;
  iceFetchedAt = 0;
}

export async function fetchIceServers(options?: {
  fresh?: boolean;
}): Promise<RTCIceServer[]> {
  const stale =
    !cachedIceServers?.length ||
    Date.now() - iceFetchedAt > ICE_CACHE_MS;

  if (!options?.fresh && cachedIceServers?.length && !stale) {
    return cachedIceServers;
  }

  try {
    const data = await apiClient.get<IceResponse>(ICE_ROUTE);
    cachedIceServers = normalizeIceServers(data?.iceServers);
    iceFetchedAt = Date.now();
    return cachedIceServers;
  } catch {
    if (cachedIceServers?.length && !options?.fresh) {
      return cachedIceServers;
    }
    cachedIceServers = [{ urls: "stun:stun.cloudflare.com:3478" }];
    iceFetchedAt = Date.now();
    return cachedIceServers;
  }
}

export async function fetchSparkDatingConfig(): Promise<SparkDatingConfig> {
  try {
    const data = await apiClient.get<RestrictionsBody>(
      reportRoutes.getRestrictions,
    );
    const spark = data?.sparkDating;
    const distanceMax = data?.distance?.max ?? DEFAULT_CONFIG.distanceMaxThreshold;

    return {
      maxWaitTime: spark?.maxWaitTime ?? DEFAULT_CONFIG.maxWaitTime,
      sparkDatingRounds:
        spark?.sparkDatingRounds ?? DEFAULT_CONFIG.sparkDatingRounds,
      roundExpireTime: spark?.roundExpireTime ?? DEFAULT_CONFIG.roundExpireTime,
      distanceMaxThreshold: distanceMax,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function fetchFreeMembershipPlanId(): Promise<string> {
  if (cachedFreePlanId) return cachedFreePlanId;

  try {
    const data = await apiClient.get<MembershipPlanRow[]>(MEMBERSHIP_PLANS_ROUTE);
    const plans = Array.isArray(data) ? data : [];
    const free =
      plans.find((plan) => plan.category === "free-plan") ??
      plans.find((plan) => (plan.price ?? 1) <= 0) ??
      plans[0];

    cachedFreePlanId = free?.id?.trim() ?? "";
    return cachedFreePlanId;
  } catch {
    return "";
  }
}

export async function resolveMembershipPlanId(user: GliceUser): Promise<string> {
  const planId = user.membership?.planId?.trim();
  if (planId) return planId;
  return fetchFreeMembershipPlanId();
}

/**
 * Mirrors Flutter MembershipCubit.getPlanFeature — POST with membershipId + userId.
 */
export async function fetchSparkPlanQuota(
  user: GliceUser,
): Promise<SparkPlanQuota> {
  const userId = user._id?.trim();
  if (!userId) {
    return { amount: 0, unlimited: false };
  }

  try {
    const membershipId = await resolveMembershipPlanId(user);
    if (!membershipId) {
      return { amount: 0, unlimited: false };
    }

    const data = await apiClient.post<PlanFeaturesBody>(PLAN_FEATURES_ROUTE, {
      membershipId,
      userId,
    });

    const baseAmount = parseSparkAmount(data?.sparkDating);
    const rewardAmount = parseSparkAmount(data?.adReward?.sparkDating);
    const amount = mergeSparkAmount(baseAmount, rewardAmount);

    return {
      amount,
      unlimited: amount === -1,
    };
  } catch {
    return { amount: 0, unlimited: false };
  }
}

export function resolveCallLimitSeconds(
  config: SparkDatingConfig,
  quota: SparkPlanQuota,
): number {
  if (quota.unlimited) return config.roundExpireTime;
  if (quota.amount <= 0) return config.roundExpireTime;
  return quota.amount;
}

export function canUseSparkDating(quota: SparkPlanQuota): boolean {
  return quota.unlimited || quota.amount > 0;
}
