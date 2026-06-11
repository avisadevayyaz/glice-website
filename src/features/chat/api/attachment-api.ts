import { apiClient } from "@/lib/api-client";
import type { ChatAttachment } from "../types";
import { chatRoutes } from "./routes";

type AddAttachmentBody = {
  userId: string;
  attachment: Record<string, unknown>;
};

/** Profile ice-breaker flow — mirrors AttachmentCubit.addAttachment */
export async function addAttachment(
  userId: string,
  attachment: ChatAttachment,
): Promise<ChatAttachment> {
  const payload: AddAttachmentBody = {
    userId,
    attachment: {
      id: attachment.id,
      url: attachment.url,
      thumbnail: attachment.thumbnail,
      type: attachment.type,
      size: attachment.size,
      title: attachment.title,
      userId: attachment.userId,
      pinned: attachment.pinned,
      isAdult: attachment.isAdult,
      verificationStatus: "approved",
    },
  };

  const res = await apiClient.post<{ body?: Record<string, unknown> } & Record<string, unknown>>(
    chatRoutes.addAttachment,
    payload,
  );

  const body = (res.body ?? res) as Record<string, unknown>;
  return {
    id: String(body._id ?? body.id ?? attachment.id),
    url: String(body.url ?? attachment.url),
    thumbnail: String(body.thumbnail ?? attachment.thumbnail),
    type: attachment.type,
    size: Number(body.size ?? attachment.size),
    title: String(body.title ?? attachment.title),
    userId: String(body.userId ?? userId),
    pinned: Boolean(body.pinned ?? attachment.pinned),
    isAdult: Boolean(body.isAdult ?? attachment.isAdult),
  };
}
