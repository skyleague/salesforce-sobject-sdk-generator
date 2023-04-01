import type { Org } from './org.type.js'
import { OrgList } from './org.type.js'

import { asTry, isFailure, mapTry } from '@skyleague/axioms'
import { ValidationError } from 'ajv'
import chalk from 'chalk'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export async function getSfdxOrgInfo({ baseUrl, cwd }: { baseUrl: string; cwd: string }): Promise<Org> {
    console.log(`${chalk.blue('→')} Trying to find active credentials on sfdx...`)

    const orgs = mapTry(await asTry(promisify(execFile)('sfdx', ['org', 'list', 'auth', '--json'], { cwd })), ({ stdout }) => {
        const parsed: unknown = JSON.parse(stdout)
        if (OrgList.is(parsed)) {
            console.log(
                `${chalk.blue('→')} Found credentials...`,
                Object.fromEntries(parsed.result.map((o) => [o.instanceUrl, o.username]))
            )
            return parsed.result
        } else {
            throw new ValidationError(OrgList.errors ?? [])
        }
    })

    const org = mapTry(orgs, (os) => {
        console.log(`${chalk.blue('→')} Searching for matching instanceUrl [expected: ${baseUrl}]`)
        const o = os.find((x) => x.instanceUrl.includes(baseUrl) || baseUrl.includes(x.instanceUrl))

        if (o === undefined) {
            throw new Error(`Not signed in to an organization with matching baseUrl: ${baseUrl}`)
        }
        console.log(`${chalk.blue('→')} Found matching instanceUrl...`)
        return o
    })

    if (isFailure(org)) {
        console.info(
            `${chalk.red(
                '❌'
            )} Not signed into the expected organization. To sign in, install sfdx and execute:\n\tsfdx org login web -r ${baseUrl}`
        )
        throw org
    }

    return org
}
