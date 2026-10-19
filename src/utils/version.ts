const MAJOR_MINOR_PATCH_SEGMENTS = 3;

/**
 * Compares two version strings by their major.minor.patch segments (e.g. "3.24.1"). Missing
 * segments are treated as 0, so "3.24" is equal to "3.24.0". Anything from the 4th segment
 * onward (pre-release/build/dev metadata, e.g. the "dev498" in "0.0.1.dev498") is ignored,
 * since it isn't meaningful for a simple "is this CLI new enough" check. Returns false if
 * `version` is null/empty, or if its first three segments aren't all numeric.
 */
export const isVersionAtLeast = (version: string | null | undefined, minVersion: string): boolean => {
  if (!version) {
    return false;
  }

  const versionParts = version.split('.')
    .slice(0, MAJOR_MINOR_PATCH_SEGMENTS)
    .map(Number);
  const minVersionParts = minVersion.split('.')
    .slice(0, MAJOR_MINOR_PATCH_SEGMENTS)
    .map(Number);

  if (versionParts.some(Number.isNaN) || minVersionParts.some(Number.isNaN)) {
    return false;
  }

  for (let i = 0; i < MAJOR_MINOR_PATCH_SEGMENTS; i++) {
    const part = versionParts[i] ?? 0;
    const minPart = minVersionParts[i] ?? 0;

    if (part !== minPart) {
      return part > minPart;
    }
  }

  return true;
};
