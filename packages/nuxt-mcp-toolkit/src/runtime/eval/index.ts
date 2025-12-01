/**
 * MCP Eval Runner Utilities
 *
 * Optional utilities for running evals on MCP tools using evalite.
 * Import from '@nuxtjs/mcp-toolkit/eval' in your eval files.
 *
 * @example
 * ```ts
 * // test/mcp.eval.ts
 * import { createMcpEvalRunner, createToolCallScorer } from '@nuxtjs/mcp-toolkit/eval'
 * import { evalite } from 'evalite'
 *
 * const runner = createMcpEvalRunner({
 *   mcpUrl: 'http://localhost:3000/mcp',
 *   model: 'openai/gpt-4o-mini', // AI Gateway format
 * })
 *
 * evalite('My Tool Evals', {
 *   data: async () => [
 *     { input: 'Calculate BMI for 70kg and 1.75m', expected: [{ toolName: 'calculate-bmi', input: { weightKg: 70, heightM: 1.75 } }] }
 *   ],
 *   task: async input => runner.runTask(input),
 *   scorers: [await createToolCallScorer()],
 * })
 * ```
 */

import type { LanguageModel, ToolCallPart } from 'ai'

// Re-export types for multi-tool workflow evals
export type { McpEvalDefinition, McpEvalExpectedToolCall, McpEvalTestCase } from '../server/mcp/definitions/evals'

/**
 * Configuration for the MCP eval runner
 */
export interface McpEvalRunnerConfig {
  /** MCP server URL (e.g., 'http://localhost:3000/mcp') */
  mcpUrl: string
  /** AI SDK language model or AI Gateway model string (e.g., 'openai/gpt-4o-mini') */
  model: LanguageModel | string
  /** Max steps for multi-tool workflows (default: 1) */
  maxSteps?: number
}

/**
 * MCP eval runner instance
 */
export interface McpEvalRunner {
  config: McpEvalRunnerConfig
  /** Run a single eval task and return tool calls */
  runTask: (input: string, maxSteps?: number) => Promise<ToolCallPart[]>
}

/**
 * Create an MCP eval runner for use with evalite
 *
 * @example
 * ```ts
 * import { createMcpEvalRunner } from '@nuxtjs/mcp-toolkit/eval'
 *
 * // Using AI Gateway (recommended)
 * const runner = createMcpEvalRunner({
 *   mcpUrl: process.env.MCP_URL ?? 'http://localhost:3000/mcp',
 *   model: 'openai/gpt-4o-mini',
 * })
 * ```
 */
export function createMcpEvalRunner(config: McpEvalRunnerConfig): McpEvalRunner {
  return {
    config,
    runTask: async (input: string, maxSteps?: number) => {
      const { experimental_createMCPClient: createMCPClient } = await import('@ai-sdk/mcp')
      const { generateText } = await import('ai')

      const mcpClient = await createMCPClient({
        transport: { type: 'http', url: config.mcpUrl },
      })

      try {
        const result = await generateText({
          model: config.model as LanguageModel,
          prompt: input,
          tools: await mcpClient.tools(),
          maxSteps: maxSteps ?? config.maxSteps ?? 1,
        })
        return result.toolCalls ?? []
      }
      finally {
        await mcpClient.close()
      }
    },
  }
}

/**
 * Expected tool call format for evalite's toolCallAccuracy scorer
 */
export interface ExpectedToolCall {
  toolName: string
  input?: Record<string, unknown>
}

/**
 * Create evalite scorer function for tool call accuracy
 */
export async function createToolCallScorer() {
  const { toolCallAccuracy } = await import('evalite/scorers')
  return ({ output, expected }: { output: ToolCallPart[], expected: ExpectedToolCall[] }) =>
    toolCallAccuracy({ actualCalls: output, expectedCalls: expected })
}
