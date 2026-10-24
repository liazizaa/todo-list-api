const router = require('express').Router();
const pool = require('../db');
const { wrap, validId, isPosInt, PRIORITIES, isDate } = require('../helpers');

// Query dasar: task + nama kategori + daftar tag (array JSON)
const BASE_SELECT = `
  SELECT t.*, c.name AS category_name,
    COALESCE(
      (SELECT json_agg(json_build_object('id', g.id, 'name', g.name) ORDER BY g.id)
       FROM task_tags tt JOIN tags g ON g.id = tt.tag_id WHERE tt.task_id = t.id),
      '[]'::json) AS tags
  FROM tasks t
  LEFT JOIN categories c ON c.id = t.category_id`;

// Validasi input task; mengembalikan pesan error atau null
function validateTask(b, { partial = false } = {}) {
  if (!partial && !b.title) return 'Field title wajib diisi';
  if (b.title !== undefined && (typeof b.title !== 'string' || !b.title.trim())) return 'Field title tidak boleh kosong';
  if (b.title && b.title.length > 150) return 'Field title maksimal 150 karakter';
  if (b.priority !== undefined && b.priority !== null && !PRIORITIES.includes(b.priority)) return "Field priority harus 'rendah', 'sedang', atau 'tinggi'";
  if (b.due_date !== undefined && b.due_date !== null && !isDate(b.due_date)) return 'Format due_date harus YYYY-MM-DD';
  if (b.category_id !== undefined && b.category_id !== null && !isPosInt(b.category_id)) return 'category_id harus berupa angka positif';
  if (b.tag_ids !== undefined && (!Array.isArray(b.tag_ids) || !b.tag_ids.every(isPosInt))) return 'tag_ids harus berupa array angka';
  return null;
}

// Pastikan kategori milik user yang sama
async function categoryOwnedBy(client, categoryId, userId) {
  if (categoryId === null || categoryId === undefined) return true;
  const { rows } = await client.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
  return rows.length > 0;
}

async function setTags(client, taskId, tagIds) {
  await client.query('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
  for (const tagId of [...new Set(tagIds.map(Number))]) {
    await client.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [taskId, tagId]);
  }
}

// GET /tasks  -> getDataTugas()
// filter opsional: user_id, category_id, is_done, priority, tag_id, search
router.get('/', wrap(async (req, res) => {
  const { user_id, category_id, is_done, priority, tag_id, search } = req.query;
  const where = [];
  const params = [];
  const add = (cond, val) => { params.push(val); where.push(cond.replace(/\?/g, `$${params.length}`)); };

  if (user_id !== undefined) { if (!isPosInt(user_id)) return res.status(400).json({ error: 'user_id harus berupa angka positif' }); add('t.user_id = ?', user_id); }
  if (category_id !== undefined) { if (!isPosInt(category_id)) return res.status(400).json({ error: 'category_id harus berupa angka positif' }); add('t.category_id = ?', category_id); }
  if (is_done !== undefined) { if (!['true', 'false'].includes(is_done)) return res.status(400).json({ error: "is_done harus 'true' atau 'false'" }); add('t.is_done = ?', is_done === 'true'); }
  if (priority !== undefined) { if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "priority harus 'rendah', 'sedang', atau 'tinggi'" }); add('t.priority = ?', priority); }
  if (tag_id !== undefined) { if (!isPosInt(tag_id)) return res.status(400).json({ error: 'tag_id harus berupa angka positif' }); add('EXISTS (SELECT 1 FROM task_tags x WHERE x.task_id = t.id AND x.tag_id = ?)', tag_id); }
  if (search) add('(t.title ILIKE ? OR t.description ILIKE ?)', `%${search}%`);

  const sql = `${BASE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.is_done, t.due_date NULLS LAST, t.id`;
  const { rows } = await pool.query(sql, params);
  res.json({ message: 'Data tugas berhasil diambil', total: rows.length, data: rows });
}));

// GET /tasks/:id  -> getTugasById()
router.get('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
  res.json({ message: 'Data tugas berhasil diambil', data: rows[0] });
}));

// POST /tasks  -> tambahTugas()
router.post('/', wrap(async (req, res) => {
  const b = req.body;
  if (!isPosInt(b.user_id)) return res.status(400).json({ error: 'Field user_id wajib diisi (angka)' });
  const err = validateTask(b);
  if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    const user = await client.query('SELECT 1 FROM users WHERE id = $1', [b.user_id]);
    if (!user.rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (!(await categoryOwnedBy(client, b.category_id ?? null, b.user_id)))
      return res.status(400).json({ error: 'Kategori tidak ditemukan untuk user ini' });

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO tasks (user_id, category_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'sedang')) RETURNING id`,
      [b.user_id, b.category_id ?? null, b.title.trim(), b.description ?? null, b.due_date ?? null, b.priority ?? null]
    );
    if (b.tag_ids) await setTags(client, ins.rows[0].id, b.tag_ids);
    await client.query('COMMIT');

    const { rows } = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [ins.rows[0].id]);
    res.status(201).json({ message: 'Tugas berhasil ditambahkan', data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));

// PUT /tasks/:id  -> ubahTugas()  (mengubah seluruh data tugas)
router.put('/:id', validId, wrap(async (req, res) => {
  const b = req.body;
  const err = validateTask(b);
  if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    const cur = await client.query('SELECT user_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    if (!(await categoryOwnedBy(client, b.category_id ?? null, cur.rows[0].user_id)))
      return res.status(400).json({ error: 'Kategori tidak ditemukan untuk user ini' });

    await client.query('BEGIN');
    await client.query(
      `UPDATE tasks SET title = $1, description = $2, due_date = $3, priority = COALESCE($4, 'sedang'), category_id = $5
       WHERE id = $6`,
      [b.title.trim(), b.description ?? null, b.due_date ?? null, b.priority ?? null, b.category_id ?? null, req.params.id]
    );
    if (b.tag_ids) await setTags(client, req.params.id, b.tag_ids);
    await client.query('COMMIT');

    const { rows } = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json({ message: 'Tugas berhasil diubah', data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));

// PATCH /tasks/:id/done  -> tandaiTugasSelesai()
// (didaftarkan sebelum PATCH /:id agar tidak tertukar)
router.patch('/:id/done', validId, wrap(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE tasks SET is_done = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
  const full = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
  res.json({ message: 'Tugas ditandai selesai', data: full.rows[0] });
}));

// PATCH /tasks/:id  -> ubah sebagian data tugas
router.patch('/:id', validId, wrap(async (req, res) => {
  const b = req.body;
  const err = validateTask(b, { partial: true });
  if (err) return res.status(400).json({ error: err });

  const fields = ['title', 'description', 'due_date', 'priority', 'category_id'].filter((f) => b[f] !== undefined);
  if (!fields.length && b.tag_ids === undefined) return res.status(400).json({ error: 'Tidak ada field yang diubah' });

  const client = await pool.connect();
  try {
    const cur = await client.query('SELECT user_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    if (b.category_id !== undefined && !(await categoryOwnedBy(client, b.category_id, cur.rows[0].user_id)))
      return res.status(400).json({ error: 'Kategori tidak ditemukan untuk user ini' });

    await client.query('BEGIN');
    if (fields.length) {
      const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      await client.query(`UPDATE tasks SET ${sets} WHERE id = $${fields.length + 1}`, [...fields.map((f) => b[f]), req.params.id]);
    }
    if (b.tag_ids) await setTags(client, req.params.id, b.tag_ids);
    await client.query('COMMIT');

    const { rows } = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json({ message: 'Tugas berhasil diubah', data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));

// DELETE /tasks/:id  -> hapusTugas()
router.delete('/:id', validId, wrap(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
  res.json({ message: 'Tugas berhasil dihapus' });
}));

module.exports = router;
