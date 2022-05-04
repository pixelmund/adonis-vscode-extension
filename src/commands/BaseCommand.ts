import { commands, window, workspace } from 'vscode'
import { platform } from 'process'
import { promisify } from 'util'
import { exec as baseExec } from 'child_process'
import { join } from 'path'
import Config from '../utilities/config'
import Extension, { AdonisProject } from '../Extension'
import { capitalize } from '../utilities/functions'
const exec = promisify(baseExec)

let outputChannel = window.createOutputChannel('AdonisJS')

export enum ExtensionErrors {
  ERR_ADONIS_PROJECT_SELECTION_NEEDED,
}

export default class BaseCommand {
  /**
   * Show a message to the user
   */
  protected static async showMessage(message: string) {
    window.showInformationMessage(message)
  }

  /**
   * Show an error message to the user
   */
  protected static async showError(message: string, consoleErr: any = null) {
    if (consoleErr !== null) {
      message += ' (See output console for more details)'
      outputChannel.appendLine(consoleErr)
      outputChannel.show()
    }
    window.showErrorMessage(message)
    return false
  }

  /**
   * Prompt the user to select Yes or No
   */
  protected static async getYesNo(placeHolder: string): Promise<boolean> {
    let value = await window.showQuickPick(['Yes', 'No'], { placeHolder })
    return value?.toLowerCase() === 'yes' ? true : false
  }

  /**
   * Prompt the user for an input
   */
  protected static async getInput(placeHolder: string) {
    let name = await window.showInputBox({ placeHolder: placeHolder.replace(/\s\s+/g, ' ').trim() })
    name = name === undefined ? '' : name
    return name
  }

  /**
   * Prompt the user to select one or multiple input from a list
   */
  protected static async getListInput(
    placeHolder: string,
    list: string[],
    canPickMany: boolean = false
  ): Promise<string[]> {
    let name = (await window.showQuickPick(list, { placeHolder: placeHolder, canPickMany })) as
      | string[]
      | string
    return typeof name === 'string' ? [name] : name
  }

  /**
   * Open the given file in VSCode
   */
  protected static async openFile(path: string, filename: string) {
    try {
      let doc = await workspace.openTextDocument(join(path, filename))
      window.showTextDocument(doc)
      commands.executeCommand('workbench.files.action.refreshFilesExplorer')
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Parse stdout after generating command using adonis/assembler and returns
   * the freshly created file
   */
  protected static parseCreatedFilename(stdout: string): string | null {
    const matches = stdout.match(/(?<=CREATE: )(.+)/)
    return matches ? matches[0] : null
  }

  /**
   * Open the new file generated by adonis/assembler in VSCode
   */
  protected static async openCreatedFile(adonisProject: AdonisProject, stdout: string) {
    if (!stdout) return

    const filename = this.parseCreatedFilename(stdout)
    if (filename) {
      await this.openFile(adonisProject.path, filename)
    }
  }

  /**
   * Prompt the user to select an AdonisJS project when multiple
   * are present in the workspace
   */
  protected static async pickAdonisProject() {
    const adonisProjects = Extension.getAdonisProjects()

    if (adonisProjects.length === 1) {
      return adonisProjects[0]
    }

    const target = await window.showQuickPick(
      adonisProjects.map((project) => ({
        label: project.name,
        description: project.path,
      })),
      { placeHolder: 'Select the project in which you want to run this command' }
    )

    return adonisProjects.find((project) => project.path === target?.description)
  }

  /**
   * Execute execCmd and handle errors/success notifications
   */
  protected static async handleExecCmd({
    command,
    successMessage,
    errorMessage,
    fileType = 'file',
    openCreatedFile = false,
    background = true,
  }: {
    command: string
    successMessage?: string
    errorMessage?: string
    fileType?: string
    openCreatedFile?: boolean
    background?: boolean
  }) {
    successMessage = successMessage || `${capitalize(fileType)} created successfully`
    errorMessage = errorMessage || `Failed to create ${fileType.toLowerCase()}`

    try {
      const res = await this.execCmd(command, background)

      if (openCreatedFile) {
        this.openCreatedFile(res.adonisProject, res.result!.stdout)
      }

      if (successMessage) {
        this.showMessage(successMessage)
      }
    } catch (err) {
      // @ts-ignore
      if (err.errorCode === ExtensionErrors.ERR_ADONIS_PROJECT_SELECTION_NEEDED) {
        return this.showError('You must select an AdonisJS project on which to run your command.')
      }

      this.showError(errorMessage, err)
    }
  }

  /**
   * Execute the final `node ace x` command
   */
  protected static async execCmd(
    command: string,
    background: boolean = true,
    adonisProject?: AdonisProject
  ): Promise<{ adonisProject: AdonisProject; result?: { stdout: string; stderr: string } }> {
    adonisProject = adonisProject || (await this.pickAdonisProject())

    if (!adonisProject) {
      return Promise.reject({ errorCode: ExtensionErrors.ERR_ADONIS_PROJECT_SELECTION_NEEDED })
    }

    const isWindows = platform === 'win32'
    if (isWindows && adonisProject.path.startsWith('/')) {
      adonisProject.path = adonisProject.path.substring(1)
    }

    /**
     * Execute the final command in the background
     */
    const nodePath = Config.misc.nodePath || 'node'
    command = `"${nodePath}" ace ${command}`
    if (background) {
      const result = await exec(command, { cwd: adonisProject.path })
      return { result, adonisProject }
    }

    /**
     * Since we are in the integrated terminal, we need to
     * manually set the cwd to the adonis project path
     */
    let cmdWithCd =
      platform === 'win32' && !Config.misc.useUnixCd
        ? `cd /d "${adonisProject.path}" && ${command}`
        : `cd "${adonisProject.path}" && ${command}`

    this.sendTextToAdonisTerminal(cmdWithCd)

    return { adonisProject }
  }

  /**
   * Execute a command in the foreground, in the VSCode integrated terminal
   */
  protected static sendTextToAdonisTerminal(command: string) {
    let terminal = window.activeTerminal
    if (!terminal || terminal.name !== 'AdonisJS Ace') {
      terminal = window.createTerminal(`AdonisJS Ace`)
    }

    terminal.show()
    terminal.sendText(command)
  }
}
