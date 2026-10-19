import { CliError } from './cli-error';

export class CliResultSuccess<T> {
  constructor(public result: T) {}
}

export class CliResultError {
  constructor(public result: CliError) {}
}

export class CliResultPanic {
  constructor(public exitCode: number | null, public errorMessage: string) {}
}

export type CliResult<T> = CliResultSuccess<T> | CliResultError | CliResultPanic;

export const isCliResultSuccess = <T>(obj: unknown): obj is CliResultSuccess<T> => {
  return obj instanceof CliResultSuccess;
};

export const isCliResultError = (obj: unknown): obj is CliResultError => {
  return obj instanceof CliResultError;
};

export const isCliResultPanic = (obj: unknown): obj is CliResultPanic => {
  return obj instanceof CliResultPanic;
};
