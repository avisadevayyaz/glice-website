/**
 * Spark dating lobby socket contract — must match Flutter `socket_bloc.dart`:
 * - join_event / leave_event: `{ name, email }`
 * - get_joined_count: event name string only (`"spark_dating"`)
 * - spark_count response: `{ count, users?, genderCounts? }`
 */

export const SPARK_DATING_EVENT_NAME = "spark_dating" as const;

export type SparkJoinLeavePayload = {
  name: typeof SPARK_DATING_EVENT_NAME;
  email: string;
};

export type SparkCountPayload = {
  count: number;
  users: unknown[];
  genderCounts: Record<string, number>;
};

export function buildSparkJoinPayload(email: string): SparkJoinLeavePayload {
  return {
    name: SPARK_DATING_EVENT_NAME,
    email,
  };
}

export function buildSparkLeavePayload(email: string): SparkJoinLeavePayload {
  return buildSparkJoinPayload(email);
}

/** Flutter: `_socket?.emit("get_joined_count", event.eventName)` */
export function sparkJoinedCountRequest(): typeof SPARK_DATING_EVENT_NAME {
  return SPARK_DATING_EVENT_NAME;
}

/** Flutter: `spark_count` handler in socket_bloc.dart */
export function parseSparkCountPayload(raw: unknown): SparkCountPayload {
  if (typeof raw === "number" || typeof raw === "string") {
    const count = Number(raw);
    return {
      count: Number.isNaN(count) ? 0 : count,
      users: [],
      genderCounts: {},
    };
  }

  if (!raw || typeof raw !== "object") {
    return { count: 0, users: [], genderCounts: {} };
  }

  const data = raw as Record<string, unknown>;
  const count = Number(data.count ?? 0);

  const users = Array.isArray(data.users) ? data.users : [];

  const genderCounts: Record<string, number> = {};
  if (data.genderCounts && typeof data.genderCounts === "object") {
    for (const [key, value] of Object.entries(
      data.genderCounts as Record<string, unknown>,
    )) {
      genderCounts[key] = Number(value) || 0;
    }
  }

  return {
    count: Number.isNaN(count) ? 0 : count,
    users,
    genderCounts,
  };
}
