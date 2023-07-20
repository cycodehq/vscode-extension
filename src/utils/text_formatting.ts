export function prettyPrintJson<T extends object>(json: T) {
  return JSON.stringify(json, null, 3);
}
