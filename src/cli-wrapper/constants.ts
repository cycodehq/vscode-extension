export enum CliCommands {
  Path = "path",
  Scan = "scan",
  Configure = "configure",
  Auth = "auth",
  AuthCheck = "auth check",
  Ignore = "ignore",
}

export enum CommandParameters {
  OutputFormatJson = "--output=json",
  Usage = "--help",
  ByRule = "--by-rule",
  ByValue = "--by-value",
  UserAgent = "--user-agent",
  Version = "--version",
}

export const MinCLIVersion = "0.2.4";
