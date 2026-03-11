import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  createApplication,
  createPayment,
  createUser,
  getApplicationById,
  getDashboardSnapshot,
  getEventById,
  getUserByEmail,
  listApplications,
  listApplicationsByEmail,
  listEvents,
  listPayments,
  updateApplicationStatus
} from "./db.js";
import { sourceSnapshot } from "./data/sources.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const webDistDir = path.resolve(projectRoot, "apps/web/dist");

const app = express();
const port = process.env.PORT || 8787;
const host = process.env.HOST || "0.0.0.0";
const nodeEnv = process.env.NODE_ENV || "development";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || nodeEnv !== "production" || allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed"), false);
    }
  })
);
app.use(express.json());

const registrationSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = registrationSchema.pick({ email: true, password: true });

const eligibilitySchema = z.object({
  hasPassport: z.boolean(),
  hasOfficialMembership: z.boolean(),
  hasConfirmedAccommodation: z.boolean(),
  canAttendInPerson: z.boolean(),
  hasJapanesePhone: z.boolean().optional().default(false),
  canUseOfficialApp: z.boolean().optional().default(true)
});

const applicationSchema = z.object({
  accountEmail: z.string().email(),
  fullName: z.string().min(2),
  passportName: z.string().min(2),
  eventId: z.string().min(1),
  eventDate: z.string().min(1),
  accommodationAddress: z.string().min(5),
  notes: z.string().optional().default("")
});

const serviceFeeOrderSchema = z.object({
  applicationId: z.string().min(1),
  channel: z.enum(["wechat", "alipay"]),
  amountCny: z.number().positive()
});

const lotteryUpdateSchema = z.object({
  lotteryStatus: z.enum(["PENDING", "WON", "LOST"]),
  status: z.enum(["PENDING_REVIEW", "PAYMENT_PENDING", "COMPLETED", "CLOSED"]).optional()
});

const nextId = (prefix) => `${prefix}-${Date.now()}`;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "yorushika-ticket-assist-api",
    env: nodeEnv
  });
});

app.get("/api/sources", (_req, res) => {
  res.json(sourceSnapshot);
});

app.get("/api/events", (_req, res) => {
  res.json({
    checkedAt: sourceSnapshot.checkedAt,
    tourName: sourceSnapshot.tourName,
    events: listEvents()
  });
});

app.get("/api/events/:id", (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "未找到对应场次" });
  }

  return res.json({
    ...event,
    sources: sourceSnapshot.officialSources.filter((source) =>
      ["official", "ticketing", "membership"].includes(source.type)
    ),
    faq: [
      "夜鹿会员注册建议在手机浏览器中完成。",
      "电子票最终显示在 Yorushika 官方 App 中。",
      "平台只管理资料与协同，不替代官方实名购票。"
    ]
  });
});

app.post("/api/auth/register", (req, res) => {
  const result = registrationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  if (getUserByEmail(result.data.email)) {
    return res.status(409).json({ error: "该邮箱已注册" });
  }

  const user = createUser({
    id: nextId("USR"),
    createdAt: new Date().toISOString(),
    ...result.data
  });

  return res.status(201).json({
    message: "本站账号已注册，可以进入票务协同流程。",
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email
    }
  });
});

app.post("/api/auth/login", (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const user = getUserByEmail(result.data.email);
  if (!user || user.password !== result.data.password) {
    return res.status(401).json({ error: "邮箱或密码不正确" });
  }

  return res.json({
    message: "登录成功",
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email
    }
  });
});

app.post("/api/eligibility/check", (req, res) => {
  const result = eligibilitySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const data = result.data;
  const blockers = [];
  const hints = [];

  if (!data.hasPassport) blockers.push("需要用户本人可用护照信息");
  if (!data.canAttendInPerson) blockers.push("官方实名和现场核验要求较强，需本人到场");
  if (!data.canUseOfficialApp) blockers.push("电子票在官方 App 中展示，需可安装并使用官方 App");
  if (!data.hasConfirmedAccommodation) {
    hints.push("建议先提供真实已预订的酒店或民宿地址");
  }
  if (!data.hasOfficialMembership) {
    hints.push("部分会员先行需要夜鹿会员，需根据当前阶段判断是否先开通");
  }
  if (!data.hasJapanesePhone) {
    hints.push("部分流程可能要求手机号或现场窗口处理，需关注官方专题页最新说明");
  }

  return res.json({
    eligible: blockers.length === 0,
    blockers,
    hints,
    allowedFlows: [
      "浏览官方专题与公开规则",
      "跳转官方注册夜鹿会员",
      "提交资料给客服审核",
      "创建人民币支付协助单与便利店付款任务"
    ],
    forbiddenFlows: [
      "伪造地址或手机号",
      "自动提交抽选",
      "绕过实名和电子票限制"
    ]
  });
});

app.post("/api/applications", (req, res) => {
  const result = applicationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const user = getUserByEmail(result.data.accountEmail);
  if (!user) {
    return res.status(404).json({ error: "请先注册本站账号" });
  }

  const event = getEventById(result.data.eventId);
  if (!event) {
    return res.status(404).json({ error: "请选择有效场次" });
  }

  const application = createApplication({
    id: nextId("APP"),
    status: "PENDING_REVIEW",
    createdAt: new Date().toISOString(),
    membershipStatus: event.salesStatus.includes("会员") ? "REQUIRES_MEMBERSHIP" : "OPTIONAL",
    collaborationStage: "PROFILE_REVIEW",
    lotteryStatus: "PENDING",
    ...result.data
  });

  return res.status(201).json({
    id: application.id,
    status: application.status,
    message: "报名申请已创建，等待客服审核。",
    application
  });
});

app.get("/api/applications", (_req, res) => {
  res.json({ items: listApplications() });
});

app.get("/api/applications/:id", (req, res) => {
  const application = getApplicationById(req.params.id);
  if (!application) {
    return res.status(404).json({ error: "未找到报名申请" });
  }

  return res.json({
    ...application,
    timeline: [
      { title: "资料提交", detail: "用户已提交资料。", status: "completed" },
      {
        title: "资格复核",
        detail: "核对实名、入住地址与到场能力。",
        status: application.status === "PENDING_REVIEW" ? "current" : "completed"
      },
      {
        title: "票务协同",
        detail: "服务费支付或便利店付款任务分配。",
        status: application.status === "PAYMENT_PENDING" ? "current" : "upcoming"
      }
    ]
  });
});

app.post("/api/payments/service-fee", (req, res) => {
  const result = serviceFeeOrderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const application = getApplicationById(result.data.applicationId);
  if (!application) {
    return res.status(404).json({ error: "未找到申请单" });
  }

  const payment = createPayment({
    paymentId: nextId("PAY"),
    applicationId: result.data.applicationId,
    provider: result.data.channel,
    amountCny: result.data.amountCny,
    status: "PENDING",
    createdAt: new Date().toISOString()
  });

  updateApplicationStatus(result.data.applicationId, {
    status: "PAYMENT_PENDING",
    collaborationStage: "STORE_PAYMENT_ASSIST",
    lotteryStatus: application.lotteryStatus,
    membershipStatus: application.membershipStatus
  });

  return res.status(201).json({
    ...payment,
    qrCodeUrl: `https://example.com/pay/${result.data.channel}/${Date.now()}`,
    note: "这是人民币支付协助单占位接口，不代表官方票款支付。"
  });
});

app.patch("/api/applications/:id/lottery", (req, res) => {
  const result = lotteryUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const current = getApplicationById(req.params.id);
  if (!current) {
    return res.status(404).json({ error: "未找到报名申请" });
  }

  const updated = updateApplicationStatus(req.params.id, {
    status:
      result.data.status ??
      (result.data.lotteryStatus === "WON" ? "COMPLETED" : result.data.lotteryStatus === "LOST" ? "CLOSED" : current.status),
    collaborationStage: current.collaborationStage,
    membershipStatus: current.membershipStatus,
    lotteryStatus: result.data.lotteryStatus
  });

  return res.json(updated);
});

app.get("/api/portal/:email", (req, res) => {
  const user = getUserByEmail(req.params.email);
  if (!user) {
    return res.status(404).json({ error: "未找到该账号" });
  }

  const userApplications = listApplicationsByEmail(user.email);

  return res.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email
    },
    flow: [
      { title: "注册本站账号", status: "completed" },
      { title: "选择目标场次", status: userApplications.length > 0 ? "completed" : "current" },
      {
        title: "跳转官方注册夜鹿会员",
        status: userApplications.some((item) => item.membershipStatus === "REQUIRES_MEMBERSHIP")
          ? "completed"
          : "upcoming"
      },
      { title: "填写资料并提交申请", status: userApplications.length > 0 ? "completed" : "upcoming" },
      {
        title: "票务协同与便利店付款",
        status: userApplications.some((item) => item.collaborationStage === "STORE_PAYMENT_ASSIST")
          ? "current"
          : "upcoming"
      },
      {
        title: "个人中心查看中签结果",
        status: userApplications.some((item) => item.lotteryStatus !== "PENDING") ? "current" : "upcoming"
      }
    ],
    applications: userApplications.map((item) => ({
      id: item.id,
      eventId: item.eventId,
      eventDate: item.eventDate,
      membershipStatus: item.membershipStatus,
      collaborationStage: item.collaborationStage,
      lotteryStatus: item.lotteryStatus,
      status: item.status
    })),
    notices: [
      "夜鹿会员注册页建议使用手机浏览器打开。",
      "电子票最终展示在 Yorushika 官方 App 中，而不是本站。",
      "站内人民币支付仅用于服务费与协同费用占位，不等于官方票款通道。"
    ]
  });
});

app.get("/api/dashboard", (_req, res) => {
  res.json(getDashboardSnapshot());
});

app.get("/api/payments", (_req, res) => {
  res.json({ items: listPayments(20) });
});

if (nodeEnv === "production") {
  app.use(express.static(webDistDir));

  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(webDistDir, "index.html"));
  });
}

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port} (${nodeEnv})`);
});
