import { injectQueryPaths } from './responses.js'

import { asTry, isFailure, mapTry, sleep } from '@skyleague/axioms'
import type { OpenapiV3 } from '@skyleague/therefore'
import chalk from 'chalk'
import got, { HTTPError } from 'got'
import { getSfdxOrgInfo } from '../../lib/sfdx/index.js'
interface GenerateSobjectSpecInput {
    baseUrl: string
    apiVersion: string
    resourcePaths: string[]
    injectQueryEndpoints: boolean
    cwd: string
}

export async function generateSobjectSpec({
    baseUrl,
    apiVersion,
    cwd,
    resourcePaths,
    injectQueryEndpoints,
}: GenerateSobjectSpecInput): Promise<string> {
    const org = await getSfdxOrgInfo({ baseUrl, cwd })

    const client = got.extend({
        prefixUrl: `${baseUrl}`,
        headers: {
            Authorization: `Bearer ${org.accessToken}`,
        },
    })

    console.log(`${chalk.blue('→')} Starting oas3 generation...`)

    let task = await asTry(() =>
        client
            .post(`services/data/v${apiVersion}/async/specifications/oas3`, { json: { resources: resourcePaths } })
            .json<{ detailsHref: string; resultsHref: string; apiTaskStatus: ('COMPLETED' & {}) | string }>(),
    )
    if (isFailure(task) && task instanceof HTTPError && task.response.statusCode === 429) {
        console.info(`${chalk.yellow('⚠')} Rate limit exceeded, reconstructing the task response...`)
        const matched = /refId:\s*(?<refId>[^ ."\\]+)/g.exec(JSON.stringify(task.response.body))?.groups ?? {}
        if (matched.refId !== undefined) {
            task = {
                detailsHref: `/services/data/v${apiVersion}/async/specifications/oas3/${matched.refId}`,
                resultsHref: `/services/data/v${apiVersion}/async/specifications/oas3/${matched.refId}/results`,
                apiTaskStatus: 'NEW',
            }
        }
    }

    if (isFailure(task)) {
        console.info(
            `${chalk.red(
                '❌',
            )} Failed to generate, the token may be expired. To sign in, install sfdx and execute:\n\tsfdx org login web -r ${baseUrl}`,
        )
        throw task
    }

    for (let i = 0; i < 20 && !isFailure(task) && task.apiTaskStatus !== 'COMPLETED'; ++i) {
        if (i > 0) {
            const delay = 2000 * 1.5 ** (i - 1)
            console.log(`${chalk.yellow('⟳')} Result is not ready, waiting for ${(delay / 1000).toFixed(2)} seconds`, { task })
            await sleep(delay)
        }
        task = await mapTry(task, (t) => {
            // strip the leading slash
            return client.get(t.detailsHref.replace(/^\/*(.*)$/g, '$1')).json()
        })
    }

    let result = await mapTry(task, (t) => {
        // strip the leading slash
        return client.get(t.resultsHref.replace(/^\/*(.*)$/g, '$1')).json<Partial<OpenapiV3>>()
    })

    if (isFailure(result) || result?.info?.version === undefined) {
        const err = new Error('Failed to generate an expected output')
        err.cause = { result }
        console.info(`${chalk.red('❌')} ${err.message}.`, { result })
        throw err
    }

    console.log(
        `${chalk.blue('→')} Generated oas3 definition, replacing versions [from: ${result.info.version}, to: ${apiVersion}]`,
    )

    if (injectQueryEndpoints) {
        result = injectQueryPaths(result)
    }

    let formatted = JSON.stringify(result, null, 2)
    formatted = formatted.replaceAll(result.info?.version ?? apiVersion, apiVersion)

    return formatted
}
