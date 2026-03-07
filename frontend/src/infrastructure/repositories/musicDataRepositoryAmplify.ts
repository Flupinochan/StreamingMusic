import type { UploadRequestDto } from '@/infrastructure/repositories/dto/uploadRequestDto'
import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { fetchAuthSession } from 'aws-amplify/auth'

const BUCKET_NAME = 'streamingmusichostingstack-bucket'

async function getS3Client(): Promise<S3Client> {
  const session = await fetchAuthSession()
  return new S3Client({
    region: 'ap-northeast-1',
    credentials: session.credentials,
  })
}

export class MusicDataRepositoryAmplify {
  async uploadMusicData(input: UploadRequestDto): Promise<void> {
    const client = await getS3Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: input.pathS3,
      Body: input.binary.data,
      ContentType: input.binary.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
    await client.send(command)
  }

  async remove(prefix: string): Promise<void> {
    // フォルダパスをベースにListしフォルダ内の全ファイル(audio, manifest等)を削除

    const client = await getS3Client()

    // List
    const objectKeys: string[] = []
    const paginator = paginateListObjectsV2(
      { client, pageSize: 1000 },
      { Bucket: BUCKET_NAME, Prefix: prefix },
    )
    for await (const page of paginator) {
      if (page.Contents) objectKeys.push(...page.Contents.map((obj) => obj.Key!))
    }

    if (objectKeys.length === 0) return

    // Delete
    const chunks: string[][] = []
    for (let i = 0; i < objectKeys.length; i += 1000) {
      chunks.push(objectKeys.slice(i, i + 1000))
    }
    await Promise.all(
      chunks.map((chunk) =>
        client.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: chunk.map((key) => ({ Key: key })) },
          }),
        ),
      ),
    )
  }
}
