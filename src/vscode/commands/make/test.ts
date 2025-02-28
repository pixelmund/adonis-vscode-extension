import { Notifier } from '../../notifier'
import BaseCommand from '../../commands/base_command'

/**
 * Handle make:test command
 */
export class Test extends BaseCommand {
  public static async run() {
    /**
     * Get the test suite name
     */
    const suiteName = await this.getInput('Suite name')
    if (!suiteName) {
      Notifier.showError('Suite name is required.')
      return
    }

    /**
     * Get the test suite name
     */
    const testName = await this.getInput('Test name')
    if (!testName) {
      Notifier.showError('Test name is required.')
      return
    }

    /**
     * Execute the command
     */
    return this.handleExecCmd({
      command: `make:test ${suiteName} ${testName}`,
      fileType: 'test',
      openCreatedFile: true,
    })
  }
}
