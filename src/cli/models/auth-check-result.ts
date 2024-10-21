import { Type } from 'class-transformer';

export class AuthCheckResultData {
  userId: string;
  tenantId: string;
}

export class AuthCheckResult {
  result: boolean;
  message: string;
  @Type(() => AuthCheckResultData)
  data?: AuthCheckResultData;
}
