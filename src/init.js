"use strict";

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const config = require("./config");
const { query, getPool } = require("./db");

/**
 * 确保目标数据库存在（用 utf8mb4）。先用不带 database 的连接建库。
 */
async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    charset: config.db.charset,
    multipleStatements: true,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` ` +
        `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await conn.end();
  }
}

async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      password VARCHAR(120) NOT NULL,
      name VARCHAR(64) NOT NULL DEFAULT '',
      role VARCHAR(32) NOT NULL DEFAULT 'admin',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trees (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(32) NOT NULL COMMENT '古树编号',
      species VARCHAR(64) NOT NULL COMMENT '树种',
      latin_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '拉丁学名',
      age_estimate INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '估测树龄(年)',
      protection_level TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT '保护等级:1/2/3',
      growth_status VARCHAR(16) NOT NULL DEFAULT '正常' COMMENT '生长状态',
      location VARCHAR(255) NOT NULL DEFAULT '' COMMENT '生长位置',
      longitude DECIMAL(10,6) NULL COMMENT '经度',
      latitude DECIMAL(10,6) NULL COMMENT '纬度',
      guardian VARCHAR(64) NOT NULL DEFAULT '' COMMENT '管护责任人',
      description VARCHAR(500) NOT NULL DEFAULT '' COMMENT '描述',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_code (code),
      KEY idx_level (protection_level),
      KEY idx_status (growth_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function seedAdmin() {
  const rows = await query("SELECT id FROM users WHERE username = ?", [
    config.admin.username,
  ]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(config.admin.password, 10);
    await query(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)",
      [config.admin.username, hash, config.admin.name, "admin"],
    );
  }
}

const SEED_TREES = [
  {
    code: "GS-0001",
    species: "银杏",
    latin_name: "Ginkgo biloba",
    age_estimate: 1200,
    protection_level: 1,
    growth_status: "正常",
    location: "城东文庙院内",
    longitude: 118.792345,
    latitude: 32.061234,
    guardian: "文庙管理处",
    description: "相传为宋代所植，冠幅巨大，秋日满树金黄。",
  },
  {
    code: "GS-0002",
    species: "香樟",
    latin_name: "Cinnamomum camphora",
    age_estimate: 360,
    protection_level: 2,
    growth_status: "正常",
    location: "清河村口晒谷场旁",
    longitude: 118.801122,
    latitude: 32.045678,
    guardian: "清河村委会",
    description: "村民纳凉古树，树形舒展。",
  },
  {
    code: "GS-0003",
    species: "国槐",
    latin_name: "Styphnolobium japonicum",
    age_estimate: 520,
    protection_level: 1,
    growth_status: "衰弱",
    location: "老城隍庙后巷",
    longitude: 118.7789,
    latitude: 32.0589,
    guardian: "城隍庙文管所",
    description: "主干部分中空，已做支撑加固。",
  },
  {
    code: "GS-0004",
    species: "圆柏",
    latin_name: "Juniperus chinensis",
    age_estimate: 280,
    protection_level: 3,
    growth_status: "正常",
    location: "北山公园半山亭",
    longitude: 118.765432,
    latitude: 32.077654,
    guardian: "北山公园管理科",
    description: "枝干虬曲，姿态苍劲。",
  },
  {
    code: "GS-0005",
    species: "黄连木",
    latin_name: "Pistacia chinensis",
    age_estimate: 200,
    protection_level: 3,
    growth_status: "正常",
    location: "西街牌坊广场",
    longitude: 118.78321,
    latitude: 32.0556,
    guardian: "西街社区",
    description: "树皮裂纹斑驳，入秋叶色红艳。",
  },
  {
    code: "GS-0006",
    species: "皂荚",
    latin_name: "Gleditsia sinensis",
    age_estimate: 410,
    protection_level: 2,
    growth_status: "濒危",
    location: "南渡口渡船码头",
    longitude: 118.812,
    latitude: 32.031,
    guardian: "南渡口社区",
    description: "近年长势下滑，叶片稀疏，已列入抢救复壮计划。",
  },
  {
    code: "GS-0007",
    species: "朴树",
    latin_name: "Celtis sinensis",
    age_estimate: 150,
    protection_level: 3,
    growth_status: "正常",
    location: "实验小学操场边",
    longitude: 118.788,
    latitude: 32.069,
    guardian: "实验小学总务处",
    description: "夏季为学生提供大片绿荫。",
  },
  {
    code: "GS-0008",
    species: "广玉兰",
    latin_name: "Magnolia grandiflora",
    age_estimate: 110,
    protection_level: 3,
    growth_status: "正常",
    location: "人民医院老门诊楼前",
    longitude: 118.7955,
    latitude: 32.0522,
    guardian: "人民医院后勤处",
    description: "花大洁白，初夏盛开。",
  },
  {
    code: "GS-0009",
    species: "枫香",
    latin_name: "Liquidambar formosana",
    age_estimate: 240,
    protection_level: 2,
    growth_status: "正常",
    location: "西郊枫林湾观景台",
    longitude: 118.741,
    latitude: 32.064,
    guardian: "枫林湾林场",
    description: "深秋红叶，为当地一景。",
  },
  {
    code: "GS-0010",
    species: "麻栎",
    latin_name: "Quercus acutissima",
    age_estimate: 330,
    protection_level: 2,
    growth_status: "衰弱",
    location: "东岭古道驿站遗址",
    longitude: 118.823,
    latitude: 32.071,
    guardian: "文物保护中心",
    description: "古道沿线遗存，根部周围铺装过硬，透气性差。",
  },
];

async function seedTrees() {
  const rows = await query("SELECT COUNT(*) AS cnt FROM trees");
  if (rows[0].cnt > 0) return;
  for (const t of SEED_TREES) {
    await query(
      `INSERT INTO trees
        (code, species, latin_name, age_estimate, protection_level, growth_status, location, longitude, latitude, guardian, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.code,
        t.species,
        t.latin_name,
        t.age_estimate,
        t.protection_level,
        t.growth_status,
        t.location,
        t.longitude,
        t.latitude,
        t.guardian,
        t.description,
      ],
    );
  }
}

/**
 * 初始化：建库 -> 建表 -> 灌入内置管理员与种子古树数据。可重复执行（幂等）。
 */
async function initDatabase() {
  await ensureDatabase();
  await createTables();
  await seedAdmin();
  await seedTrees();
}

module.exports = {
  initDatabase,
  ensureDatabase,
  createTables,
  seedAdmin,
  seedTrees,
};

// 允许 `npm run init-db` 直接执行
if (require.main === module) {
  initDatabase()
    .then(async () => {
      console.log("[init] 数据库初始化完成");
      await getPool().end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[init] 初始化失败:", err.message);
      process.exit(1);
    });
}
