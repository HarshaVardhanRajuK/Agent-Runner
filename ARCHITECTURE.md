# Agent Runner — Architecture

> A custom AI agent runtime, built to be **completely understood** by its author and to
> evolve continuously as that understanding deepens. Not a clone of Claude Code / Cursor /
> Cline / Codex — a runtime whose every decision is deliberate.

**Status:** v0.1 skeleton (working end-to-end, ~2,200 LOC)
**Last updated:** 2026-06-20
**Maintainer:** solo developer (learning-first)

---

## 1. Project Vision

Build an **agent runtime** — the engine that turns a user task + an LLM + a set of tools into
autonomous, multi-step work — that the author understands at every layer. The runtime is
client-agnostic; the VS Code extension is the first client, a CLI and others may follow.

The long-term north star (implied by the repo's `RAG/` home and the stubbed context engine)
is a **retrieval-aware coding agent**: one that understands a whole repository, retrieves the
right context on demand, plans, remembers, and eventually coordinates sub-agents.

This document is the single source of truth for *where we are*, *where we're going*, and
*why*. Keep it current; it is the project's memory.

## 2. Guiding Principles

1. **Understand before you build.** No abstraction enters the codebase without a concrete
   reason that the author can articulate. No vibe-coding.
2. **Ports and adapters at every external boundary.** The runtime never imports a vendor SDK
   or a platform API directly. It depends on interfaces (`ModelProvider`, `PlatformAdapter`).
3. **The runtime is a library, clients are thin.** All intelligence lives in `packages/*`.
   A client (VS Code, CLI) only adapts I/O and renders events.
4. **Events are the contract.** The runtime communicates with the world by yielding a typed
   stream of `RuntimeEvent`s. Clients render; they do not reach inside.
5. **Earn complexity.** Single JSON file before SQLite. Char-count token estimate before a
   real tokenizer. Each upgrade happens when a real limitation forces it, not before.
6. **Every phase ships something useful.** No 6-month refactors with nothing to show.

## 3. Core Concepts

| Concept | Meaning in this codebase |
|---|---|
| **Runtime** | The agent loop: task → context → LLM → tools → repeat until done. |
| **Session** | Persisted conversation for a workspace. Currently one per workspace. |
| **Message** | Discriminated union: `user` \| `assistant` \| `tool` \| `summary`. |
| **Provider** | An adapter to one LLM API, behind the `ModelProvider` interface. |
| **Tool** | A `(schema, executor)` pair the LLM can call; executes via a `PlatformAdapter`. |
| **PlatformAdapter** | The port for file/command/dir I/O. Implemented per client. |
| **Context** | The messages array actually sent to the model for one iteration. |
| **RuntimeEvent** | The typed, streamed output of the runtime, consumed by any client. |

## 4. Major Components

```
packages/
  shared/     Types + contracts shared everywhere (events, session, providers, tools, catalog)
  runtime/    The agent loop + session manager  ← the heart
  providers/  ModelProvider implementations (Anthropic, OpenAI-compatible, DeepSeek, MiniMax)
  tools/      ToolRegistry + 4 tool definitions (read/write/list/run)
  context/    Token budget + naive compression (retrieval not yet built — STUB)
  storage/    Session persistence (single global JSON file)
clients/
  vscode-extension/  Extension host (wiring) + React webview (UI)
```

- **`shared`** — zero-dependency type package. The dependency sink everything points at.
- **`runtime`** — `run()` async generator (the loop) + `SessionManager`. Knows nothing about
  any vendor or any UI.
- **`providers`** — translate the runtime's neutral `Message[]`/`ToolSchema[]` to/from each
  vendor wire format. `DeepSeek`/`MiniMax` subclass `OpenAICompatibleProvider`.
- **`tools`** — `ToolRegistry` maps tool name → `{schema, executor}`. Executors receive a
  `PlatformAdapter`, so the same tool works in any client.
- **`context`** — `buildContext()` estimates tokens and applies sliding-window compression.
  This is the seam where **retrieval, memory, and prompt assembly will eventually live.**
- **`storage`** — module-singleton JSON store keyed by workspace path.
- **`vscode-extension`** — `SidebarViewProvider` wires runtime + providers + tools + storage
  and bridges the webview message protocol. `VsCodeAdapter` implements `PlatformAdapter`.
  The webview is a small React app (chat works; settings works; history/profiles/agent are
  stubs).

## 5. Execution Flow

```
User types task in webview
  → postMessage({type:'user_message'})                     [webview → extension host]
  → SidebarViewProvider.#runTask()
      → resolve ModelProvider from selected model + stored API key
      → build ToolRegistry(VsCodeAdapter, workspaceRoot)
      → run({task, sessionManager, provider, tools})        [enter the loop]

  agent loop (packages/runtime/agent-loop.ts):
    append user message → session
    repeat up to maxIterations:
      buildContext(messages, model)        → compress if over threshold
      provider.stream(messages, schemas)   → yield assistant_token events
      complete()                           → full assistant message + stopReason
      append assistant message → session
      if stopReason == end_turn:  save session, yield task_completed, RETURN
      else (tool_use):
        for each tool_use block:
          yield tool_started
          registry.execute(name, input)    → runs via PlatformAdapter
          yield tool_completed
          append tool result → session
    (cap reached) save session, yield task_failed

  → each RuntimeEvent → postMessage({type:'runtime_event'})  [host → webview]
  → ChatView renders tokens / tool cards / completion
```

## 6. Repository Structure

pnpm workspace + Turbo. TypeScript project references. ESM throughout.
Build: per-package `tsc --build`; the VS Code client bundles with esbuild (extension host +
React webview as two bundles).

See §4 for the package map. Key contracts all live in `packages/shared/src/`.

## 7. Current Maturity

Scores are 0–10. See the analysis doc / commit discussion for rationale.

| Subsystem | Score | One-line reason |
|---|---|---|
| Monorepo & build | 8 | Clean workspace, refs, esbuild bundling, minification. |
| Runtime / agent loop | 6 | Correct & readable, but no cancel, no approval, sequential tools. |
| Provider layer | 7 | Good port; 2 real impls; no usage/retry/error typing; model-id drift. |
| Tool system | 6 | Clean registry + adapter port; only 4 tools; no approval/validation. |
| Streaming | 6 | Token streaming works; no tool-input streaming; no usage stats. |
| Event system | 5 | Typed events, single consumer; no bus/persistence/replay. |
| Session management | 5 | Works; one session/workspace; no turns/checkpoints. |
| Storage | 4 | Global JSON singleton; overwrites; no multi-session. |
| Token budget | 4 | Reasonable shape; **model map doesn't match catalog → always default**. |
| Context engine | 3 | Budget + naive trim only; retrieval/memory/prompt assembly absent. |
| Prompt system | 2 | System prompt hardcoded **in the client layer**; no builder. |
| Permission / approval | 1 | Event + protocol types exist but are **never wired**. |
| Observability / telemetry | 1 | Logging only; no metrics, traces, or cost accounting. |
| Testing | 0 | No tests anywhere. |
| Retrieval / workspace index | 0 | Not started (the namesake capability). |
| Planner | 0 | Not started. |
| Memory | 0 | Not started. |

## 8. Roadmap

Phases are ordered so each unlocks the next. **Do not skip ahead.** Full rationale,
acceptance criteria, and "what not to build yet" live in the roadmap section of the analysis.

- **Phase 1 — Foundation Stabilization** *(next, highest leverage)*
  Make the loop trustworthy and inspectable: fix the model registry, add cancellation, wire
  tool approval, emit `tool_failed`/usage events, extract the prompt into a `PromptBuilder`,
  add the first tests. *Nothing intelligent gets built on an un-measurable loop.*
- **Phase 2 — Session & Turn Model** — real turns, multi-session storage (SQLite via WASM),
  history that the `HistoryView` can actually show, checkpoints.
- **Phase 3 — Workspace Intelligence** — file walker, ignore rules, a workspace index
  (symbols/outline). The substrate retrieval needs.
- **Phase 4 — Retrieval** — search over the index (lexical first, embeddings later); the
  context engine injects retrieved snippets. *This is the project's namesake — it comes only
  after the index and a measurable context budget exist.*
- **Phase 5 — Context Engine v2** — deliberate assembly: system + memory + retrieved +
  history under a real token budget, with summarization instead of blind trimming.
- **Phase 6 — Planning** — explicit plan/step decomposition and tracking.
- **Phase 7 — Memory** — durable user/project preferences injected into context.
- **Phase 8 — Tool Orchestration** — parallel tool execution, richer tool set, MCP.
- **Phase 9 — Multi-Agent / Sub-agents** — spawn scoped sub-runtimes for sub-tasks.

## 9. Future Expansion

Each capability lists the foundation that must exist first.

- **Autonomous coding assistant** ← trustworthy loop (P1) + retrieval (P4) + planning (P6).
- **Repository intelligence platform** ← workspace index (P3) + retrieval (P4) + a graph.
- **Multi-model orchestrator / model router** ← provider usage+cost accounting (P1) + a
  routing seam in `run()`.
- **Agent swarm runtime** ← sub-agents (P9) + an event bus + a task queue.
- **Self-improving runtime** ← telemetry + evaluation harness (needs P1's observability first).
- **Cloud / distributed execution** ← a serializable session/turn model (P2) + a transport
  for the event stream.

## 10. Design Principles (operational)

- New external dependency? It hides behind an interface in `shared` first.
- New capability that touches the model's input? It belongs in `context`, not in the loop or
  the client.
- New event? Add it to `RuntimeEvent` and render it in clients — never widen the seam by
  having clients call back into the runtime.
- Prefer pure functions (`buildContext`, `compressHistory`) — they are trivially testable.
- If a file starts coordinating more than one concern, split it before it becomes a god object
  (watch `SidebarViewProvider`).

## 11. Technical Debt (live register)

| # | Debt | Impact | Fix in |
|---|---|---|---|
| D1 | Model IDs in `provider-catalog` ≠ keys in `token-budget` `MODEL_LIMITS` | Every model silently uses the 128k default budget | P1 |
| D2 | `DEFAULT_MODEL` (`claude-sonnet-4-5`) not in catalog | First run errors with "Unknown model" until user picks one | P1 |
| D3 | System prompt hardcoded in `SidebarViewProvider` | Wrong layer; can't test or vary per task | P1 |
| D4 | `tool_approval_required` + approve/reject protocol unwired | No permission system; tools auto-run | P1 |
| D5 | `cancel_task` protocol message never handled; no `AbortSignal` | Runaway tasks can't be stopped | P1 |
| D6 | `context_compressed` reports `tokensBefore == tokensAfter` | Misleading metric | P1 |
| D7 | Storage is a global mutable singleton; `initStore` re-called per op | Fragile; blocks multi-session | P2 |
| D8 | One session per workspace (save overwrites) | `HistoryView` can't exist meaningfully | P2 |
| D9 | No tests; no eval harness | No safety net for refactors | P1 |
| D10 | `gemini-*` in `MODEL_LIMITS` but no Gemini provider | Dead config | P1 |
| D11 | Tools execute sequentially; no input-schema validation | Slower; malformed input reaches executors | P8 / P1 |

## 12. Next Milestone

**Phase 1 — Foundation Stabilization.** A loop you can trust, interrupt, and measure, with the
prompt and model registry in the right place and the first tests in the repo. Everything
intelligent (retrieval, planning, memory) is built on top of this loop — so it must be correct
and observable *before* we make it smart.
