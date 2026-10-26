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
      name: 'read_file',
      description: 'Membaca isi berkas teks dalam workspace. Bisa menentukan rentang baris tertentu.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Lokasi relatif file dari workspace root (contoh: "src/index.js").',
          },
          start_line: {
            type: 'integer',
            description: 'Nomor baris awal (1-indexed, opsional).',
          },
          end_line: {
            type: 'integer',
            description: 'Nomor baris akhir (1-indexed, opsional).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Menulis atau membuat file baru dengan isi yang diberikan. Otomatis membuat folder induk jika belum ada.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Lokasi relatif file yang akan ditulis.',
          },
          content: {
            type: 'string',
            description: 'Isi lengkap teks yang akan ditulis ke file.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Mengubah bagian tertentu dari sebuah file dengan mengganti target_content menjadi replacement_content secara presisi.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Lokasi relatif file yang akan diedit.',
          },
          target_content: {
            type: 'string',
            description: 'Kutipan teks eksak dalam file yang ingin digantikan.',
          },
          replacement_content: {
            type: 'string',
            description: 'Teks pengganti baru.',
          },
        },
        required: ['path', 'target_content', 'replacement_content'],
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
      name: 'list_dir',
      description: 'Melihat daftar file dan subfolder dalam sebuah direktori.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Lokasi relatif folder (kosongkan atau gunakan "." untuk root workspace).',
          },
          recursive: {
            type: 'boolean',
            description: 'Jika true, menampilkan hingga 2 tingkat kedalaman subfolder.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_files',
      description: 'Mencari file berdasarkan pola nama atau ekstensi (contoh: "*.jsx", "src/**/test*").',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Pola nama file atau ekstensi yang dicari.',
          },
          path: {
            type: 'string',
            description: 'Folder awal pencarian (default: ".").',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep_search',
      description: 'Mencari kemunculan kata atau pola teks di dalam seluruh file proyek.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Kata kunci atau teks yang dicari di dalam isi file.',
          },
          path: {
            type: 'string',
            description: 'Direktori tempat pencarian (default: ".").',
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Apakah pencarian sensitif terhadap huruf besar/kecil (default: false).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Menjalankan perintah terminal/bash di lingkungan workspace proyek (misal npm test, git status, node script). Perintah berisiko memerlukan persetujuan.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Perintah shell lengkap yang akan dieksekusi.',
          },
          timeout_ms: {
            type: 'integer',
            description: 'Batas waktu eksekusi dalam milidetik (default: 60000).',
          },
        },
        required: ['command'],
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

  // Normalize command
  if (!args.command) {
    args.command = args.cmd || args.script || '';
  }

  return args;
}

/**
 * Executes a tool by name with arguments and returns formatted result
 */
export async function executeTool(toolName, rawArgs = {}) {
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

        if (args.start_line && args.start_line > 0) {
          startLine = Math.min(args.start_line, lines.length);
        }
        if (args.end_line && args.end_line >= startLine) {
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
        const target = args.target_content;
        const replacement = args.replacement_content;

        if (!target) {
          return { error: 'target_content tidak boleh kosong.' };
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

      default:
        return { error: `Tool tidak dikenali: '${toolName}'` };
    }
  } catch (err) {
    return { error: `Gagal menjalankan tool '${toolName}': ${err.message}` };
  }
}
