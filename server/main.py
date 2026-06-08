from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="MKB MIS API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Модели
# ============================================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "doctor"
    full_name: str


class User(UserCreate):
    id: int


class PatientCreate(BaseModel):
    full_name: str
    birth_date: str
    phone: str | None = None
    card_number: str | None = None
    anamnesis: str | None = None
    doctor_id: int | None = None


class Patient(PatientCreate):
    id: int


class StoneCreate(BaseModel):
    patient_id: int
    location: str
    size_mm: float
    stone_type: str | None = None
    detected_date: str | None = None


class Stone(StoneCreate):
    id: int


class ExaminationCreate(BaseModel):
    patient_id: int
    date: str
    examination_type: str
    result: str
    doctor_id: int | None = None


class Examination(ExaminationCreate):
    id: int


class PatientCard(BaseModel):
    patient: Patient
    doctor: User | None = None
    stones: list[Stone]
    examinations: list[Examination]


# ============================================
# ТЕСТОВЫЕ ДАННЫЕ
# ============================================

users: List[User] = [
    User(id=1, username="doctor", password="1234", role="doctor", full_name="Иванов Иван Иванович"),
    User(id=2, username="admin", password="admin", role="admin", full_name="Петров Петр Петрович"),
    User(id=3, username="doctor_petrova", password="1234", role="doctor", full_name="Петрова Анна Сергеевна"),
]

patients: List[Patient] = [
    Patient(
        id=1,
        full_name="Сидоров Александр Владимирович",
        birth_date="1980-05-15",
        phone="+7 (999) 123-45-67",
        card_number="P001",
        anamnesis="Хронический пиелонефрит, гипертония. Мочекаменная болезнь с 2019 года.",
        doctor_id=1
    ),
    Patient(
        id=2,
        full_name="Кузнецова Елена Петровна",
        birth_date="1990-08-22",
        phone="+7 (999) 987-65-43",
        card_number="P002",
        anamnesis="Мочекаменная болезнь с 2018 года. Дважды проходила литотрипсию.",
        doctor_id=1
    ),
    Patient(
        id=3,
        full_name="Смирнов Дмитрий Николаевич",
        birth_date="1975-03-10",
        phone="+7 (999) 555-44-33",
        card_number="P003",
        anamnesis="Подагра, оксалатные камни. Операция на левой почке в 2020 году.",
        doctor_id=3
    ),
    Patient(
        id=4,
        full_name="Иванова Мария Сергеевна",
        birth_date="1988-12-01",
        phone="+7 (999) 111-22-33",
        card_number="P004",
        anamnesis="Беременность 20 недель. Обнаружен камень правой почки.",
        doctor_id=3
    ),
    Patient(
        id=5,
        full_name="Петров Алексей Иванович",
        birth_date="1995-07-18",
        phone="+7 (999) 444-55-66",
        card_number="P005",
        anamnesis="Спортсмен. Жалобы на боли в пояснице. Подозрение на МКБ.",
        doctor_id=1
    ),
]

stones: List[Stone] = [
    Stone(id=1, patient_id=1, location="Левая почка", size_mm=12.0, stone_type="оксалатный", detected_date="2024-01-15"),
    Stone(id=2, patient_id=1, location="Мочеточник правый", size_mm=5.0, stone_type="уратный", detected_date="2024-01-15"),
    Stone(id=3, patient_id=2, location="Правая почка", size_mm=8.0, stone_type="фосфатный", detected_date="2024-02-10"),
    Stone(id=4, patient_id=3, location="Мочевой пузырь", size_mm=15.0, stone_type="оксалатный", detected_date="2024-03-05"),
    Stone(id=5, patient_id=4, location="Правая почка", size_mm=4.0, stone_type="не определён", detected_date="2024-03-12"),
    Stone(id=6, patient_id=5, location="Левая почка", size_mm=6.0, stone_type="уратный", detected_date="2024-04-01"),
]

examinations: List[Examination] = [
    Examination(id=1, patient_id=1, date="2024-01-15", examination_type="УЗИ почек", result="Камень левой почки 12 мм, камень мочеточника 5 мм", doctor_id=1),
    Examination(id=2, patient_id=1, date="2024-01-20", examination_type="Анализ мочи", result="Оксалаты повышены, pH 5.5", doctor_id=1),
    Examination(id=3, patient_id=2, date="2024-02-10", examination_type="КТ почек", result="Камень правой почки 8 мм, без обструкции", doctor_id=1),
    Examination(id=4, patient_id=2, date="2024-02-15", examination_type="Приём врача", result="Назначена литотрипсия", doctor_id=1),
    Examination(id=5, patient_id=3, date="2024-03-05", examination_type="УЗИ", result="Камень мочевого пузыря 15 мм, требуется операция", doctor_id=3),
    Examination(id=6, patient_id=4, date="2024-03-12", examination_type="УЗИ почек", result="Камень правой почки 4 мм, динамическое наблюдение", doctor_id=3),
    Examination(id=7, patient_id=5, date="2024-04-01", examination_type="КТ", result="Камень левой почки 6 мм, без признаков обструкции", doctor_id=1),
    Examination(id=8, patient_id=5, date="2024-04-10", examination_type="Анализ мочи", result="Ураты повышены", doctor_id=1),
]


# ============================================
# Вспомогательные функции
# ============================================

def find_user(user_id: int) -> User:
    for user in users:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")


def find_patient(patient_id: int) -> Patient:
    for patient in patients:
        if patient.id == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")


# ============================================
# API
# ============================================

@app.get("/")
def root():
    return {"message": "MKB MIS server is running"}


# --- Логин ---
@app.post("/login")
def login(data: LoginRequest):
    for user in users:
        if user.username == data.username and user.password == data.password:
            return {"success": True, "role": user.role, "name": user.full_name, "id": user.id}
    raise HTTPException(status_code=401, detail="Invalid username or password")


# --- Врачи ---
@app.get("/users")
def get_users():
    return users


@app.post("/users")
def add_user(data: UserCreate):
    new_user = User(id=len(users) + 1, **data.model_dump())
    users.append(new_user)
    return new_user


@app.get("/users/{user_id}/patients")
def get_user_patients(user_id: int):
    find_user(user_id)
    return [p for p in patients if p.doctor_id == user_id]


# --- Пациенты ---
@app.get("/patients")
def get_patients():
    return patients


@app.get("/patients/{patient_id}", response_model=PatientCard)
def get_patient_card(patient_id: int):
    patient = find_patient(patient_id)
    
    doctor = None
    if patient.doctor_id:
        try:
            doctor = find_user(patient.doctor_id)
        except HTTPException:
            pass
    
    patient_stones = [s for s in stones if s.patient_id == patient_id]
    patient_examinations = [e for e in examinations if e.patient_id == patient_id]

    return {
        "patient": patient,
        "doctor": doctor,
        "stones": patient_stones,
        "examinations": patient_examinations,
    }


@app.post("/patients")
def add_patient(data: PatientCreate):
    patient = Patient(id=len(patients) + 1, **data.model_dump())
    patients.append(patient)
    return patient


# --- Камни ---
@app.post("/stones")
def add_stone(data: StoneCreate):
    if not any(p.id == data.patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
    stone = Stone(id=len(stones) + 1, **data.model_dump())
    stones.append(stone)
    return stone


@app.get("/stones")
def get_stones():
    return stones


# --- Обследования ---
@app.post("/examinations")
def add_examination(data: ExaminationCreate):
    if not any(p.id == data.patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
    examination = Examination(id=len(examinations) + 1, **data.model_dump())
    examinations.append(examination)
    return examination


@app.get("/examinations")
def get_examinations():
    return examinations
