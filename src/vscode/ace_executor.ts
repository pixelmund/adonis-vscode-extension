import { platform } from 'process'
import { window } from 'vscode'
import { node as execaNode } from 'execa'
import ExtConfig from './utilities/config'
import type { AdonisProject } from '../types/projects'

interface ExecOptions {
  adonisProject: AdonisProject
  command: string
  background?: boolean
}

export class AceExecutor {
  private static isWindows = platform === 'win32'
  private static shellPath = AceExecutor.isWindows ? 'cmd.exe' : undefined

  /**
   * Execute a command in the foreground, in the VSCode integrated terminal
   */
  private static sendTextToAdonisTerminal(command: string) {
    let terminal = window.terminals.find((openedTerminal) => openedTerminal.name === 'AdonisJS Ace')

    if (!terminal) {
      terminal = window.createTerminal(`AdonisJS Ace`, this.shellPath)
    }

    terminal.show()
    terminal.sendText(command)
  }

  /**
   * Execute a `node ace x` command
   */
  public static async exec({ adonisProject, command, background = true }: ExecOptions) {
    let path = adonisProject.path
    if (this.isWindows && path.startsWith('/')) {
      path = path.substring(1)
    }

    if (background) {
      const result = await execaNode(`ace`, command.split(' '), {
        cwd: path,
        nodePath: ExtConfig.misc.nodePath,
      })

      return { result, adonisProject }
    }

    /**
     * Execute the final command in the background
     */
    const nodePath = ExtConfig.misc.nodePath || 'node'
    command = `"${nodePath}" ace ${command}`

    /**
     * Since we are in the integrated terminal, we need to
     * manually set the cwd to the adonis project path
     */
    const cmdWithCd =
      platform === 'win32' && !ExtConfig.misc.useUnixCd
        ? `cd /d "${path}" && ${command}`
        : `cd "${path}" && ${command}`

    this.sendTextToAdonisTerminal(cmdWithCd)

    return { adonisProject }
  }
}
