/**
 * Multi-tool eval definition for testing workflows that span multiple MCP tools
 * Used with evalite to verify LLM correctly orchestrates multiple tool calls
 */

/**
 * Expected tool call in an eval (matches evalite's toolCallAccuracy format)
 */
export interface McpEvalExpectedToolCall {
  /** Name of the tool that should be called */
  toolName: string
  /** Expected input params (optional - omit to only check tool selection) */
  input?: Record<string, unknown>
}

/**
 * A single eval test case for multi-tool workflows
 */
export interface McpEvalTestCase {
  /** Natural language prompt for the LLM */
  input: string
  /** Expected sequence of tool calls */
  expected: McpEvalExpectedToolCall[]
}

/**
 * Definition for a multi-tool eval workflow
 */
export interface McpEvalDefinition {
  /** Name of this eval (auto-generated from filename if omitted) */
  name?: string
  /** Description of what this eval tests */
  description?: string
  /** Test cases */
  data: McpEvalTestCase[]
  /** Max tool call steps allowed (default: 1) */
  maxSteps?: number
  /** Internal metadata (auto-populated) */
  _meta?: Record<string, unknown>
}

/**
 * Define a multi-tool eval workflow for testing LLM tool orchestration
 *
 * Use this when you need to test that an LLM correctly calls multiple tools
 * in sequence or makes the right tool selection decisions.
 *
 * @example
 * ```ts
 * // server/mcp/evals/recipe-workflow.eval.ts
 * export default defineMcpEval({
 *   name: 'Recipe search and fetch',
 *   data: [
 *     {
 *       input: 'Find chicken recipes and show me the first one',
 *       expected: [
 *         { toolName: 'search_recipes', input: { query: 'chicken' } },
 *         { toolName: 'get_recipe' }
 *       ]
 *     },
 *   ],
 *   maxSteps: 3,
 * })
 * ```
 */
export function defineMcpEval(definition: McpEvalDefinition): McpEvalDefinition {
  return definition
}
