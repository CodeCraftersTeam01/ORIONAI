import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { safetyGuard } from './safetyGuard.js';
import { getModelConfig, resolveEndpointAndHeaders } from '../services/aiService.js';

// Pending approvals registry for interactive web/cli sessions
export const pendingApprovals = new Map();

export function resolveApproval(toolCallId, approved) {
  const pending = pendingApprovals.get(toolCallId);
  if (pending) {
    pendingApprovals.delete(toolCallId);
    pending.resolve(approved);
    return true;
  }
  return false;
}

const AGENT_SYSTEM_PROMPT = `Anda adalah Orion Agent, agen rekayasa kode otonom (arsitektur Pi Agent).
Anda membantu pengguna dengan membaca berkas, menjalankan perintah terminal, mengedit kode, menulis file, dan menghapus berkas secara tuntas.

Daftar tools yang tersedia:
- write: Menulis atau membuat file baru dengan isi lengkap. Parameter: path (string), content (string).
- read: Membaca isi file teks. Parameter: path (string), offset (integer opsional), limit (integer opsional).
- edit: Mengedit file secara presisi dengan exact replacement. Parameter: path (string), edits (array [{oldText, newText}]).
- bash: Menjalankan perintah terminal/shell di direktori aktif. Parameter: command (string), timeout (integer opsional).
- ls: Melihat isi direktori. Parameter: path (string opsional).
- find: Mencari file dengan pola/glob. Parameter: pattern (string), path (string opsional).
- grep: Mencari teks di dalam file. Parameter: pattern (string), path (string opsional).
- delete_file: Menghapus satu atau banyak file sekaligus dalam direktori proyek. Parameter: path (string untuk 1 file) atau paths (array of strings untuk banyak file). Sistem keselamatan akan meminta persetujuan 1 kali untuk seluruh file tersebut.
- ask_user: Menampilkan pertanyaan pilihan opsi interaktif kepada pengguna yang dapat dipilih menggunakan tombol panah keyboard (Up/Down) dan Enter. Parameter: question (string), options (array of strings).

Pedoman Eksekusi:
1. EKSEKUSI LANGSUNG & EFISIEN (BATCH OPERATIONS):
   - Bila pengguna meminta menghapus beberapa file (seperti "hapus html css js di folder ini"), JANGAN memanggil find lalu ls secara bertele-tele. Langsung kumpulkan daftar file dan panggil tool 'delete_file' SEKALI SAJA dengan parameter 'paths: [...]' (batch deletion). Sistem keselamatan akan memicu dialog persetujuan sekali untuk semua file tersebut dan langsung menghapusnya seketika tanpa harus menunggu bergilir satu per satu.
   - Bila pengguna meminta membuat beberapa file, panggil seluruh tool 'write' sekaligus dalam 1 giliran (multi-tool call).
   - Bila memerlukan konfirmasi atau ingin pengguna memilih opsi, gunakan tool 'ask_user' dengan parameter 'question' dan 'options'.
2. JANGAN MEMOTONG KODE: Selalu tulis kode lengkap tanpa placeholder.
3. TANGGAP & TATA BAHASA: Berikan penjelasan yang singkat dan to-the-point dalam bahasa Indonesia dengan spasi yang rapi antar setiap kata.`;

/**
 * Fallback parser to extract tool calls from models that format tools in XML/Markdown
 */
function extractFallbackToolCalls(text) {
  if (!text) return [];
  const calls = [];

  // Match ```json { "tool": "...", "args": {...} } ``` or <tool_call>...</tool_call>
  const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match;
  while ((match = xmlRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      const args = parsed.arguments || parsed.args || parsed.parameters || {};
      if (name) {
        calls.push({ id: `call_fallback_${Date.now()}_${calls.length}`, function: { name, arguments: JSON.stringify(args) } });
      }
    } catch {
      // ignore
    }
  }

  return calls;
}

/**
 * Consolidate chunked or delta tool calls emitted by proxies/streaming APIs.
 * Solves the critical issue where arguments are streamed in multiple array entries
 * (e.g. chunk 0 has name: "write_file", chunk 1 has arguments: "{\"path\"...", chunk 2 has arguments: "...}").
 */
function consolidateToolCalls(rawCalls) {
  if (!Array.isArray(rawCalls) || rawCalls.length === 0) return [];

  const consolidated = [];
  let currentCall = null;

  for (const tc of rawCalls) {
    if (!tc) continue;
    const fnName = tc.function?.name || tc.name;
    const fnArgs = tc.function?.arguments !== undefined
      ? tc.function.arguments
      : (tc.arguments !== undefined ? tc.arguments : '');
    const callId = tc.id;
    const index = tc.index;

    // 1. Try to find existing by index
    let existing = null;
    if (index !== undefined && index !== null) {
      existing = consolidated.find((c) => c.index === index);
    }
    // 2. Try to find existing by id
    if (!existing && callId) {
      existing = consolidated.find((c) => c.id === callId);
    }

    if (existing) {
      if (fnName && (!existing.function.name || existing.function.name === 'undefined')) {
        existing.function.name = fnName;
      }
      if (fnArgs) {
        if (typeof existing.function.arguments === 'string' && typeof fnArgs === 'string') {
          existing.function.arguments += fnArgs;
        } else if (typeof fnArgs === 'object') {
          existing.function.arguments = JSON.stringify(fnArgs);
        }
      }
      continue;
    }

    // 3. If chunk has NO function name and currentCall exists, append to currentCall
    if ((!fnName || fnName === 'undefined') && currentCall) {
      if (fnArgs) {
        if (typeof currentCall.function.arguments === 'string' && typeof fnArgs === 'string') {
          currentCall.function.arguments += fnArgs;
        } else if (typeof fnArgs === 'object') {
          currentCall.function.arguments = JSON.stringify(fnArgs);
        }
      }
      continue;
    }

    // 4. Otherwise, new tool call entry
    currentCall = {
      id: callId || `call_${Date.now()}_${consolidated.length}`,
      index: index !== undefined ? index : consolidated.length,
      type: 'function',
      function: {
        name: fnName || '',
        arguments: typeof fnArgs === 'string' ? fnArgs : (typeof fnArgs === 'object' ? JSON.stringify(fnArgs) : ''),
      },
    };
    consolidated.push(currentCall);
  }

  // Filter and return only tool calls with a valid function name
  return consolidated.filter((c) => Boolean(c.function?.name && c.function.name !== 'undefined' && c.function.name.trim() !== ''));
}

/**
 * Runs the autonomous agent loop until the goal is achieved or max steps reached
 */
export async function runAgentLoop({
  message,
  history = [],
  model = 'orion',
  reasoningTier = 'high',
  customProvider = null,
  orionApiKey = null,
  workspaceRoot = process.cwd(),
  onEvent = () => {},
  signal,
  maxSteps = 15,
}) {
  safetyGuard.setWorkspaceRoot(workspaceRoot);
  const modelConfig = getModelConfig(model, reasoningTier);
  const endpointInfo = resolveEndpointAndHeaders(customProvider, modelConfig, orionApiKey);

  // Initialize messages payload with Agent System Prompt
  const messages = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
  ];

  // Append formatted history
  if (Array.isArray(history) && history.length > 0) {
    history.slice(-6).forEach((h) => {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
      });
    });
  }

  // Append latest user message
  messages.push({
    role: 'user',
    content: message,
  });

  let step = 0;
  let completed = false;
  let finalAnswer = '';

  onEvent({
    type: 'agent_start',
    message: 'Orion Agent aktif. Memulai analisis tugas...',
    workspaceRoot: safetyGuard.getWorkspaceRoot(),
  });

  while (step < maxSteps && !completed) {
    step++;
    if (signal?.aborted) {
      throw new Error('Operasi agent dihentikan oleh pengguna.');
    }

    onEvent({
      type: 'agent_step',
      step,
      maxSteps,
    });

    // Make API request with Tool calling enabled and streaming for instant responsiveness
    const requestBody = {
      model: endpointInfo.targetModel,
      messages: messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      stream: true,
      temperature: endpointInfo.temperature,
    };

    let response;
    try {
      response = await fetch(endpointInfo.targetUrl, {
        method: 'POST',
        headers: endpointInfo.headers,
        body: JSON.stringify(requestBody),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operasi agent dihentikan oleh pengguna.');
      }
      throw new Error(`Koneksi AI gagal: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API Error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const streamedToolCalls = [];
    let content = '';
    let reasoning = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta || {};

          if (delta.reasoning_content || delta.reasoning || delta.thinking) {
            const rChunk = delta.reasoning_content || delta.reasoning || delta.thinking;
            reasoning += rChunk;
            await onEvent({
              type: 'agent_thought_chunk',
              chunk: rChunk,
              step,
            });
          }

          if (delta.content) {
            content += delta.content;
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!streamedToolCalls[idx]) {
                streamedToolCalls[idx] = {
                  id: tc.id || `call_${Date.now()}_${step}_${idx}`,
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (tc.id) streamedToolCalls[idx].id = tc.id;
              if (tc.function?.name && !streamedToolCalls[idx].function.name) {
                streamedToolCalls[idx].function.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                streamedToolCalls[idx].function.arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          // ignore keep-alive or JSON parse fragments
        }
      }
    }

    // Filter valid tool calls
    let validToolCalls = streamedToolCalls.filter(tc => tc && tc.function && tc.function.name);

    // Fallback extraction if model output tool calls in markdown/text
    if (validToolCalls.length === 0 && content) {
      validToolCalls = extractFallbackToolCalls(content);
    }

    // Consolidate fragmented calls
    const allToolCalls = consolidateToolCalls(validToolCalls);

    // Ensure all tool calls have unique IDs and type='function'
    allToolCalls.forEach((tc, idx) => {
      if (!tc.id) {
        tc.id = `call_${Date.now()}_${step}_${idx}`;
      }
      if (!tc.type) {
        tc.type = 'function';
      }
    });

    // Enforce max 3 tool calls per step
    const toolCalls = allToolCalls.slice(0, 3);

    // If no tool calls, this is the final conversational answer!
    if (toolCalls.length === 0) {
      completed = true;
      finalAnswer = content;
      messages.push({ role: 'assistant', content: content || '' });
      await onEvent({
        type: 'agent_chunk',
        chunk: content,
        step,
      });
      break;
    }

    // If there ARE tool calls, emit intermediate reasoning/thought so user sees intent
    const thoughtText = reasoning || content;
    if (thoughtText && thoughtText.trim()) {
      await onEvent({
        type: 'agent_thought',
        content: thoughtText.trim(),
        thought: thoughtText.trim(),
        step,
      });
    }

    // Push assistant message with tool calls into history
    messages.push({
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    });

    const totalToolsInStep = toolCalls.length;
    let toolIndexInStep = 0;

    // Execute each tool call 1 by 1
    for (const tc of toolCalls) {
      toolIndexInStep++;
      const callId = tc.id;
      const fnName = tc.function?.name;
      let fnArgs = {};
      const rawArgString = typeof tc.function?.arguments === 'string' ? tc.function.arguments.trim() : '';

      try {
        if (typeof tc.function?.arguments === 'object' && tc.function?.arguments !== null) {
          fnArgs = tc.function.arguments;
        } else if (rawArgString) {
          fnArgs = JSON.parse(rawArgString);
        }
      } catch (parseErr) {
        // Try repairing common formatting issues (unescaped newlines or single quotes)
        try {
          const repaired = rawArgString
            .replace(/\r?\n/g, '\\n')
            .replace(/'/g, '"');
          fnArgs = JSON.parse(repaired);
        } catch {
          fnArgs = { raw: rawArgString };
        }
      }

      // If JSON.parse failed and left fnArgs.raw, extract fields via regex
      if (fnArgs.raw && typeof fnArgs.raw === 'string') {
        const pathMatch = fnArgs.raw.match(/["']?(?:path|filename|file)["']?\s*[:=]\s*["']?([^"',}\s]+)["']?/i);
        if (pathMatch) fnArgs.path = pathMatch[1].trim();

        const contentMatch = fnArgs.raw.match(/["']?(?:content|text|body)["']?\s*[:=]\s*["']?([\s\S]*?)["']?\s*(?:,\s*["']?[a-z_]+["']?\s*[:=]|\}\s*$)/i);
        if (contentMatch) fnArgs.content = contentMatch[1];

        const cmdMatch = fnArgs.raw.match(/["']?(?:command|cmd)["']?\s*[:=]\s*["']?([^"']+)["']?/i);
        if (cmdMatch) fnArgs.command = cmdMatch[1].trim();
      }

      // Check safety guard
      const evaluation = safetyGuard.evaluateToolCall(fnName, fnArgs);

      const toolCallObj = {
        id: callId,
        name: fnName,
        tool: fnName,
        args: fnArgs,
        risk: { reason: evaluation.reason, level: evaluation.riskLevel },
      };

      // State: START / QUEUED
      await onEvent({
        type: 'tool_call_start',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        step,
        maxSteps,
        needsApproval: evaluation.needsApproval,
        riskLevel: evaluation.riskLevel,
        reason: evaluation.reason,
      });

      // If approval is needed, pause and wait for user permission
      if (evaluation.needsApproval) {
        let approvalResolver;
        const approvalPromise = new Promise((resolve) => {
          approvalResolver = resolve;
        });

        const onAbort = () => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            approvalResolver(false);
          }
        };

        if (signal?.aborted) throw new Error('Operasi agent dihentikan oleh pengguna.');
        signal?.addEventListener('abort', onAbort, { once: true });

        pendingApprovals.set(callId, {
          resolve: (val) => {
            signal?.removeEventListener('abort', onAbort);
            approvalResolver(val);
          },
          toolCall: { name: fnName, args: fnArgs },
        });

        // Auto-timeout after 5 minutes if no response
        const timeoutId = setTimeout(() => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            signal?.removeEventListener('abort', onAbort);
            approvalResolver(false);
          }
        }, 5 * 60 * 1000);

        // State: WAITING APPROVAL - Emitted AFTER pendingApprovals has been set!
        await onEvent({
          type: 'tool_call_waiting_approval',
          toolCallId: callId,
          tool: fnName,
          args: fnArgs,
          toolCall: toolCallObj,
          toolIndex: toolIndexInStep,
          totalTools: totalToolsInStep,
          reason: evaluation.reason,
        });

        const approved = await approvalPromise;
        clearTimeout(timeoutId);

        if (signal?.aborted) {
          throw new Error('Operasi agent dihentikan oleh pengguna.');
        }

        if (!approved) {
          const rejectedResult = {
            error: 'Tindakan ini ditolak oleh pengguna. Silakan cari solusi alternatif atau jelaskan kepada pengguna.',
          };

          await onEvent({
            type: 'tool_call_rejected',
            toolCallId: callId,
            tool: fnName,
            args: fnArgs,
            toolCall: toolCallObj,
            toolIndex: toolIndexInStep,
            totalTools: totalToolsInStep,
            result: rejectedResult,
          });

          messages.push({
            role: 'tool',
            tool_call_id: callId,
            name: fnName,
            content: JSON.stringify(rejectedResult),
          });
          continue;
        }
      }

      // Special interactive tool: ask_user (dynamic choice menu)
      if (fnName === 'ask_user') {
        const question = fnArgs.question || 'Pilih salah satu opsi:';
        let options = Array.isArray(fnArgs.options) ? fnArgs.options : [];
        if (options.length === 0) {
          options = ['Ya, lanjutkan', 'Tidak, batalkan'];
        }

        let choiceResolver;
        const choicePromise = new Promise((resolve) => {
          choiceResolver = resolve;
        });

        const onAbort = () => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            choiceResolver({ selected: 'Dibatalkan', index: -1, cancelled: true });
          }
        };

        if (signal?.aborted) return { success: false, selected: 'Dibatalkan' };
        signal?.addEventListener('abort', onAbort, { once: true });

        pendingApprovals.set(callId, {
          resolve: (val) => {
            signal?.removeEventListener('abort', onAbort);
            choiceResolver(val);
          },
          toolCall: { name: fnName, args: fnArgs },
        });

        await onEvent({
          type: 'tool_call_waiting_choice',
          toolCallId: callId,
          tool: fnName,
          question,
          options,
          step,
        });

        const chosen = await choicePromise;

        const selectedText = typeof chosen === 'string' ? chosen : (chosen?.selected || chosen?.label || options[0]);
        const result = {
          success: !chosen?.cancelled,
          selected: selectedText,
          index: chosen?.index ?? 0,
        };

        await onEvent({
          type: 'tool_call_complete',
          toolCallId: callId,
          tool: fnName,
          args: fnArgs,
          result: { message: `Pengguna memilih: "${selectedText}"` },
          step,
        });

        messages.push({
          role: 'tool',
          tool_call_id: callId,
          name: fnName,
          content: JSON.stringify(result),
        });

        continue;
      }

      const toolStartTime = Date.now();
      // State: RUNNING
      await onEvent({
        type: 'tool_call_running',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        step,
      });

      const result = await executeTool(fnName, fnArgs);
      const durationMs = Date.now() - toolStartTime;

      // State: COMPLETE
      await onEvent({
        type: 'tool_call_complete',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        durationMs,
        durationSec: (durationMs / 1000).toFixed(1),
        result,
        isError: Boolean(result?.error),
        step,
      });

      messages.push({
        role: 'tool',
        tool_call_id: callId,
        name: fnName,
        content: JSON.stringify(result) || '{}',
      });
    }

    // State: STEP_COMPLETED -> Finished executing tools for this step, proceed to next step
    await onEvent({
      type: 'agent_step_complete',
      step,
      maxSteps,
      toolsExecuted: totalToolsInStep,
      message: `Tahap ${step} selesai. Melanjutkan ke tahap berikutnya...`,
    });
  }

  await onEvent({
    type: 'agent_done',
    finalAnswer: finalAnswer || 'Tugas telah selesai diproses.',
    content: finalAnswer || 'Tugas telah selesai diproses.',
    chunk: finalAnswer || 'Tugas telah selesai diproses.',
    stepsCount: step,
  });

  return {
    success: true,
    finalAnswer,
    stepsCount: step,
    messages,
  };
}
