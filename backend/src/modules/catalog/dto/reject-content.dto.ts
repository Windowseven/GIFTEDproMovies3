import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RejectContentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  rejectionReason!: string;
}
