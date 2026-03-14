import type { UploadRequestDto } from '@/infrastructure/repositories/dto/uploadRequestDto'
import type { ApiClient } from '../apiClient'
import { makeApiClient } from '../apiClient'

export class MusicDataRepositoryRest {
  private client: ApiClient

  constructor(client: ApiClient = makeApiClient()) {
    this.client = client
  }

  async getUrl(path: string): Promise<string> {
    const resp = await this.client.post<{ url: string }>('/generateS3PresignedUrl', {
      key: path,
    })
    if (!resp.url) {
      throw new Error(`failed to generate presigned url for key: ${path}`)
    }
    return resp.url
  }

  async upload(input: UploadRequestDto): Promise<void> {
    const url = await this.getUrl(input.pathS3)

    const response = await fetch(url, {
      method: 'PUT',
      body: input.binary.data,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

    if (!response.ok) {
      throw new Error(`failed to upload object to presigned url (status ${response.status})`)
    }
  }

  async remove(prefix: string): Promise<void> {
    const resp = await this.client.post<{ deletedCount: number }>('/deleteS3Folder', {
      prefix,
    })
    if (typeof resp.deletedCount !== 'number') {
      throw new Error(`failed to delete objects for prefix: ${prefix}`)
    }
  }

  async process(key: string): Promise<string> {
    await this.client.post<{ manifestPath: string }>('/processMusic', {
      key,
    })
    // SQSに送るだけにしたのでレスポンスはリクエストのkeyを返すように変更
    // if (!resp.manifestPath) {
    //   throw new Error(`failed to process music file: ${key}`)
    // }
    return key
  }
}
