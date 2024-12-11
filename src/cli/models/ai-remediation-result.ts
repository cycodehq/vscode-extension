import { Type } from 'class-transformer';

export class AiRemediationResultData {
  remediation: string;
  isFixAvailable: boolean;
}

export class AiRemediationResult {
  result: boolean;
  message: string;
  @Type(() => AiRemediationResultData)
  data?: AiRemediationResultData;
}
