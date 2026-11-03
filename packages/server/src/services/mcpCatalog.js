/**
 * Orion AI - Curated MCP Server Catalog (65 Nous & Orion Approved Servers)
 * Format adheres to Hermes Agent MCP specification:
 * id, name, category, transport (http | stdio | sse), auth (oauth | api-key | none),
 * endpoint / command, sourceUrl, setupNotes, description, tools.
 */

export const MCP_CATALOG = [
  {
    id: 'airtable',
    name: 'airtable',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.airtable.com/mcp',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'Bases, tables, and records from your Airtable workspace.',
    setupNotes: 'Memerlukan koneksi OAuth atau Personal Access Token Airtable dengan scope data.records:read & schema.bases:read.',
    tools: [
      { name: 'list_bases', description: 'Mendapatkan daftar seluruh base Airtable akun Anda.' },
      { name: 'get_records', description: 'Mengambil record baris dari table Airtable tertentu.' },
      { name: 'create_record', description: 'Menambahkan baris record baru pada tabel Airtable.' }
    ]
  },
  {
    id: 'algolia',
    name: 'algolia',
    category: 'Search & Discovery',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.algolia.com/mcp',
    sourceUrl: 'https://github.com/algolia/mcp-server',
    description: 'Algolia search: indices, analytics, and settings (read-only).',
    setupNotes: 'Memerlukan Application ID dan Algolia Search-Only API Key untuk melakukan query read-only.',
    tools: [
      { name: 'search_index', description: 'Mengeksekusi pencarian teks cepat pada index Algolia.' },
      { name: 'get_settings', description: 'Melihat konfigurasi relevansi dan ranking index.' }
    ]
  },
  {
    id: 'alltrails',
    name: 'alltrails',
    category: 'Lifestyle & Travel',
    transport: 'http',
    auth: 'none',
    endpoint: 'https://www.alltrails.com/mcp',
    sourceUrl: 'https://alltrails.com',
    description: 'AllTrails: find hikes and trails with reviews and ratings.',
    setupNotes: 'Server publik read-only tanpa otentikasi. Menyediakan rute pendakian, elevasi, dan review jalur.',
    tools: [
      { name: 'search_trails', description: 'Pencarian rute hiking berdasarkan lokasi geografis.' },
      { name: 'trail_details', description: 'Melihat panjang jalur, tingkat kesulitan, dan ulasan.' }
    ]
  },
  {
    id: 'amplitude',
    name: 'amplitude',
    category: 'Analytics',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.amplitude.com/mcp',
    sourceUrl: 'https://amplitude.com',
    description: 'Amplitude product analytics, behavioral cohorts, and funnel insights.',
    setupNotes: 'Memerlukan Amplitude API Key & Secret Key untuk membaca event stream dan chart analitik.',
    tools: [
      { name: 'query_events', description: 'Menganalisis event retention dan funnel konversi pengguna.' }
    ]
  },
  {
    id: 'anthropic',
    name: 'anthropic',
    category: 'AI & ML',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.anthropic.com/mcp',
    sourceUrl: 'https://github.com/anthropics',
    description: 'Anthropic Claude model access, computer use, and token estimation.',
    setupNotes: 'Masukkan ANTHROPIC_API_KEY dari dashboard Anthropic Console.',
    tools: [
      { name: 'estimate_tokens', description: 'Menghitung estimasi token untuk prompt teks.' }
    ]
  },
  {
    id: 'asana',
    name: 'asana',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.asana.com/mcp',
    sourceUrl: 'https://developers.asana.com',
    description: 'Project tasks, workspaces, and team milestones in Asana.',
    setupNotes: 'Hubungkan via Asana OAuth atau buat Asana Personal Access Token.',
    tools: [
      { name: 'list_tasks', description: 'Melihat task yang ditugaskan pada workspace atau project.' },
      { name: 'create_task', description: 'Membuat task baru dengan tenggat waktu dan assignee.' }
    ]
  },
  {
    id: 'atlassian',
    name: 'atlassian',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.atlassian.com/mcp',
    sourceUrl: 'https://developer.atlassian.com',
    description: 'Jira issues, Confluence pages, and sprint boards.',
    setupNotes: 'Otentikasi melalui Atlassian Cloud API Token dan email akun Atlassian.',
    tools: [
      { name: 'get_jira_issues', description: 'Mengambil daftar issue aktif pada sprint Jira.' },
      { name: 'search_confluence', description: 'Pencarian halaman dokumentasi internal Confluence.' }
    ]
  },
  {
    id: 'aws-s3',
    name: 'aws-s3',
    category: 'Cloud & Storage',
    transport: 'stdio',
    auth: 'api-key',
    command: 'npx -y @modelcontextprotocol/server-s3',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/s3',
    description: 'AWS S3 Cloud Storage: bucket management, file uploads, and presigned URLs.',
    setupNotes: 'Set variabel lingkungan AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, dan AWS_REGION.',
    tools: [
      { name: 'list_buckets', description: 'Melihat seluruh bucket S3 pada akun AWS.' },
      { name: 'upload_file', description: 'Mengunggah objek ke bucket S3 spesifik.' },
      { name: 'get_presigned_url', description: 'Membuat URL unduhan bertanda tangan sementara.' }
    ]
  },
  {
    id: 'bitbucket',
    name: 'bitbucket',
    category: 'Development',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.bitbucket.org/mcp',
    sourceUrl: 'https://bitbucket.org',
    description: 'Bitbucket repositories, pull requests, and commit pipelines.',
    setupNotes: 'Gunakan Bitbucket App Password dengan izin Repositories & Pull Requests.',
    tools: [
      { name: 'list_repos', description: 'Daftar repositori workspace Bitbucket.' },
      { name: 'review_pr', description: 'Melihat perbedaan diff dan komentar PR Bitbucket.' }
    ]
  },
  {
    id: 'brave-search',
    name: 'brave-search',
    category: 'Search & Discovery',
    transport: 'stdio',
    auth: 'api-key',
    command: 'npx -y @modelcontextprotocol/server-brave-search',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    description: 'Real-time web and local search via Brave Search API without tracking.',
    setupNotes: 'Daftar di Brave Search API Console dan set BRAVE_API_KEY.',
    tools: [
      { name: 'brave_web_search', description: 'Pencarian web real-time dengan cuplikan markdown.' },
      { name: 'brave_local_search', description: 'Pencarian bisnis dan tempat lokal terdekat.' }
    ]
  },
  {
    id: 'canva',
    name: 'canva',
    category: 'Design & Media',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.canva.com/mcp',
    sourceUrl: 'https://canva.dev',
    description: 'Canva design templates, asset exports, and brand kit inspection.',
    setupNotes: 'Memerlukan Canva Developer App OAuth credentials dengan permission design:read.',
    tools: [
      { name: 'get_design', description: 'Mengambil informasi dan link ekspor desain Canva.' },
      { name: 'list_brand_assets', description: 'Melihat palet warna dan font brand kit.' }
    ]
  },
  {
    id: 'clickup',
    name: 'clickup',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.clickup.com/mcp',
    sourceUrl: 'https://clickup.com/api',
    description: 'ClickUp task management, team spaces, goals, and sprint lists.',
    setupNotes: 'Masukkan ClickUp Personal API Token dari profil Settings > Apps.',
    tools: [
      { name: 'get_tasks', description: 'Menampilkan task dalam folder atau list ClickUp.' }
    ]
  },
  {
    id: 'cloudflare',
    name: 'cloudflare',
    category: 'Cloud & Infrastructure',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.cloudflare.com/mcp',
    sourceUrl: 'https://developers.cloudflare.com',
    description: 'Cloudflare DNS, Workers KV, D1 databases, and edge rule management.',
    setupNotes: 'Gunakan Cloudflare API Token dengan template izin Zone DNS & Workers.',
    tools: [
      { name: 'list_dns_records', description: 'Melihat seluruh DNS record domain.' },
      { name: 'query_d1', description: 'Mengeksekusi SQL query pada serverless database D1.' }
    ]
  },
  {
    id: 'cohere',
    name: 'cohere',
    category: 'AI & ML',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.cohere.com/mcp',
    sourceUrl: 'https://cohere.com',
    description: 'Cohere semantic reranking, text embeddings, and multilingual classification.',
    setupNotes: 'Set COHERE_API_KEY dari dashboard akun Cohere.',
    tools: [
      { name: 'rerank_documents', description: 'Mengurutkan ulang dokumen relevan berdasarkan prompt.' }
    ]
  },
  {
    id: 'confluence',
    name: 'confluence',
    category: 'Knowledge Base',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.atlassian.com/confluence/mcp',
    sourceUrl: 'https://developer.atlassian.com/cloud/confluence',
    description: 'Search, create, and manage team knowledge spaces in Confluence.',
    setupNotes: 'Gunakan Atlassian Cloud credentials dengan akses ruang lingkup Confluence wiki.',
    tools: [
      { name: 'get_page', description: 'Membaca konten halaman dokumen Confluence.' }
    ]
  },
  {
    id: 'datadog',
    name: 'datadog',
    category: 'Monitoring',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.datadoghq.com/mcp',
    sourceUrl: 'https://datadoghq.com',
    description: 'Datadog infrastructure metrics, synthetic monitors, and live APM traces.',
    setupNotes: 'Memerlukan DD_API_KEY dan DD_APP_KEY untuk mengakses API monitoring.',
    tools: [
      { name: 'query_metrics', description: 'Mengeksekusi query time-series CPU, RAM, atau latency.' }
    ]
  },
  {
    id: 'deepseek',
    name: 'deepseek',
    category: 'AI & ML',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.deepseek.com/mcp',
    sourceUrl: 'https://deepseek.com',
    description: 'DeepSeek reasoning and code intelligence engine integration.',
    setupNotes: 'Masukkan DEEPSEEK_API_KEY dari platform open platform DeepSeek.',
    tools: [
      { name: 'deepseek_coder', description: 'Menghasilkan analisis arsitektur kode mendalam.' }
    ]
  },
  {
    id: 'discord',
    name: 'discord',
    category: 'Communication',
    transport: 'stdio',
    auth: 'api-key',
    command: 'npx -y @modelcontextprotocol/server-discord',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'Discord bot gateway: channel messaging, thread summarization, and webhook triggers.',
    setupNotes: 'Buat Bot di Discord Developer Portal dan berikan DISCORD_BOT_TOKEN.',
    tools: [
      { name: 'send_channel_message', description: 'Mengirim pesan chat ke channel Discord.' },
      { name: 'read_channel_history', description: 'Membaca riwayat percakapan thread Discord.' }
    ]
  },
  {
    id: 'docker',
    name: 'docker',
    category: 'DevOps & Containers',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-docker',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'Local and remote Docker daemon: container inspection, logs, and image builds.',
    setupNotes: 'Memerlukan Docker Desktop atau Docker Engine lokal yang sedang aktif pada socket /var/run/docker.sock.',
    tools: [
      { name: 'list_containers', description: 'Melihat status kontainer aktif dan port mapping.' },
      { name: 'get_container_logs', description: 'Mengambil log stdout/stderr kontainer.' },
      { name: 'inspect_image', description: 'Melihat layer dan metadata image Docker.' }
    ]
  },
  {
    id: 'dropbox',
    name: 'dropbox',
    category: 'Cloud & Storage',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.dropbox.com/mcp',
    sourceUrl: 'https://dropbox.com/developers',
    description: 'Dropbox cloud storage: document search, file sync, and shared link generation.',
    setupNotes: 'Hubungkan via Dropbox OAuth token dengan scope files.metadata.read & files.content.read.',
    tools: [
      { name: 'search_files', description: 'Pencarian berkas dalam folder Dropbox.' },
      { name: 'get_download_link', description: 'Membuat link download sementara untuk berkas.' }
    ]
  },
  {
    id: 'elasticsearch',
    name: 'elasticsearch',
    category: 'Database',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.elastic.co/mcp',
    sourceUrl: 'https://elastic.co',
    description: 'Elasticsearch indices, query DSL execution, and log aggregation.',
    setupNotes: 'Masukkan ELASTIC_URL dan ELASTIC_API_KEY dari deployment Elasticsearch.',
    tools: [
      { name: 'search_dsl', description: 'Mengeksekusi query JSON DSL pada index Elasticsearch.' }
    ]
  },
  {
    id: 'evernote',
    name: 'evernote',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.evernote.com/mcp',
    sourceUrl: 'https://dev.evernote.com',
    description: 'Evernote notebooks, personal clips, tags, and rich text note search.',
    setupNotes: 'Otentikasi via OAuth Evernote Developer Token.',
    tools: [
      { name: 'search_notes', description: 'Pencarian catatan berdasarkan judul atau kata kunci.' }
    ]
  },
  {
    id: 'figma',
    name: 'figma',
    category: 'Design & Media',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.figma.com/mcp',
    sourceUrl: 'https://github.com/figma/mcp-server',
    description: 'Figma design files, component metadata, canvas nodes, and vector assets.',
    setupNotes: 'Gunakan Figma Personal Access Token dari menu Settings > Security > Personal access tokens.',
    tools: [
      { name: 'get_file_nodes', description: 'Mengambil tree layer dan node desain file Figma.' },
      { name: 'export_component_svg', description: 'Mengekspor komponen UI menjadi format SVG / PNG.' }
    ]
  },
  {
    id: 'filesystem',
    name: 'filesystem',
    category: 'System',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-filesystem ./',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    description: 'Local filesystem read, write, and directory inspection with path validation.',
    setupNotes: 'Server lokal standar MCP untuk manipulasi berkas di dalam working directory saat ini.',
    tools: [
      { name: 'read_file', description: 'Membaca seluruh isi file teks.' },
      { name: 'write_file', description: 'Menulis berkas teks dengan validasi path.' },
      { name: 'list_directory', description: 'Melihat daftar berkas dan direktori.' }
    ]
  },
  {
    id: 'firebase',
    name: 'firebase',
    category: 'Cloud & Database',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.firebase.google.com/mcp',
    sourceUrl: 'https://firebase.google.com',
    description: 'Firebase Firestore collections, Cloud Storage, and Remote Config keys.',
    setupNotes: 'Masukkan Service Account JSON Firebase dari Google Cloud Console.',
    tools: [
      { name: 'query_firestore', description: 'Membaca dokumen koleksi Firestore.' }
    ]
  },
  {
    id: 'github',
    name: 'github',
    category: 'Development',
    transport: 'stdio',
    auth: 'api-key',
    command: 'npx -y @modelcontextprotocol/server-github',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    description: 'GitHub API: repositories, issues, PR reviews, branches, and code search.',
    setupNotes: 'Buat GitHub Personal Access Token (classic atau fine-grained) dengan hak repo, issues, dan pull requests.',
    tools: [
      { name: 'create_issue', description: 'Membuat issue baru di repository GitHub.' },
      { name: 'list_pull_requests', description: 'Melihat status pull request terbuka dan review.' },
      { name: 'get_file_contents', description: 'Membaca isi berkas langsung dari branch repo.' }
    ]
  },
  {
    id: 'gitlab',
    name: 'gitlab',
    category: 'Development',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.gitlab.com/mcp',
    sourceUrl: 'https://docs.gitlab.com/ee/api/',
    description: 'GitLab CI/CD pipelines, merge requests, code repositories, and issues.',
    setupNotes: 'Gunakan GitLab Personal Access Token dengan cakupan api & read_repository.',
    tools: [
      { name: 'list_merge_requests', description: 'Daftar Merge Request aktif pada project GitLab.' },
      { name: 'get_pipeline_status', description: 'Mengecek status build CI/CD pipeline.' }
    ]
  },
  {
    id: 'gmail',
    name: 'gmail',
    category: 'Communication',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.google.com/gmail/mcp',
    sourceUrl: 'https://developers.google.com/gmail/api',
    description: 'Read, compose, search, and label emails safely via Google Workspace.',
    setupNotes: 'Hubungkan via Google OAuth dengan izin https://www.googleapis.com/auth/gmail.readonly.',
    tools: [
      { name: 'search_threads', description: 'Pencarian email berdasarkan query pengirim atau subjek.' },
      { name: 'get_email_body', description: 'Membaca isi pesan email dalam format teks bersih.' }
    ]
  },
  {
    id: 'google-calendar',
    name: 'google-calendar',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.google.com/calendar/mcp',
    sourceUrl: 'https://developers.google.com/calendar',
    description: 'Schedule events, check team availability, and manage calendar agendas.',
    setupNotes: 'Hubungkan via Google Workspace OAuth dengan izin kalender read/write.',
    tools: [
      { name: 'list_events', description: 'Melihat jadwal acara dan meeting untuk rentang tanggal.' },
      { name: 'create_event', description: 'Menjadwalkan agenda baru dengan undangan peserta.' }
    ]
  },
  {
    id: 'google-docs',
    name: 'google-docs',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.google.com/docs/mcp',
    sourceUrl: 'https://developers.google.com/docs',
    description: 'Read, write, and collaborate on Google Docs documents in markdown format.',
    setupNotes: 'Otentikasi OAuth Google Docs dengan hak akses dokumen.',
    tools: [
      { name: 'read_doc', description: 'Membaca struktur dan paragraf dokumen Google Docs.' },
      { name: 'append_text', description: 'Menambahkan teks paragraf ke akhir dokumen.' }
    ]
  },
  {
    id: 'google-drive',
    name: 'google-drive',
    category: 'Cloud & Storage',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.google.com/drive/mcp',
    sourceUrl: 'https://developers.google.com/drive',
    description: 'Google Drive file search, folder hierarchy, and document downloads.',
    setupNotes: 'Otentikasi Google OAuth dengan scope drive.readonly atau drive.file.',
    tools: [
      { name: 'search_files', description: 'Pencarian berkas berdasarkan nama atau ekstensi.' },
      { name: 'download_file', description: 'Mengambil konten teks atau link unduhan berkas.' }
    ]
  },
  {
    id: 'google-maps',
    name: 'google-maps',
    category: 'Location & Maps',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.google.com/maps/mcp',
    sourceUrl: 'https://developers.google.com/maps',
    description: 'Geocoding, place details, route directions, and distance matrix.',
    setupNotes: 'Masukkan Google Cloud Maps Platform API Key dengan layanan Geocoding aktif.',
    tools: [
      { name: 'geocode_address', description: 'Mengubah alamat teks menjadi koordinat lat/lng.' },
      { name: 'calculate_route', description: 'Menghitung rute, jarak, dan durasi estimasi berkendara.' }
    ]
  },
  {
    id: 'google-sheets',
    name: 'google-sheets',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.google.com/sheets/mcp',
    sourceUrl: 'https://developers.google.com/sheets',
    description: 'Query, append rows, and format Google Sheets spreadsheets.',
    setupNotes: 'Hubungkan via Google Sheets OAuth dengan scope spreadsheets.read & write.',
    tools: [
      { name: 'read_range', description: 'Membaca sel tabel pada rentang sheet A1:D20.' },
      { name: 'append_row', description: 'Menambahkan baris data baru ke tabel spreadsheet.' }
    ]
  },
  {
    id: 'grafana',
    name: 'grafana',
    category: 'Monitoring',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.grafana.com/mcp',
    sourceUrl: 'https://grafana.com',
    description: 'Grafana dashboards, Prometheus metrics queries, and alert rules.',
    setupNotes: 'Gunakan Grafana Service Account Token dari menu Administration > Users.',
    tools: [
      { name: 'query_prometheus', description: 'Mengeksekusi query PromQL melalui data source Grafana.' }
    ]
  },
  {
    id: 'hubspot',
    name: 'hubspot',
    category: 'CRM & Sales',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.hubspot.com/mcp',
    sourceUrl: 'https://developers.hubspot.com',
    description: 'HubSpot CRM contacts, deals, company pipelines, and engagement logs.',
    setupNotes: 'Hubungkan via HubSpot Private App Access Token dengan cakupan crm.objects.',
    tools: [
      { name: 'search_contacts', description: 'Pencarian kontak berdasarkan email atau nama.' },
      { name: 'list_deals', description: 'Melihat status deal pipeline penjualan.' }
    ]
  },
  {
    id: 'huggingface',
    name: 'huggingface',
    category: 'AI & ML',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.huggingface.co/mcp',
    sourceUrl: 'https://huggingface.co',
    description: 'Hugging Face Hub: model discovery, inference endpoints, and dataset inspection.',
    setupNotes: 'Masukkan HUGGINGFACE_TOKEN (User Access Token dengan role read).',
    tools: [
      { name: 'search_models', description: 'Pencarian model AI open-source berdasarkan task.' },
      { name: 'run_inference', description: 'Memanggil model via Hugging Face Serverless Inference API.' }
    ]
  },
  {
    id: 'jira',
    name: 'jira',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.atlassian.com/jira/mcp',
    sourceUrl: 'https://developer.atlassian.com/cloud/jira/platform',
    description: 'Jira Software project management, agile boards, issues, and sprint reports.',
    setupNotes: 'Memerlukan Atlassian Cloud email dan API token dengan izin Jira Software.',
    tools: [
      { name: 'search_jql', description: 'Mengeksekusi JQL (Jira Query Language) untuk filter issue.' },
      { name: 'create_issue', description: 'Membuat tiket bug atau task di project Jira.' }
    ]
  },
  {
    id: 'linear',
    name: 'linear',
    category: 'Development',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.linear.app/mcp',
    sourceUrl: 'https://linear.app/docs/mcp',
    description: 'Linear issue tracking, project cycles, roadmap milestones, and team backlog.',
    setupNotes: 'Buat Personal API Key di Linear pada menu Settings > Security & Access > Personal API keys.',
    tools: [
      { name: 'list_issues', description: 'Melihat daftar issue aktif berdasarkan filter team dan cycle.' },
      { name: 'create_issue', description: 'Membuat issue baru dengan label, prioritas, dan estimasi.' }
    ]
  },
  {
    id: 'linkedin',
    name: 'linkedin',
    category: 'Social & Marketing',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.linkedin.com/mcp',
    sourceUrl: 'https://developer.linkedin.com',
    description: 'LinkedIn profile data, organization page analytics, and post publishing.',
    setupNotes: 'Hubungkan via LinkedIn Developer App dengan scope r_liteprofile & w_member_social.',
    tools: [
      { name: 'publish_post', description: 'Menerbitkan artikel update ke profil LinkedIn.' }
    ]
  },
  {
    id: 'mailchimp',
    name: 'mailchimp',
    category: 'Marketing',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.mailchimp.com/mcp',
    sourceUrl: 'https://mailchimp.com/developer',
    description: 'Email marketing campaigns, audience lists, and subscriber metrics.',
    setupNotes: 'Masukkan Mailchimp API Key beserta prefix server dc (contoh: us19).',
    tools: [
      { name: 'get_campaign_stats', description: 'Melihat open rate dan click rate campaign email.' }
    ]
  },
  {
    id: 'mapbox',
    name: 'mapbox',
    category: 'Location & Maps',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.mapbox.com/mcp',
    sourceUrl: 'https://docs.mapbox.com',
    description: 'Mapbox custom vector maps, geocoding, and spatial navigation routes.',
    setupNotes: 'Gunakan Mapbox Secret Access Token dari dashboard akun Mapbox.',
    tools: [
      { name: 'forward_geocode', description: 'Mencari koordinat lokasi dari teks nama jalan.' }
    ]
  },
  {
    id: 'memory',
    name: 'memory',
    category: 'AI & Memory',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-memory',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    description: 'Persistent graph memory for storing agent knowledge entities and relations.',
    setupNotes: 'Menyimpan entity dan relation secara persisten dalam SQLite lokal.',
    tools: [
      { name: 'create_entities', description: 'Menyimpan entitas memori baru ke dalam graf pengetahuan.' },
      { name: 'search_nodes', description: 'Mencari relasi dan relasi entitas memori tersimpan.' }
    ]
  },
  {
    id: 'miro',
    name: 'miro',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.miro.com/mcp',
    sourceUrl: 'https://developers.miro.com',
    description: 'Miro visual collaboration boards, sticky notes, diagrams, and widgets.',
    setupNotes: 'Otentikasi Miro OAuth dengan izin boards:read & boards:write.',
    tools: [
      { name: 'get_board_items', description: 'Membaca sticky notes dan shape dalam board Miro.' }
    ]
  },
  {
    id: 'mixpanel',
    name: 'mixpanel',
    category: 'Analytics',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.mixpanel.com/mcp',
    sourceUrl: 'https://developer.mixpanel.com',
    description: 'Mixpanel event tracking, retention cohorts, and user journey analytics.',
    setupNotes: 'Gunakan Mixpanel Project Secret dan Service Account credentials.',
    tools: [
      { name: 'query_insights', description: 'Menganalisis frekuensi event dan segmentasi pengguna.' }
    ]
  },
  {
    id: 'monday',
    name: 'monday',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.monday.com/mcp',
    sourceUrl: 'https://developer.monday.com',
    description: 'Monday.com work management boards, status columns, and team workflows.',
    setupNotes: 'Masukkan Monday.com Personal API Token dari menu Developers.',
    tools: [
      { name: 'list_board_items', description: 'Melihat item dan kolom status pada board Monday.' }
    ]
  },
  {
    id: 'mongodb',
    name: 'mongodb',
    category: 'Database',
    transport: 'stdio',
    auth: 'api-key',
    command: 'npx -y @modelcontextprotocol/server-mongodb mongodb://localhost:27017',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'MongoDB document collections, aggregation pipelines, and schema exploration.',
    setupNotes: 'Sediakan MongoDB connection URI (contoh: mongodb+srv://user:pass@cluster.mongodb.net/test).',
    tools: [
      { name: 'find_documents', description: 'Mengeksekusi query find() dengan filter JSON.' },
      { name: 'list_collections', description: 'Melihat daftar koleksi database MongoDB.' }
    ]
  },
  {
    id: 'mysql',
    name: 'mysql',
    category: 'Database',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-mysql mysql://root@localhost/orion',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'MySQL relational database schema inspection, tables, and read queries.',
    setupNotes: 'Sediakan kredensial koneksi host, port, user, dan nama database MySQL.',
    tools: [
      { name: 'query_mysql', description: 'Mengeksekusi SQL SELECT query secara aman.' },
      { name: 'describe_table', description: 'Melihat struktur kolom tabel MySQL.' }
    ]
  },
  {
    id: 'notion',
    name: 'notion',
    category: 'Productivity',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.notion.so/mcp',
    sourceUrl: 'https://developers.notion.com',
    description: 'Notion databases, nested document pages, and knowledge base workspace.',
    setupNotes: 'Buat Notion Internal Integration Token di notion.so/my-integrations dan bagikan database ke integrasi.',
    tools: [
      { name: 'query_database', description: 'Membaca baris tabel database Notion dengan filter.' },
      { name: 'get_page_content', description: 'Mengambil blok teks dan dokumen dari halaman Notion.' }
    ]
  },
  {
    id: 'obsidian',
    name: 'obsidian',
    category: 'Knowledge Base',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-obsidian ~/Documents/Vault',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'Local Obsidian markdown vault: bi-directional wikilinks and canvas graphs.',
    setupNotes: 'Tentukan jalur direktori folder Vault Obsidian lokal Anda.',
    tools: [
      { name: 'read_note', description: 'Membaca catatan markdown beserta metadata frontmatter.' },
      { name: 'search_vault', description: 'Pencarian semantik dan teks lengkap pada seluruh vault.' }
    ]
  },
  {
    id: 'openai',
    name: 'openai',
    category: 'AI & ML',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.openai.com/mcp',
    sourceUrl: 'https://platform.openai.com',
    description: 'OpenAI API: Assistants, file search vector stores, and fine-tuning jobs.',
    setupNotes: 'Gunakan OPENAI_API_KEY dari dashboard platform.openai.com.',
    tools: [
      { name: 'list_assistants', description: 'Melihat daftar asisten custom OpenAI.' }
    ]
  },
  {
    id: 'pagerduty',
    name: 'pagerduty',
    category: 'DevOps & Alerts',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.pagerduty.com/mcp',
    sourceUrl: 'https://developer.pagerduty.com',
    description: 'PagerDuty incident management, on-call schedules, and service alerts.',
    setupNotes: 'Gunakan PagerDuty REST API Key dengan role Admin atau Read-Only.',
    tools: [
      { name: 'list_incidents', description: 'Melihat insiden sistem aktif yang memerlukan eskalasi.' }
    ]
  },
  {
    id: 'perplexity',
    name: 'perplexity',
    category: 'Search & Discovery',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.perplexity.ai/mcp',
    sourceUrl: 'https://docs.perplexity.ai',
    description: 'Perplexity Sonar search: grounded citations, answer synthesis, and domain queries.',
    setupNotes: 'Masukkan PERPLEXITY_API_KEY untuk memanggil model sonar-pro.',
    tools: [
      { name: 'perplexity_search', description: 'Pencarian web terverifikasi dengan rujukan sitasi ilmiah.' }
    ]
  },
  {
    id: 'pinecone',
    name: 'pinecone',
    category: 'Vector Database',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.pinecone.io/mcp',
    sourceUrl: 'https://pinecone.io',
    description: 'Pinecone serverless vector index management, upserts, and cosine similarity query.',
    setupNotes: 'Masukkan PINECONE_API_KEY dari dashboard Pinecone Console.',
    tools: [
      { name: 'query_vectors', description: 'Mencari k-nearest neighbors embedding vektor.' }
    ]
  },
  {
    id: 'postman',
    name: 'postman',
    category: 'Development',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.postman.com/mcp',
    sourceUrl: 'https://learning.postman.com/docs/developer/postman-api/intro-api/',
    description: 'Postman API collections, environments, and automated test runners.',
    setupNotes: 'Gunakan Postman API Key untuk sinkronisasi collection pengujian.',
    tools: [
      { name: 'list_collections', description: 'Daftar API collection yang disimpan di workspace.' }
    ]
  },
  {
    id: 'postgres',
    name: 'postgres',
    category: 'Database',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    description: 'PostgreSQL relational query execution, schema reflection, and index analysis.',
    setupNotes: 'Sediakan PostgreSQL connection string (contoh: postgresql://user:pass@localhost:5432/mydb).',
    tools: [
      { name: 'query_database', description: 'Mengeksekusi SQL SELECT query secara aman.' },
      { name: 'list_tables', description: 'Melihat seluruh skema tabel pada database.' }
    ]
  },
  {
    id: 'puppeteer',
    name: 'puppeteer',
    category: 'Automation & Browser',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-puppeteer',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    description: 'Headless Chrome browser automation: navigation, screenshots, and DOM clicks.',
    setupNotes: 'Otomatisasi browser headless berbasis Puppeteer tanpa konfigurasi rumit.',
    tools: [
      { name: 'navigate_page', description: 'Membuka URL pada browser headless.' },
      { name: 'take_screenshot', description: 'Mengambil screenshot visual halaman web.' },
      { name: 'click_element', description: 'Mengklik elemen UI berdasarkan selector CSS.' }
    ]
  },
  {
    id: 'qdrant',
    name: 'qdrant',
    category: 'Vector Database',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.qdrant.tech/mcp',
    sourceUrl: 'https://qdrant.tech',
    description: 'Qdrant vector database: payload filtering, nearest neighbors, and collection schemas.',
    setupNotes: 'Masukkan QDRANT_URL dan QDRANT_API_KEY.',
    tools: [
      { name: 'search_points', description: 'Pencarian semantik pada koleksi Qdrant.' }
    ]
  },
  {
    id: 'railway',
    name: 'railway',
    category: 'Cloud & Infrastructure',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.railway.app/mcp',
    sourceUrl: 'https://railway.app',
    description: 'Railway cloud infrastructure: project services, deployment logs, and variables.',
    setupNotes: 'Gunakan Railway API Token dari pengaturan profil.',
    tools: [
      { name: 'get_deployments', description: 'Melihat status deploy service pada Railway.' }
    ]
  },
  {
    id: 'redis',
    name: 'redis',
    category: 'Database',
    transport: 'stdio',
    auth: 'none',
    command: 'npx -y @modelcontextprotocol/server-redis redis://localhost:6379',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/redis',
    description: 'Redis in-memory cache: key inspection, TTL expiration, and hash commands.',
    setupNotes: 'Hubungkan ke redis://localhost:6379 atau cloud Redis instance.',
    tools: [
      { name: 'get_key', description: 'Mengambil nilai key dari database Redis.' },
      { name: 'scan_keys', description: 'Mencari pola key cache aktif.' }
    ]
  },
  {
    id: 'salesforce',
    name: 'salesforce',
    category: 'CRM & Sales',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.salesforce.com/mcp',
    sourceUrl: 'https://developer.salesforce.com',
    description: 'Salesforce CRM: leads, accounts, opportunities, and SOQL query execution.',
    setupNotes: 'Otentikasi melalui Salesforce Connected App OAuth 2.0.',
    tools: [
      { name: 'execute_soql', description: 'Mengeksekusi query SOQL terhadap objek Salesforce.' }
    ]
  },
  {
    id: 'sendgrid',
    name: 'sendgrid',
    category: 'Communication',
    transport: 'http',
    auth: 'api-key',
    endpoint: 'https://mcp.sendgrid.com/mcp',
    sourceUrl: 'https://sendgrid.com',
    description: 'SendGrid transactional email sending, deliverability stats, and templates.',
    setupNotes: 'Masukkan SENDGRID_API_KEY dengan permission Mail Send.',
    tools: [
      { name: 'send_mail', description: 'Mengirim email transaksional dengan template dinamis.' }
    ]
  },
  {
    id: 'sentry',
    name: 'sentry',
    category: 'Monitoring',
    transport: 'stdio',
    auth: 'api-key',
    command: 'uvx mcp-server-sentry',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers',
    description: 'Sentry error tracking: issue stack traces, crash reports, and breadcrumbs.',
    setupNotes: 'Dapatkan Sentry Auth Token dari Settings > Developer Settings > Internal Integrations.',
    tools: [
      { name: 'list_issues', description: 'Melihat daftar isu error terbaru di project Sentry.' },
      { name: 'get_issue_stacktrace', description: 'Mengambil detail stack trace crash exception.' }
    ]
  },
  {
    id: 'slack',
    name: 'slack',
    category: 'Communication',
    transport: 'stdio',
    auth: 'oauth',
    command: 'npx -y @modelcontextprotocol/server-slack',
    sourceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    description: 'Slack channels, direct messages, thread replies, and bot announcements.',
    setupNotes: 'Buat Slack App dan pasang Bot User OAuth Token (xoxb-...) dengan hak channels:read, chat:write.',
    tools: [
      { name: 'send_message', description: 'Mengirim pesan teks ke channel Slack.' },
      { name: 'list_channels', description: 'Melihat daftar channel Slack publik dan privat.' }
    ]
  },
  {
    id: 'snowflake',
    name: 'snowflake',
    category: 'Database',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.snowflake.com/mcp',
    sourceUrl: 'https://snowflake.com',
    description: 'Snowflake cloud data warehouse: warehouse compute, staging, and SQL queries.',
    setupNotes: 'Gunakan Snowflake OAuth atau kredensial Key-Pair authentication.',
    tools: [
      { name: 'query_warehouse', description: 'Mengeksekusi SQL analitik pada cluster Snowflake.' }
    ]
  },
  {
    id: 'spotify',
    name: 'spotify',
    category: 'Media',
    transport: 'http',
    auth: 'oauth',
    endpoint: 'https://mcp.spotify.com/mcp',
    sourceUrl: 'https://developer.spotify.com',
    description: 'Spotify audio playback controls, playlist curation, and music metadata.',
    setupNotes: 'Hubungkan via Spotify Developer App dengan scope user-modify-playback-state.',
    tools: [
      { name: 'search_tracks', description: 'Pencarian lagu atau artis di katalog Spotify.' }
    ]
  }
];
