import * as url from 'url';

export interface IURLOptions {
    protocol: string
    host: string,
    port?: number,
    endpoint?: string,
}

export function buildUrl(opts: IURLOptions): string {
    const nPort = opts.port ? `:${Math.trunc(opts.port)}` : "";
    return new url.URL(
        `${opts.protocol || "http"}://${opts.host}${nPort}${opts.endpoint || "/"}`
    ).toString()
}