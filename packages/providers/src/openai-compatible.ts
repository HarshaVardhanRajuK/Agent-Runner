import OpenAI from 'openai'
import type {
  ModelProvider,
  StreamingResponse,
  LLMMessage,
  Message,
  ToolSchema,
  AssistantContentBlock,
  Logger,
} from '@agent-runner/shared'
import { silentLogger } from '@agent-runner/shared'

interface OpenAICompatibleOptions {
  apiKey: string
  model: string
  baseURL: string
  systemPrompt: string
  logger?: Logger
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly model: string
  readonly #client: OpenAI
  readonly #systemPrompt: string
  readonly #log: Logger

  constructor(opts: OpenAICompatibleOptions) {
    this.model = opts.model
    this.#client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL })
    this.#systemPrompt = opts.systemPrompt
    this.#log = opts.logger ?? silentLogger
  }

  stream(messages: Message[], tools: ToolSchema[]): StreamingResponse {
    const oaiMessages = toOAIMessages(this.#systemPrompt, messages)
    const oaiTools = tools.length > 0 ? toOAITools(tools) : undefined

    this.#log.info(`OpenAI stream: model=${this.model}, baseURL=${this.#client.baseURL}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let streamRef: any = null
    const getStream = () => {
      if (!streamRef) {
        streamRef = this.#client.chat.completions.stream({
          model: this.model,
          max_tokens: 8096,
          messages: oaiMessages,
          ...(oaiTools ? { tools: oaiTools } : {}),
        })
      }
      return streamRef
    }

    return {
      tokens: async function* () {
        const stream = getStream()
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta
          if (delta?.content) {
            yield delta.content
          }
        }
      },

      complete: async (): Promise<LLMMessage> => {
        const stream = getStream()
        const msg = await stream.finalMessage()
        const usage = msg.usage
        return {
          role: 'assistant',
          content: toSharedContent(msg.choices[0]?.message),
          stopReason: toStopReason(msg.choices[0]?.finish_reason),
        }
      },
    }
  }
}

// ---------------------------------------------------------------------------
// Format translators
// ---------------------------------------------------------------------------

function toOAIMessages(
  systemPrompt: string,
  messages: Message[],
): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      const textBlocks = msg.content.filter((b) => b.type === 'text')
      const toolBlocks = msg.content.filter((b) => b.type === 'tool_use')
      result.push({
        role: 'assistant',
        content: textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('') || null,
        ...(toolBlocks.length > 0
          ? {
              tool_calls: toolBlocks.map((b) => {
                if (b.type !== 'tool_use') return null as never
                return {
                  id: b.id,
                  type: 'function' as const,
                  function: { name: b.name, arguments: JSON.stringify(b.input) },
                }
              }),
            }
          : {}),
      })
    } else if (msg.role === 'tool') {
      result.push({
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      })
    } else if (msg.role === 'summary') {
      result.push({ role: 'user', content: `[CONTEXT SUMMARY]\n${msg.content}` })
    }
  }

  return result
}

function toOAITools(tools: ToolSchema[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema as unknown as Record<string, unknown>,
    },
  }))
}

function toSharedContent(
  message: OpenAI.ChatCompletionMessage | undefined,
): AssistantContentBlock[] {
  const result: AssistantContentBlock[] = []

  if (message?.content) {
    result.push({ type: 'text', text: message.content })
  }

  for (const tc of message?.tool_calls ?? []) {
    const fn = (tc as OpenAI.ChatCompletionMessageFunctionToolCall).function
    if (!fn) continue
    let input: Record<string, unknown> = {}
    try {
      input = JSON.parse(fn.arguments) as Record<string, unknown>
    } catch {
      // malformed JSON from model — leave input empty
    }
    result.push({ type: 'tool_use', id: tc.id, name: fn.name, input })
  }

  return result
}

function toStopReason(
  reason: string | null | undefined,
): LLMMessage['stopReason'] {
  if (reason === 'tool_calls') return 'tool_use'
  if (reason === 'length') return 'max_tokens'
  return 'end_turn'
}
