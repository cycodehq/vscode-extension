import { Type } from 'class-transformer';

export class SupportedModulesStatus {
  // TODO(MarshalX): respect enabled/disabled scanning modules
  secretScanning: boolean;
  scaScanning: boolean;
  iacScanning: boolean;
  sastScanning: boolean;
  aiLargeLanguageModel: boolean;
}

export class StatusResult {
  program: string;
  version: string;
  isAuthenticated: boolean;
  userId: string | null;
  tenantId: string | null;
  @Type(() => SupportedModulesStatus)
  supportedModules: SupportedModulesStatus;
}
