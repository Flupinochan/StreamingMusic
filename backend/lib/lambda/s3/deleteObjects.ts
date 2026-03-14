import { Logger } from "@aws-lambda-powertools/logger";
import { JSONStringified } from "@aws-lambda-powertools/parser/helpers";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
} from "@aws-sdk/client-s3";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { z } from "zod";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

const requestBodySchema = z.object({
  prefix: z.string().min(1),
});

const lambdaEventSchema = APIGatewayProxyEventSchema.extend({
  body: JSONStringified(requestBodySchema),
});

type ParsedEvent = z.infer<typeof lambdaEventSchema>;
type SafeParsedEvent = ParsedResult<ParsedEvent, ParsedEvent>;

/**
 * 指定したS3 prefix以下のオブジェクトを全て削除する
 * ※proxy統合のため、API Gateway modelは利用せず、Lambda内でzodを使ってバリデーションを行う
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

  const prefix = event.data.body.prefix;
  logger.info("Deleting objects with prefix", { prefix });

  // list objects
  const objectKeys: string[] = [];
  const paginator = paginateListObjectsV2(
    { client: s3Client, pageSize: 1000 },
    { Bucket: BUCKET_NAME, Prefix: prefix },
  );
  for await (const page of paginator) {
    if (page.Contents) {
      objectKeys.push(...page.Contents.map((obj) => obj.Key!));
    }
  }

  if (objectKeys.length === 0) {
    logger.info("No objects found for prefix", { prefix });
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ deletedCount: 0 }),
    };
  }

  // delete in chunks of 1000
  const chunks: string[][] = [];
  for (let i = 0; i < objectKeys.length; i += 1000) {
    chunks.push(objectKeys.slice(i, i + 1000));
  }

  let deletedCount = 0;
  await Promise.all(
    chunks.map(async (chunk) => {
      const resp = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: chunk.map((key) => ({ Key: key })) },
        }),
      );
      if (resp.Deleted) {
        deletedCount += resp.Deleted.length;
      }
    }),
  );

  logger.info("Deleted objects completed", { deletedCount, prefix });
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ deletedCount }),
  };
};

export const handler = middy(lambdaHandler).use(
  parser({ schema: lambdaEventSchema, safeParse: true }),
);
