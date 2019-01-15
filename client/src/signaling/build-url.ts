import * as url from 'url';

export interface URLOptions {
    protocol: string
    host: string,
    port?: number,
    endpoint?: string,
}

export function buildUrl(opts: URLOptions): string {
    const nPort = opts.port ? `:${Math.trunc(opts.port)}` : "";
    return new url.URL(
        `${opts.protocol || "http"}://${opts.host}${nPort}${opts.endpoint || "/"}`
    ).toString()
}