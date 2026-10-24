const router = require('express').Router();
const pool = require('../db');
const { wrap, validId } = require('../helpers');

// GET /tags
router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tags ORDER BY id');
  res.json({ message: 'Data tag berhasil diambil', data: rows });
}));

// GET /tags/:id
router.get('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tags WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Tag tidak ditemukan' });
  res.json({ message: 'Data tag berhasil diambil', data: rows[0] });
}));

// POST /tags
router.post('/', wrap(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Field name wajib diisi' });
  const { rows } = await pool.query('INSERT INTO tags (name) VALUES ($1) RETURNING *', [name]);
  res.status(201).json({ message: 'Tag berhasil ditambahkan', data: rows[0] });
}));

// PUT /tags/:id
router.put('/:id', validId, wrap(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Field name wajib diisi' });
  const { rows } = await pool.query('UPDATE tags SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Tag tidak ditemukan' });
  res.json({ message: 'Tag berhasil diubah', data: rows[0] });
}));

// DELETE /tags/:id
router.delete('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Tag tidak ditemukan' });
  res.json({ message: 'Tag berhasil dihapus' });
}));

module.exports = router;
