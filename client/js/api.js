/* =====================================================
 * Слой доступа к данным.
 *
 * Один и тот же интерфейс Api.* работает в двух режимах:
 *   USE_MOCK = true  -> данные в localStorage (клиент работает без сервера)
 *   USE_MOCK = false -> реальные запросы к REST API сервера (fetch)
 *
 * Чтобы подключить настоящий сервер: поставьте USE_MOCK = false
 * и укажите BASE_URL. Контракт эндпоинтов описан в README.md.
 * ===================================================== */

const USE_MOCK = true;
const BASE_URL = "http://localhost:8000/api";   // адрес сервера команды
const STORAGE_KEY = "mkb_mis_db";

/* ---------- Мок-хранилище (localStorage) ---------- */
const MockDB = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const seed = JSON.parse(JSON.stringify(window.MOCK_SEED));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  },
  save(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); },
  reset()  { localStorage.removeItem(STORAGE_KEY); },
  nextId(rows, key) {
    return rows.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
  }
};

/* ---------- Помощник для реального REST ---------- */
async function http(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  const token = sessionStorage.getItem("mkb_token");
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(BASE_URL + path, opts);
  if (!res.ok) {
    let msg = "Ошибка запроса (" + res.status + ")";
    try { const e = await res.json(); msg = e.detail || e.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* небольшая задержка, чтобы мок вёл себя как сеть */
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

/* =====================================================
 * Публичный интерфейс
 * ===================================================== */
const Api = {

  /* ---------- Аутентификация ---------- */
  async login(username, password) {
    if (!USE_MOCK) return http("POST", "/auth/login", { username, password });

    await delay();
    const db = MockDB.load();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) throw new Error("Неверный логин или пароль");
    const { password: _, ...safe } = user;
    return { token: "mock-token-" + user.id_user, user: safe };
  },

  /* ---------- Пользователи (врачи/админы) ---------- */
  async getUsers() {
    if (!USE_MOCK) return http("GET", "/users");
    await delay();
    return MockDB.load().users.map(({ password, ...u }) => u);
  },

  async getDoctors() {
    if (!USE_MOCK) return http("GET", "/users?role=doctor");
    await delay();
    return MockDB.load().users
      .filter(u => u.role === "doctor")
      .map(({ password, ...u }) => u);
  },

  async createUser(data) {
    // data: { username, password, role, full_name }
    if (!USE_MOCK) return http("POST", "/users", data);
    await delay();
    const db = MockDB.load();
    if (db.users.some(u => u.username === data.username))
      throw new Error("Логин уже занят");
    const user = { id_user: MockDB.nextId(db.users, "id_user"), ...data };
    db.users.push(user);
    MockDB.save(db);
    const { password, ...safe } = user;
    return safe;
  },

  /* ---------- Пациенты ---------- */
  async getPatients(search = "") {
    if (!USE_MOCK) {
      const q = search ? "?search=" + encodeURIComponent(search) : "";
      return http("GET", "/patients" + q);
    }
    await delay();
    const db = MockDB.load();
    const byId = Object.fromEntries(db.users.map(u => [u.id_user, u.full_name]));
    let rows = db.patients.map(p => ({
      ...p,
      doctor_name: byId[p.id_user] || "—",
      stones_count: db.stones.filter(s => s.id_patient === p.id_patient).length,
      examinations_count: db.examinations.filter(e => e.id_patient === p.id_patient).length
    }));
    if (search) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        String(p.id_patient) === q
      );
    }
    return rows;
  },

  async getPatient(id) {
    if (!USE_MOCK) return http("GET", "/patients/" + id);
    await delay();
    const db = MockDB.load();
    const p = db.patients.find(x => x.id_patient === Number(id));
    if (!p) throw new Error("Пациент не найден");
    const doctor = db.users.find(u => u.id_user === p.id_user);
    return { ...p, doctor_name: doctor ? doctor.full_name : "—" };
  },

  async createPatient(data) {
    // data: { full_name, anamnesis, id_user }
    if (!USE_MOCK) return http("POST", "/patients", data);
    await delay();
    const db = MockDB.load();
    const patient = {
      id_patient: MockDB.nextId(db.patients, "id_patient"),
      id_user: Number(data.id_user),
      full_name: data.full_name,
      anamnesis: data.anamnesis || ""
    };
    db.patients.push(patient);
    MockDB.save(db);
    return patient;
  },

  async updatePatient(id, data) {
    if (!USE_MOCK) return http("PUT", "/patients/" + id, data);
    await delay();
    const db = MockDB.load();
    const p = db.patients.find(x => x.id_patient === Number(id));
    if (!p) throw new Error("Пациент не найден");
    p.full_name = data.full_name;
    p.anamnesis = data.anamnesis;
    p.id_user = Number(data.id_user);
    MockDB.save(db);
    return p;
  },

  /* ---------- Камни ---------- */
  async getStones(patientId) {
    if (!USE_MOCK) return http("GET", "/patients/" + patientId + "/stones");
    await delay();
    return MockDB.load().stones.filter(s => s.id_patient === Number(patientId));
  },

  async createStone(patientId, data) {
    // data: { location, size_mm }
    if (!USE_MOCK) return http("POST", "/patients/" + patientId + "/stones", data);
    await delay();
    const db = MockDB.load();
    const stone = {
      id_stone: MockDB.nextId(db.stones, "id_stone"),
      id_patient: Number(patientId),
      location: data.location,
      size_mm: Number(data.size_mm)
    };
    db.stones.push(stone);
    MockDB.save(db);
    return stone;
  },

  async deleteStone(id) {
    if (!USE_MOCK) return http("DELETE", "/stones/" + id);
    await delay();
    const db = MockDB.load();
    db.stones = db.stones.filter(s => s.id_stone !== Number(id));
    MockDB.save(db);
    return null;
  },

  /* ---------- Обследования ---------- */
  async getExaminations(patientId) {
    if (!USE_MOCK) return http("GET", "/patients/" + patientId + "/examinations");
    await delay();
    const db = MockDB.load();
    const byId = Object.fromEntries(db.users.map(u => [u.id_user, u.full_name]));
    return db.examinations
      .filter(e => e.id_patient === Number(patientId))
      .map(e => ({ ...e, doctor_name: byId[e.id_user] || "—" }));
  },

  async createExamination(patientId, data) {
    // data: { examination_type, id_user }
    if (!USE_MOCK) return http("POST", "/patients/" + patientId + "/examinations", data);
    await delay();
    const db = MockDB.load();
    const exam = {
      id_examination: MockDB.nextId(db.examinations, "id_examination"),
      id_patient: Number(patientId),
      id_user: Number(data.id_user),
      examination_type: data.examination_type
    };
    db.examinations.push(exam);
    MockDB.save(db);
    return exam;
  },

  async deleteExamination(id) {
    if (!USE_MOCK) return http("DELETE", "/examinations/" + id);
    await delay();
    const db = MockDB.load();
    db.examinations = db.examinations.filter(e => e.id_examination !== Number(id));
    MockDB.save(db);
    return null;
  },

  /* служебное: сброс мок-данных к исходным */
  resetMock() { MockDB.reset(); }
};

window.Api = Api;
