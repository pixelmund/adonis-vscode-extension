import { join } from 'path'
import fg from 'fast-glob'
import slash from 'slash'
import { inertiaRegex } from '../utilities/regexes'
import type { InertiaLink } from '../types/linkers'
import type { AdonisProject } from '../types/projects'

export class InertiaLinker {
  static #matchIndexToPosition(options: { fileContent: string; match: RegExpMatchArray }) {
    const lines = options.fileContent.split('\n')

    const line = lines.findIndex((line) => line.includes(options.match[1]!))
    const colStart = lines[line]!.indexOf(options.match[1]!)
    const colEnd = colStart + options.match[1]!.length

    return { line, colStart, colEnd }
  }

  public static async getLinks(options: {
    fileContent: string
    project: AdonisProject
    pagesDirectory: string
  }): Promise<InertiaLink[]> {
    const matches = options.fileContent.matchAll(inertiaRegex) || []

    const matchesArray = Array.from(matches)

    const promises = matchesArray.map(async (match) => {
      const fileName = match[1]!.replace(/\"|\'/g, '').replace(/\./g, '/')
      const fullName = join(options.project.path, options.pagesDirectory, `${fileName}.vue`)

      const pattern = slash(fullName)

      const files = await fg(pattern, {
        onlyFiles: true,
        caseSensitiveMatch: false,
        cwd: slash(options.project.path),
      })

      const position = InertiaLinker.#matchIndexToPosition({
        fileContent: options.fileContent,
        match,
      })

      if (!files.length) {
        return { templatePath: null, position }
      }

      return {
        templatePath: slash(files[0]!),
        position,
      }
    })

    const result = await Promise.all(promises)
    return result.filter(Boolean) as InertiaLink[]
  }
}
