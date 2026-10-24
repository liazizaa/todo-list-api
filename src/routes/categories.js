const router = require('express').Router();
const pool = require('../db');
const { wrap, validId, isPosInt } = require('../helpers');

// GET /categories?user_id=1
router.get('/', wrap(async (req, res) => {
  const { user_id } = req.query;
  if (user_id !== undefined && !isPosInt(user_id)) return res.status(400).json({ error: 'user_id harus berupa angka positif' });
  const { rows } = user_id
    ? await pool.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY id', [user_id])
    : await pool.query('SELECT * FROM categories ORDER BY id');
  res.json({ message: 'Data kategori berhasil diambil', data: rows });
}));

// GET /categories/:id
router.get('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json({ message: 'Data kategori berhasil diambil', data: rows[0] });
}));

// POST /categories
router.post('/', wrap(async (req, res) => {
  const { user_id, name } = req.body;
  if (!isPosInt(user_id)) return res.status(400).json({ error: 'Field user_id wajib diisi (angka)' });
  if (!name) return res.status(400).json({ error: 'Field name wajib diisi' });
  const { rows } = await pool.query('INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *', [user_id, name]);
  res.status(201).json({ message: 'Kategori berhasil ditambahkan', data: rows[0] });
}));

// PUT /categories/:id
router.put('/:id', validId, wrap(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Field name wajib diisi' });
  const { rows } = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil diubah', data: rows[0] });
}));

// DELETE /categories/:id  (task terkait tidak ikut terhapus, category_id menjadi NULL)
router.delete('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil dihapus' });
}));

module.exports = router;
