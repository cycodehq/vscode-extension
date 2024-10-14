import { CliError } from './cli-error';

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-extraneous-class
export abstract class CliResult<_> {}

export class CliResultSuccess<T> extends CliResult<T> {
  constructor(public result: T) {
    super();
  }
}

export class CliResultError extends CliResult<never> {
  constructor(public result: CliError) {
    super();
  }
}

export class CliResultPanic extends CliResult<never> {
  constructor(public exitCode: number | null, public errorMessage: string) {
    super();
  }
}

export const isCliResultSuccess = <T>(obj: unknown): obj is CliResultSuccess<T> => {
  return obj instanceof CliResultSuccess;
};

export const isCliResultError = (obj: unknown): obj is CliResultError => {
  return obj instanceof CliResultError;
};

export const isCliResultPanic = (obj: unknown): obj is CliResultPanic => {
  return obj instanceof CliResultPanic;
};
