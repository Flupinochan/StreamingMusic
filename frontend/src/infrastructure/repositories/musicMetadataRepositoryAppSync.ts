import type {
  CreateMusicMetadataInput,
  DeleteMusicMetadataInput,
  MusicMetadata,
} from '@/domain/value_objects/graphql/schema'
import { generateClient, type GraphQLResult } from 'aws-amplify/api'

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

const client = generateClient()

export class MusicMetadataRepositoryAmplify {
  async listMusicMetadata(): Promise<MusicMetadata[]> {
    const response = (await client.graphql<{ listMusicMetadata: MusicMetadata[] }>({
      query: listMusicMetadataQuery,
      authMode: 'userPool',
    })) as GraphQLResult<{ listMusicMetadata: MusicMetadata[] }>

    return response.data?.listMusicMetadata ?? []
  }

  async createMusicMetadata(input: CreateMusicMetadataInput): Promise<MusicMetadata> {
    const response = (await client.graphql({
      query: createMusicMetadataMutation,
      variables: { input },
      authMode: 'userPool',
    })) as GraphQLResult<{ createMusicMetadata: MusicMetadata }>

    return response.data!.createMusicMetadata
  }

  async removeMusicMetadata(input: DeleteMusicMetadataInput): Promise<MusicMetadata> {
    const response = (await client.graphql({
      query: removeMusicMetadataMutation,
      variables: { input },
      authMode: 'userPool',
    })) as GraphQLResult<{ removeMusicMetadata: MusicMetadata }>

    return response.data!.removeMusicMetadata
  }
}
