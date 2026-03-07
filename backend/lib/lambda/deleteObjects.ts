process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
} from "@aws-sdk/client-s3";
import type { AppSyncResolverEvent, Context } from "aws-lambda";

const BUCKET_NAME = process.env.BUCKET_NAME!;

const s3Client = new S3Client();
const logger = new Logger();

interface DeleteS3FolderInput {
  prefix: string;
}

export const handler = async (
  event: AppSyncResolverEvent<{ input: DeleteS3FolderInput }>,
  _context: Context,
) => {
  logger.logEventIfEnabled(event);

  const prefix = event.arguments?.input?.prefix;
  if (!prefix) {
    logger.error("Missing prefix in event", { event });
    throw new Error("Missing prefix");
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
    return { deletedCount: 0 };
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
  return { deletedCount };
};
