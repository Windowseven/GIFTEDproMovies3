import { IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class UploadCompleteDto {
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsIn(["movie", "episode"])
  contentKind!: "movie" | "episode";

  @IsUUID("4")
  targetId!: string; // movieEditionId or episodeId

  @IsIn(["streaming", "download"])
  fileType!: "streaming" | "download";
}
