"use strict";

const express = require("express");
const { query } = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUS = ["正常", "衰弱", "濒危", "死亡"];
const VALID_LEVELS = [1, 2, 3];

const COLUMNS =
  "id, code, species, latin_name, age_estimate, protection_level, growth_status, location, longitude, latitude, guardian, description, created_at, updated_at";

function toInt(val, def) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? def : n;
}

function validateTreePayload(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const need = (k) => !partial || body[k] !== undefined;

  if (need("code")) {
    if (!body.code || !String(body.code).trim())
      errors.push("编号(code)不能为空");
    else data.code = String(body.code).trim();
  }
  if (need("species")) {
    if (!body.species || !String(body.species).trim())
      errors.push("树种(species)不能为空");
    else data.species = String(body.species).trim();
  }
  if (body.latin_name !== undefined)
    data.latin_name = String(body.latin_name).trim();
  if (body.age_estimate !== undefined) {
    const age = toInt(body.age_estimate, NaN);
    if (Number.isNaN(age) || age < 0)
      errors.push("估测树龄(age_estimate)必须是非负整数");
    else data.age_estimate = age;
  }
  if (body.protection_level !== undefined) {
    const lvl = toInt(body.protection_level, NaN);
    if (!VALID_LEVELS.includes(lvl))
      errors.push("保护等级(protection_level)只能是 1/2/3");
    else data.protection_level = lvl;
  }
  if (body.growth_status !== undefined) {
    if (!VALID_STATUS.includes(body.growth_status))
      errors.push("生长状态(growth_status)取值非法");
    else data.growth_status = body.growth_status;
  }
  if (body.location !== undefined) data.location = String(body.location).trim();
  if (body.guardian !== undefined) data.guardian = String(body.guardian).trim();
  if (body.description !== undefined)
    data.description = String(body.description).trim();
  if (body.longitude !== undefined)
    data.longitude = body.longitude === null ? null : Number(body.longitude);
  if (body.latitude !== undefined)
    data.latitude = body.latitude === null ? null : Number(body.latitude);

  return { errors, data };
}

// 列表（分页 + 按等级/状态/关键词筛选）
router.get("/", authRequired, async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.pageSize, 10)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];

    if (req.query.level !== undefined && req.query.level !== "") {
      const lvl = toInt(req.query.level, NaN);
      if (VALID_LEVELS.includes(lvl)) {
        where.push("protection_level = ?");
        params.push(lvl);
      }
    }
    if (req.query.status) {
      where.push("growth_status = ?");
      params.push(req.query.status);
    }
    if (req.query.keyword) {
      where.push(
        "(code LIKE ? OR species LIKE ? OR location LIKE ? OR guardian LIKE ?)",
      );
      const kw = `%${req.query.keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM trees ${whereSql}`,
      params,
    );
    const total = countRows[0].total;

    // LIMIT/OFFSET 用经过 parseInt 的整数内联，避免预处理语句对 LIMIT 占位符的兼容问题
    const list = await query(
      `SELECT ${COLUMNS} FROM trees ${whereSql} ORDER BY protection_level ASC, id ASC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return res.json({
      code: 200,
      message: "success",
      data: { list, total, page, pageSize },
    });
  } catch (err) {
    next(err);
  }
});

// 详情
router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (Number.isNaN(id))
      return res.status(400).json({ code: 400, message: "ID 非法" });
    const rows = await query(`SELECT ${COLUMNS} FROM trees WHERE id = ?`, [id]);
    if (rows.length === 0)
      return res.status(404).json({ code: 404, message: "古树不存在" });
    return res.json({ code: 200, message: "success", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 新增
router.post("/", authRequired, async (req, res, next) => {
  try {
    const { errors, data } = validateTreePayload(req.body || {}, {
      partial: false,
    });
    if (errors.length)
      return res.status(400).json({ code: 400, message: errors.join("；") });

    const dup = await query("SELECT id FROM trees WHERE code = ?", [data.code]);
    if (dup.length)
      return res
        .status(409)
        .json({ code: 409, message: `编号 ${data.code} 已存在` });

    const fields = [
      "code",
      "species",
      "latin_name",
      "age_estimate",
      "protection_level",
      "growth_status",
      "location",
      "longitude",
      "latitude",
      "guardian",
      "description",
    ];
    const values = fields.map((f) =>
      data[f] !== undefined ? data[f] : defaultFor(f),
    );
    const placeholders = fields.map(() => "?").join(", ");
    const result = await query(
      `INSERT INTO trees (${fields.join(", ")}) VALUES (${placeholders})`,
      values,
    );

    const rows = await query(`SELECT ${COLUMNS} FROM trees WHERE id = ?`, [
      result.insertId,
    ]);
    return res
      .status(201)
      .json({ code: 200, message: "创建成功", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 更新
router.put("/:id", authRequired, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (Number.isNaN(id))
      return res.status(400).json({ code: 400, message: "ID 非法" });

    const exists = await query("SELECT id FROM trees WHERE id = ?", [id]);
    if (exists.length === 0)
      return res.status(404).json({ code: 404, message: "古树不存在" });

    const { errors, data } = validateTreePayload(req.body || {}, {
      partial: true,
    });
    if (errors.length)
      return res.status(400).json({ code: 400, message: errors.join("；") });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ code: 400, message: "没有需要更新的字段" });
    }

    if (data.code) {
      const dup = await query(
        "SELECT id FROM trees WHERE code = ? AND id <> ?",
        [data.code, id],
      );
      if (dup.length)
        return res
          .status(409)
          .json({ code: 409, message: `编号 ${data.code} 已存在` });
    }

    const sets = Object.keys(data).map((k) => `${k} = ?`);
    const values = Object.keys(data).map((k) => data[k]);
    values.push(id);
    await query(`UPDATE trees SET ${sets.join(", ")} WHERE id = ?`, values);

    const rows = await query(`SELECT ${COLUMNS} FROM trees WHERE id = ?`, [id]);
    return res.json({ code: 200, message: "更新成功", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 删除
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (Number.isNaN(id))
      return res.status(400).json({ code: 400, message: "ID 非法" });
    const result = await query("DELETE FROM trees WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ code: 404, message: "古树不存在" });
    return res.json({ code: 200, message: "删除成功", data: null });
  } catch (err) {
    next(err);
  }
});

function defaultFor(field) {
  switch (field) {
    case "age_estimate":
      return 0;
    case "protection_level":
      return 3;
    case "growth_status":
      return "正常";
    case "longitude":
    case "latitude":
      return null;
    default:
      return "";
  }
}

module.exports = router;
