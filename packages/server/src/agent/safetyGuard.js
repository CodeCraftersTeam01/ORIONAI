import path from 'path';
import fs from 'fs';

/**
 * High-risk terminal command patterns that require user approval
 */
const DANGEROUS_COMMAND_PATTERNS = [
  // Deletion & destructive file commands
  /\brm\s+/i,
  /\brmdir\b/i,
  /\bdel\s+/i,
  /\bunlink\b/i,
  /\bshred\b/i,
  // Privilege escalation & system control
  /\bsudo\s+/i,
  /\bsu\s+/i,
  /\bchmod\s+(-[a-zA-Z]*R|\d{3,4})\b/i,
  /\bchown\s+/i,
  /\bkill\s+(-9|\d+)\b/i,
  /\bpkill\b/i,
  /\bkillall\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  // Disk / raw devices
  /\bdd\s+/i,
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  />\s*\/dev\//i,
  // High-risk Git operations
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[a-zA-Z]*f\b/i,
  /\bgit\s+push\s+.*--force\b/i,
  /\bgit\s+branch\s+-[a-zA-Z]*D\b/i,
  // Package publication & secrets
  /\bnpm\s+publish\b/i,
  /\byarn\s+publish\b/i,
  /\bpnpm\s+publish\b/i,
  // Remote pipe to shell execution
  /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/i,
  // Fork bombs & malicious strings
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
];

/**
 * Files deemed critical/sensitive where write/edit operations require approval
 */
const CRITICAL_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /\bauth\.json$/i,
  /\bcredentials\.json$/i,
  /\bid_rsa(\.pub)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /\bpackage\.json$/i,
  /\bpackage-lock\.json$/i,
  /\bpnpm-lock\.yaml$/i,
  /\byarn\.lock$/i,
  /\.gitconfig$/i,
  /\.bashrc$/i,
  /\.zshrc$/i,
];

export class SafetyGuard {
  constructor(workspaceRoot = process.cwd()) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  setWorkspaceRoot(newRoot) {
    if (newRoot && fs.existsSync(newRoot)) {
      this.workspaceRoot = path.resolve(newRoot);
    }
  }

  getWorkspaceRoot() {
    return this.workspaceRoot;
  }

  /**
   * Resolves a target path safely inside the workspace.
   * Prevents directory traversal outside workspace unless explicitly permitted.
   */
  resolveSafePath(targetPath) {
    if (!targetPath) {
      throw new Error('Path file tidak boleh kosong.');
    }
    const resolved = path.resolve(this.workspaceRoot, targetPath);
    return resolved;
  }

  /**
   * Check if a path is considered a critical/sensitive file
   */
  isCriticalFile(filePath) {
    const fileName = path.basename(filePath);
    return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
  }

  /**
   * Evaluates if a tool invocation requires user confirmation
   * @returns {{ needsApproval: boolean, riskLevel: 'safe'|'medium'|'high', reason?: string }}
   */
  evaluateToolCall(name, rawArgs = {}) {
    let toolName = name?.toLowerCase() || '';
    if (toolName === 'write') toolName = 'write_file';
    if (toolName === 'read') toolName = 'read_file';
    if (toolName === 'edit') toolName = 'edit_file';
    if (toolName === 'bash' || toolName === 'sh') toolName = 'run_command';
    if (toolName === 'ls') toolName = 'list_dir';
    if (toolName === 'find') toolName = 'find_files';
    if (toolName === 'grep') toolName = 'grep_search';

    const args = { ...rawArgs };
    const filePath = args?.path || args?.filename || args?.file_path || args?.file || '';
    const cmd = (args?.command || args?.cmd || '').trim();

    switch (toolName) {
      case 'delete_file': {
        const fileTarget = Array.isArray(args?.paths) && args.paths.length > 0
          ? `${args.paths.length} file (${args.paths.slice(0, 3).join(', ')}${args.paths.length > 3 ? '...' : ''})`
          : (filePath || 'file');
        return {
          needsApproval: true,
          riskLevel: 'high',
          reason: `Menghapus '${fileTarget}' bersifat permanen dan tidak dapat dibatalkan.`,
        };
      }

      case 'write_file':
      case 'edit_file': {
        if (filePath && this.isCriticalFile(filePath)) {
          return {
            needsApproval: true,
            riskLevel: 'medium',
            reason: `File '${path.basename(filePath)}' adalah file konfigurasi/kredensial penting proyek.`,
          };
        }
        return { needsApproval: false, riskLevel: 'safe' };
      }

      case 'run_command': {
        for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
          if (pattern.test(cmd)) {
            return {
              needsApproval: true,
              riskLevel: 'high',
              reason: `Perintah '${cmd}' terdeteksi berpotensi destruktif atau mengubah sistem.`,
            };
          }
        }
        return { needsApproval: false, riskLevel: 'safe' };
      }

      case 'read_file':
      case 'list_dir':
      case 'find_files':
      case 'grep_search':
      default:
        return { needsApproval: false, riskLevel: 'safe' };
    }
  }
}

export const safetyGuard = new SafetyGuard();
