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

const AGENT_SYSTEM_PROMPT = `Anda adalah Orion Agent, agen pemrograman kecerdasan kosmik yang otonom, presisi, dan tangkas (seperti pi agent).
Anda memiliki akses langsung ke perkakas sistem (tools) untuk memeriksa file, membaca, menulis, mengedit, menghapus, serta menjalankan perintah terminal di workspace proyek pengguna.

ATURAN OPERASIONAL AGENT:
1. Analisis Kebutuhan: Pahami tujuan pengguna secara mendalam sebelum bertindak.
2. Eksplorasi Terlebih Dahulu: Jika belum mengetahui struktur proyek atau letak kode, gunakan 'list_dir', 'find_files', atau 'grep_search'.
3. Baca Sebelum Mengedit: Sebelum memodifikasi file apa pun, selalu gunakan 'read_file' untuk memastikan konteks dan isi baris yang sebenarnya.
4. Presisi Kode: Saat menggunakan 'edit_file', pastikan 'target_content' persis sama dengan kode di file aslinya (termasuk spasi/indentasi).
5. Eksekusi Mandiri: Gunakan tool secara berulang dan terstruktur hingga tugas pengguna benar-benar tuntas. Jangan meminta pengguna melakukan hal yang bisa Anda selesaikan sendiri lewat tool.
6. Validasi & Uji: Bila melakukan perubahan kode, jika relevan jalankan pemeriksaan atau tes melalui 'run_command' (misal: npm test, build, lint).
7. Konfirmasi Pengamanan: Operasi penghapusan file (delete_file), modifikasi file sensitif (.env, auth, package.json), atau perintah terminal destruktif akan otomatis meminta persetujuan pengguna oleh sistem pengamanan. Anda tidak perlu ragu memanggilnya jika memang dibutuhkan pengguna.
8. Bahasa: Gunakan bahasa Indonesia yang santun, profesional, lugas, dan bebas dari basa-basi yang tidak perlu.`;

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
      if (err.name === 'AbortError') return;
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
    let toolCalls = messageRes.tool_calls || [];

    // Fallback extraction if model outputs markdown tool calls
    if (toolCalls.length === 0 && content) {
      toolCalls = extractFallbackToolCalls(content);
    }

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
      messages.push({ role: 'assistant', content });
      break;
    }

    // Push assistant message with tool calls into history
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls,
    });

    // Execute each tool call
    for (const tc of toolCalls) {
      const callId = tc.id || `call_${Date.now()}`;
      const fnName = tc.function?.name;
      let fnArgs = {};
      try {
        fnArgs = typeof tc.function?.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function?.arguments || {};
      } catch (parseErr) {
        fnArgs = { raw: tc.function?.arguments };
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

      onEvent({
        type: 'tool_call_start',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
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
          reason: evaluation.reason,
        });

        const approved = await new Promise((resolve) => {
          pendingApprovals.set(callId, { resolve, toolCall: { name: fnName, args: fnArgs } });

          // Auto-timeout after 5 minutes if no response
          setTimeout(() => {
            if (pendingApprovals.has(callId)) {
              pendingApprovals.delete(callId);
              resolve(false);
            }
          }, 5 * 60 * 1000);
        });

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

      // Execute tool
      onEvent({
        type: 'tool_call_running',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
      });

      const result = await executeTool(fnName, fnArgs);

      onEvent({
        type: 'tool_call_complete',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        result,
        isError: Boolean(result?.error),
      });

      messages.push({
        role: 'tool',
        tool_call_id: callId,
        name: fnName,
        content: JSON.stringify(result),
      });
    }
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
