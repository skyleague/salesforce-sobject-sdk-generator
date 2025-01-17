import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { asTry, isFailure, isRight, mapTry } from '@skyleague/axioms'
import { ValidationError } from 'ajv'
import chalk from 'chalk'
import type { Org } from './org.type.js'
import { OrgList } from './org.type.js'

export async function getSfdxOrgInfo({ baseUrl, cwd }: { baseUrl: string; cwd: string }): Promise<Org> {
    console.log(`${chalk.blue('→')} Trying to find active credentials on sfdx...`)

    const orgs = mapTry(
        await asTry(promisify(execFile)('sfdx', ['org', 'list', 'auth', '--json'], { cwd, shell: true })),
        ({ stdout }) => {
            const parsed = OrgList.parse(JSON.parse(stdout))
            if (isRight(parsed)) {
                console.log(
                    `${chalk.blue('→')} Found credentials...`,
                    Object.fromEntries(parsed.right.result.map((o) => [o.instanceUrl, o.username])),
                )
                return parsed.right.result
            }
            throw new ValidationError(parsed.left ?? [])
        },
    )

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
                '❌',
            )} Not signed into the expected organization. To sign in, install sfdx and execute:\n\tsfdx org login web -r ${baseUrl}`,
        )
        throw org
    }

    return org
}
