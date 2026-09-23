/**
 * `fetch` with a deadline.
 *
 * Node's global fetch has no default timeout, so a third party that accepts the
 * connection and then never answers holds the request open indefinitely. That
 * matters most on the login path (Google OAuth) and at checkout, where the
 * visitor is left waiting with no error; for the courier sync it means a tick
 * can hold a Mongo pool connection for as long as the far end stays silent.
 *
 * Throws an Error mentioning the timeout rather than a bare AbortError, so the
 * message that reaches the caller says what actually happened.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
    input: string | URL | Request,
    init: RequestInit = {},
    timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            throw new Error(`Request to ${target} timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
