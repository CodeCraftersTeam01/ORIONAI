import readline from 'readline';
import os from 'os';
import { isAuthInitialized, setupAccount } from '../../server/src/services/authService.js';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askSecret(query) {
  if (!process.stdin.isTTY) {
    return askQuestion(query);
  }

  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw || false;
    try {
      stdin.setRawMode(true);
    } catch {}
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char) => {
      // Enter / Return / EOF
      if (char === '\n' || char === '\r' || char === '\u0004') {
        try {
          stdin.setRawMode(wasRaw);
        } catch {}
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input.trim());
        return;
      }
      // Ctrl+C (Interrupt)
      if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(130);
      }
      // Backspace (\x08 or \x7f)
      if (char === '\u0008' || char === '\u007f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      // Ignore other invisible control keys
      if (char.charCodeAt(0) < 32) return;

      input += char;
      process.stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

/**
 * Interactive Terminal Setup Wizard
 */
export async function runCliSetupWizard(force = false) {
  if (!force && isAuthInitialized()) {
    return true;
  }

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  🌌 Orion Agent — Konfigurasi Akun Pengelola Pertama Kali    │
│  Keamanan: Enkripsi Memori-Kuat (scrypt KDF + 32B Salt)      │
└──────────────────────────────────────────────────────────────┘
Akun ini digunakan untuk mengamankan akses terminal dan dashboard web.
`);

  const defaultUsername = os.userInfo().username || 'arjuna';
  let username = '';

  while (!username) {
    const inputUser = await askQuestion(`👤 Masukkan Username [${defaultUsername}]: `);
    username = inputUser || defaultUsername;
    if (!username.trim()) {
      console.log('⚠️  Username tidak boleh kosong. Silakan coba lagi.');
    }
  }

  let password = '';
  while (!password) {
    const pass1 = await askSecret('🔑 Masukkan Password / PIN: ');
    if (!pass1 || pass1.length < 3) {
      console.log('⚠️  Password / PIN minimal 3 karakter. Silakan coba lagi.\n');
      continue;
    }

    const pass2 = await askSecret('🔒 Konfirmasi Password / PIN: ');
    if (pass1 !== pass2) {
      console.log('❌ Konfirmasi password tidak cocok! Silakan ulangi password.\n');
      continue;
    }

    password = pass1;
  }

  try {
    const account = await setupAccount(username, password);
    console.log(`
✅ Akun pengelola berhasil dikonfigurasi!
├── Pengguna:     ${account.username}
├── Enkripsi:     scrypt (OWASP Certified Memory-Hard KDF)
└── Penyimpanan:  ~/.orion/auth.json (izin berkas terbatas 0600)
`);
    return true;
  } catch (err) {
    console.error(`\n❌ Gagal menyimpan akun: ${err.message}`);
    return false;
  }
}
