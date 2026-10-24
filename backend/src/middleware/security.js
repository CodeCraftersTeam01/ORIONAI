import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Chat Endpoints
 * Prevents automated scraping, token exhaustion, and DDoS attacks.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 45, // Max 45 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan ke Orion AI. Mohon tunggu beberapa detik sebelum mengirim lagi.',
  },
});

/**
 * Input Validation & Sanitization Middleware
 */
export const validateChatInput = (req, res, next) => {
  const { message, history, attachments } = req.body;

  // 1. Validate 'attachments' if present
  let validAttachments = [];
  if (attachments !== undefined) {
    if (!Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'Format lampiran tidak valid. Harus berupa array.',
      });
    }

    if (attachments.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal 10 lampiran sekaligus per pesan.',
      });
    }

    for (const att of attachments) {
      if (!att || typeof att !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Format lampiran file tidak valid.',
        });
      }

      const name = typeof att.name === 'string' ? att.name.slice(0, 255) : 'file';
      const type = att.type === 'image' ? 'image' : 'file';
      const size = typeof att.size === 'number' ? att.size : 0;

      // Validate image data URL or file text content
      if (type === 'image') {
        if (!att.data || typeof att.data !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Data gambar untuk "${name}" tidak valid.`,
          });
        }
        // Limit individual base64 data to ~18MB
        if (att.data.length > 25 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: `Ukuran gambar "${name}" melebihi batas 18MB.`,
          });
        }
      } else {
        // File content validation
        if (att.content && typeof att.content === 'string') {
          if (att.content.length > 500000) {
            att.content = att.content.slice(0, 500000); // cap text file content
          }
        }
      }

      validAttachments.push({
        id: att.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        type,
        size,
        mimeType: typeof att.mimeType === 'string' ? att.mimeType.slice(0, 100) : '',
        data: att.data || null,
        content: att.content || null,
      });
    }
  }

  // 2. Validate 'message'
  const hasAttachments = validAttachments.length > 0;
  let trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage && !hasAttachments) {
    return res.status(400).json({
      success: false,
      message: 'Pesan atau lampiran tidak boleh kosong.',
    });
  }

  if (!trimmedMessage && hasAttachments) {
    trimmedMessage = 'Tolong analisis dan jelaskan lampiran berikut.';
  }

  // Max payload character limit for message text
  if (trimmedMessage.length > 8000) {
    return res.status(400).json({
      success: false,
      message: 'Panjang teks pesan melebihi batas maksimum 8.000 karakter.',
    });
  }

  // 3. Validate 'history' array if provided
  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        message: 'Format history tidak valid. Harus berupa array pesan.',
      });
    }

    if (history.length > 20) {
      req.body.history = history.slice(-20);
    }

    for (const item of req.body.history) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Format elemen riwayat pesan tidak valid.',
        });
      }

      if (!['user', 'assistant'].includes(item.role)) {
        return res.status(400).json({
          success: false,
          message: 'Role pada riwayat obrolan tidak valid.',
        });
      }

      if (typeof item.content !== 'string') {
        item.content = typeof item.content === 'object' ? JSON.stringify(item.content) : String(item.content || '');
      }

      if (item.content.length > 8000) {
        item.content = item.content.slice(0, 8000);
      }
    }
  }

  // 4. Validate 'model' & 'reasoningTier' selection
  const ALLOWED_MODELS = ['orion', 'agnes', 'nemotron-3', 'orion-low', 'orion-mid', 'orion-high'];
  if (typeof req.body.model === 'string' && ALLOWED_MODELS.includes(req.body.model)) {
    // Normalise backwards compatibility
    if (req.body.model === 'orion-low') {
      req.body.model = 'orion';
      req.body.reasoningTier = 'low';
    } else if (req.body.model === 'orion-high') {
      req.body.model = 'orion';
      req.body.reasoningTier = 'high';
    } else if (req.body.model === 'orion-mid') {
      req.body.model = 'orion';
      req.body.reasoningTier = 'medium';
    }
  } else {
    req.body.model = 'orion';
  }

  const ALLOWED_REASONING = ['low', 'medium', 'high'];
  if (typeof req.body.reasoningTier === 'string' && ALLOWED_REASONING.includes(req.body.reasoningTier)) {
    req.body.reasoningTier = req.body.reasoningTier;
  } else {
    req.body.reasoningTier = 'medium';
  }

  req.body.message = trimmedMessage;
  req.body.attachments = validAttachments;
  next();
};
