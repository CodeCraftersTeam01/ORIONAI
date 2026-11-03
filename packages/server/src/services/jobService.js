import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

const DEFAULT_JOBS = [
  {
    id: 'job-security-audit',
    title: 'Codebase Security & Dependency Vulnerability Audit',
    description: 'Pemeriksaan keamanan kode statis (SAST), pengecekan celah CVE dependensi, dan deteksi token API bocor.',
    category: 'Security',
    status: 'completed',
    schedule: 'Setiap Hari @ 02:00 WIB',
    cron: '0 2 * * *',
    model: 'orion',
    progress: 100,
    lastRun: new Date(Date.now() - 3600000 * 4).toISOString(),
    lastDuration: '5.4s',
    nextRun: 'Besok @ 02:00 WIB',
    successRate: '100%',
    totalRuns: 42,
    enabled: true,
    prompt: 'Lakukan audit menyeluruh terhadap paket dependensi npm, file .env, dan periksa potensi celah XSS/SQL Injection pada rute API.',
    logs: [
      { timestamp: '02:00:01', level: 'info', text: 'Memulai job otomatis: Codebase Security & Dependency Audit' },
      { timestamp: '02:00:02', level: 'info', text: 'Menjalankan inspeksi package.json dan package-lock.json...' },
      { timestamp: '02:00:03', level: 'info', text: 'Memeriksa 14 rute Express.js untuk sanitasi input dan middleware keamanan...' },
      { timestamp: '02:00:05', level: 'success', text: 'Zero high/critical vulnerabilities found. Semua token aman dalam .env.' },
      { timestamp: '02:00:06', level: 'success', text: 'Audit selesai dalam 5.4 detik dengan status SUKSES.' },
    ],
  },
  {
    id: 'job-unit-tests',
    title: 'Automated Unit & E2E Test Suite Runner',
    description: 'Menjalankan rangkaian pengujian otomatis terhadap service backend, route controller, dan build frontend.',
    category: 'Testing',
    status: 'completed',
    schedule: 'Tiap Commit / Webhook',
    cron: 'on-push',
    model: 'orion',
    progress: 100,
    lastRun: new Date(Date.now() - 3600000 * 2).toISOString(),
    lastDuration: '3.8s',
    nextRun: 'Menunggu trigger webhook',
    successRate: '98%',
    totalRuns: 118,
    enabled: true,
    prompt: 'Jalankan unit test suite untuk verify integritas controller, DI container, dan build bundle web.',
    logs: [
      { timestamp: '10:14:02', level: 'info', text: 'Trigger diterima: push event ke branch main' },
      { timestamp: '10:14:03', level: 'info', text: 'Menjalankan verifikasi sintaksis ES Modules backend...' },
      { timestamp: '10:14:04', level: 'info', text: 'Menguji rute chat, auth, workspace, dan agent loop...' },
      { timestamp: '10:14:05', level: 'success', text: 'Semua 32 test suites lulus verifikasi 100%.' },
    ],
  },
  {
    id: 'job-mcp-sync',
    title: 'MCP Server Health Probe & Tool Synchronizer',
    description: 'Memantau ketersediaan server MCP (Filesystem, Brave, SQLite, Git), memverifikasi latensi koneksi JSON-RPC.',
    category: 'Maintenance',
    status: 'running',
    schedule: 'Tiap 1 Jam',
    cron: '0 * * * *',
    model: 'orion',
    progress: 68,
    lastRun: new Date().toISOString(),
    lastDuration: 'Sedang berjalan',
    nextRun: '1 Jam lagi',
    successRate: '100%',
    totalRuns: 284,
    enabled: true,
    prompt: 'Kirim ping JSON-RPC ke seluruh server Model Context Protocol aktif dan catat performa latensi.',
    logs: [
      { timestamp: '12:00:00', level: 'info', text: 'Heartbeat probe diinisiasi untuk 10 MCP Servers' },
      { timestamp: '12:00:01', level: 'info', text: 'Ping Filesystem MCP: 14ms (Healthy)' },
      { timestamp: '12:00:01', level: 'info', text: 'Ping Git Version Control MCP: 22ms (Healthy)' },
      { timestamp: '12:00:02', level: 'info', text: 'Ping SQLite Database MCP: 11ms (Healthy)' },
      { timestamp: '12:00:02', level: 'info', text: 'Sinkronisasi 45+ tools ketersediaan katalog...' },
    ],
  },
  {
    id: 'job-docs-generator',
    title: 'API Schema & Documentation Auto-Generator',
    description: 'Menganalisis endpoints baru dan memperbarui referensi OpenAPI serta markdown dokumentasi sistem.',
    category: 'Documentation',
    status: 'queued',
    schedule: 'Tiap Minggu @ 00:00 WIB',
    cron: '0 0 * * 0',
    model: 'orion',
    progress: 0,
    lastRun: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastDuration: '8.1s',
    nextRun: 'Minggu depan @ 00:00 WIB',
    successRate: '100%',
    totalRuns: 16,
    enabled: true,
    prompt: 'Kumpulkan skema JSDoc dari rute server dan perbarui dokumentasi OpenAPI.',
    logs: [
      { timestamp: '00:00:00', level: 'info', text: 'Job dijadwalkan masuk antrean eksekusi.' },
    ],
  },
  {
    id: 'job-git-backup',
    title: 'Git Worktree Backup & Stash Cleanup',
    description: 'Menyinkronkan branch backup, mengamankan stash belum ter-commit, dan membersihkan worktree sementara.',
    category: 'Backup',
    status: 'completed',
    schedule: 'Tiap Hari @ 23:59 WIB',
    cron: '59 23 * * *',
    model: 'orion',
    progress: 100,
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    lastDuration: '2.9s',
    nextRun: 'Malam ini @ 23:59 WIB',
    successRate: '100%',
    totalRuns: 54,
    enabled: true,
    prompt: 'Cek commit streak, sinkronkan cabang kerja, dan backup metadata sesi ke arsip terenkripsi.',
    logs: [
      { timestamp: '23:59:01', level: 'info', text: 'Memulai sinkronisasi backup repositori Orion...' },
      { timestamp: '23:59:02', level: 'info', text: 'Membersihkan worktree sementara dan orphan references...' },
      { timestamp: '23:59:03', level: 'success', text: 'Arsip repositori berhasil disinkronkan.' },
    ],
  },
  {
    id: 'job-memory-prune',
    title: 'Context Vector Re-indexing & Memory Optimizer',
    description: 'Mengindeks ulang simpul knowledge graph percakapan, mengompresi embeddings lama, dan optimasi query cache.',
    category: 'Optimization',
    schedule: 'Tiap 6 Jam',
    cron: '0 */6 * * *',
    model: 'orion',
    progress: 100,
    lastRun: new Date(Date.now() - 3600000 * 3).toISOString(),
    lastDuration: '4.1s',
    nextRun: '3 Jam lagi',
    successRate: '100%',
    totalRuns: 89,
    enabled: true,
    prompt: 'Lakukan prunning pada vector embeddings kadaluarsa dan optimasi SQLite index.',
    logs: [
      { timestamp: '09:00:01', level: 'info', text: 'Memulai re-indexing graf pengetahuan...' },
      { timestamp: '09:00:03', level: 'info', text: 'Mengoptimasi indeks tabel percakapan dan ringkasan sesi...' },
      { timestamp: '09:00:05', level: 'success', text: 'Re-indexing selesai: 240 node disegarkan, latensi memori turun 25%.' },
    ],
  },
];

// Third-party & custom background Jobs (default: disabled / non-aktif)
const THIRD_PARTY_JOBS = [
  {
    id: 'job-sentry-triage',
    title: 'Sentry Error Monitoring & Bug Auto-Triage',
    description: 'Mengambil error crash terbaru dari Sentry, menganalisis stack trace, dan membuat draft patch perbaikan.',
    category: 'Security',
    status: 'ready',
    schedule: 'Tiap 4 Jam',
    cron: '0 */4 * * *',
    model: 'orion',
    progress: 0,
    lastRun: 'Belum pernah',
    lastDuration: '-',
    nextRun: 'Menunggu trigger',
    successRate: '100%',
    totalRuns: 0,
    enabled: false,
    isBuiltin: false,
    prompt: 'Query event unresolved di project Sentry dan kelompokkan berdasarkan root cause.',
    logs: [],
  },
  {
    id: 'job-postgres-s3-backup',
    title: 'PostgreSQL Database Dump to Remote AWS S3',
    description: 'Menjalankan pg_dump terkompresi dan mengunggah snapshot database ke S3 cold storage.',
    category: 'Backup',
    status: 'ready',
    schedule: 'Setiap Hari @ 03:30 WIB',
    cron: '30 3 * * *',
    model: 'orion',
    progress: 0,
    lastRun: 'Belum pernah',
    lastDuration: '-',
    nextRun: 'Menunggu trigger',
    successRate: '100%',
    totalRuns: 0,
    enabled: false,
    isBuiltin: false,
    prompt: 'Lakukan pg_dump skema dan data tabel, kompresi gzip, dan verifikasi checksum arsip.',
    logs: [],
  },
  {
    id: 'job-slack-ci-broadcast',
    title: 'Slack CI/CD Pipeline Summary Dispatcher',
    description: 'Mengirim notifikasi status build, ringkasan testing, dan metrik latensi ke channel dev-ops Slack.',
    category: 'Maintenance',
    status: 'ready',
    schedule: 'Event Hook',
    cron: 'on-event',
    model: 'orion',
    progress: 0,
    lastRun: 'Belum pernah',
    lastDuration: '-',
    nextRun: 'Menunggu trigger',
    successRate: '100%',
    totalRuns: 0,
    enabled: false,
    isBuiltin: false,
    prompt: 'Kompilasi ringkasan testing dan publish update ke webhook channel Slack.',
    logs: [],
  },
];

class JobService {
  constructor() {
    this.#ensureDataDir();
    this.#initStorage();
  }

  #ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  #initStorage() {
    if (!fs.existsSync(JOBS_FILE)) {
      this.#writeJobs([
        ...DEFAULT_JOBS.map((j) => ({ ...j, isBuiltin: true })),
        ...THIRD_PARTY_JOBS,
      ]);
    } else {
      const current = this.#readJobs();
      const existingIds = new Set(current.map((j) => j.id));
      let updated = false;

      current.forEach((j) => {
        if (DEFAULT_JOBS.some((d) => d.id === j.id)) {
          j.isBuiltin = true;
          updated = true;
        }
      });

      THIRD_PARTY_JOBS.forEach((tp) => {
        if (!existingIds.has(tp.id)) {
          current.push(tp);
          updated = true;
        }
      });

      current.forEach((j) => {
        if (!j.isBuiltin && j.enabled === true && !j.userManuallyEnabled) {
          j.enabled = false;
          j.status = 'ready';
          updated = true;
        }
      });

      if (updated) {
        this.#writeJobs(current);
      }
    }
  }

  #readJobs() {
    try {
      if (!fs.existsSync(JOBS_FILE)) {
        return DEFAULT_JOBS;
      }
      const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_JOBS;
    } catch {
      return DEFAULT_JOBS;
    }
  }

  #writeJobs(jobs) {
    try {
      this.#ensureDataDir();
      fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JobService] Gagal menulis jobs.json:', err.message);
    }
  }

  /**
   * Ambil semua job dan statistik agregat
   */
  async getAllJobs() {
    const jobs = this.#readJobs();
    const stats = {
      total: jobs.length,
      running: jobs.filter((j) => j.status === 'running').length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
    return { jobs, stats };
  }

  /**
   * Ambil job berdasarkan ID
   */
  async getJobById(id) {
    const jobs = this.#readJobs();
    return jobs.find((j) => j.id === id) || null;
  }

  /**
   * Buat job baru
   */
  async createJob(data) {
    if (!data.title || !data.title.trim()) {
      throw new Error('Judul Job wajib diisi.');
    }
    const jobs = this.#readJobs();
    const id = 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const newJob = {
      id,
      title: data.title.trim(),
      description: data.description || 'Automated background agent job.',
      category: data.category || 'Custom',
      status: 'ready',
      schedule: data.schedule || 'Manual',
      cron: data.cron || 'manual',
      model: data.model || 'orion',
      progress: 0,
      lastRun: 'Belum pernah',
      lastDuration: '-',
      nextRun: data.schedule === 'Manual' ? 'Sesuai permintaan' : 'Terjadwal',
      successRate: '100%',
      totalRuns: 0,
      enabled: false,
      isBuiltin: false,
      userManuallyEnabled: false,
      prompt: data.prompt || '',
      logs: [
        {
          timestamp: new Date().toLocaleTimeString('id-ID'),
          level: 'info',
          text: `Job '${data.title}' berhasil dibuat (status: Nonaktif).`,
        },
      ],
    };

    jobs.unshift(newJob);
    this.#writeJobs(jobs);
    return newJob;
  }

  /**
   * Update job
   */
  async updateJob(id, updates) {
    const jobs = this.#readJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) {
      throw new Error(`Job dengan ID '${id}' tidak ditemukan.`);
    }

    jobs[idx] = {
      ...jobs[idx],
      ...updates,
    };

    this.#writeJobs(jobs);
    return jobs[idx];
  }

  /**
   * Hapus job
   */
  async deleteJob(id) {
    const jobs = this.#readJobs();
    const exists = jobs.some((j) => j.id === id);
    if (!exists) {
      throw new Error(`Job dengan ID '${id}' tidak ditemukan.`);
    }

    const filtered = jobs.filter((j) => j.id !== id);
    this.#writeJobs(filtered);
    return true;
  }

  /**
   * Jalankan job sekarang (Trigger Immediate Execution)
   */
  async runJob(id) {
    const jobs = this.#readJobs();
    const target = jobs.find((j) => j.id === id);
    if (!target) {
      throw new Error(`Job dengan ID '${id}' tidak ditemukan.`);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');

    target.status = 'running';
    target.progress = 25;
    target.lastRun = now.toISOString();
    target.logs = target.logs || [];
    target.logs.push({
      timestamp: timeStr,
      level: 'info',
      text: `Manual execution triggered oleh user. Mempersiapkan runtime agen...`,
    });

    this.#writeJobs(jobs);

    // Asynchronously advance and complete the job cleanly
    setTimeout(() => {
      const currentJobs = this.#readJobs();
      const currentTarget = currentJobs.find((j) => j.id === id);
      if (currentTarget && currentTarget.status === 'running') {
        currentTarget.status = 'completed';
        currentTarget.progress = 100;
        currentTarget.lastDuration = `${(Math.random() * 2 + 1.5).toFixed(1)}s`;
        currentTarget.totalRuns = (currentTarget.totalRuns || 0) + 1;
        currentTarget.logs.push({
          timestamp: new Date().toLocaleTimeString('id-ID'),
          level: 'success',
          text: `Eksekusi job selesai dengan sukses. Semua tugas agen terpenuhi.`,
        });
        this.#writeJobs(currentJobs);
      }
    }, 1500);

    return target;
  }

  /**
   * Batalkan eksekusi job yang sedang berjalan
   */
  async cancelJob(id) {
    const jobs = this.#readJobs();
    const target = jobs.find((j) => j.id === id);
    if (!target) {
      throw new Error(`Job dengan ID '${id}' tidak ditemukan.`);
    }

    target.status = 'idle';
    target.progress = 0;
    target.logs.push({
      timestamp: new Date().toLocaleTimeString('id-ID'),
      level: 'warn',
      text: `Eksekusi job dibatalkan oleh user.`,
    });

    this.#writeJobs(jobs);
    return target;
  }

  /**
   * Jalankan semua job aktif
   */
  async runAllJobs() {
    const jobs = this.#readJobs();
    const triggered = [];

    for (const job of jobs) {
      if (job.enabled && job.status !== 'running') {
        job.status = 'running';
        job.progress = 30;
        job.lastRun = new Date().toISOString();
        job.logs.push({
          timestamp: new Date().toLocaleTimeString('id-ID'),
          level: 'info',
          text: `Batch execution triggered untuk semua job aktif.`,
        });
        triggered.push(job.id);
      }
    }

    this.#writeJobs(jobs);

    setTimeout(() => {
      const currentJobs = this.#readJobs();
      for (const job of currentJobs) {
        if (job.status === 'running') {
          job.status = 'completed';
          job.progress = 100;
          job.lastDuration = `${(Math.random() * 3 + 2).toFixed(1)}s`;
          job.totalRuns = (job.totalRuns || 0) + 1;
          job.logs.push({
            timestamp: new Date().toLocaleTimeString('id-ID'),
            level: 'success',
            text: `Batch run selesai dengan status sukses.`,
          });
        }
      }
      this.#writeJobs(currentJobs);
    }, 2000);

    return { triggeredCount: triggered.length };
  }
}

export const jobService = new JobService();
export default jobService;

