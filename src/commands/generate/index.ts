import { generateSobjectSpec } from './generate'

import { asArray } from '@skyleague/axioms'
import chalk from 'chalk'
import { format } from 'date-fns'
import inquirer from 'inquirer'
import type { Argv } from 'yargs'

import fs from 'fs'
import path from 'path'

export function builder(yargs: Argv) {
    return yargs
        .option('out-dir', {
            alias: 'o',
            demandOption: true,
            describe: 'output directory for the specification to generate',
            type: 'string',
        })
        .option('out-file', {
            description: 'filename for the output (defaults to a date formatted as {yyyyMMdd}.json)',
            default: `${format(Date.now(), 'yyyyMMdd')}.json`,
            type: 'string',
        })
        .option('api-version', {
            alias: 'v',
            demandOption: true,
            description: 'Salesforce API Version',
            type: 'string',
        })
        .option('resource-paths', {
            default: ['*'],
            type: 'array',
            description: 'List of paths to export into the OpenAPI specification',
            coerce: (arg: string[]) => {
                return asArray(arg).flatMap((x) => `${x}`.split(','))
            },
        })
        .option('org-base-url', {
            demandOption: true,
            description: 'Base URL of your Salesforce instance',
            type: 'string',
        })
}

export async function handler(argv: ReturnType<typeof builder>['argv']): Promise<void> {
    const { outFile, outDir: _outDir, resourcePaths, orgBaseUrl, apiVersion } = await argv
    const cwd = process.cwd()
    const outDir = path.resolve(cwd, _outDir)

    const spec = await generateSobjectSpec({
        baseUrl: orgBaseUrl,
        resourcePaths,
        apiVersion,
        cwd,
    })

    console.log(`${chalk.blue('→')} Writing the spec to ${chalk.green(path.join(outDir, outFile))}`)

    await fs.promises.writeFile(path.join(outDir, outFile), spec)

    for (const f of await fs.promises.readdir(outDir)) {
        if (f !== outFile && /[0-9]{8}\.json/.test(f)) {
            const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
                {
                    name: 'confirmed',
                    type: 'confirm',
                    message: `Do you want to delete the old spec file? [file: ${f}]`,
                },
            ])
            if (confirmed) {
                await fs.promises.rm(path.join(outDir, f))
            }
        }
    }
}

export default {
    command: ['generate', '*'],
    describe: 'generate SDK OpenAPI definition for the Salesforce sObject API',
    builder,
    handler,
}
