import { IsNotEmpty, IsUUID } from "class-validator";

export class CreateSeriesMetadataDto {
  @IsNotEmpty()
  @IsUUID("4")
  leadDjId!: string;
}
