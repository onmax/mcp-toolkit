import { logger } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'
import type { ModuleOptions } from '../../../../module'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'

const log = logger.withTag('@nuxtjs/mcp-toolkit:evals')

const EVALITE_TIMEOUT = 10000
const HEALTH_CHECK_TIMEOUT = 2000
const EVALITE_DEFAULT_PORT = 5173
const HEALTH_CHECK_RETRIES = 5

let evaliteProcess: ChildProcess | null = null
let evaliteUrl: string | null = null
let isReady = false
let promise: Promise<void> | null = null

function resetState() {
  evaliteProcess = null
  evaliteUrl = null
  isReady = false
}

function getEvalitePort(options: ModuleOptions): number {
  if (options.evalite?.port) {
    return options.evalite.port
  }
  if (process.env.EVALITE_PORT) {
    const port = Number.parseInt(process.env.EVALITE_PORT, 10)
    if (!Number.isNaN(port) && port > 0 && port < 65536) {
      return port
    }
  }
  return EVALITE_DEFAULT_PORT
}

function getMcpUrl(nuxt: Nuxt, options: ModuleOptions): string {
  if (options.evalite?.mcpUrl) {
    return options.evalite.mcpUrl
  }
  return `http://localhost:${nuxt.options.devServer?.port || 3000}${options.route || '/mcp'}`
}

async function waitForEvaliteReady(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < HEALTH_CHECK_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status >= 200 && response.status < 400) {
        return true
      }
    }
    catch {
      if (attempt < HEALTH_CHECK_RETRIES - 1) {
        await new Promise(res => setTimeout(res, 500))
        continue
      }
    }
  }
  return false
}

async function launchEvaliteUI(nuxt: Nuxt, options: ModuleOptions): Promise<void> {
  if (evaliteProcess) {
    return
  }

  const port = getEvalitePort(options)
  const mcpUrl = getMcpUrl(nuxt, options)
  const baseUrl = `http://localhost:${port}`

  log.info('🧪 Launching Evalite UI...')

  try {
    const env = {
      ...globalThis.process.env,
      MCP_URL: mcpUrl,
    }

    evaliteProcess = spawn('npx', ['evalite', '--ui', '--port', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      cwd: nuxt.options.rootDir,
    })

    const childProcess = evaliteProcess

    await new Promise<void>((res, rej) => {
      let isResolved = false
      let timeoutId: NodeJS.Timeout | null = null

      const resolve = () => {
        if (timeoutId) clearTimeout(timeoutId)
        res()
      }
      const reject = (error: Error) => {
        if (timeoutId) clearTimeout(timeoutId)
        resetState()
        rej(error)
      }

      childProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          log.error(`❌ Failed to start evalite: ${error.message}`)
          reject(error)
        }
      })

      childProcess.on('exit', (code) => {
        if (!isResolved && code !== 0) {
          isResolved = true
          log.error(`❌ Evalite exited with code ${code}`)
          reject(new Error(`Evalite exited with code ${code}`))
        }
      })

      const startHealthCheck = async () => {
        for (let delay = 500; delay <= 3000; delay += 500) {
          await new Promise(r => setTimeout(r, delay))
          if (isResolved) return

          const ready = await waitForEvaliteReady(baseUrl)
          if (ready && !isResolved) {
            isResolved = true
            evaliteUrl = baseUrl
            isReady = true
            log.success(`✅ Evalite UI is ready at ${baseUrl}`)
            resolve()
            return
          }
        }
      }

      startHealthCheck().catch((error) => {
        if (!isResolved) {
          isResolved = true
          reject(error)
        }
      })

      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          log.error(`❌ Evalite startup timeout after ${EVALITE_TIMEOUT}ms`)
          reject(new Error(`Evalite failed to start - timeout after ${EVALITE_TIMEOUT}ms`))
        }
      }, EVALITE_TIMEOUT)
    })
  }
  catch (error) {
    log.error('❌ Failed to launch Evalite UI:', error)
    resetState()
    throw error
  }
}

function stopEvaliteUI() {
  if (evaliteProcess) {
    evaliteProcess.kill()
    resetState()
  }
}

export function addEvalsDevToolsTab(nuxt: Nuxt, options: ModuleOptions) {
  nuxt.hook('devtools:customTabs', (tabs) => {
    // Skip if MCP or evalite is disabled
    if (!options.enabled || options.evalite?.enabled === false) {
      return
    }

    tabs.push({
      category: 'server',
      name: 'mcp-evals',
      title: 'MCP Evals',
      icon: 'i-lucide-flask-conical',
      view: isReady && evaliteUrl
        ? {
            type: 'iframe',
            src: evaliteUrl,
          }
        : {
            type: 'launch',
            description: 'Launch Evalite UI to run and view MCP tool evals. Make sure you have evalite installed and evals defined in your tools.',
            actions: [
              {
                label: promise ? 'Starting...' : 'Launch Evalite',
                pending: !!promise,
                handle() {
                  promise = promise || launchEvaliteUI(nuxt, options).finally(() => {
                    promise = null
                  })
                  return promise
                },
              },
              ...(evaliteProcess
                ? [{
                    label: 'Stop Evalite',
                    handle() {
                      stopEvaliteUI()
                      promise = null
                    },
                  }]
                : []),
            ],
          },
    })
  })

  nuxt.hook('close', () => {
    stopEvaliteUI()
  })
}
