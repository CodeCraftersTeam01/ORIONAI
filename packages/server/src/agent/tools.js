import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { safetyGuard } from './safetyGuard.js';

/**
 * Standard OpenAI Tools Schema for Autonomous Coding Agent
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'write',
      description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write (relative or absolute)',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read the contents of a file. Supports text files and line ranges or offset/limit.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative or absolute)',
          },
          offset: {
            type: 'integer',
            description: 'Line offset to start reading from (1-indexed, optional)',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of lines to read (optional)',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit',
      description: 'Edit a single file using exact text replacement. Supports single target replacement or edits[] array with {oldText, newText}.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to edit',
          },
          edits: {
            type: 'array',
            description: 'List of edits to apply to the file',
            items: {
              type: 'object',
              properties: {
                oldText: { type: 'string', description: 'Exact text in the file to replace' },
                newText: { type: 'string', description: 'New text to insert' },
              },
              required: ['oldText', 'newText'],
            },
          },
          target_content: {
            type: 'string',
            description: 'Exact text in the file to replace (if not using edits array)',
          },
          replacement_content: {
            type: 'string',
            description: 'New replacement text',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a bash command in the current working directory. Returns stdout and stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to run in bash shell',
          },
          timeout: {
            type: 'integer',
            description: 'Timeout in seconds (optional)',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ls',
      description: 'List directory contents (sorted, shows folders and files).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (default: ".")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find',
      description: 'Find files by glob pattern or name.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'File name pattern or glob to search for',
          },
          path: {
            type: 'string',
            description: 'Starting directory (default: ".")',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search file contents for a pattern.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Pattern or text to search for',
          },
          path: {
            type: 'string',
            description: 'Directory to search (default: ".")',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Menghapus file tertentu dalam workspace. MEMERLUKAN PERSETUJUAN PENGGUNA.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Lokasi relatif file yang ingin dihapus.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: 'Menampilkan pertanyaan atau konfirmasi kepada pengguna dengan daftar pilihan opsi dinamis yang dapat dipilih menggunakan tombol panah keyboard (Up/Down) dan Enter.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Pertanyaan atau hal yang ingin dikonfirmasi/ditanyakan ke pengguna',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Daftar opsi pilihan dinamis yang dapat dipilih oleh pengguna (misal: ["Ya, lanjutkan penghapusan file", "Tidak, batalkan"], atau opsi pemilihan desain/framework/tindakan)',
          },
        },
        required: ['question', 'options'],
      },
    },
  },
];

function normalizeToolArgs(toolName, rawArgs = {}) {
  const args = { ...rawArgs };

  // Normalize path
  if (!args.path) {
    args.path = args.filepath || args.file_path || args.filename || args.file || args.file_name || '';
  }

  // Normalize content
  if (args.content === undefined) {
    if (args.text !== undefined) args.content = args.text;
    else if (args.data !== undefined) args.content = args.data;
    else if (args.body !== undefined) args.content = args.body;
  }

  // Normalize edit targets
  if (!args.target_content) {
    args.target_content = args.oldText || args.old_str || args.old_content || '';
  }
  if (!args.replacement_content) {
    args.replacement_content = args.newText || args.new_str || args.new_content || '';
  }

  // Normalize command
  if (!args.command) {
    args.command = args.cmd || args.script || '';
  }

  return args;
}

/**
 * Executes a tool by name with arguments and returns formatted result
 */
export async function executeTool(name, rawArgs = {}) {
  let toolName = name?.toLowerCase() || '';
  if (toolName === 'write' || toolName.startsWith('write') || toolName === 'write_file') toolName = 'write_file';
  else if (toolName === 'read' || toolName.startsWith('read') || toolName === 'read_file') toolName = 'read_file';
  else if (toolName === 'edit' || toolName.startsWith('edit') || toolName === 'edit_file') toolName = 'edit_file';
  else if (toolName === 'bash' || toolName === 'sh' || toolName.startsWith('run_command')) toolName = 'run_command';
  else if (toolName === 'ls' || toolName.startsWith('list') || toolName === 'list_dir') toolName = 'list_dir';
  else if (toolName === 'find' || toolName.startsWith('find') || toolName === 'find_files') toolName = 'find_files';
  else if (toolName === 'grep' || toolName.startsWith('grep') || toolName === 'grep_search') toolName = 'grep_search';

  const args = normalizeToolArgs(toolName, rawArgs);
  try {
    switch (toolName) {
      case 'read_file': {
        const fullPath = safetyGuard.resolveSafePath(args.path);
        if (!fs.existsSync(fullPath)) {
          return { error: `File tidak ditemukan: ${args.path}` };
        }
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          return { error: `'${args.path}' adalah direktori, gunakan 'list_dir'.` };
        }
        const rawContent = fs.readFileSync(fullPath, 'utf8');
        const lines = rawContent.split('\n');

        let outputLines = lines;
        let startLine = 1;
        let endLine = lines.length;

        // Support Pi style offset & limit or Orion style start_line & end_line
        if (args.offset && args.offset > 0) {
          startLine = Math.min(args.offset, lines.length);
        } else if (args.start_line && args.start_line > 0) {
          startLine = Math.min(args.start_line, lines.length);
        }

        if (args.limit && args.limit > 0) {
          endLine = Math.min(startLine + args.limit - 1, lines.length);
        } else if (args.end_line && args.end_line >= startLine) {
          endLine = Math.min(args.end_line, lines.length);
        }

        outputLines = lines.slice(startLine - 1, endLine);
        const numberedContent = outputLines
          .map((line, idx) => `${startLine + idx}: ${line}`)
          .join('\n');

        return {
          path: args.path,
          total_lines: lines.length,
          start_line: startLine,
          end_line: endLine,
          size_bytes: stat.size,
          content: numberedContent,
        };
      }

      case 'write_file': {
        if (!args.path || !args.path.trim()) {
          return { error: "Gagal menjalankan tool 'write_file': Path file tidak boleh kosong." };
        }
        const fullPath = safetyGuard.resolveSafePath(args.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, args.content || '', 'utf8');
        const stat = fs.statSync(fullPath);
        return {
          success: true,
          path: args.path,
          size_bytes: stat.size,
          message: `Berhasil menulis ${stat.size} byte ke '${args.path}'.`,
        };
      }

      case 'edit_file': {
        const fullPath = safetyGuard.resolveSafePath(args.path);
        if (!fs.existsSync(fullPath)) {
          return { error: `File tidak ditemukan: ${args.path}` };
        }
        const originalContent = fs.readFileSync(fullPath, 'utf8');

        // Pi Agent multi-edit support via edits[]
        if (Array.isArray(args.edits) && args.edits.length > 0) {
          let updatedContent = originalContent;
          for (let i = 0; i < args.edits.length; i++) {
            const edit = args.edits[i];
            const target = edit.oldText || edit.old_str || edit.target_content;
            const replacement = edit.newText !== undefined ? edit.newText : (edit.new_str !== undefined ? edit.new_str : edit.replacement_content);
            if (!target) continue;
            if (!updatedContent.includes(target)) {
              return { error: `oldText ke-${i + 1} tidak ditemukan di file '${args.path}'. Pastikan teks cocok persis.` };
            }
            updatedContent = updatedContent.replace(target, replacement);
          }
          fs.writeFileSync(fullPath, updatedContent, 'utf8');
          return {
            success: true,
            path: args.path,
            message: `Berhasil menerapkan ${args.edits.length} perubahan di '${args.path}'.`,
          };
        }

        const target = args.target_content;
        const replacement = args.replacement_content;

        if (!target) {
          return { error: 'target_content atau edits[] tidak boleh kosong.' };
        }

        const occurrences = originalContent.split(target).length - 1;
        if (occurrences === 0) {
          return {
            error: `target_content tidak ditemukan di file '${args.path}'. Pastikan spasi dan karakter cocok.`,
          };
        }
        if (occurrences > 1) {
          return {
            error: `Ditemukan ${occurrences} kemunculan target_content di '${args.path}'. Berikan konteks baris lebih spesifik agar target unik.`,
          };
        }

        const updatedContent = originalContent.replace(target, replacement);
        fs.writeFileSync(fullPath, updatedContent, 'utf8');
        return {
          success: true,
          path: args.path,
          message: `Berhasil mengubah target_content di file '${args.path}'.`,
        };
      }

      case 'delete_file': {
        const fullPath = safetyGuard.resolveSafePath(args.path);
        if (!fs.existsSync(fullPath)) {
          return { error: `File tidak ditemukan: ${args.path}` };
        }
        fs.unlinkSync(fullPath);
        return {
          success: true,
          path: args.path,
          message: `File '${args.path}' berhasil dihapus.`,
        };
      }

      case 'list_dir': {
        const targetDir = safetyGuard.resolveSafePath(args.path || '.');
        if (!fs.existsSync(targetDir)) {
          return { error: `Direktori tidak ditemukan: ${args.path || '.'}` };
        }

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        const items = entries
          .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules')
          .slice(0, 80)
          .map((entry) => {
            const entryPath = path.join(targetDir, entry.name);
            let size = 0;
            try {
              if (entry.isFile()) size = fs.statSync(entryPath).size;
            } catch {
              // ignore
            }
            return {
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              size_bytes: size,
            };
          });

        return {
          path: args.path || '.',
          total_entries: items.length,
          entries: items,
        };
      }

      case 'find_files': {
        const startPath = safetyGuard.resolveSafePath(args.path || '.');
        const pattern = (args.pattern || '').toLowerCase().replace(/^\*\./, '.');
        const matches = [];

        function walk(currentDir, depth = 0) {
          if (depth > 5 || matches.length >= 50) return;
          try {
            const list = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const item of list) {
              if (item.name.startsWith('.git') || item.name === 'node_modules') continue;
              const fullItemPath = path.join(currentDir, item.name);
              const rel = path.relative(startPath, fullItemPath);
              if (item.isFile()) {
                if (item.name.toLowerCase().includes(pattern) || rel.toLowerCase().includes(pattern)) {
                  matches.push(rel);
                }
              } else if (item.isDirectory()) {
                walk(fullItemPath, depth + 1);
              }
            }
          } catch {
            // ignore
          }
        }

        walk(startPath);
        return {
          pattern: args.pattern,
          matches: matches.slice(0, 50),
          total: matches.length,
        };
      }

      case 'grep_search': {
        const root = safetyGuard.resolveSafePath(args.path || '.');
        const query = args.query;
        const caseSensitive = Boolean(args.case_sensitive);
        const matches = [];

        function walk(currentDir, depth = 0) {
          if (depth > 5 || matches.length >= 40) return;
          try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name.startsWith('.git') || entry.name === 'node_modules' || entry.name === 'dist') continue;
              const full = path.join(currentDir, entry.name);
              const rel = path.relative(root, full);
              if (entry.isFile()) {
                try {
                  const stat = fs.statSync(full);
                  if (stat.size > 500 * 1024) continue; // skip large files >500KB
                  const text = fs.readFileSync(full, 'utf8');
                  const lines = text.split('\n');
                  lines.forEach((line, idx) => {
                    const matchFound = caseSensitive
                      ? line.includes(query)
                      : line.toLowerCase().includes(query.toLowerCase());
                    if (matchFound && matches.length < 40) {
                      matches.push({
                        file: rel,
                        line: idx + 1,
                        text: line.trim().slice(0, 150),
                      });
                    }
                  });
                } catch {
                  // ignore binary/read error
                }
              } else if (entry.isDirectory()) {
                walk(full, depth + 1);
              }
            }
          } catch {
            // ignore
          }
        }

        walk(root);
        return {
          query,
          matches_count: matches.length,
          results: matches,
        };
      }

      case 'run_command': {
        const cmd = args.command;
        const timeout = args.timeout_ms || 60000;
        const cwd = safetyGuard.getWorkspaceRoot();

        return new Promise((resolve) => {
          exec(
            cmd,
            {
              cwd,
              timeout,
              maxBuffer: 5 * 1024 * 1024,
              encoding: 'utf8',
            },
            (error, stdout, stderr) => {
              resolve({
                command: cmd,
                exit_code: error ? error.code || 1 : 0,
                stdout: (stdout || '').slice(0, 10000),
                stderr: (stderr || '').slice(0, 5000),
                success: !error,
                error_message: error ? error.message : null,
              });
            }
          );
        });
      }

      case 'delete_file': {
        const fullPath = safetyGuard.resolveSafePath(args.path);
        if (!fs.existsSync(fullPath)) {
          return { error: `File tidak ditemukan: ${args.path}` };
        }
        fs.unlinkSync(fullPath);
        return {
          success: true,
          path: args.path,
          message: `File '${args.path}' berhasil dihapus.`,
        };
      }

      default:
        return { error: `Tool tidak dikenali: '${toolName}'` };
    }
  } catch (err) {
    return { error: `Gagal menjalankan tool '${toolName}': ${err.message}` };
  }
}
