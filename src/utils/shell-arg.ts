// characters that can break out of a double-quoted argument (or a bare token) on POSIX shells or cmd.exe
const UNSAFE_SHELL_CHARS_REGEX = /["'`$;&|<>(){}\n\r]/;

// cmd.exe expands %VAR% even inside double quotes, and '^' is its escape character
const UNSAFE_WINDOWS_SHELL_CHARS_REGEX = /[%^]/;

/**
 * Validates a value (a git ref, commit range, etc.) before it is embedded, unquoted, in a CLI
 * argument. CliWrapper spawns the CLI with `shell: true`, so args are interpreted by a shell
 * rather than passed as an argv array — an unvalidated value could otherwise inject shell syntax.
 */
export const assertSafeArg = (value: string): string => {
  const hasUnsafeWindowsChars = process.platform === 'win32' && UNSAFE_WINDOWS_SHELL_CHARS_REGEX.test(value);
  if (UNSAFE_SHELL_CHARS_REGEX.test(value) || hasUnsafeWindowsChars) {
    throw new Error(`Value contains unsupported characters for a CLI argument: ${value}`);
  }

  return value;
};

/**
 * Validates a filesystem path before it is embedded in a double-quoted CLI argument.
 */
export const quotePathArg = (path: string): string => `"${assertSafeArg(path)}"`;
