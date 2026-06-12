import { create } from "zustand";
import type {
  CallStage,
  FeedbackPhase,
  SparkDatingConfig,
  SparkPlanQuota,
  VideoChatMessage,
  VideoPartner,
} from "../types";

type VideoCallState = {
  stage: CallStage;
  partner: VideoPartner | null;
  roomId: string | null;
  messages: VideoChatMessage[];
  remoteStream: MediaStream | null;
  remoteVideoOn: boolean;
  isLocalPrimary: boolean;
  searchSecondsLeft: number;
  callSecondsLeft: number;
  roundsLeft: number;
  config: SparkDatingConfig | null;
  quota: SparkPlanQuota | null;
  error: string | null;
  endedByMe: boolean;
  continueAfterFeedback: boolean;
  feedbackPhase: FeedbackPhase;
  mutualMatch: boolean;
  matchedRoomId: string | null;
  everConnected: boolean;
  onlineCount: number;
  setStage: (stage: CallStage) => void;
  setPartner: (partner: VideoPartner | null) => void;
  setRoomId: (roomId: string | null) => void;
  addMessage: (message: VideoChatMessage) => void;
  clearMessages: () => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setRemoteVideoOn: (on: boolean) => void;
  toggleLayout: () => void;
  setSearchSecondsLeft: (seconds: number) => void;
  setCallSecondsLeft: (seconds: number) => void;
  setRoundsLeft: (rounds: number) => void;
  setConfig: (config: SparkDatingConfig) => void;
  setQuota: (quota: SparkPlanQuota) => void;
  setError: (error: string | null) => void;
  setEndedByMe: (endedByMe: boolean) => void;
  setContinueAfterFeedback: (continueAfterFeedback: boolean) => void;
  setFeedbackPhase: (phase: FeedbackPhase) => void;
  setMutualMatch: (matched: boolean, roomId?: string | null) => void;
  setEverConnected: (everConnected: boolean) => void;
  clearMediaState: () => void;
  setOnlineCount: (count: number) => void;
  resetCall: () => void;
};

export const useVideoCallStore = create<VideoCallState>((set) => ({
  stage: "idle",
  partner: null,
  roomId: null,
  messages: [],
  remoteStream: null,
  remoteVideoOn: true,
  isLocalPrimary: false,
  searchSecondsLeft: 0,
  callSecondsLeft: 0,
  roundsLeft: 0,
  config: null,
  quota: null,
  error: null,
  endedByMe: true,
  continueAfterFeedback: false,
  feedbackPhase: "pending",
  mutualMatch: false,
  matchedRoomId: null,
  everConnected: false,
  onlineCount: 0,
  setStage: (stage) => set({ stage }),
  setPartner: (partner) => set({ partner }),
  setRoomId: (roomId) => set({ roomId }),
  addMessage: (message) =>
    set((state) => {
      const duplicate = state.messages.some(
        (item) =>
          item.text === message.text &&
          item.senderId === message.senderId &&
          item.isMine === message.isMine,
      );
      if (duplicate) return state;
      return { messages: [...state.messages, message] };
    }),
  clearMessages: () => set({ messages: [] }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setRemoteVideoOn: (remoteVideoOn) => set({ remoteVideoOn }),
  toggleLayout: () =>
    set((state) => ({ isLocalPrimary: !state.isLocalPrimary })),
  setSearchSecondsLeft: (searchSecondsLeft) => set({ searchSecondsLeft }),
  setCallSecondsLeft: (callSecondsLeft) => set({ callSecondsLeft }),
  setRoundsLeft: (roundsLeft) => set({ roundsLeft }),
  setConfig: (config) => set({ config }),
  setQuota: (quota) => set({ quota }),
  setError: (error) => set({ error }),
  setEndedByMe: (endedByMe) => set({ endedByMe }),
  setContinueAfterFeedback: (continueAfterFeedback) =>
    set({ continueAfterFeedback }),
  setFeedbackPhase: (feedbackPhase) => set({ feedbackPhase }),
  setMutualMatch: (mutualMatch, roomId = null) =>
    set((state) => ({
      mutualMatch,
      matchedRoomId: roomId ?? state.matchedRoomId,
      feedbackPhase: mutualMatch ? "matched" : state.feedbackPhase,
    })),
  setEverConnected: (everConnected) => set({ everConnected }),
  clearMediaState: () =>
    set({
      remoteStream: null,
      remoteVideoOn: true,
      isLocalPrimary: false,
      messages: [],
    }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  resetCall: () =>
    set({
      partner: null,
      remoteStream: null,
      remoteVideoOn: true,
      isLocalPrimary: false,
      roomId: null,
      everConnected: false,
      messages: [],
      feedbackPhase: "pending",
      mutualMatch: false,
      matchedRoomId: null,
      continueAfterFeedback: false,
    }),
}));
