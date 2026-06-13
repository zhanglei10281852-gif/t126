"use strict";

const request = require("supertest");
const { createApp } = require("../src/app");
const { initDatabase } = require("../src/init");
const { closePool } = require("../src/db");
const config = require("../src/config");

let app;
let token;
const uniqueCode = "TST-" + Date.now();

beforeAll(async () => {
  await initDatabase();
  app = createApp();
});

afterAll(async () => {
  await closePool();
});

describe("健康检查", () => {
  it("GET /api/health 返回 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.service).toBe("ancient-tree-admin");
  });
});

describe("登录鉴权", () => {
  it("错误密码返回 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: config.admin.username, password: "wrong-pw" });
    expect(res.status).toBe(401);
  });

  it("缺少字段返回 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: config.admin.username });
    expect(res.status).toBe(400);
  });

  it("正确账号登录拿到 token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: config.admin.username,
      password: config.admin.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.userInfo.username).toBe(config.admin.username);
    token = res.body.data.token;
  });

  it("未带 token 访问 /me 返回 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("带 token 访问 /me 返回用户信息", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(config.admin.username);
  });
});

describe("古树 CRUD 与中文编码", () => {
  it("未登录访问列表返回 401", async () => {
    const res = await request(app).get("/api/trees");
    expect(res.status).toBe(401);
  });

  it("列表分页返回种子数据", async () => {
    const res = await request(app)
      .get("/api/trees?page=1&pageSize=5")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(10);
    expect(res.body.data.list.length).toBe(5);
    // 中文不应乱码
    const ginkgo = res.body.data.list.find((t) => t.code === "GS-0001");
    expect(ginkgo).toBeTruthy();
    expect(ginkgo.species).toBe("银杏");
  });

  it("按保护等级筛选只返回一级古树", async () => {
    const res = await request(app)
      .get("/api/trees?level=1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.list.forEach((t) => expect(t.protection_level).toBe(1));
  });

  it("按关键词搜索（中文）", async () => {
    const res = await request(app)
      .get("/api/trees?keyword=香樟")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].species).toBe("香樟");
  });

  let createdId;

  it("新增古树（含中文字段）", async () => {
    const payload = {
      code: uniqueCode,
      species: "七叶树",
      latin_name: "Aesculus chinensis",
      age_estimate: 188,
      protection_level: 2,
      growth_status: "正常",
      location: "测试样地·钟楼广场东南角",
      longitude: 118.8,
      latitude: 32.05,
      guardian: "测试管护员·张三",
      description: "用于自动化测试的临时记录，含中文与生僻位置描述。",
    };
    const res = await request(app)
      .post("/api/trees")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.species).toBe("七叶树");
    expect(res.body.data.location).toBe("测试样地·钟楼广场东南角");
    createdId = res.body.data.id;
  });

  it("重复编号返回 409", async () => {
    const res = await request(app)
      .post("/api/trees")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: uniqueCode, species: "重复" });
    expect(res.status).toBe(409);
  });

  it("非法保护等级返回 400", async () => {
    const res = await request(app)
      .post("/api/trees")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: uniqueCode + "-X", species: "测试", protection_level: 9 });
    expect(res.status).toBe(400);
  });

  it("更新古树状态", async () => {
    const res = await request(app)
      .put(`/api/trees/${createdId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ growth_status: "衰弱", description: "巡检发现长势变弱" });
    expect(res.status).toBe(200);
    expect(res.body.data.growth_status).toBe("衰弱");
    expect(res.body.data.description).toBe("巡检发现长势变弱");
  });

  it("获取详情", async () => {
    const res = await request(app)
      .get(`/api/trees/${createdId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(uniqueCode);
  });

  it("删除古树", async () => {
    const res = await request(app)
      .delete(`/api/trees/${createdId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("删除后详情返回 404", async () => {
    const res = await request(app)
      .get(`/api/trees/${createdId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("未知路由", () => {
  it("返回 404", async () => {
    const res = await request(app).get("/api/not-exist");
    expect(res.status).toBe(404);
  });
});
