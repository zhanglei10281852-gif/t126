"use strict";

const { createApp } = require("./app");
const { initDatabase } = require("./init");
const config = require("./config");

async function bootstrap() {
  // 启动时自动建库建表、灌入内置管理员与种子数据
  await initDatabase();
  console.log("[server] 数据库初始化完成");

  const app = createApp();
  app.listen(config.port, () => {
    console.log(
      `[server] 古树名木保护管理平台 API 已启动: http://localhost:${config.port}`,
    );
    console.log(
      `[server] 默认管理员账号: ${config.admin.username} / ${config.admin.password}`,
    );
  });
}

bootstrap().catch((err) => {
  console.error("[server] 启动失败:", err.message);
  process.exit(1);
});
