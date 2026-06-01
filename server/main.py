from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="MKB MIS API")


class LoginRequest(BaseModel):
    username: str
    password: str


class PatientCreate(BaseModel):
    full_name: str
    birth_date: str
    phone: str | None = None
    card_number: str | None = None


class Patient(PatientCreate):
    id: int


class StoneCreate(BaseModel):
    patient_id: int
    location: str
    size_mm: float
    stone_type: str | None = None


class Stone(StoneCreate):
    id: int


class ExaminationCreate(BaseModel):
    patient_id: int
    date: str
    examination_type: str
    result: str


class Examination(ExaminationCreate):
    id: int


class PatientCard(BaseModel):
    patient: Patient
    stones: list[Stone]
    examinations: list[Examination]


patients: List[Patient] = []
stones: List[Stone] = []
examinations: List[Examination] = []


def patient_exists(patient_id: int) -> bool:
    return any(patient.id == patient_id for patient in patients)


def find_patient(patient_id: int) -> Patient:
    for patient in patients:
        if patient.id == patient_id:
            return patient

    raise HTTPException(status_code=404, detail="Patient not found")


@app.get("/")
def root():
    return {"message": "MKB MIS server is running"}


@app.post("/login")
def login(data: LoginRequest):
    if data.username == "doctor" and data.password == "1234":
        return {"success": True, "role": "doctor"}

    raise HTTPException(status_code=401, detail="Invalid username or password")


@app.get("/patients", response_model=list[Patient])
def get_patients():
    return patients


@app.get("/patients/{patient_id}", response_model=PatientCard)
def get_patient_card(patient_id: int):
    patient = find_patient(patient_id)
    patient_stones = [stone for stone in stones if stone.patient_id == patient_id]
    patient_examinations = [
        examination
        for examination in examinations
        if examination.patient_id == patient_id
    ]

    return {
        "patient": patient,
        "stones": patient_stones,
        "examinations": patient_examinations,
    }


@app.post("/patients", response_model=Patient)
def add_patient(data: PatientCreate):
    patient = Patient(id=len(patients) + 1, **data.model_dump())
    patients.append(patient)
    return patient


@app.post("/stones", response_model=Stone)
def add_stone(data: StoneCreate):
    if not patient_exists(data.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    stone = Stone(id=len(stones) + 1, **data.model_dump())
    stones.append(stone)
    return stone


@app.get("/stones", response_model=list[Stone])
def get_stones():
    return stones


@app.post("/examinations", response_model=Examination)
def add_examination(data: ExaminationCreate):
    if not patient_exists(data.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    examination = Examination(id=len(examinations) + 1, **data.model_dump())
    examinations.append(examination)
    return examination


@app.get("/examinations", response_model=list[Examination])
def get_examinations():
    return examinations
