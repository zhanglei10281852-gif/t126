"use strict";

const { verifyToken } = require("../utils/jwt");

/**
 * 鉴权中间件：校验 Authorization: Bearer <token>。
 * 未携带或无效 token 一律 401。
 */
function authRequired(req, res, next) {
  const header = req.headers["authorization"] || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ code: 401, message: "未登录或缺少令牌" });
  }
  try {
    const decoded = verifyToken(match[1]);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: "令牌无效或已过期" });
  }
}

module.exports = { authRequired };
