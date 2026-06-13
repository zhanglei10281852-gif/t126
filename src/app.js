"use strict";

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const treeRoutes = require("./routes/trees");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // 健康检查
  app.get("/api/health", (req, res) => {
    res.json({
      code: 200,
      message: "ok",
      data: { service: "ancient-tree-admin", time: new Date().toISOString() },
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/trees", treeRoutes);

  // 404
  app.use((req, res) => {
    res
      .status(404)
      .json({ code: 404, message: `接口不存在: ${req.method} ${req.path}` });
  });

  // 统一错误处理
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[error]", err);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  });

  return app;
}

module.exports = { createApp };
