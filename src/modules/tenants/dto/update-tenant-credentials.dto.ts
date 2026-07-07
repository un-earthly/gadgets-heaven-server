import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTenantCredentialsDto {
  @IsString()
  @IsOptional()
  sslcommerzStoreId?: string;

  @IsString()
  @IsOptional()
  sslcommerzStorePassword?: string;

  @IsString()
  @IsOptional()
  steadfastApiKey?: string;

  @IsString()
  @IsOptional()
  steadfastSecretKey?: string;

  @IsString()
  @IsOptional()
  whatsappPhoneNumberId?: string;

  @IsString()
  @IsOptional()
  whatsappAccessToken?: string;

  @IsBoolean()
  @IsOptional()
  simpleMode?: boolean;
}
