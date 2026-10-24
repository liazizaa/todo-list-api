-- Data contoh (opsional). Jalankan setelah schema.sql
-- Kolom password hanya berisi teks contoh (bukan hash asli); buat user lewat POST /users agar password di-hash
INSERT INTO users (username, email, password) VALUES
 ('aulia', 'aulia@example.com', 'contoh-hash-bukan-asli'),
 ('budi',  'budi@example.com',  'contoh-hash-bukan-asli');

INSERT INTO user_profiles (user_id, full_name, phone, bio) VALUES
 (1, 'Aulia Dwiyanti Nur Azizah', '081234567890', 'Mahasiswa yang sedang belajar backend');

INSERT INTO categories (user_id, name) VALUES
 (1, 'Kuliah'), (1, 'Pribadi'), (2, 'Pekerjaan');

INSERT INTO tags (name) VALUES ('penting'), ('mendesak'), ('santai');

INSERT INTO tasks (user_id, category_id, title, description, due_date, priority) VALUES
 (1, 1, 'Kerjakan tugas akhir backend', 'Buat REST API dan deploy ke Vercel', '2026-11-01', 'tinggi'),
 (1, 2, 'Belanja bulanan', NULL, '2026-10-30', 'rendah'),
 (2, 3, 'Kirim laporan mingguan', 'Kirim ke atasan via email', '2026-10-28', 'sedang');

INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1), (1, 2), (2, 3);
