const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { wrap, validId } = require('../helpers');

const COLS = 'id, username, email, created_at'; // password tidak pernah dikirim ke client

// GET /users
router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM users ORDER BY id`);
  res.json({ message: 'Data user berhasil diambil', data: rows });
}));

// GET /users/:id
router.get('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM users WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ message: 'Data user berhasil diambil', data: rows[0] });
}));

// POST /users
router.post('/', wrap(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Field username wajib diisi' });
  if (!email) return res.status(400).json({ error: 'Field email wajib diisi' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Field password wajib diisi (minimal 6 karakter)' });
  const hash = await bcrypt.hash(String(password), 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING ${COLS}`,
    [username, email, hash]
  );
  res.status(201).json({ message: 'User berhasil ditambahkan', data: rows[0] });
}));

// PUT /users/:id
router.put('/:id', validId, wrap(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Field username dan email wajib diisi' });
  const params = [username, email];
  let sql = 'UPDATE users SET username = $1, email = $2';
  if (password) {
    if (String(password).length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    params.push(await bcrypt.hash(String(password), 10));
    sql += ', password = $3';
  }
  params.push(req.params.id);
  sql += ` WHERE id = $${params.length} RETURNING ${COLS}`;
  const { rows } = await pool.query(sql, params);
  if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ message: 'User berhasil diubah', data: rows[0] });
}));

// DELETE /users/:id
router.delete('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ message: 'User berhasil dihapus' });
}));

// GET /users/:id/profile
router.get('/:id/profile', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Profil user tidak ditemukan' });
  res.json({ message: 'Profil berhasil diambil', data: rows[0] });
}));

// PUT /users/:id/profile  (dibuat jika belum ada, diubah jika sudah ada)
router.put('/:id/profile', validId, wrap(async (req, res) => {
  const { full_name, phone = null, bio = null } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Field full_name wajib diisi' });
  const user = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (!user.rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
  const { rows } = await pool.query(
    `INSERT INTO user_profiles (user_id, full_name, phone, bio) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, bio = EXCLUDED.bio
     RETURNING *`,
    [req.params.id, full_name, phone, bio]
  );
  res.json({ message: 'Profil berhasil disimpan', data: rows[0] });
}));

module.exports = router;
