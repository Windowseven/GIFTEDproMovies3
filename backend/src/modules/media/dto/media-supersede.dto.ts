import { IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class MediaSupersedeDto {
  @IsIn(["movie", "episode"], {
    message: "contentKind must be either 'movie' or 'episode'",
  })
  contentKind!: "movie" | "episode";

  @IsUUID("4", { message: "targetId must be a valid UUID" })
  targetId!: string;

  @IsIn(["streaming", "download"], {
    message: "fileType must be either 'streaming' or 'download'",
  })
  fileType!: "streaming" | "download";

  @IsString()
  @IsNotEmpty({ message: "newStorageKey must not be empty" })
  newStorageKey!: string;

  @IsString()
  @IsNotEmpty({ message: "reason must not be empty" })
  reason!: string;
}

export interface MediaSupersedeResult {
  supersessionId: string;
  contentKind: "movie" | "episode";
  targetId: string;
  fileType: "streaming" | "download";
  previousFileKey: string | null;
  newFileKey: string;
  supersededAt: string;
}
