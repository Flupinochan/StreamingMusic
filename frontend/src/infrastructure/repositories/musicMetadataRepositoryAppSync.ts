import type {
  CreateMusicMetadataInput,
  DeleteMusicMetadataInput,
  MusicMetadata,
} from '@/domain/value_objects/graphql/schema'
import { type GraphQLResult } from 'aws-amplify/api'
import type { ApiClient } from '../apiClient'
import { makeApiClient } from '../apiClient'

const listMusicMetadataQuery = /* GraphQL */ `
  query ListMusicMetadata {
    listMusicMetadata {
      id
      title
      seconds
      size
      manifestPath
      artworkImagePath
      artworkThumbnailImagePath
    }
  }
`

const createMusicMetadataMutation = /* GraphQL */ `
  mutation CreateMusicMetadata($input: CreateMusicMetadataInput!) {
    createMusicMetadata(input: $input) {
      id
      title
      seconds
      size
      manifestPath
      artworkImagePath
      artworkThumbnailImagePath
    }
  }
`

const removeMusicMetadataMutation = /* GraphQL */ `
  mutation RemoveMusicMetadata($input: DeleteMusicMetadataInput!) {
    removeMusicMetadata(input: $input) {
      id
      title
      seconds
      size
      manifestPath
      artworkImagePath
      artworkThumbnailImagePath
    }
  }
`

export class MusicMetadataRepositoryAmplify {
  private client: ApiClient

  constructor(client: ApiClient = makeApiClient()) {
    this.client = client
  }

  async listMusicMetadata(): Promise<MusicMetadata[]> {
    const response = (await this.client.graphql<{ listMusicMetadata: MusicMetadata[] }>({
      query: listMusicMetadataQuery,
    })) as GraphQLResult<{ listMusicMetadata: MusicMetadata[] }>

    return response.data?.listMusicMetadata ?? []
  }

  async createMusicMetadata(input: CreateMusicMetadataInput): Promise<MusicMetadata> {
    const response = (await this.client.graphql({
      query: createMusicMetadataMutation,
      variables: { input },
    })) as GraphQLResult<{ createMusicMetadata: MusicMetadata }>

    return response.data!.createMusicMetadata
  }

  async removeMusicMetadata(input: DeleteMusicMetadataInput): Promise<MusicMetadata> {
    const response = (await this.client.graphql({
      query: removeMusicMetadataMutation,
      variables: { input },
    })) as GraphQLResult<{ removeMusicMetadata: MusicMetadata }>

    return response.data!.removeMusicMetadata
  }
}
