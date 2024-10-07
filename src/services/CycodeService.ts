import {ICliDownloadService} from './CliDownloadService';
import {inject, injectable} from 'tsyringe';
import {CliDownloadServiceSymbol, CliServiceSymbol} from '../symbols';
import {ICliService} from './CliService';

export interface ICycodeService {
  installCliIfNeededAndCheckAuthentication(): Promise<void>;
}

@injectable()
export class CycodeService implements ICycodeService {
  constructor(
      @inject(CliDownloadServiceSymbol) private cliDownloadService: ICliDownloadService,
      @inject(CliServiceSymbol) private cliService: ICliService,
  ) {}

  public async installCliIfNeededAndCheckAuthentication() {
    // TODO(MarshalX): show progressbar?
    await this.cliDownloadService.initCli();

    // required to know CLI version.
    // we don't have a universal command that will cover the auth state and CLI version yet
    await this.cliService.healthCheck();
    await this.cliService.checkAuth();
  }
}
