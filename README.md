# To-Do List REST API

REST API sederhana untuk **Aplikasi To-Do List**, dibuat sebagai Tugas Akhir *Learning Labs: Backend Development*. API memungkinkan user mengelola tugas harian (tambah, lihat, ubah, hapus, tandai selesai) lengkap dengan kategori dan tag.

- **Stack:** Node.js, Express, PostgreSQL (`pg`), bcryptjs
- **Deployment:** Vercel (serverless) + database PostgreSQL online (Neon / Supabase)
- **Format:** JSON untuk request dan response

## URL Deployment

```
https://nama-project.vercel.app
```

> Ganti `nama-project` di README ini dengan URL Vercel milikmu setelah deploy.

## Hubungan dengan Project Preparation

**Phase 1 (daftar fungsi)** diwujudkan menjadi endpoint berikut:

| Fungsi (Phase 1)     | Endpoint                  |
|----------------------|---------------------------|
| `tambahTugas()`      | `POST /tasks`             |
| `getDataTugas()`     | `GET /tasks`              |
| `getTugasById()`     | `GET /tasks/:id`          |
| `ubahTugas()`        | `PUT /tasks/:id`, `PATCH /tasks/:id` |
| `hapusTugas()`       | `DELETE /tasks/:id`       |
| `tandaiTugasSelesai()` | `PATCH /tasks/:id/done` |

**Phase 2 (skema database)** dipakai apa adanya dari `database/schema.sql`.

## ERD / Skema Database

6 tabel yang saling berelasi lewat foreign key:

![ERD](docs/erd.png)

```mermaid
erDiagram
    users ||--o| user_profiles : "1:1"
    users ||--o{ categories : "1:N"
    users ||--o{ tasks : "1:N"
    categories ||--o{ tasks : "1:N"
    tasks ||--o{ task_tags : "N:N"
    tags ||--o{ task_tags : "N:N"
    users { int id PK
            string username
            string email
            string password
            timestamp created_at }
    user_profiles { int id PK
                    int user_id FK
                    string full_name
                    string phone
                    text bio }
    categories { int id PK
                 int user_id FK
                 string name }
    tasks { int id PK
            int user_id FK
            int category_id FK
            string title
            text description
            date due_date
            string priority
            boolean is_done
            timestamp completed_at
            timestamp created_at }
    tags { int id PK
           string name }
    task_tags { int task_id PK,FK
                int tag_id PK,FK }
```

| Relasi | Keterangan |
|--------|------------|
| `users` 1:1 `user_profiles` | satu user punya satu profil |
| `users` 1:N `categories` | satu user punya banyak kategori |
| `users` 1:N `tasks` | satu user punya banyak tugas |
| `categories` 1:N `tasks` | satu kategori berisi banyak tugas (hapus kategori → `category_id` tugas menjadi NULL) |
| `tasks` N:N `tags` | lewat tabel pivot `task_tags` |

Kode untuk dbdiagram.io tersedia di `docs/erd.dbml`.

## Daftar Endpoint (24 endpoint)

| Method | URL | Fungsi |
|--------|-----|--------|
| POST | `/tasks` | Tambah tugas |
| GET | `/tasks` | Daftar tugas (dengan filter) |
| GET | `/tasks/:id` | Detail tugas |
| PUT | `/tasks/:id` | Ubah seluruh data tugas |
| PATCH | `/tasks/:id` | Ubah sebagian data tugas |
| PATCH | `/tasks/:id/done` | Tandai tugas selesai |
| DELETE | `/tasks/:id` | Hapus tugas |
| POST / GET | `/users`, `/users/:id` | Tambah / lihat user |
| PUT / DELETE | `/users/:id` | Ubah / hapus user |
| GET / PUT | `/users/:id/profile` | Lihat / simpan profil |
| POST / GET / PUT / DELETE | `/categories`, `/categories/:id` | CRUD kategori |
| POST / GET / PUT / DELETE | `/tags`, `/tags/:id` | CRUD tag |

**Status code yang dipakai:** `200` OK, `201` Created, `400` input salah, `404` data tidak ditemukan, `409` data duplikat, `500` error server.

Semua error memakai format `{"error": "pesan yang jelas"}`.


## Tugas (Tasks) — resource utama, CRUD lengkap

### Tambah Tugas
```
- Method       : POST
- URL          : https://nama-project.vercel.app/tasks
- Deskripsi    : Menambahkan tugas baru (tambahTugas). tag_ids opsional.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "user_id": 1,
    "category_id": 1,
    "title": "Kerjakan tugas akhir backend",
    "description": "Buat REST API dan deploy ke Vercel",
    "due_date": "2026-11-01",
    "priority": "tinggi",
    "tag_ids": [
      1
    ]
  }
- Response Sukses (201):
  {
    "message": "Tugas berhasil ditambahkan",
    "data": {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "title": "Kerjakan tugas akhir backend",
      "description": "Buat REST API dan deploy ke Vercel",
      "due_date": "2026-11-01",
      "priority": "tinggi",
      "is_done": false,
      "completed_at": null,
      "created_at": "2026-10-24T08:00:00.000Z",
      "category_name": "Kuliah",
      "tags": [
        {
          "id": 1,
          "name": "penting"
        }
      ]
    }
  }
- Response Error (400):
  {
    "error": "Field title wajib diisi"
  }
```

### Daftar Tugas
```
- Method       : GET
- URL          : https://nama-project.vercel.app/tasks
- Deskripsi    : Mengambil semua tugas (getDataTugas). Filter opsional lewat query: user_id, category_id, is_done (true/false), priority (rendah/sedang/tinggi), tag_id, search. Contoh: /tasks?user_id=1&is_done=false
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data tugas berhasil diambil",
    "total": 1,
    "data": [
      {
        "id": 1,
        "user_id": 1,
        "category_id": 1,
        "title": "Kerjakan tugas akhir backend",
        "description": "Buat REST API dan deploy ke Vercel",
        "due_date": "2026-11-01",
        "priority": "tinggi",
        "is_done": false,
        "completed_at": null,
        "created_at": "2026-10-24T08:00:00.000Z",
        "category_name": "Kuliah",
        "tags": [
          {
            "id": 1,
            "name": "penting"
          }
        ]
      }
    ]
  }
- Response Error (400):
  {
    "error": "is_done harus 'true' atau 'false'"
  }
```

### Detail Tugas
```
- Method       : GET
- URL          : https://nama-project.vercel.app/tasks/1
- Deskripsi    : Mengambil satu tugas berdasarkan ID (getTugasById), lengkap dengan nama kategori dan tag.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data tugas berhasil diambil",
    "data": {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "title": "Kerjakan tugas akhir backend",
      "description": "Buat REST API dan deploy ke Vercel",
      "due_date": "2026-11-01",
      "priority": "tinggi",
      "is_done": false,
      "completed_at": null,
      "created_at": "2026-10-24T08:00:00.000Z",
      "category_name": "Kuliah",
      "tags": [
        {
          "id": 1,
          "name": "penting"
        }
      ]
    }
  }
- Response Error (404):
  {
    "error": "Tugas tidak ditemukan"
  }
```

### Ubah Tugas (PUT)
```
- Method       : PUT
- URL          : https://nama-project.vercel.app/tasks/1
- Deskripsi    : Mengubah seluruh data tugas (ubahTugas). title wajib; field lain yang tidak dikirim akan dikosongkan. Jika tag_ids dikirim, tag lama diganti.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "title": "Kerjakan tugas akhir (revisi)",
    "description": "Tambah dokumentasi",
    "due_date": "2026-11-02",
    "priority": "sedang",
    "category_id": 1,
    "tag_ids": [
      1,
      2
    ]
  }
- Response Sukses (200):
  {
    "message": "Tugas berhasil diubah",
    "data": {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "title": "Kerjakan tugas akhir backend",
      "description": "Buat REST API dan deploy ke Vercel",
      "due_date": "2026-11-01",
      "priority": "tinggi",
      "is_done": false,
      "completed_at": null,
      "created_at": "2026-10-24T08:00:00.000Z",
      "category_name": "Kuliah",
      "tags": [
        {
          "id": 1,
          "name": "penting"
        }
      ]
    }
  }
- Response Error (400):
  {
    "error": "Field title wajib diisi"
  }
```

### Ubah Sebagian Tugas (PATCH)
```
- Method       : PATCH
- URL          : https://nama-project.vercel.app/tasks/1
- Deskripsi    : Mengubah sebagian data tugas; kirim hanya field yang ingin diubah.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "priority": "rendah"
  }
- Response Sukses (200):
  {
    "message": "Tugas berhasil diubah",
    "data": {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "title": "Kerjakan tugas akhir backend",
      "description": "Buat REST API dan deploy ke Vercel",
      "due_date": "2026-11-01",
      "priority": "tinggi",
      "is_done": false,
      "completed_at": null,
      "created_at": "2026-10-24T08:00:00.000Z",
      "category_name": "Kuliah",
      "tags": [
        {
          "id": 1,
          "name": "penting"
        }
      ]
    }
  }
- Response Error (400):
  {
    "error": "Tidak ada field yang diubah"
  }
```

### Tandai Tugas Selesai
```
- Method       : PATCH
- URL          : https://nama-project.vercel.app/tasks/1/done
- Deskripsi    : Menandai tugas selesai (tandaiTugasSelesai): is_done menjadi true dan completed_at terisi. Tanpa request body.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Tugas ditandai selesai",
    "data": {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "title": "Kerjakan tugas akhir backend",
      "description": "Buat REST API dan deploy ke Vercel",
      "due_date": "2026-11-01",
      "priority": "tinggi",
      "is_done": true,
      "completed_at": "2026-10-24T09:00:00.000Z",
      "created_at": "2026-10-24T08:00:00.000Z",
      "category_name": "Kuliah",
      "tags": [
        {
          "id": 1,
          "name": "penting"
        }
      ]
    }
  }
- Response Error (404):
  {
    "error": "Tugas tidak ditemukan"
  }
```

### Hapus Tugas
```
- Method       : DELETE
- URL          : https://nama-project.vercel.app/tasks/1
- Deskripsi    : Menghapus tugas berdasarkan ID (hapusTugas).
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Tugas berhasil dihapus"
  }
- Response Error (404):
  {
    "error": "Tugas tidak ditemukan"
  }
```

## User & Profil

### Tambah User
```
- Method       : POST
- URL          : https://nama-project.vercel.app/users
- Deskripsi    : Menambahkan user baru. Password di-hash (bcrypt) dan tidak pernah dikembalikan di response.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "username": "aulia",
    "email": "aulia@example.com",
    "password": "rahasia123"
  }
- Response Sukses (201):
  {
    "message": "User berhasil ditambahkan",
    "data": {
      "id": 1,
      "username": "aulia",
      "email": "aulia@example.com",
      "created_at": "2026-10-24T08:00:00.000Z"
    }
  }
- Response Error (400):
  {
    "error": "Field username wajib diisi"
  }
```

### Daftar User
```
- Method       : GET
- URL          : https://nama-project.vercel.app/users
- Deskripsi    : Mengambil semua user.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data user berhasil diambil",
    "data": [
      {
        "id": 1,
        "username": "aulia",
        "email": "aulia@example.com",
        "created_at": "2026-10-24T08:00:00.000Z"
      }
    ]
  }
```

### Detail User
```
- Method       : GET
- URL          : https://nama-project.vercel.app/users/1
- Deskripsi    : Mengambil satu user berdasarkan ID.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data user berhasil diambil",
    "data": {
      "id": 1,
      "username": "aulia",
      "email": "aulia@example.com",
      "created_at": "2026-10-24T08:00:00.000Z"
    }
  }
- Response Error (404):
  {
    "error": "User tidak ditemukan"
  }
```

### Ubah User
```
- Method       : PUT
- URL          : https://nama-project.vercel.app/users/1
- Deskripsi    : Mengubah username dan email. password opsional (jika dikirim, diganti).
- Headers      : Content-Type: application/json
- Request Body :
  {
    "username": "aulia_baru",
    "email": "aulia@example.com"
  }
- Response Sukses (200):
  {
    "message": "User berhasil diubah",
    "data": {
      "id": 1,
      "username": "aulia",
      "email": "aulia@example.com",
      "created_at": "2026-10-24T08:00:00.000Z"
    }
  }
- Response Error (400):
  {
    "error": "Field username dan email wajib diisi"
  }
```

### Hapus User
```
- Method       : DELETE
- URL          : https://nama-project.vercel.app/users/1
- Deskripsi    : Menghapus user beserta profil, kategori, dan tugasnya (ON DELETE CASCADE).
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "User berhasil dihapus"
  }
- Response Error (404):
  {
    "error": "User tidak ditemukan"
  }
```

### Lihat Profil User
```
- Method       : GET
- URL          : https://nama-project.vercel.app/users/1/profile
- Deskripsi    : Mengambil profil user (relasi 1:1).
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Profil berhasil diambil",
    "data": {
      "id": 1,
      "user_id": 1,
      "full_name": "Aulia Dwiyanti Nur Azizah",
      "phone": "081234567890",
      "bio": "Mahasiswa backend"
    }
  }
- Response Error (404):
  {
    "error": "Profil user tidak ditemukan"
  }
```

### Simpan Profil User
```
- Method       : PUT
- URL          : https://nama-project.vercel.app/users/1/profile
- Deskripsi    : Membuat profil jika belum ada, atau mengubahnya jika sudah ada.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "full_name": "Aulia Dwiyanti Nur Azizah",
    "phone": "081234567890",
    "bio": "Mahasiswa backend"
  }
- Response Sukses (200):
  {
    "message": "Profil berhasil disimpan",
    "data": {
      "id": 1,
      "user_id": 1,
      "full_name": "Aulia Dwiyanti Nur Azizah",
      "phone": "081234567890",
      "bio": "Mahasiswa backend"
    }
  }
- Response Error (400):
  {
    "error": "Field full_name wajib diisi"
  }
```

## Kategori (Categories)

### Tambah Kategori
```
- Method       : POST
- URL          : https://nama-project.vercel.app/categories
- Deskripsi    : Menambahkan kategori milik seorang user. Nama kategori harus unik per user.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "user_id": 1,
    "name": "Kuliah"
  }
- Response Sukses (201):
  {
    "message": "Kategori berhasil ditambahkan",
    "data": {
      "id": 1,
      "user_id": 1,
      "name": "Kuliah"
    }
  }
- Response Error (400):
  {
    "error": "Field name wajib diisi"
  }
```

### Daftar Kategori
```
- Method       : GET
- URL          : https://nama-project.vercel.app/categories
- Deskripsi    : Mengambil semua kategori. Filter opsional: ?user_id=1
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data kategori berhasil diambil",
    "data": [
      {
        "id": 1,
        "user_id": 1,
        "name": "Kuliah"
      }
    ]
  }
- Response Error (400):
  {
    "error": "user_id harus berupa angka positif"
  }
```

### Detail Kategori
```
- Method       : GET
- URL          : https://nama-project.vercel.app/categories/1
- Deskripsi    : Mengambil satu kategori berdasarkan ID.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data kategori berhasil diambil",
    "data": {
      "id": 1,
      "user_id": 1,
      "name": "Kuliah"
    }
  }
- Response Error (404):
  {
    "error": "Kategori tidak ditemukan"
  }
```

### Ubah Kategori
```
- Method       : PUT
- URL          : https://nama-project.vercel.app/categories/1
- Deskripsi    : Mengubah nama kategori.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "name": "Perkuliahan"
  }
- Response Sukses (200):
  {
    "message": "Kategori berhasil diubah",
    "data": {
      "id": 1,
      "user_id": 1,
      "name": "Perkuliahan"
    }
  }
- Response Error (404):
  {
    "error": "Kategori tidak ditemukan"
  }
```

### Hapus Kategori
```
- Method       : DELETE
- URL          : https://nama-project.vercel.app/categories/1
- Deskripsi    : Menghapus kategori. Tugas terkait tidak ikut terhapus (category_id menjadi NULL).
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Kategori berhasil dihapus"
  }
- Response Error (404):
  {
    "error": "Kategori tidak ditemukan"
  }
```

## Tag

### Tambah Tag
```
- Method       : POST
- URL          : https://nama-project.vercel.app/tags
- Deskripsi    : Menambahkan tag baru (nama harus unik).
- Headers      : Content-Type: application/json
- Request Body :
  {
    "name": "penting"
  }
- Response Sukses (201):
  {
    "message": "Tag berhasil ditambahkan",
    "data": {
      "id": 1,
      "name": "penting"
    }
  }
- Response Error (409):
  {
    "error": "Data sudah ada (duplikat)"
  }
```

### Daftar Tag
```
- Method       : GET
- URL          : https://nama-project.vercel.app/tags
- Deskripsi    : Mengambil semua tag.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data tag berhasil diambil",
    "data": [
      {
        "id": 1,
        "name": "penting"
      }
    ]
  }
```

### Detail Tag
```
- Method       : GET
- URL          : https://nama-project.vercel.app/tags/1
- Deskripsi    : Mengambil satu tag berdasarkan ID.
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Data tag berhasil diambil",
    "data": {
      "id": 1,
      "name": "penting"
    }
  }
- Response Error (404):
  {
    "error": "Tag tidak ditemukan"
  }
```

### Ubah Tag
```
- Method       : PUT
- URL          : https://nama-project.vercel.app/tags/1
- Deskripsi    : Mengubah nama tag.
- Headers      : Content-Type: application/json
- Request Body :
  {
    "name": "sangat-penting"
  }
- Response Sukses (200):
  {
    "message": "Tag berhasil diubah",
    "data": {
      "id": 1,
      "name": "sangat-penting"
    }
  }
- Response Error (404):
  {
    "error": "Tag tidak ditemukan"
  }
```

### Hapus Tag
```
- Method       : DELETE
- URL          : https://nama-project.vercel.app/tags/1
- Deskripsi    : Menghapus tag (relasi di task_tags ikut terhapus).
- Headers      : -
- Request Body : -
- Response Sukses (200):
  {
    "message": "Tag berhasil dihapus"
  }
- Response Error (404):
  {
    "error": "Tag tidak ditemukan"
  }
```


## Cara Menjalankan Secara Lokal

1. Pastikan Node.js 18+ terpasang, lalu clone repository dan install dependency:
   ```bash
   git clone <link-repository>
   cd todo-list-api
   npm install
   ```
2. Buat database PostgreSQL online (gratis) di [Neon](https://neon.tech) atau [Supabase](https://supabase.com), lalu salin *connection string*-nya.
3. Salin `.env.example` menjadi `.env` dan isi:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   ```
4. Buat tabel (tambahkan data contoh dengan `npm run db:seed`):
   ```bash
   npm run db:setup
   ```
   *Perhatian: script ini menjalankan `DROP TABLE` lebih dulu sehingga data lama ikut terhapus.*
5. Jalankan server:
   ```bash
   npm run dev
   ```
   API aktif di `http://localhost:3000`.

## Deploy ke Vercel

1. Push project ke GitHub (file `.env` sudah masuk `.gitignore`).
2. Di [vercel.com](https://vercel.com) pilih **Add New → Project**, import repository tersebut.
3. Di **Settings → Environment Variables** tambahkan `DATABASE_URL` (isi connection string database online).
4. Klik **Deploy**. `vercel.json` mengarahkan semua request ke `api/index.js`.

## Pengujian

Import `docs/postman_collection.json` ke Postman / Thunder Client, lalu ubah variabel `baseUrl` menjadi URL Vercel. Urutan pengujian yang disarankan: buat user → buat kategori → buat tag → buat tugas → lihat, ubah, tandai selesai, hapus.

## Struktur Project

```
├── api/index.js            # entry point Vercel
├── server.js               # entry point lokal
├── vercel.json
├── database/
│   ├── schema.sql          # skema (Phase 2)
│   ├── seed.sql            # data contoh
│   └── setup.js            # menjalankan schema/seed
├── docs/
│   ├── erd.png  erd.dbml
│   └── postman_collection.json
└── src/
    ├── app.js  db.js  helpers.js
    └── routes/ tasks.js users.js categories.js tags.js
```
