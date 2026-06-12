const S3_PREFIX = "/s3_file/api";
const ATTACHMENT_PREFIX = "/attachment/api";

export const chatRoutes = {
  s3UploadFile: `${S3_PREFIX}/upload_file`,
  s3DeleteFile: `${S3_PREFIX}/delete_file`,
  addAttachment: `${ATTACHMENT_PREFIX}/add`,
  getAllAttachments: `${ATTACHMENT_PREFIX}/get_all`,
} as const;
