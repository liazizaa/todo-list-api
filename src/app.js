const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API Aplikasi To-Do List berjalan',
    endpoints: ['/users', '/categories', '/tags', '/tasks'],
  });
});

app.use('/users', require('./routes/users'));
app.use('/categories', require('./routes/categories'));
app.use('/tags', require('./routes/tags'));
app.use('/tasks', require('./routes/tasks'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

// Error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format JSON tidak valid' });
  // Kode error PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'Data sudah ada (duplikat)' });
  if (err.code === '23503') return res.status(400).json({ error: 'Data referensi (foreign key) tidak ditemukan' });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

module.exports = app;
