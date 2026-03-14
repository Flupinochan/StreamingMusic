process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import { JSONStringified } from "@aws-lambda-powertools/parser/helpers";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { z } from "zod";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

const requestBodySchema = z.object({
  key: z.string().min(1),
});

const lambdaEventSchema = APIGatewayProxyEventSchema.extend({
  body: JSONStringified(requestBodySchema),
});

type ParsedEvent = z.infer<typeof lambdaEventSchema>;
type SafeParsedEvent = ParsedResult<ParsedEvent, ParsedEvent>;

/**
 * 指定したS3 keyのpresigned URLを生成して返却
 * @param event
 * @param context
 * @returns
 */
const lambdaHandler = async (
  event: SafeParsedEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);

  // middy, zodを利用したリクエストボディのバリデーション
  if (!event.success) {
    logger.error("Invalid request body", { error: event.error });
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: "Invalid request body",
    };
  }

  const key = event.data.body.key;
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
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ url }),
  };
};

export const handler = middy(lambdaHandler).use(
  parser({ schema: lambdaEventSchema, safeParse: true }),
);
