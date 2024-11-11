import * as commands from './commands/index.js'

import * as packageJson from '../package.json' with { type: 'json' }

import type { CommandModule } from 'yargs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { bin } = packageJson.default ?? packageJson

/**
 * @internal
 */
export async function run(): Promise<void> {
    let cli = yargs(hideBin(process.argv)).scriptName(Object.keys(bin)[0] ?? 'salesforce-sobject-sdk-generator')
    for (const command of Object.values(commands)) {
        cli = cli.command(command.default as unknown as CommandModule)
    }
    await cli.demandCommand().strict().help().argv
}

export * from './lib/index.js'
