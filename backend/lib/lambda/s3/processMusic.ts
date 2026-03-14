process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import { JSONStringified } from "@aws-lambda-powertools/parser/helpers";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { z } from "zod";

const BUCKET_NAME = process.env.BUCKET_NAME!;
// ffmpeg Layerのパス
const FFMPEG_PATH = "/opt/bin/ffmpeg";

const logger = new Logger();
const s3Client = new S3Client();

const requestBodySchema = z.object({
  key: z.string().min(1),
});

const lambdaEventSchema = APIGatewayProxyEventSchema.extend({
  body: JSONStringified(requestBodySchema),
});

type ParsedEvent = z.infer<typeof lambdaEventSchema>;
type SafeParsedEvent = ParsedResult<ParsedEvent, ParsedEvent>;

const execFileAsync = promisify(execFile);

/**
 * 指定したS3 key音楽ファイルをHLS形式に変換し分割してS3へアップロードする
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
  const folder = path.dirname(key);
  const manifestKey = `${folder}/index.m3u8`;
  logger.info("Processing music file", { key, folder, manifestKey });

  // download S3 music file to /tmp
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
    const tmpAac = "/tmp/converted.m4a";
    const ext = path.extname(tmpFile).toLowerCase();

    if (ext !== ".m4a") {
      // Step 1: MP3 → AAC (m4a)
      // hls用のAACでないとバグるため
      await execFileAsync(FFMPEG_PATH, [
        "-i",
        tmpFile,
        "-vn",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-ar",
        "48000",
        tmpAac,
      ]);
    }

    // Step 2: AAC → HLS
    await execFileAsync(FFMPEG_PATH, [
      "-i",
      ext === ".m4a" ? tmpFile : tmpAac,
      "-c:a",
      "copy",
      "-f",
      "hls",
      "-hls_time",
      "10",
      "-hls_list_size",
      "0",
      "-hls_master_name",
      "index.m3u8",
      "-hls_segment_filename",
      "/tmp/seg%03d.ts",
      manifest,
    ]);

    // hls用オプションドキュメント
    // https://ffmpeg.org/ffmpeg-formats.html#hls-2
    // hls_base_url: manifest内のsegmentファイルを絶対パスにできる (今回はmanifestとsegmentを同じS3フォルダに置くため指定不要)
    // hls_list_size = 0: manifestに全てのsegmentファイル名を記載 (vodでは0に強制されるため指定不要)
  } catch (err) {
    logger.error("ffmpeg failed", { err });
    throw err;
  }

  // upload manifest and segments back to bucket under same folder
  const uploadFile = async (localPath: string, destKey: string) => {
    const body = fs.createReadStream(localPath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: destKey,
        Body: body,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  };
  await uploadFile(manifest, manifestKey);
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

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ manifestPath: manifestKey }),
  };
};

export const handler = middy(lambdaHandler).use(
  parser({ schema: lambdaEventSchema, safeParse: true }),
);
