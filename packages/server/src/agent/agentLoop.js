import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { safetyGuard } from './safetyGuard.js';
import { getModelConfig, resolveEndpointAndHeaders } from '../services/aiService.js';

// Pending approvals registry for interactive web/cli sessions
export const pendingApprovals = new Map();

export function resolveApproval(toolCallId, approved) {
  const pending = pendingApprovals.get(toolCallId);
  if (pending) {
    pendingApprovals.delete(toolCallId);
    pending.resolve(Boolean(approved));
    return true;
  }
  return false;
}

const AGENT_SYSTEM_PROMPT = `Anda adalah Orion Agent, agen rekayasa kode otonom yang presisi, tangkas, dan pantang berhenti sebelum tugas selesai (seperti Pi Agent).
Anda memiliki akses langsung ke tools untuk membaca, menulis, membuat, mengedit file, dan menjalankan perintah terminal.

STRATEGI EKSEKUSI TOOL (PI-STYLE):
1. FOKUS & BERTAHAP (1-3 TOOL PER GILIRAN):
   - Jangan memanggil terlalu banyak tool sekaligus. Panggil 1 sampai maksimal 3 tool per giliran secara terfokus.
   - Eksekusi langkah demi langkah: periksa lingkungan -> siapkan direktori/file -> tulis kode -> verifikasi -> selesai.

2. TUNTASKAN SELURUH KEBUTUHAN PENGGUNA TANPA BERHENTI DI TENGAH:
   - Jika pengguna meminta membuat sistem atau proyek (misalnya: "buatkan file html css js dashboard full system crud"):
     * Tahap 1: Periksa direktori atau siapkan folder tujuan.
     * Tahap 2: Tulis file HTML lengkap ('write_file') dengan struktur UI dan elemen CRUD.
     * Tahap 3: Tulis file CSS ('write_file') yang modern, responsif, dan rapi.
     * Tahap 4: Tulis file JavaScript ('write_file') fungsional dengan logika CRUD lengkap (Create, Read, Update, Delete).
     * Tahap 5: Pastikan semua file telah tertulis nyata di disk, lalu berikan kesimpulan akhir kepada pengguna.
   - JANGAN PERNAH berhenti di tengah jalan hanya setelah 'list_dir' atau 'find_files'! Lanjutkan giliran berikutnya untuk memanggil 'write_file' sampai SEMUA file yang diminta selesai dibuat.

3. MANDIRI: Anda yang menulis file dan mengeksekusi perintah. Jangan meminta pengguna membuat file yang bisa Anda buat sendiri lewat tool.
4. BAHASA: Gunakan bahasa Indonesia yang santun, profesional, dan lugas.`;

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

    // Make API request with Tool calling enabled
    const requestBody = {
      model: endpointInfo.targetModel,
      messages: messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
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

    const resJson = await response.json();
    const choice = resJson.choices?.[0];
    const messageRes = choice?.message || {};

    let content = messageRes.content || '';
    let rawToolCalls = messageRes.tool_calls || [];

    // Fallback extraction if model outputs markdown tool calls
    if (rawToolCalls.length === 0 && content) {
      rawToolCalls = extractFallbackToolCalls(content);
    }

    // Consolidate fragmented/chunked tool calls (crucial for upstream router deltas)
    const allToolCalls = consolidateToolCalls(rawToolCalls);

    // Ensure all tool calls have unique IDs
    allToolCalls.forEach((tc, idx) => {
      if (!tc.id) {
        tc.id = `call_${Date.now()}_${step}_${idx}`;
      }
    });

    // Enforce user requirement: maximum 3 tool calls per step, executed sequentially 1-by-1
    const toolCalls = allToolCalls.slice(0, 3);

    // Emit thoughts or intermediate explanations if present
    if (content) {
      onEvent({
        type: 'agent_thought',
        content,
        thought: content,
        step,
      });
    }

    // If no tool calls, the agent has finished thinking and answered the user!
    if (toolCalls.length === 0) {
      completed = true;
      finalAnswer = content;
      messages.push({ role: 'assistant', content: content || '' });
      break;
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
      onEvent({
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
        onEvent({
          type: 'tool_call_waiting_approval',
          toolCallId: callId,
          tool: fnName,
          args: fnArgs,
          toolCall: toolCallObj,
          toolIndex: toolIndexInStep,
          totalTools: totalToolsInStep,
          reason: evaluation.reason,
        });

        const approved = await new Promise((resolve) => {
          const onAbort = () => {
            if (pendingApprovals.has(callId)) {
              pendingApprovals.delete(callId);
              resolve(false);
            }
          };

          if (signal?.aborted) return resolve(false);
          signal?.addEventListener('abort', onAbort, { once: true });

          pendingApprovals.set(callId, {
            resolve: (val) => {
              signal?.removeEventListener('abort', onAbort);
              resolve(val);
            },
            toolCall: { name: fnName, args: fnArgs },
          });

          // Auto-timeout after 5 minutes if no response
          setTimeout(() => {
            if (pendingApprovals.has(callId)) {
              pendingApprovals.delete(callId);
              signal?.removeEventListener('abort', onAbort);
              resolve(false);
            }
          }, 5 * 60 * 1000);
        });

        if (signal?.aborted) {
          throw new Error('Operasi agent dihentikan oleh pengguna.');
        }

        if (!approved) {
          const rejectedResult = {
            error: 'Tindakan ini ditolak oleh pengguna. Silakan cari solusi alternatif atau jelaskan kepada pengguna.',
          };

          onEvent({
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

      // State: RUNNING
      onEvent({
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

      // State: COMPLETE
      onEvent({
        type: 'tool_call_complete',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
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
    onEvent({
      type: 'agent_step_complete',
      step,
      maxSteps,
      toolsExecuted: totalToolsInStep,
      message: `Tahap ${step} selesai. Melanjutkan ke tahap berikutnya...`,
    });
  }

  onEvent({
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
