import { IsISO8601, IsNotEmpty, IsObject, IsString } from 'class-validator';

class IngestMetricsDto {
  @IsObject()
  @IsNotEmpty()
  metrics!: Record<string, number>;
}

export class IngestDto extends IngestMetricsDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  farmId!: string;

  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @IsString()
  @IsISO8601({ strict: true })
  ts!: string;
}
