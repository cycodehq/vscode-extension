import { container } from 'tsyringe';
import { ExtensionServiceSymbol, ScanResultsServiceSymbol } from '../symbols';
import { IExtensionService } from '../services/extension-service';
import { IScanResultsService } from '../services/scan-results-service';

export default async () => {
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const extensionService = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  scanResultsService.dropAllScanResults();
  await extensionService.refreshProviders();
};
