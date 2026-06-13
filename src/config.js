"use strict";

require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT, 10) || 7763,
  jwt: {
    secret: process.env.JWT_SECRET || "ancient-tree-dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  },
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT, 10) || 3309,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "tree_root_pw",
    database: process.env.DB_NAME || "ancient_tree",
    // 全链路统一 utf8mb4，确保中文（含生僻字、emoji）不乱码
    charset: "utf8mb4_unicode_ci",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  },
  // 内置管理员（启动时自动创建，仅 admin 单一角色）
  admin: {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    name: "系统管理员",
  },
};

module.exports = config;
