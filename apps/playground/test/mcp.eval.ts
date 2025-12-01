/**
 * MCP Tool Evals for Playground
 *
 * Run: pnpm eval (after starting dev server)
 * Run with UI: pnpm eval:ui
 */
import { createMcpEvalRunner, createToolCallScorer } from '@nuxtjs/mcp-toolkit/eval'
import { evalite } from 'evalite'

const model = 'openai/gpt-4o-mini'
const MCP_URL = process.env.MCP_URL ?? 'http://localhost:3000/mcp'
const runner = createMcpEvalRunner({ mcpUrl: MCP_URL, model })
const toolCallScorer = await createToolCallScorer()

evalite('BMI Calculator Tool', {
  data: async () => [
    { input: 'Calculate BMI for someone who weighs 70kg and is 1.75m tall', expected: [{ toolName: 'calculate-bmi', input: { weightKg: 70, heightM: 1.75 } }] },
    { input: 'What is the BMI for 80 kilograms and 1.8 meters?', expected: [{ toolName: 'calculate-bmi', input: { weightKg: 80, heightM: 1.8 } }] },
    { input: 'I weigh 55kg and my height is 1.65m, calculate my BMI', expected: [{ toolName: 'calculate-bmi', input: { weightKg: 55, heightM: 1.65 } }] },
  ],
  task: input => runner.runTask(input),
  scorers: [toolCallScorer],
})

evalite('Echo Tool', {
  data: async () => [
    { input: 'Echo the message "Hello World"', expected: [{ toolName: 'echo', input: { message: 'Hello World' } }] },
    { input: 'Repeat back: Testing 123', expected: [{ toolName: 'echo', input: { message: 'Testing 123' } }] },
  ],
  task: input => runner.runTask(input),
  scorers: [toolCallScorer],
})
