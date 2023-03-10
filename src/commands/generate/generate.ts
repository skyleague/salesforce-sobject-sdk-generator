import { getSfdxOrgInfo } from '../../lib/sfdx'

import type { Try } from '@skyleague/axioms'
import { asTry, isFailure, sleep } from '@skyleague/axioms'
import type { OpenapiV3 } from '@skyleague/therefore'
import chalk from 'chalk'
import got from 'got'

interface GenerateSobjectSpecInput {
    baseUrl: string
    apiVersion: string
    resourcePaths: string[]
    cwd: string
}

export async function generateSobjectSpec({
    baseUrl,
    apiVersion,
    cwd,
    resourcePaths,
}: GenerateSobjectSpecInput): Promise<string> {
    const org = await getSfdxOrgInfo({ baseUrl, cwd })

    const client = got.extend({
        prefixUrl: `${baseUrl}/services/data`,
        headers: {
            Authorization: `Bearer ${org.accessToken}`,
        },
    })

    console.log(`${chalk.blue('→')} Starting oas3 generation...`)

    const href = await asTry(() =>
        client.post(`v${apiVersion}/async/specifications/oas3`, { json: { resources: resourcePaths } }).json<{ href: string }>()
    )
    if (isFailure(href)) {
        console.info(
            `${chalk.red(
                '❌'
            )} Failed to generate, the token may be expired. To sign in, install sfdx and execute:\n\tsfdx org login web -r ${baseUrl}`
        )
        throw href
    }
    let result: Try<Partial<OpenapiV3>> | undefined
    for (let i = 0; i < 20 && !isFailure(result) && result?.info?.version === undefined; ++i) {
        if (i > 0) {
            const delay = 2000 * Math.pow(1.5, i - 1)
            console.log(`${chalk.yellow('⟳')} Result is not ready, waiting for ${(delay / 1000).toFixed(2)} seconds`, { result })
            await sleep(delay)
        }
        result = await asTry(() => client.get(href.href.replace(/^\/*(.*)$/g, '$1')).json<OpenapiV3>())
    }
    if (isFailure(result) || result?.info?.version === undefined) {
        const err = new Error('Failed to generate an expected output')
        err.cause = { result }
        console.info(`${chalk.red('❌')} ${err.message}.`, { result })
        throw err
    }

    console.log(
        `${chalk.blue('→')} Generated oas3 definition, replacing versions [from: ${result.info.version}, to: ${apiVersion}]`
    )

    let formatted = JSON.stringify(result, null, 2)
    formatted = formatted.replaceAll(result.info.version, apiVersion)

    return formatted
}
