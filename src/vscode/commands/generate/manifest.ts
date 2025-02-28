import BaseCommand from '../../commands/base_command'

/**
 * Handle generate:manifest command
 */
export class Manifest extends BaseCommand {
  public static async run() {
    return this.handleExecCmd({
      command: 'generate:manifest',
      successMessage: 'Manifest generated successfully.',
      errorMessage: 'Manifest generation failed.',
    })
  }
}
