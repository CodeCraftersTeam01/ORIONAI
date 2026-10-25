/**
 * In-memory Mock Data Store
 * Ganti bagian ini dengan Database pilihan Anda (Prisma, MongoDB/Mongoose, PostgreSQL, SQLite, dll.)
 */
let items = [
  {
    id: 1,
    title: 'Setup Project Boilerplate',
    description: 'Konfigurasi Express.js backend dan React Vite frontend',
    status: 'completed',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Connect Frontend & Backend',
    description: 'Tes koneksi API lewat proxy Vite atau direct CORS fetch',
    status: 'in-progress',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Custom Feature Development',
    description: 'Mulai coding fitur utama aplikasi Anda!',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

// @desc    Get all items
// @route   GET /api/items
export const getItems = (req, res) => {
  res.json({
    success: true,
    count: items.length,
    data: items
  });
};

// @desc    Get single item by ID
// @route   GET /api/items/:id
export const getItemById = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find((i) => i.id === id);

  if (!item) {
    res.status(404);
    return next(new Error(`Item dengan ID ${id} tidak ditemukan`));
  }

  res.json({
    success: true,
    data: item
  });
};

// @desc    Create new item
// @route   POST /api/items
export const createItem = (req, res, next) => {
  const { title, description, status } = req.body;

  if (!title || title.trim() === '') {
    res.status(400);
    return next(new Error('Title wajib diisi'));
  }

  const newItem = {
    id: items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1,
    title: title.trim(),
    description: description ? description.trim() : '',
    status: status || 'pending',
    createdAt: new Date().toISOString()
  };

  items.unshift(newItem);

  res.status(201).json({
    success: true,
    message: 'Item berhasil ditambahkan',
    data: newItem
  });
};

// @desc    Update existing item
// @route   PUT /api/items/:id
export const updateItem = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    res.status(404);
    return next(new Error(`Item dengan ID ${id} tidak ditemukan`));
  }

  const { title, description, status } = req.body;

  items[index] = {
    ...items[index],
    ...(title !== undefined && { title: title.trim() }),
    ...(description !== undefined && { description: description.trim() }),
    ...(status !== undefined && { status }),
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Item berhasil diperbarui',
    data: items[index]
  });
};

// @desc    Delete item
// @route   DELETE /api/items/:id
export const deleteItem = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const initialLength = items.length;
  items = items.filter((i) => i.id !== id);

  if (items.length === initialLength) {
    res.status(404);
    return next(new Error(`Item dengan ID ${id} tidak ditemukan`));
  }

  res.json({
    success: true,
    message: `Item ID ${id} berhasil dihapus`
  });
};
