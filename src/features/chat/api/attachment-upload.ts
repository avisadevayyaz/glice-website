import type { AttachmentType } from "../types";

import { uploadChatFile } from "./upload";



export type UploadedMedia = {

  url: string;

  thumbnail: string;

  isAdult: boolean;

};



async function dataUrlToFile(dataUrl: string): Promise<File> {

  const res = await fetch(dataUrl);

  const blob = await res.blob();

  return new File([blob], `thumb-${Date.now()}.jpg`, {

    type: blob.type || "image/jpeg",

  });

}



/**

 * Chat media upload — mirrors Flutter bottom_builder.dart

 * Chat messages use S3 only (not addAttachment).

 */

export async function uploadChatMedia(

  file: File,

  type: AttachmentType,

  userId: string,

  options?: {

    videoThumbnail?: string;

    onProgress?: (percent: number) => void;

  },

): Promise<UploadedMedia> {

  const onProgress = options?.onProgress;



  if (type === "video" && options?.videoThumbnail?.startsWith("data:")) {

    const thumbFile = await dataUrlToFile(options.videoThumbnail);

    const [videoResult, thumbResult] = await Promise.all([

      uploadChatFile(file, userId, onProgress),

      uploadChatFile(thumbFile, userId),

    ]);

    return {

      url: videoResult.publicUrl,

      thumbnail: thumbResult.publicUrl,

      isAdult: Boolean(videoResult.isAdult || thumbResult.isAdult),

    };

  }



  const result = await uploadChatFile(file, userId, onProgress);
  const publicUrl = result.publicUrl;

  return {
    url: publicUrl,
    thumbnail:
      type === "image"
        ? publicUrl
        : options?.videoThumbnail?.startsWith("http")
          ? options.videoThumbnail
          : publicUrl,
    isAdult: Boolean(result.isAdult),
  };

}

