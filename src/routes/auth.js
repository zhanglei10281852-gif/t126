"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { signToken } = require("../utils/jwt");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// 登录
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ code: 400, message: "用户名和密码不能为空" });
    }
    const rows = await query(
      "SELECT id, username, password, name, role FROM users WHERE username = ?",
      [username],
    );
    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }
    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    return res.json({
      code: 200,
      message: "登录成功",
      data: {
        token,
        userInfo: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 当前登录用户信息
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const rows = await query(
      "SELECT id, username, name, role, created_at FROM users WHERE id = ?",
      [req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }
    return res.json({ code: 200, message: "success", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
