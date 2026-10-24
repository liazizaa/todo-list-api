// Pembungkus agar error async otomatis diteruskan ke error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isPosInt = (v) => /^\d+$/.test(String(v)) && Number(v) > 0;

// Validasi :id di URL
const validId = (req, res, next) => {
  if (!isPosInt(req.params.id)) return res.status(400).json({ error: 'ID harus berupa angka positif' });
  next();
};

const PRIORITIES = ['rendah', 'sedang', 'tinggi'];
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v));

module.exports = { wrap, isPosInt, validId, PRIORITIES, isDate };
