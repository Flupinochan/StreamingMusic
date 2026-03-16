import { signIn } from 'aws-amplify/auth'
import { beforeAll, describe, expect, it } from 'vitest'

import { MusicMetadata } from '@/domain/entities/musicMetadata'
import { MusicSeconds } from '@/domain/value_objects/musicSeconds'
import { MusicSize } from '@/domain/value_objects/musicSize'
import { MusicTitle } from '@/domain/value_objects/musicTitle'
import { ArtworkImagePath } from '@/domain/value_objects/path/artworkImagePath'
import { ArtworkThumbnailImagePath } from '@/domain/value_objects/path/artworkThumbnailImagePath'
import { ManifestPath } from '@/domain/value_objects/path/manifestPath'
import { initAmplify } from '@/infrastructure/amplify'
import { MusicMetadataRepositoryImpl } from '@/infrastructure/repositories/musicMetadataRepositoryImpl'
import { MusicMetadataRepositoryRest } from '@/infrastructure/repositories/musicMetadataRepositoryRest'

describe('Integration API', () => {
  beforeAll(async () => {
    const user = process.env.TEST_USER
    const password = process.env.TEST_PASSWORD

    if (!user || !password) {
      throw new Error('TEST_USER and TEST_PASSWORD must be set to run this integration test')
    }

    initAmplify()
    await signIn({ username: user, password })
  })

  it('listMusicMetadata', async () => {
    const repo = new MusicMetadataRepositoryImpl(new MusicMetadataRepositoryRest())
    const result = await repo.listMusicMetadata()

    expect(Array.isArray(result)).toBe(true)
    const first = result[0]
    expect(typeof first.id.value).toBe('string')
    expect(typeof first.title.value).toBe('string')
    expect(typeof first.manifestPath.value).toBe('string')
    expect(typeof first.artworkImagePath.value).toBe('string')
    expect(typeof first.artworkThumbnailImagePath.value).toBe('string')
    expect(typeof first.seconds.value).toBe('number')
    expect(typeof first.size.value).toBe('number')
  })

  // oxlint-disable-next-line jest/expect-expect
  it('createMusicMetadata and removeMusicMetadata', async () => {
    const repo = new MusicMetadataRepositoryImpl(new MusicMetadataRepositoryRest())
    const now = Date.now().toString()

    const metadata = MusicMetadata.create(
      MusicTitle.create(`test-${now}`),
      MusicSeconds.create(123),
      MusicSize.create(45678),
      ManifestPath.create(`test-${now}`, 'manifest.m3u8'),
      ArtworkImagePath.create(`test-${now}`, 'artwork.png'),
      ArtworkThumbnailImagePath.create(`test-${now}`, 'thumbnail.png'),
    )

    // Ensure the endpoint accepts create/delete without throwing.
    await repo.createMusicMetadata(metadata)
    await repo.removeMusicMetadata(metadata.id)
  })
})
