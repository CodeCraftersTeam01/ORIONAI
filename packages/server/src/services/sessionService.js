import fs from 'fs';
import path from 'path';
import os from 'os';

const orionConfigDir = path.join(os.homedir(), '.orion');
const sessionsFile = path.join(orionConfigDir, 'sessions.json');

function ensureConfigDir() {
  if (!fs.existsSync(orionConfigDir)) {
    fs.mkdirSync(orionConfigDir, { recursive: true });
  }
}

/**
 * Format relative time (e.g. "Baru saja", "5 menit lalu", "2 jam lalu", "Kemarin")
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 172800) return 'Kemarin';
  return `${Math.floor(diffSec / 86400)} hari lalu`;
}

/**
 * Clean & truncate a title from a prompt
 */
function createTitleFromText(text, maxLen = 30) {
  if (!text) return 'Percakapan Baru';
  const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '...';
}

/**
 * Safely read sessions file
 */
function readSessionsRaw() {
  ensureConfigDir();
  if (!fs.existsSync(sessionsFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(sessionsFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error parsing sessions.json:', err.message);
    return null;
  }
}

/**
 * Safely write sessions file atomically
 */
function writeSessionsRaw(data) {
  ensureConfigDir();
  const payload = {
    activeSessionId: data.activeSessionId || null,
    updatedAt: Date.now(),
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  };

  const tempFile = `${sessionsFile}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tempFile, sessionsFile);
  } catch (err) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
    // Fallback direct write
    fs.writeFileSync(sessionsFile, JSON.stringify(payload, null, 2), 'utf8');
  }
}

/**
 * Generate a new default session object
 */
export function createDefaultSession(title = 'Percakapan Perdana') {
  const now = new Date().toISOString();
  return {
    id: `session-${Date.now()}`,
    title,
    createdAt: now,
    updatedAt: now,
    projectPath: null,
    projectName: null,
    messages: [],
  };
}

/**
 * Get all sessions and current active session ID
 */
export function getAllSessions() {
  const data = readSessionsRaw();
  if (!data || !Array.isArray(data.sessions) || data.sessions.length === 0) {
    const defaultSession = createDefaultSession();
    const initialData = {
      activeSessionId: defaultSession.id,
      updatedAt: Date.now(),
      sessions: [defaultSession],
    };
    writeSessionsRaw(initialData);
    return initialData;
  }

  // Ensure activeSessionId is valid
  let activeId = data.activeSessionId;
  const exists = data.sessions.some((s) => s.id === activeId);
  if (!exists) {
    activeId = data.sessions[0].id;
  }

  return {
    activeSessionId: activeId,
    updatedAt: data.updatedAt || Date.now(),
    sessions: data.sessions,
  };
}

/**
 * Get a specific session by ID
 */
export function getSessionById(sessionId) {
  const { sessions } = getAllSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}

/**
 * Get active session
 */
export function getActiveSession() {
  const { activeSessionId, sessions } = getAllSessions();
  const session = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  return session || null;
}

/**
 * Set active session ID
 */
export function setActiveSessionId(sessionId) {
  const data = getAllSessions();
  const exists = data.sessions.some((s) => s.id === sessionId);
  if (!exists) return false;

  data.activeSessionId = sessionId;
  data.updatedAt = Date.now();
  writeSessionsRaw(data);
  return true;
}

/**
 * Create a new session
 */
export function createSession({ title = 'Percakapan Baru', projectPath = null, projectName = null, id = null } = {}) {
  const data = getAllSessions();
  const now = new Date().toISOString();
  const newSession = {
    id: id || `session-${Date.now()}`,
    title,
    createdAt: now,
    updatedAt: now,
    projectPath,
    projectName,
    messages: [],
  };

  data.sessions = [newSession, ...data.sessions];
  data.activeSessionId = newSession.id;
  data.updatedAt = Date.now();
  writeSessionsRaw(data);
  return newSession;
}

/**
 * Delete a session by ID
 */
export function deleteSession(sessionId) {
  const data = getAllSessions();
  const remaining = data.sessions.filter((s) => s.id !== sessionId);

  if (remaining.length === 0) {
    const fresh = createDefaultSession();
    writeSessionsRaw({
      activeSessionId: fresh.id,
      updatedAt: Date.now(),
      sessions: [fresh],
    });
    return { success: true, activeSessionId: fresh.id };
  }

  let nextActiveId = data.activeSessionId;
  if (data.activeSessionId === sessionId) {
    nextActiveId = remaining[0].id;
  }

  writeSessionsRaw({
    activeSessionId: nextActiveId,
    updatedAt: Date.now(),
    sessions: remaining,
  });

  return { success: true, activeSessionId: nextActiveId };
}

/**
 * Append a message to a session (User or Assistant)
 * Automatically derives session title on first user message if default
 */
export function appendMessageToSession(sessionId, message) {
  const data = getAllSessions();
  let session = data.sessions.find((s) => s.id === sessionId);

  if (!session) {
    // If session doesn't exist, create it
    session = createSession({ id: sessionId });
    data.sessions = [session, ...data.sessions.filter((s) => s.id !== sessionId)];
  }

  const now = new Date().toISOString();
  const msgObj = {
    id: message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: message.role || 'user',
    content: message.content || '',
    timestamp: message.timestamp || now,
    ...(message.model ? { model: message.model } : {}),
    ...(message.toolCalls ? { toolCalls: message.toolCalls } : {}),
    ...(message.attachments ? { attachments: message.attachments } : {}),
  };

  // Auto-set title from first user message if title is generic
  const isGenericTitle =
    !session.title ||
    session.title === 'Percakapan Baru' ||
    session.title === 'Percakapan Perdana' ||
    session.title === 'Sesi Terminal';

  if (isGenericTitle && message.role === 'user' && message.content) {
    session.title = createTitleFromText(message.content);
  }

  session.messages = session.messages || [];
  session.messages.push(msgObj);
  session.updatedAt = now;

  // Move active/updated session to front of the list
  const otherSessions = data.sessions.filter((s) => s.id !== session.id);
  data.sessions = [session, ...otherSessions];
  data.activeSessionId = session.id;
  data.updatedAt = Date.now();

  writeSessionsRaw(data);
  return { session, message: msgObj };
}

/**
 * Clear all messages in a session
 */
export function clearSessionMessages(sessionId) {
  const data = getAllSessions();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return false;

  session.messages = [];
  session.updatedAt = new Date().toISOString();
  data.updatedAt = Date.now();
  writeSessionsRaw(data);
  return true;
}

/**
 * Rename session title
 */
export function renameSession(sessionId, newTitle) {
  const data = getAllSessions();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return false;

  session.title = newTitle.trim();
  session.updatedAt = new Date().toISOString();
  data.updatedAt = Date.now();
  writeSessionsRaw(data);
  return true;
}

/**
 * Full sync / save from client (View)
 * Merges cleanly with any server-side additions
 */
export function syncAllSessions({ sessions = [], activeSessionId = null }) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return getAllSessions();
  }

  const existing = getAllSessions();
  const existingMap = new Map((existing.sessions || []).map((s) => [s.id, s]));

  const merged = sessions.map((incoming) => {
    const prev = existingMap.get(incoming.id);
    if (!prev) return incoming;

    // If incoming has fewer messages than on disk (e.g. CLI added messages in the meantime),
    // retain the longer/newer message chain!
    const incomingMsgs = incoming.messages || [];
    const prevMsgs = prev.messages || [];
    if (prevMsgs.length > incomingMsgs.length) {
      return {
        ...incoming,
        messages: prevMsgs,
        updatedAt: prev.updatedAt || incoming.updatedAt,
      };
    }
    return incoming;
  });

  // Preserve any sessions that exist on disk but were not passed by client
  existing.sessions.forEach((s) => {
    if (!merged.some((m) => m.id === s.id)) {
      merged.push(s);
    }
  });

  const finalActiveId = activeSessionId || existing.activeSessionId || merged[0]?.id;

  const payload = {
    activeSessionId: finalActiveId,
    updatedAt: Date.now(),
    sessions: merged,
  };

  writeSessionsRaw(payload);
  return payload;
}
