// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/;

/**
 * Validates a git ref or commit range before it is passed to the CLI as a separate argv element.
 * The CLI is spawned without a shell, so metacharacters are harmless; what remains is a value being
 * read as an option (leading '-') instead of a revision. Git itself never allows either in a ref name.
 */
export const assertSafeRefArg = (value: string): string => {
  if (!value || value.startsWith('-') || CONTROL_CHARS_REGEX.test(value)) {
    throw new Error(`Invalid git ref for a CLI argument: ${JSON.stringify(value)}`);
  }

  return value;
};
