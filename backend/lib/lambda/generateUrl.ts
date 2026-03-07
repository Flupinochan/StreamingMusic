process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppSyncResolverEvent, Context } from "aws-lambda";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

interface GenerateS3PresignedUrlInput {
  key: string;
}

export const handler = async (
  event: AppSyncResolverEvent<{ input: GenerateS3PresignedUrlInput }>,
  _context: Context,
) => {
  logger.logEventIfEnabled(event);

  const key = event.arguments?.input?.key;
  if (!key) {
    logger.error("Missing key in event", { event });
    throw new Error("Missing key");
  }

  logger.info("Generating S3 presigned URL", { key });

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  logger.info("Generated S3 presigned URL", { url });

  return { url };
};
