export class CliError {
  // FIXME(MarshalX): sometimes CLI uses `code` and sometimes `error` for the same thing
  public code?: string = 'Unknown';
  public error?: string = 'Unknown';
  public message: string;
  public softFail?: boolean = false;
}
