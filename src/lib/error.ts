import { HTTPError } from 'got'

export function formatUrl(url: string | URL | undefined) {
    if (url instanceof URL) {
        return url.href
    }
    return url
}

export function formatError(err: unknown) {
    if (err instanceof HTTPError) {
        return {
            reason: `HTTP Error ${err.response.statusCode} (${err.response.statusMessage}).`,
            httpMethod: err.request.options.method,
            url: formatUrl(err.request.options.url),
            responseBody: err.response.body,
        }
    }

    return err
}
