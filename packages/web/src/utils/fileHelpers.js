/**
 * File & Image Processing Utilities for Orion AI
 */

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function getFileCategory(filename, mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image';

  const ext = getFileExtension(filename);
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'html', 'css', 'scss', 'json', 'yaml', 'yml', 'xml', 'sql', 'sh', 'bash', 'zsh', 'rs', 'go', 'php', 'rb', 'lua'];
  if (codeExts.includes(ext)) return 'code';

  const dataExts = ['csv', 'tsv', 'xlsx', 'xls', 'parquet'];
  if (dataExts.includes(ext)) return 'spreadsheet';

  const docExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'log'];
  if (docExts.includes(ext) || mimeType.startsWith('text/')) return 'document';

  return 'file';
}

/**
 * Resize and compress image to keep payload fast and avoid localStorage overflow
 */
export async function optimizeImage(file, maxDimension = 1600, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Process any uploaded file (images, documents, code files)
 */
export async function processFile(file) {
  const isImage = file.type.startsWith('image/');
  const category = getFileCategory(file.name, file.type);
  const ext = getFileExtension(file.name);

  if (isImage) {
    const optimizedDataUrl = await optimizeImage(file);
    return {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      type: 'image',
      category: 'image',
      size: file.size,
      mimeType: file.type || 'image/jpeg',
      data: optimizedDataUrl,
      ext,
    };
  }

  // Handle text-based files
  const isTextLike = category === 'code' || category === 'spreadsheet' || category === 'document' || file.type.startsWith('text/');

  if (isTextLike && file.size < 4 * 1024 * 1024) {
    const content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });

    return {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      type: 'file',
      category,
      size: file.size,
      mimeType: file.type || 'text/plain',
      content: content || null,
      ext,
    };
  }

  // Fallback for other files
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: file.name,
    type: 'file',
    category,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    content: null,
    ext,
  };
}
