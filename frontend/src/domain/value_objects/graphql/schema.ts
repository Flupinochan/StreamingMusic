export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateMusicMetadataInput = {
  artworkImagePath: Scalars['String']['input'];
  artworkThumbnailImagePath: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  manifestPath: Scalars['String']['input'];
  seconds: Scalars['Int']['input'];
  size: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type DeleteMusicMetadataInput = {
  id: Scalars['ID']['input'];
};

export type DeleteS3FolderInput = {
  prefix: Scalars['String']['input'];
};

export type DeleteS3FolderOutput = {
  __typename?: 'DeleteS3FolderOutput';
  deletedCount: Scalars['Int']['output'];
};

export type GenerateS3PresignedUrlInput = {
  key: Scalars['String']['input'];
};

export type GenerateS3PresignedUrlOutput = {
  __typename?: 'GenerateS3PresignedUrlOutput';
  url: Scalars['String']['output'];
};

export type MusicMetadata = {
  __typename?: 'MusicMetadata';
  artworkImagePath: Scalars['String']['output'];
  artworkThumbnailImagePath: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  manifestPath: Scalars['String']['output'];
  seconds: Scalars['Int']['output'];
  size: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createMusicMetadata?: Maybe<MusicMetadata>;
  deleteS3Folder?: Maybe<DeleteS3FolderOutput>;
  processMusic?: Maybe<ProcessMusicOutput>;
  removeMusicMetadata?: Maybe<MusicMetadata>;
  updateMusicMetadata?: Maybe<MusicMetadata>;
};


export type MutationCreateMusicMetadataArgs = {
  input: CreateMusicMetadataInput;
};


export type MutationDeleteS3FolderArgs = {
  input: DeleteS3FolderInput;
};


export type MutationProcessMusicArgs = {
  input: ProcessMusicInput;
};


export type MutationRemoveMusicMetadataArgs = {
  input: DeleteMusicMetadataInput;
};


export type MutationUpdateMusicMetadataArgs = {
  input: UpdateMusicMetadataInput;
};

export type ProcessMusicInput = {
  key: Scalars['String']['input'];
};

export type ProcessMusicOutput = {
  __typename?: 'ProcessMusicOutput';
  manifestPath: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  generateS3PresignedUrl?: Maybe<GenerateS3PresignedUrlOutput>;
  listMusicMetadata: Array<MusicMetadata>;
};


export type QueryGenerateS3PresignedUrlArgs = {
  input: GenerateS3PresignedUrlInput;
};

export type Subscription = {
  __typename?: 'Subscription';
  onCreateMusicMetadata?: Maybe<MusicMetadata>;
  onRemoveMusicMetadata?: Maybe<MusicMetadata>;
  onUpdateMusicMetadata?: Maybe<MusicMetadata>;
};

export type UpdateMusicMetadataInput = {
  artworkImagePath?: InputMaybe<Scalars['String']['input']>;
  artworkThumbnailImagePath?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  manifestPath?: InputMaybe<Scalars['String']['input']>;
  seconds?: InputMaybe<Scalars['Int']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};
