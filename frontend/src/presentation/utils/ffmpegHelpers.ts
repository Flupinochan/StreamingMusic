/**
 * Hlsストリーミング再生用に音声ファイルを分割
 * AWS Elemental MediaConvertでも変換可能だがコストが高いためffmpegを利用
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";

// 重いためメモリ上に保管
let ffmpeg: FFmpeg | undefined;

// FfmPeg初期化用
async function getFfmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }

  return ffmpeg;
}

export interface HlsResult {
  manifestFile: File;
  segmentFiles: File[];
}

/**
 * 与えられた単一の音声ファイルを複数のHLSセグメントファイルに分割
 * @param file 音声ファイル (mp3等の任意の形式)
 * @param segmentSeconds セグメント長（デフォルト 10 秒）
 */
export async function segmentAudioFile(
  file: File,
  segmentSeconds = 10,
): Promise<HlsResult> {
  const ff = await getFfmpeg();

  const name = file.name;
  const arrayBuffer = await file.arrayBuffer();

  await ff.writeFile(name, new Uint8Array(arrayBuffer));

  const manifestFileName = "index.m3u8";
  const segmentFileName = "seg%03d.ts";

  await ff.exec([
    "-i",
    name,
    "-codec",
    "copy",
    "-f",
    "hls",
    "-hls_time",
    segmentSeconds.toString(),
    "-hls_list_size",
    "0",
    "-hls_segment_filename",
    segmentFileName,
    manifestFileName,
  ]);

  const manifestData = (await ff.readFile(manifestFileName)) as Uint8Array;
  const manifestString = new TextDecoder().decode(manifestData);
  const manifestBlob = new Blob([manifestString], {
    type: "application/vnd.apple.mpegurl",
  });
  const manifestFile = new File([manifestBlob], "index.m3u8", {
    type: manifestBlob.type,
  });

  const segmentFiles: File[] = [];
  const files = (await ff.listDir("/"))
    .map((node) => node.name)
    .filter((f) => f.match(/^seg\d{3}\.ts$/));
  for (const fname of files) {
    const data = (await ff.readFile(fname)) as Uint8Array;
    const buf = data.buffer as ArrayBuffer;
    const blob = new Blob([buf], { type: "audio/MP2T" });
    const fileSeg = new File([blob], fname, { type: blob.type });
    segmentFiles.push(fileSeg);
  }

  return { manifestFile, segmentFiles };
}
