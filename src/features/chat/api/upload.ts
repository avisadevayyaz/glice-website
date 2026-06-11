import { refreshAccessToken } from "@/features/auth/lib/refresh-auth";

import { tokenStorage } from "@/features/auth/lib/token-storage";

import { normalizeMediaUrlString } from "../lib/resolve-media-url";
import { chatRoutes } from "./routes";



export type S3UploadResult = {

  publicUrl: string;

  isAdult: boolean;

};



function unwrapResponse(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const map = data as Record<string, unknown>;

  if (map.publicUrl || map.url) return data;

  if (map.body != null) return unwrapResponse(map.body);

  if (map.data != null) return unwrapResponse(map.data);

  return data;
}

/** Parse raw XHR body — API may return a JSON string, object, or plain URL. */
function parseUploadResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith('"')
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      /* fall through to raw text */
    }
  }

  return trimmed;
}

/** Mirrors GliceFlutterV1/lib/models/s3_upload_result.dart */
export function parseS3UploadResponse(data: unknown): S3UploadResult {
  const unwrapped = unwrapResponse(data);

  if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
    const map = unwrapped as Record<string, unknown>;
    const publicUrl = normalizeMediaUrlString(
      String(map.publicUrl ?? map.url ?? ""),
    );
    return {
      publicUrl,
      isAdult: map.isAdult === true,
    };
  }

  if (typeof unwrapped === "string") {
    const trimmed = normalizeMediaUrlString(unwrapped);

    if (trimmed.startsWith("{")) {
      try {
        return parseS3UploadResponse(JSON.parse(trimmed) as unknown);
      } catch {
        /* fall through */
      }
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return { publicUrl: trimmed, isAdult: false };
    }
  }

  const fallback = normalizeMediaUrlString(String(unwrapped ?? ""));
  return { publicUrl: fallback, isAdult: false };
}



/**

 * Upload file to S3 — mirrors Flutter ApiService.uploadFile

 * POST {API}/s3_file/api/upload_file

 * Headers: authorization, userid

 * Body: multipart field "file"

 */

export async function uploadChatFile(

  file: File,

  userId: string,

  onProgress?: (percent: number) => void,

): Promise<S3UploadResult> {

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

  if (!baseUrl) {

    throw new Error("NEXT_PUBLIC_API_URL is not configured");

  }



  const url = `${baseUrl}${chatRoutes.s3UploadFile}`;



  const attempt = async (token: string | null): Promise<S3UploadResult> => {

    const formData = new FormData();

    formData.append("file", file, file.name);



    return new Promise((resolve, reject) => {

      const xhr = new XMLHttpRequest();

      xhr.open("POST", url);

      if (token) xhr.setRequestHeader("authorization", token);

      xhr.setRequestHeader("userid", userId);

      xhr.setRequestHeader("ngrok-skip-browser-warning", "true");



      xhr.upload.onprogress = (event) => {

        if (event.lengthComputable && onProgress) {

          onProgress((event.loaded / event.total) * 100);

        }

      };



      xhr.onload = () => {

        if (xhr.status === 401) {

          reject(new Error("UNAUTHORIZED"));

          return;

        }

        if (xhr.status >= 200 && xhr.status < 300) {

          try {

            const result = parseS3UploadResponse(
              parseUploadResponseBody(xhr.responseText),
            );

            if (
              !result.publicUrl ||
              (!result.publicUrl.startsWith("http://") &&
                !result.publicUrl.startsWith("https://"))
            ) {
              reject(new Error("Upload succeeded but no URL returned"));
              return;
            }

            resolve(result);

          } catch {

            reject(new Error("Invalid upload response"));

          }

          return;

        }

        reject(new Error(`Upload failed (${xhr.status})`));

      };



      xhr.onerror = () => reject(new Error("Upload network error"));

      xhr.send(formData);

    });

  };



  const token = tokenStorage.getAccessToken();

  try {

    return await attempt(token);

  } catch (e) {

    if (e instanceof Error && e.message === "UNAUTHORIZED") {

      const newToken = await refreshAccessToken();

      if (newToken) {

        return attempt(newToken);

      }

    }

    throw e;

  }

}

