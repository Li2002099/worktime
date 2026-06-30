require('dotenv').config();
const pool = require('./src/config/database');

async function init() {
  const client = await pool.connect();
  try {
    // 建立資料表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        username   TEXT        UNIQUE NOT NULL,
        name       TEXT        NOT NULL,
        role       TEXT        NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER     NOT NULL REFERENCES users(id),
        work_date      TEXT        NOT NULL,
        clock_in       TIMESTAMPTZ,
        clock_out      TIMESTAMPTZ,
        note           TEXT,
        work_hours     INTEGER     DEFAULT 0,
        overtime_hours INTEGER     DEFAULT 0,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, work_date)
      );
    `);

    // 插入預設帳號（已存在則略過）
    const defaultUsers = [
      ['admin',  '管理者',  'admin'],
      ['andy',   'Andy',   'user'],
      ['jen',    'Jen',    'user'],
      ['bob',    'Bob',    'user'],
      ['daisy', 'Daisy', 'user'],
      ['willy',  'Willy',  'user'],
      ['hong',   'Hong',   'user'],
      ['jenna',  'Jenna',  'user'],
      ['wesley' , 'Wesley' ,'user'],
    ];

    for (const [username, name, role] of defaultUsers) {
      await client.query(
        'INSERT INTO users (username, name, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
        [username, name, role]
      );
    }

    console.log('✅ 資料庫初始化完成');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error('❌ 初始化失敗：', err.message);
  process.exit(1);
});
