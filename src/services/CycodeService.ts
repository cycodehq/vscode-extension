import {cliDownloadService} from './CliDownloadService';
import {cliService} from './CliService';

class CycodeService {
  public async installCliIfNeededAndCheckAuthentication() {
    // TODO(MarshalX): show progressbar?
    await cliDownloadService.initCli();

    // required to know CLI version.
    // we don't have a universal command that will cover the auth state and CLI version yet
    await cliService.healthCheck();
    await cliService.checkAuth();
  }
}

export const cycodeService = new CycodeService();
