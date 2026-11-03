const unreachableStatuses = new Set([0, 502, 503, 504]);

/**
 * True when a request failed because the server couldn't be reached, rather than because it
 * refused or broke: fetch itself failed (a TypeError, as when offline), or the response had no
 * status, or a proxy in front of the server answered 502, 503 or 504. `openmrsFetch` puts the
 * response on the error it throws. A provider reports such a failure as `status: 'error'` with
 * `detail: { state: 'unavailable' }`, and any other failure as a plain `status: 'error'`.
 */
export function isServerUnreachable(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;
  return typeof status === 'number' && unreachableStatuses.has(status);
}
