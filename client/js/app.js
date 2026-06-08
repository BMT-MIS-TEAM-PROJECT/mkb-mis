/* =====================================================
 * МКБ-МИС — клиентская логика (рабочее место врача)
 * ===================================================== */
"use strict";

/* ---------- Состояние ---------- */
const State = {
  user: null,            // текущий пользователь {id_user, role, full_name, ...}
  doctors: [],           // список врачей (для выпадающих списков)
  currentPatient: null,  // открытая карточка пациента
  editing: false
};

/* ---------- Короткие хелперы ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg, type = "ok") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast toast--" + type;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- Навигация между экранами ---------- */
function showView(id) {
  $$(".content .view").forEach(v => v.hidden = true);
  $("#" + id).hidden = false;
  $$(".navlink").forEach(n => n.classList.remove("active"));
  if (id === "view-patients") $("#nav-patients").classList.add("active");
  if (id === "view-admin")    $("#nav-admin").classList.add("active");
}

/* =====================================================
 * АУТЕНТИФИКАЦИЯ
 * ===================================================== */
function restoreSession() {
  const raw = sessionStorage.getItem("mkb_user");
  if (raw) { State.user = JSON.parse(raw); enterApp(); }
}

async function handleLogin(e) {
  e.preventDefault();
  const errBox = $("#login-error");
  errBox.hidden = true;
  const username = $("#login-username").value.trim();
  const password = $("#login-password").value;

  try {
    const { token, user } = await Api.login(username, password);
    sessionStorage.setItem("mkb_token", token);
    sessionStorage.setItem("mkb_user", JSON.stringify(user));
    State.user = user;
    enterApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
}

function logout() {
  sessionStorage.removeItem("mkb_token");
  sessionStorage.removeItem("mkb_user");
  State.user = null;
  $("#app").hidden = true;
  $("#view-login").hidden = false;
  $("#login-form").reset();
}

async function enterApp() {
  $("#view-login").hidden = true;
  $("#app").hidden = false;

  const roleLabel = State.user.role === "admin" ? "администратор" : "врач";
  $("#current-user").innerHTML =
    `<strong>${esc(State.user.full_name)}</strong> · ${roleLabel}`;

  // Доступ к разделу аккаунтов — только администратору
  $("#nav-admin").hidden = State.user.role !== "admin";

  State.doctors = await Api.getDoctors();
  showView("view-patients");
  await loadPatients();
}

/* =====================================================
 * СПИСОК ПАЦИЕНТОВ + ПОИСК
 * ===================================================== */
let searchTimer = null;

async function loadPatients(search = "") {
  const rows = await Api.getPatients(search);
  const tbody = $("#patients-tbody");
  tbody.innerHTML = "";
  $("#patients-empty").hidden = rows.length > 0;

  rows.forEach(p => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML = `
      <td>#${p.id_patient}</td>
      <td>${esc(p.full_name)}</td>
      <td>${esc(p.doctor_name)}</td>
      <td class="num">${p.stones_count}</td>
      <td class="num">${p.examinations_count}</td>
      <td class="num">→</td>`;
    tr.addEventListener("click", () => openPatient(p.id_patient));
    tbody.appendChild(tr);
  });
}

function onSearchInput(e) {
  clearTimeout(searchTimer);
  const val = e.target.value;
  searchTimer = setTimeout(() => loadPatients(val), 200);
}

/* =====================================================
 * КАРТОЧКА ПАЦИЕНТА
 * ===================================================== */
function fillDoctorSelect(select, selectedId) {
  select.innerHTML = State.doctors
    .map(d => `<option value="${d.id_user}">${esc(d.full_name)}</option>`)
    .join("");
  if (selectedId != null) select.value = String(selectedId);
}

async function openPatient(id) {
  State.editing = false;
  const p = await Api.getPatient(id);
  State.currentPatient = p;

  $("#patient-title").textContent = p.full_name;
  const form = $("#patient-form");
  form.id_patient.value = "#" + p.id_patient;
  form.full_name.value = p.full_name;
  form.anamnesis.value = p.anamnesis || "";
  fillDoctorSelect(form.id_user, p.id_user);

  setPatientEditMode(false);
  showView("view-patient");
  await Promise.all([loadStones(id), loadExaminations(id)]);
}

function setPatientEditMode(on) {
  State.editing = on;
  const form = $("#patient-form");
  // номер карты не редактируется никогда
  ["full_name", "anamnesis", "id_user"].forEach(n => form[n].disabled = !on);
  $("#patient-form-actions").hidden = !on;
  $("#btn-edit-patient").hidden = on;
}

async function savePatient(e) {
  e.preventDefault();
  const form = $("#patient-form");
  const data = {
    full_name: form.full_name.value.trim(),
    anamnesis: form.anamnesis.value.trim(),
    id_user: form.id_user.value
  };
  if (!data.full_name) { toast("Укажите ФИО пациента", "error"); return; }
  try {
    await Api.updatePatient(State.currentPatient.id_patient, data);
    toast("Данные пациента сохранены");
    await openPatient(State.currentPatient.id_patient);
  } catch (err) { toast(err.message, "error"); }
}

/* ---------- Журнал: камни ---------- */
async function loadStones(patientId) {
  const stones = await Api.getStones(patientId);
  const tbody = $("#stones-tbody");
  tbody.innerHTML = "";
  $("#stones-empty").hidden = stones.length > 0;
  stones.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${s.id_stone}</td>
      <td>${esc(s.location)}</td>
      <td class="num">${s.size_mm}</td>
      <td class="num">
        <button class="btn btn--danger btn--sm" data-stone="${s.id_stone}">Удалить</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $$("#stones-tbody [data-stone]").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Удалить запись о камне?")) return;
      await Api.deleteStone(b.dataset.stone);
      toast("Запись удалена");
      await loadStones(patientId);
    }));
}

/* ---------- Журнал: обследования ---------- */
async function loadExaminations(patientId) {
  const exams = await Api.getExaminations(patientId);
  const tbody = $("#exams-tbody");
  tbody.innerHTML = "";
  $("#exams-empty").hidden = exams.length > 0;
  exams.forEach(ex => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${ex.id_examination}</td>
      <td>${esc(ex.examination_type)}</td>
      <td>${esc(ex.doctor_name || "—")}</td>
      <td class="num">
        <button class="btn btn--danger btn--sm" data-exam="${ex.id_examination}">Удалить</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $$("#exams-tbody [data-exam]").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Удалить запись об обследовании?")) return;
      await Api.deleteExamination(b.dataset.exam);
      toast("Запись удалена");
      await loadExaminations(patientId);
    }));
}

/* =====================================================
 * МОДАЛЬНЫЕ ФОРМЫ (универсальный конструктор)
 * ===================================================== */
const Modal = {
  open(title, fields, onSubmit) {
    $("#modal-title").textContent = title;
    const form = $("#modal-form");
    form.innerHTML = fields.map(f => Modal._fieldHtml(f)).join("");
    $("#modal-overlay").hidden = false;

    Modal._submit = async () => {
      const data = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        const val = el.value.trim();
        if (f.required && !val) { toast("Заполните: " + f.label, "error"); el.focus(); return; }
        data[f.name] = val;
      }
      try {
        await onSubmit(data);
        Modal.close();
      } catch (err) { toast(err.message, "error"); }
    };
    setTimeout(() => { const first = form.querySelector("input,select,textarea"); if (first) first.focus(); }, 50);
  },

  _fieldHtml(f) {
    const wide = f.wide ? " field--full" : "";
    let control;
    if (f.type === "select") {
      const opts = f.options.map(o => {
        const value = typeof o === "object" ? o.value : o;
        const label = typeof o === "object" ? o.label : o;
        return `<option value="${esc(value)}">${esc(label)}</option>`;
      }).join("");
      control = `<select name="${f.name}">${opts}</select>`;
    } else if (f.type === "textarea") {
      control = `<textarea name="${f.name}" rows="3"></textarea>`;
    } else {
      control = `<input type="${f.type || "text"}" name="${f.name}" ${f.attrs || ""} />`;
    }
    return `<label class="field${wide}">
              <span class="field__label">${esc(f.label)}</span>${control}
            </label>`;
  },

  close() {
    $("#modal-overlay").hidden = true;
    $("#modal-form").innerHTML = "";
    Modal._submit = null;
  }
};

/* ---------- Добавить пациента ---------- */
function addPatientDialog() {
  Modal.open("Новый пациент", [
    { name: "full_name", label: "ФИО пациента", required: true, wide: true },
    { name: "id_user", label: "Лечащий врач", type: "select",
      options: State.doctors.map(d => ({ value: d.id_user, label: d.full_name })), wide: true },
    { name: "anamnesis", label: "Анамнез", type: "textarea", wide: true }
  ], async (data) => {
    const p = await Api.createPatient(data);
    toast("Пациент добавлен");
    await loadPatients($("#patient-search").value);
    openPatient(p.id_patient);
  });
}

/* ---------- Добавить камень ---------- */
function addStoneDialog() {
  const pid = State.currentPatient.id_patient;
  Modal.open("Новый камень", [
    { name: "location", label: "Локализация", type: "select", options: window.STONE_LOCATIONS, wide: true },
    { name: "size_mm", label: "Размер, мм", type: "number", required: true, attrs: 'min="1" step="1"' }
  ], async (data) => {
    if (Number(data.size_mm) <= 0) throw new Error("Размер должен быть больше 0");
    await Api.createStone(pid, data);
    toast("Камень добавлен");
    await loadStones(pid);
    await refreshCurrentCounts();
  });
}

/* ---------- Добавить обследование ---------- */
function addExamDialog() {
  const pid = State.currentPatient.id_patient;
  Modal.open("Новое обследование", [
    { name: "examination_type", label: "Тип обследования", type: "select", options: window.EXAMINATION_TYPES, wide: true },
    { name: "id_user", label: "Врач", type: "select",
      options: State.doctors.map(d => ({ value: d.id_user, label: d.full_name })), wide: true }
  ], async (data) => {
    await Api.createExamination(pid, data);
    toast("Обследование добавлено");
    await loadExaminations(pid);
    await refreshCurrentCounts();
  });
}

async function refreshCurrentCounts() {
  // обновить счётчики в списке, если вернёмся к нему
  // (список перечитается сам при возврате, поэтому здесь ничего не нужно)
}

/* ---------- Админ: создать аккаунт врача ---------- */
async function loadAccounts() {
  const users = await Api.getUsers();
  const tbody = $("#accounts-tbody");
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>#${u.id_user}</td>
      <td>${esc(u.username)}</td>
      <td>${esc(u.full_name)}</td>
      <td><span class="badge badge--${u.role}">${u.role === "admin" ? "Администратор" : "Врач"}</span></td>
    </tr>`).join("");
}

function addAccountDialog() {
  Modal.open("Новый аккаунт врача", [
    { name: "full_name", label: "ФИО", required: true, wide: true },
    { name: "username", label: "Логин", required: true },
    { name: "password", label: "Пароль", type: "password", required: true },
    { name: "role", label: "Роль", type: "select",
      options: [{ value: "doctor", label: "Врач" }, { value: "admin", label: "Администратор" }], wide: true }
  ], async (data) => {
    await Api.createUser(data);
    toast("Аккаунт создан");
    State.doctors = await Api.getDoctors();
    await loadAccounts();
  });
}

/* =====================================================
 * ПРИВЯЗКА СОБЫТИЙ
 * ===================================================== */
function bindEvents() {
  $("#login-form").addEventListener("submit", handleLogin);
  $("#btn-logout").addEventListener("click", logout);

  $("#nav-home").addEventListener("click", () => { showView("view-patients"); loadPatients($("#patient-search").value); });
  $("#nav-patients").addEventListener("click", () => { showView("view-patients"); loadPatients($("#patient-search").value); });
  $("#nav-admin").addEventListener("click", () => { showView("view-admin"); loadAccounts(); });

  $("#patient-search").addEventListener("input", onSearchInput);
  $("#btn-add-patient").addEventListener("click", addPatientDialog);

  $("#btn-back-to-list").addEventListener("click", () => { showView("view-patients"); loadPatients($("#patient-search").value); });
  $("#btn-edit-patient").addEventListener("click", () => setPatientEditMode(true));
  $("#btn-cancel-edit").addEventListener("click", () => openPatient(State.currentPatient.id_patient));
  $("#patient-form").addEventListener("submit", savePatient);

  $("#btn-add-stone").addEventListener("click", addStoneDialog);
  $("#btn-add-exam").addEventListener("click", addExamDialog);

  $("#btn-add-account").addEventListener("click", addAccountDialog);

  // Модальное окно
  $("#modal-submit").addEventListener("click", () => Modal._submit && Modal._submit());
  $("#modal-cancel").addEventListener("click", () => Modal.close());
  $("#modal-close").addEventListener("click", () => Modal.close());
  $("#modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") Modal.close(); });
  $("#modal-form").addEventListener("submit", (e) => { e.preventDefault(); Modal._submit && Modal._submit(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") Modal.close(); });
}

/* ---------- Старт ---------- */
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  restoreSession();
});
