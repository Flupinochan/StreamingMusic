import type { UploadRequestDto } from '@/infrastructure/repositories/dto/uploadRequestDto'
import { generateClient, type GraphQLResult } from 'aws-amplify/api'

const client = generateClient()

export class MusicDataRepositoryAmplify {
  async getUrl(path: string): Promise<string> {
    const query = /* GraphQL */ `
      query GenerateS3PresignedUrl($input: GenerateS3PresignedUrlInput!) {
        generateS3PresignedUrl(input: $input) {
          url
        }
      }
    `

    const response = (await client.graphql<{
      generateS3PresignedUrl: { url: string }
    }>({
      query,
      variables: { input: { key: path } },
      authMode: 'userPool',
    })) as GraphQLResult<{ generateS3PresignedUrl: { url: string } }>

    const url = response.data?.generateS3PresignedUrl?.url
    if (!url) {
      throw new Error(`failed to generate presigned url for key: ${path}`)
    }

    return url
  }

  async upload(input: UploadRequestDto): Promise<void> {
    const url = await this.getUrl(input.pathS3)

    const response = await fetch(url, {
      method: 'PUT',
      body: input.binary.data,
      headers: {
        'Content-Type': input.binary.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

    if (!response.ok) {
      throw new Error(`failed to upload object to presigned url (status ${response.status})`)
    }
  }

  async remove(prefix: string): Promise<void> {
    const mutation = /* GraphQL */ `
      mutation DeleteS3Folder($input: DeleteS3FolderInput!) {
        deleteS3Folder(input: $input) {
          deletedCount
        }
      }
    `

    const response = (await client.graphql<{
      deleteS3Folder: { deletedCount: number }
    }>({
      query: mutation,
      variables: { input: { prefix } },
      authMode: 'userPool',
    })) as GraphQLResult<{ deleteS3Folder: { deletedCount: number } }>

    const count = response.data?.deleteS3Folder?.deletedCount
    if (count === undefined) {
      throw new Error(`failed to delete objects for prefix: ${prefix}`)
    }
  }

  async process(key: string): Promise<string> {
    const mutation = /* GraphQL */ `
      mutation ProcessMusic($input: ProcessMusicInput!) {
        processMusic(input: $input) {
          manifestPath
        }
      }
    `

    const response = (await client.graphql<{
      processMusic: { manifestPath: string }
    }>({
      query: mutation,
      variables: { input: { key } },
      authMode: 'userPool',
    })) as GraphQLResult<{ processMusic: { manifestPath: string } }>

    const path = response.data?.processMusic?.manifestPath
    if (!path) {
      throw new Error(`failed to process music file: ${key}`)
    }
    return path
  }
}
