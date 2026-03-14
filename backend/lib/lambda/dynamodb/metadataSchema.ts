import { z } from "zod";

export const metadataSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  seconds: z.number().nonnegative(),
  size: z.number().nonnegative(),
  manifestPath: z.string().min(1),
  artworkImagePath: z.string().min(1),
  artworkThumbnailImagePath: z.string().min(1),
});

export const metadataIdSchema = z.object({
  id: z.string().min(1),
});

export type Metadata = z.infer<typeof metadataSchema>;
export type MetadataId = z.infer<typeof metadataIdSchema>;
