/* =====================================================
 * Мок-данные для работы клиента без сервера.
 * Структура строго повторяет schema.sql:
 *   users(id_user, username, password_hash, role, full_name)
 *   patients(id_patient, id_user, full_name, anamnesis)
 *   examinations(id_examination, id_patient, id_user, examination_type)
 *   stones(id_stone, id_patient, location, size_mm)
 * ===================================================== */

window.MOCK_SEED = {
  users: [
    // Пароли в моке хранятся как есть, чтобы можно было войти.
    // На реальном сервере будет password_hash + проверка на бэкенде.
    { id_user: 1, username: "doctor_ivanov",  password: "hash123", role: "doctor", full_name: "Иванов Иван Иванович" },
    { id_user: 2, username: "doctor_petrova", password: "hash456", role: "doctor", full_name: "Петрова Анна Сергеевна" },
    { id_user: 3, username: "admin",          password: "admin",   role: "admin",  full_name: "Администратор системы" }
  ],

  patients: [
    { id_patient: 1, id_user: 1, full_name: "Сидоров Александр Владимирович", anamnesis: "Хронический пиелонефрит, гипертония" },
    { id_patient: 2, id_user: 1, full_name: "Кузнецова Елена Петровна",        anamnesis: "Мочекаменная болезнь с 2018 года" },
    { id_patient: 3, id_user: 2, full_name: "Смирнов Дмитрий Николаевич",       anamnesis: "Подагра, оксалатные камни" }
  ],

  examinations: [
    { id_examination: 1, id_patient: 1, id_user: 1, examination_type: "УЗИ" },
    { id_examination: 2, id_patient: 1, id_user: 1, examination_type: "Анализ мочи" },
    { id_examination: 3, id_patient: 2, id_user: 1, examination_type: "КТ" },
    { id_examination: 4, id_patient: 3, id_user: 2, examination_type: "УЗИ" }
  ],

  stones: [
    { id_stone: 1, id_patient: 1, location: "Левая почка",        size_mm: 12 },
    { id_stone: 2, id_patient: 1, location: "Мочеточник правый",  size_mm: 5 },
    { id_stone: 3, id_patient: 2, location: "Правая почка",        size_mm: 8 },
    { id_stone: 4, id_patient: 3, location: "Мочевой пузырь",      size_mm: 15 }
  ]
};

/* Типовые значения для выпадающих списков в формах */
window.EXAMINATION_TYPES = ["УЗИ", "КТ", "Рентген", "Анализ мочи", "Анализ крови", "Цистоскопия"];
window.STONE_LOCATIONS  = ["Левая почка", "Правая почка", "Мочеточник левый", "Мочеточник правый", "Мочевой пузырь"];
