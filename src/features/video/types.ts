export type CallStage =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "feedback";

export type FeedbackPhase = "pending" | "waiting" | "matched" | "done";

export type VideoPartner = {
  id: string;
  name: string;
  profileUrl: string;
  distance?: string;
};

export type VideoChatMessage = {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMine: boolean;
};

export type SparkDatingConfig = {
  maxWaitTime: number;
  sparkDatingRounds: number;
  roundExpireTime: number;
  distanceMaxThreshold: number;
};

export type SparkPlanQuota = {
  amount: number;
  unlimited: boolean;
};

export type PeerFoundPayload = {
  roomId: string;
  otherUser: string;
  otherUserName: string;
  otherUserProfilePic?: string;
};

export type VideoFilterInput = {
  gender: "Everyone" | "Women" | "Men";
  minAge: number;
  maxAge: number;
  maxDistance: number;
};

export type RandomCallFilter = "all" | "random" | "spark";

export type RandomCallPartner = VideoPartner & {
  age?: number;
  gender?: string;
  username?: string;
  bio?: string;
  interests?: string[];
  isActive?: boolean;
};

export type RandomCallEntry = {
  id: string;
  partner: RandomCallPartner;
  durationSec: number;
  timestamp: Date;
  distance?: string;
  liked?: boolean;
  callType?: RandomCallFilter;
};

export type PaginatedRandomCallHistory = {
  type: RandomCallFilter;
  entries: RandomCallEntry[];
  totalCalls: number;
  currentPage: number;
  totalPages: number;
};
