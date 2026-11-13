/** An HTTP response that is not ok, except for 404 (no matches). */
export class HttpError extends Error {
  readonly status: number;
  readonly url: string | undefined;

  constructor(status: number, url?: string) {
    super(`Request failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
