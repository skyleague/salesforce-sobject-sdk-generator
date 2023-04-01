import * as commands from './commands/index.js'

import packageJson from '../package.json' assert { type: 'json' }

import { install } from 'source-map-support'
import type { CommandModule } from 'yargs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { bin } = packageJson

/**
 * @internal
 */
export async function run(): Promise<void> {
    install()

    let cli = yargs(hideBin(process.argv)).scriptName(Object.keys(bin)[0]!)
    for (const command of Object.values(commands)) {
        cli = cli.command(command.default as unknown as CommandModule)
    }
    await cli.demandCommand().strict().help().argv
}

export * from './lib/index.js'
