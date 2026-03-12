process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyHandler } from "aws-lambda";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

interface GenerateS3PresignedUrlInput {
  key: string;
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  logger.logEventIfEnabled(event);

  const body = event.body ? JSON.parse(event.body) : {};
  const key = body.key;
  if (!key) {
    logger.error("Missing key in event", { event });
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: "Missing key",
    };
  }

  logger.info("Generating S3 presigned URL", { key });

  // presigned URL生成時のheaderとアップロード時のheaderは一致させる必要がある
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    CacheControl: "public, max-age=31536000, immutable",
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  logger.info("Generated S3 presigned URL", { url });

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    body: JSON.stringify({ url }),
  };
};
