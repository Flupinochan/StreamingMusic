process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { AppSyncResolverEvent, Context } from "aws-lambda";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const logger = new Logger();
const s3Client = new S3Client();

const BUCKET_NAME = process.env.BUCKET_NAME!;
const FFMPEG_PATH = "/opt/ffmpeg"; // layer should place ffmpeg binary here

interface ProcessMusicInput {
  key: string;
}

const execFileAsync = promisify(execFile);

export const handler = async (
  event: AppSyncResolverEvent<{ input: ProcessMusicInput }>,
  _context: Context,
) => {
  logger.logEventIfEnabled(event);

  const key = event.arguments?.input?.key;
  if (!key) {
    logger.error("Missing key in event", { event });
    throw new Error("Missing key");
  }

  const folder = path.dirname(key);
  const manifestKey = `${folder}/index.m3u8`;
  logger.info("Processing music file", { key, folder, manifestKey });

  // download file to /tmp
  const tmpFile = `/tmp/${path.basename(key)}`;
  const getResp = await s3Client.send(
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
  );
  if (!getResp.Body) {
    throw new Error("failed to download source file");
  }
  const writeStream = fs.createWriteStream(tmpFile);
  await new Promise((res, rej) => {
    (getResp.Body as any).pipe(writeStream).on("finish", res).on("error", rej);
  });

  // run ffmpeg to generate HLS segments and manifest in /tmp
  const manifest = "/tmp/index.m3u8";
  try {
    await execFileAsync(FFMPEG_PATH, [
      "-i",
      tmpFile,
      "-codec",
      "copy",
      "-f",
      "hls",
      "-hls_time",
      "10",
      "-hls_list_size",
      "0",
      "-hls_segment_filename",
      "/tmp/seg%03d.ts",
      manifest,
    ]);
  } catch (err) {
    logger.error("ffmpeg failed", { err });
    throw err;
  }

  // upload manifest and segments back to bucket under same folder
  const uploadFile = async (localPath: string, destKey: string) => {
    const body = fs.createReadStream(localPath);
    await s3Client.send(
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: destKey, Body: body }),
    );
  };

  await uploadFile(manifest, manifestKey);
  // upload segments
  const files = fs.readdirSync("/tmp").filter((f) => f.match(/^seg\d{3}\.ts$/));
  await Promise.all(
    files.map((f) => uploadFile(`/tmp/${f}`, `${folder}/${f}`)),
  );

  // delete original file
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );
  } catch (err) {
    logger.warn("Failed to delete original file", { key, err });
  }

  logger.info("Processing complete", { manifestKey });
  return { manifestPath: manifestKey };
};
