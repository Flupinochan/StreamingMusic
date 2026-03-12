process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
} from "@aws-sdk/client-s3";
import type { APIGatewayProxyHandler } from "aws-lambda";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

interface DeleteS3FolderInput {
  prefix: string;
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  logger.logEventIfEnabled(event);

  const body = event.body ? JSON.parse(event.body) : {};
  const prefix = body.prefix;
  if (!prefix) {
    logger.error("Missing prefix in event", { event });
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: "Missing prefix",
    };
  }

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
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
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
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    body: JSON.stringify({ deletedCount }),
  };
};
