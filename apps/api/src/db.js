import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceSnapshot } from "./data/sources.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "../data");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "app.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    account_email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    passport_name TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    accommodation_address TEXT NOT NULL,
    notes TEXT NOT NULL,
    status TEXT NOT NULL,
    membership_status TEXT NOT NULL,
    collaboration_stage TEXT NOT NULL,
    lottery_status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS service_payments (
    payment_id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    amount_cny REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const countUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get();

if (countUsers.count === 0) {
  const now = "2026-03-11T12:30:00+08:00";
  const seedUser = {
    id: "USR-001",
    display_name: "示例用户",
    email: "demo@example.com",
    password: "password123",
    created_at: now
  };

  const seedApplication = {
    id: "APP-20260311-001",
    account_email: "demo@example.com",
    full_name: "示例用户",
    passport_name: "EXAMPLE USER",
    event_id: "evt-osaka-20260418",
    event_date: "2026-04-18",
    accommodation_address: "大阪府大阪市中央区城见 1-1-1",
    notes: "希望客服协助确认公开先行与便利店付款节点。",
    status: "PAYMENT_PENDING",
    membership_status: "REQUIRES_MEMBERSHIP",
    collaboration_stage: "STORE_PAYMENT_ASSIST",
    lottery_status: "PENDING",
    created_at: "2026-03-11T13:00:00+08:00"
  };

  const seedPayment = {
    payment_id: "PAY-20260311-001",
    application_id: seedApplication.id,
    provider: "alipay",
    amount_cny: 299,
    status: "PENDING",
    created_at: "2026-03-11T13:30:00+08:00"
  };

  db.prepare(
    `INSERT INTO users (id, display_name, email, password, created_at)
     VALUES (@id, @display_name, @email, @password, @created_at)`
  ).run(seedUser);

  db.prepare(
    `INSERT INTO applications (
      id, account_email, full_name, passport_name, event_id, event_date,
      accommodation_address, notes, status, membership_status,
      collaboration_stage, lottery_status, created_at
    ) VALUES (
      @id, @account_email, @full_name, @passport_name, @event_id, @event_date,
      @accommodation_address, @notes, @status, @membership_status,
      @collaboration_stage, @lottery_status, @created_at
    )`
  ).run(seedApplication);

  db.prepare(
    `INSERT INTO service_payments (
      payment_id, application_id, provider, amount_cny, status, created_at
    ) VALUES (
      @payment_id, @application_id, @provider, @amount_cny, @status, @created_at
    )`
  ).run(seedPayment);
}

const mapUser = (row) =>
  row && {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    password: row.password,
    createdAt: row.created_at
  };

const mapApplication = (row) =>
  row && {
    id: row.id,
    accountEmail: row.account_email,
    fullName: row.full_name,
    passportName: row.passport_name,
    eventId: row.event_id,
    eventDate: row.event_date,
    accommodationAddress: row.accommodation_address,
    notes: row.notes,
    status: row.status,
    membershipStatus: row.membership_status,
    collaborationStage: row.collaboration_stage,
    lotteryStatus: row.lottery_status,
    createdAt: row.created_at
  };

const mapPayment = (row) =>
  row && {
    paymentId: row.payment_id,
    applicationId: row.application_id,
    provider: row.provider,
    amountCny: row.amount_cny,
    status: row.status,
    createdAt: row.created_at
  };

export function listEvents() {
  return sourceSnapshot.events;
}

export function getEventById(id) {
  return sourceSnapshot.events.find((item) => item.id === id) ?? null;
}

export function createUser(user) {
  db.prepare(
    `INSERT INTO users (id, display_name, email, password, created_at)
     VALUES (@id, @display_name, @email, @password, @created_at)`
  ).run({
    id: user.id,
    display_name: user.displayName,
    email: user.email,
    password: user.password,
    created_at: user.createdAt
  });

  return getUserByEmail(user.email);
}

export function getUserByEmail(email) {
  return mapUser(db.prepare("SELECT * FROM users WHERE email = ?").get(email));
}

export function createApplication(application) {
  db.prepare(
    `INSERT INTO applications (
      id, account_email, full_name, passport_name, event_id, event_date,
      accommodation_address, notes, status, membership_status,
      collaboration_stage, lottery_status, created_at
    ) VALUES (
      @id, @account_email, @full_name, @passport_name, @event_id, @event_date,
      @accommodation_address, @notes, @status, @membership_status,
      @collaboration_stage, @lottery_status, @created_at
    )`
  ).run({
    id: application.id,
    account_email: application.accountEmail,
    full_name: application.fullName,
    passport_name: application.passportName,
    event_id: application.eventId,
    event_date: application.eventDate,
    accommodation_address: application.accommodationAddress,
    notes: application.notes,
    status: application.status,
    membership_status: application.membershipStatus,
    collaboration_stage: application.collaborationStage,
    lottery_status: application.lotteryStatus,
    created_at: application.createdAt
  });

  return getApplicationById(application.id);
}

export function listApplications() {
  return db
    .prepare("SELECT * FROM applications ORDER BY datetime(created_at) DESC")
    .all()
    .map(mapApplication);
}

export function listApplicationsByEmail(email) {
  return db
    .prepare("SELECT * FROM applications WHERE account_email = ? ORDER BY datetime(created_at) DESC")
    .all(email)
    .map(mapApplication);
}

export function getApplicationById(id) {
  return mapApplication(db.prepare("SELECT * FROM applications WHERE id = ?").get(id));
}

export function updateApplicationStatus(id, updates) {
  const current = getApplicationById(id);
  if (!current) return null;

  const next = { ...current, ...updates };
  db.prepare(
    `UPDATE applications SET
      status = @status,
      collaboration_stage = @collaborationStage,
      lottery_status = @lotteryStatus,
      membership_status = @membershipStatus
     WHERE id = @id`
  ).run(next);

  return getApplicationById(id);
}

export function createPayment(payment) {
  db.prepare(
    `INSERT INTO service_payments (
      payment_id, application_id, provider, amount_cny, status, created_at
    ) VALUES (
      @payment_id, @application_id, @provider, @amount_cny, @status, @created_at
    )`
  ).run({
    payment_id: payment.paymentId,
    application_id: payment.applicationId,
    provider: payment.provider,
    amount_cny: payment.amountCny,
    status: payment.status,
    created_at: payment.createdAt
  });

  return getPaymentById(payment.paymentId);
}

export function getPaymentById(id) {
  return mapPayment(db.prepare("SELECT * FROM service_payments WHERE payment_id = ?").get(id));
}

export function listPayments(limit = 5) {
  return db
    .prepare("SELECT * FROM service_payments ORDER BY datetime(created_at) DESC LIMIT ?")
    .all(limit)
    .map(mapPayment);
}

export function getDashboardSnapshot() {
  const applications = listApplications();
  const payments = listPayments(5);

  return {
    metrics: {
      openEvents: sourceSnapshot.events.length,
      pendingApplications: applications.filter((item) => item.status === "PENDING_REVIEW").length,
      pendingStoreTasks: applications.filter((item) => item.collaborationStage === "STORE_PAYMENT_ASSIST")
        .length,
      waitingPaymentProof: payments.filter((item) => item.status === "PENDING").length
    },
    latestApplications: applications.slice(0, 5),
    storeTasks: applications
      .filter((item) => item.collaborationStage === "STORE_PAYMENT_ASSIST")
      .slice(0, 5)
      .map((item, index) => {
        const event = getEventById(item.eventId);
        return {
          id: `TASK-${String(index + 1).padStart(3, "0")}`,
          event: sourceSnapshot.tourName,
          city: event?.city ?? "待确认",
          dueAt: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
          status: item.status === "PAYMENT_PENDING" ? "ASSIGNED" : "WAITING_RECEIPT"
        };
      }),
    payments
  };
}
