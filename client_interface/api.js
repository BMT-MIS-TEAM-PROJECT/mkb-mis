const API_BASE_URL = 'http://127.0.0.1:8000';

const API = {
    // Авторизация
    async login(username, password) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Ошибка входа');
        }
        
        const data = await response.json();
        return { 
            id: data.id,
            login: username, 
            role: data.role, 
            name: data.name
        };
    },

    // Получить список врачей
    async getDoctors() {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error('Ошибка загрузки врачей');
        return await response.json();
    },

    // Добавить врача
    async addDoctor(doctorData) {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: doctorData.login,
                password: doctorData.password,
                role: 'doctor',
                full_name: doctorData.name
            })
        });
        if (!response.ok) throw new Error('Ошибка добавления врача');
        return await response.json();
    },

    // Получить пациентов врача
    async getDoctorPatients(doctorId) {
        const response = await fetch(`${API_BASE_URL}/users/${doctorId}/patients`);
        if (!response.ok) throw new Error('Ошибка загрузки пациентов врача');
        const patients = await response.json();
        return patients.map(p => ({
            id: p.id,
            cardNumber: p.card_number || `P${String(p.id).padStart(3, '0')}`,
            lastName: p.full_name.split(' ')[0] || '',
            firstName: p.full_name.split(' ')[1] || '',
            middleName: p.full_name.split(' ')[2] || '',
            fullName: p.full_name,
            birthDate: p.birth_date || '',
            phone: p.phone || '',
            anamnesis: p.anamnesis || '',
            doctorId: p.doctor_id
        }));
    },

    // Получить всех пациентов
    async getAllPatients() {
        const response = await fetch(`${API_BASE_URL}/patients`);
        if (!response.ok) throw new Error('Ошибка загрузки пациентов');
        const patients = await response.json();
        
        return patients.map(p => ({
            id: p.id,
            cardNumber: p.card_number || `P${String(p.id).padStart(3, '0')}`,
            lastName: p.full_name.split(' ')[0] || '',
            firstName: p.full_name.split(' ')[1] || '',
            middleName: p.full_name.split(' ')[2] || '',
            fullName: p.full_name,
            birthDate: p.birth_date || '',
            phone: p.phone || '',
            anamnesis: p.anamnesis || '',
            doctorId: p.doctor_id
        }));
    },

    // Поиск пациентов
    async searchPatients(query) {
        const allPatients = await this.getAllPatients();
        const lowerQuery = query.toLowerCase();
        return allPatients.filter(p => 
            p.fullName.toLowerCase().includes(lowerQuery) ||
            p.cardNumber.toLowerCase().includes(lowerQuery)
        );
    },

    // Получить карточку пациента
    async getPatientById(id) {
        const response = await fetch(`${API_BASE_URL}/patients/${id}`);
        if (!response.ok) throw new Error('Пациент не найден');
        
        const data = await response.json();
        
        return {
            id: data.patient.id,
            cardNumber: data.patient.card_number || `P${String(data.patient.id).padStart(3, '0')}`,
            fullName: data.patient.full_name,
            birthDate: data.patient.birth_date || '',
            phone: data.patient.phone || '',
            anamnesis: data.patient.anamnesis || '',
            doctorId: data.patient.doctor_id,
            doctorName: data.doctor ? data.doctor.full_name : 'Не назначен',
            history: [
                ...data.stones.map(s => ({
                    id: s.id,
                    date: s.detected_date || '',
                    type: 'stone',
                    description: `Камень в ${s.location}`,
                    size: `${s.size_mm} мм`,
                    location: s.location,
                    stoneType: s.stone_type || 'Не указан'
                })),
                ...data.examinations.map(e => ({
                    id: e.id,
                    date: e.date,
                    type: 'examination',
                    description: e.examination_type,
                    result: e.result || ''
                }))
            ].sort((a, b) => b.date.localeCompare(a.date))
        };
    },

    // Добавить пациента
    async addPatient(patientData) {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: `${patientData.lastName} ${patientData.firstName} ${patientData.middleName}`.trim(),
                birth_date: patientData.birthDate,
                phone: patientData.phone || null,
                card_number: null,
                anamnesis: patientData.anamnesis || null,
                doctor_id: patientData.doctorId || null
            })
        });
        
        if (!response.ok) throw new Error('Ошибка добавления пациента');
        return await response.json();
    },

    // Добавить камень
    async addStone(patientId, stoneData) {
        const response = await fetch(`${API_BASE_URL}/stones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                location: stoneData.location || 'Не указано',
                size_mm: parseFloat(stoneData.size) || 0,
                stone_type: stoneData.stoneType || null,
                detected_date: stoneData.detectedDate || new Date().toISOString().split('T')[0]
            })
        });
        
        if (!response.ok) throw new Error('Ошибка добавления камня');
        return await response.json();
    },

    // Добавить обследование
    async addExamination(patientId, examData) {
        const response = await fetch(`${API_BASE_URL}/examinations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                date: examData.date || new Date().toISOString().split('T')[0],
                examination_type: examData.examination_type || examData.description || 'Обследование',
                result: examData.result || '',
                doctor_id: examData.doctorId || null
            })
        });
        
        if (!response.ok) throw new Error('Ошибка добавления обследования');
        return await response.json();
    }
};