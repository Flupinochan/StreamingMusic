import type { ApiClient } from '../apiClient'
import { makeApiClient } from '../apiClient'
import type { MusicMetadataDto } from './dto/musicMetadataDto'

export class MusicMetadataRepositoryRest {
  private client: ApiClient

  constructor(client: ApiClient = makeApiClient()) {
    this.client = client
  }

  async listMusicMetadata(): Promise<MusicMetadataDto[]> {
    const resp = await this.client.get<MusicMetadataDto[]>('/musicMetadata')
    return resp
  }

  async createMusicMetadata(input: MusicMetadataDto): Promise<void> {
    await this.client.post('/musicMetadata', input)
  }

  async removeMusicMetadata(id: string): Promise<void> {
    await this.client.delete(`/musicMetadata/${id}`)
  }
}
