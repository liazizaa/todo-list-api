-- =====================================================
-- Struktur Database: Aplikasi To-Do List (PostgreSQL)
-- Relasi:
--   users 1:1 user_profiles
--   users 1:N categories
--   users 1:N tasks
--   categories 1:N tasks
--   tasks N:N tags (lewat tabel task_tags)
-- =====================================================

DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabel users
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel user_profiles (relasi 1:1 dengan users)
CREATE TABLE user_profiles (
    id          SERIAL PRIMARY KEY,
    user_id     INT          NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    bio         TEXT,
    CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel categories (relasi 1:N: satu user punya banyak kategori)
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    user_id     INT          NOT NULL,
    name        VARCHAR(50)  NOT NULL,
    CONSTRAINT fk_category_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_category_per_user UNIQUE (user_id, name)
);

-- 4. Tabel tasks (relasi 1:N dengan users dan categories)
CREATE TABLE tasks (
    id           SERIAL PRIMARY KEY,
    user_id      INT          NOT NULL,
    category_id  INT,
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    due_date     DATE,
    priority     VARCHAR(10)  NOT NULL DEFAULT 'sedang'
                 CHECK (priority IN ('rendah', 'sedang', 'tinggi')),
    is_done      BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 5. Tabel tags
CREATE TABLE tags (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(30) NOT NULL UNIQUE
);

-- 6. Tabel task_tags (tabel penghubung relasi N:N tasks dan tags)
CREATE TABLE task_tags (
    task_id  INT NOT NULL,
    tag_id   INT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Index untuk mempercepat pencarian
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_is_done ON tasks(is_done);
