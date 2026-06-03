const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section + '-section';
        
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        
        if (btn.dataset.section === 'patients') loadPatients();
        if (btn.dataset.section === 'admin') loadDoctors();
    });
});

// ============================================
// ПАЦИЕНТЫ
// ============================================

async function loadPatients(searchQuery = '') {
    const patientsList = document.getElementById('patients-list');
    try {
        const patients = searchQuery 
            ? await API.searchPatients(searchQuery)
            : await API.getAllPatients();
        
        if (patients.length === 0) {
            patientsList.innerHTML = '<p>Пациенты не найдены</p>';
            return;
        }
        
        patientsList.innerHTML = patients.map(patient => `
            <div class="patient-card" onclick="viewPatient(${patient.id})">
                <h3>${patient.fullName}</h3>
                <div class="patient-info">
                    <p><strong>Карта №:</strong> ${patient.cardNumber}</p>
                    <p><strong>Дата рождения:</strong> ${patient.birthDate || 'Не указана'}</p>
                    <p><strong>Телефон:</strong> ${patient.phone || 'Не указан'}</p>
                    ${patient.anamnesis ? `<p><strong>Анамнез:</strong> ${patient.anamnesis.substring(0, 80)}...</p>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        patientsList.innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
        console.error(error);
    }
}

document.getElementById('search-btn').addEventListener('click', () => {
    loadPatients(document.getElementById('patient-search').value.trim());
});

document.getElementById('patient-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadPatients(e.target.value.trim());
});

// ============================================
// КАРТОЧКА ПАЦИЕНТА
// ============================================

async function viewPatient(id) {
    try {
        const patient = await API.getPatientById(id);
        showPatientCard(patient);
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function showPatientCard(patient) {
    navButtons.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('patient-card-section').classList.add('active');
    
    const content = document.getElementById('patient-card-content');
    const stones = patient.history.filter(h => h.type === 'stone');
    const examinations = patient.history.filter(h => h.type === 'examination' || h.type === 'visit');
    
    content.innerHTML = `
        <div class="patient-header">
            <div>
                <h2>${patient.fullName}</h2>
                <p style="color: #666; margin-top: 5px;">
                    Карта №: ${patient.cardNumber} | Врач: ${patient.doctorName}
                </p>
            </div>
        </div>
        
        <div class="patient-details">
            <div class="detail-item">
                <label>Дата рождения</label>
                <span>${patient.birthDate || 'Не указана'}</span>
            </div>
            <div class="detail-item">
                <label>Телефон</label>
                <span>${patient.phone || 'Не указан'}</span>
            </div>
            ${patient.anamnesis ? `
                <div class="anamnesis-block">
                    <label>📋 Анамнез</label>
                    <p>${patient.anamnesis}</p>
                </div>
            ` : ''}
        </div>
        
        <div class="action-buttons">
            <button class="btn btn-danger" onclick="showAddStoneModal(${patient.id})">
                🪨 Добавить камень
            </button>
            <button class="btn btn-primary" onclick="showAddExaminationModal(${patient.id})">
                🔬 Добавить обследование
            </button>
            <button class="btn btn-success" onclick="showAddVisitModal(${patient.id})">
                📋 Добавить приём
            </button>
        </div>
        
        <div class="patient-section">
            <h3>🪨 Камни (${stones.length})</h3>
            ${stones.length > 0 ? stones.map(stone => `
                <div class="history-item stone">
                    <h4>${stone.location}</h4>
                    <p><strong>Размер:</strong> ${stone.size}</p>
                    ${stone.stoneType !== 'Не указан' ? `<p><strong>Тип:</strong> ${stone.stoneType}</p>` : ''}
                </div>
            `).join('') : '<p>Камни не обнаружены</p>'}
        </div>
        
        <div class="patient-section">
            <h3>🔬 Обследования и приёмы (${examinations.length})</h3>
            ${examinations.length > 0 ? examinations.map(exam => `
                <div class="history-item ${exam.type}">
                    <h4>${exam.date} — ${exam.description}</h4>
                    ${exam.result ? `<p><strong>Результат:</strong> ${exam.result}</p>` : ''}
                </div>
            `).join('') : '<p>Обследований пока нет</p>'}
        </div>
    `;
    
    content.dataset.patientId = patient.id;
}

document.getElementById('back-to-list').addEventListener('click', () => {
    document.getElementById('patients-section').classList.add('active');
    document.getElementById('patient-card-section').classList.remove('active');
    document.querySelector('[data-section="patients"]').classList.add('active');
    loadPatients();
});

// ============================================
// ДОБАВЛЕНИЕ ПАЦИЕНТА
// ============================================

document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const patientData = {
        lastName: document.getElementById('last-name').value.trim(),
        firstName: document.getElementById('first-name').value.trim(),
        middleName: document.getElementById('middle-name').value.trim(),
        birthDate: document.getElementById('birth-date').value,
        phone: document.getElementById('phone').value.trim(),
        anamnesis: document.getElementById('anamnesis').value.trim()
    };
    
    try {
        await API.addPatient(patientData);
        alert('Пациент успешно добавлен!');
        document.getElementById('add-patient-form').reset();
        
        document.getElementById('patients-section').classList.add('active');
        document.getElementById('add-patient-section').classList.remove('active');
        document.querySelector('[data-section="patients"]').classList.add('active');
        await loadPatients();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function showAddStoneModal(patientId) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h3>Добавление камня</h3>
        <form id="modal-form">
            <div class="form-group">
                <label>Расположение *</label>
                <input type="text" id="stone-location" required placeholder="Левая почка, мочеточник...">
            </div>
            <div class="form-group">
                <label>Размер (мм) *</label>
                <input type="number" id="stone-size" required placeholder="5" step="0.1" min="0.1">
            </div>
            <div class="form-group">
                <label>Тип камня</label>
                <input type="text" id="stone-type" placeholder="оксалатный, уратный...">
            </div>
            <button type="submit" class="btn btn-danger">Сохранить</button>
        </form>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.addStone(patientId, {
                location: document.getElementById('stone-location').value,
                size: document.getElementById('stone-size').value,
                stoneType: document.getElementById('stone-type').value
            });
            modal.classList.remove('active');
            const patient = await API.getPatientById(patientId);
            showPatientCard(patient);
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
}

function showAddExaminationModal(patientId) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h3>Добавление обследования</h3>
        <form id="modal-form">
            <div class="form-group">
                <label>Тип обследования *</label>
                <input type="text" id="exam-type" required placeholder="УЗИ, КТ, анализ мочи...">
            </div>
            <div class="form-group">
                <label>Дата</label>
                <input type="date" id="exam-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Результат</label>
                <textarea id="exam-result" rows="3" placeholder="Описание результатов..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Сохранить</button>
        </form>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.addExamination(patientId, {
                date: document.getElementById('exam-date').value,
                examination_type: document.getElementById('exam-type').value,
                result: document.getElementById('exam-result').value
            });
            modal.classList.remove('active');
            const patient = await API.getPatientById(patientId);
            showPatientCard(patient);
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
}

function showAddVisitModal(patientId) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h3>Добавление приёма</h3>
        <form id="modal-form">
            <div class="form-group">
                <label>Дата приёма</label>
                <input type="date" id="visit-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Описание *</label>
                <textarea id="visit-description" required rows="3" placeholder="Жалобы, назначения..."></textarea>
            </div>
            <button type="submit" class="btn btn-success">Сохранить</button>
        </form>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.addExamination(patientId, {
                date: document.getElementById('visit-date').value,
                examination_type: 'Приём врача',
                result: document.getElementById('visit-description').value
            });
            modal.classList.remove('active');
            const patient = await API.getPatientById(patientId);
            showPatientCard(patient);
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
}

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) {
        document.getElementById('modal').classList.remove('active');
    }
});

// ============================================
// АДМИНКА
// ============================================

document.getElementById('show-add-doctor-btn').addEventListener('click', () => {
    document.getElementById('add-doctor-form').classList.remove('hidden');
});

document.getElementById('cancel-add-doctor').addEventListener('click', () => {
    document.getElementById('add-doctor-form').classList.add('hidden');
    document.getElementById('doctor-form').reset();
});

document.getElementById('doctor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const doctorData = {
        name: document.getElementById('doc-name').value.trim(),
        login: document.getElementById('doc-login').value.trim(),
        password: document.getElementById('doc-password').value
    };
    
    try {
        await API.addDoctor(doctorData);
        alert('Врач успешно добавлен!');
        document.getElementById('doctor-form').reset();
        document.getElementById('add-doctor-form').classList.add('hidden');
        await loadDoctors();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

async function loadDoctors() {
    const doctorsList = document.getElementById('doctors-list');
    try {
        const doctors = await API.getDoctors();
        
        if (doctors.length === 0) {
            doctorsList.innerHTML = '<p>Нет зарегистрированных врачей</p>';
            return;
        }
        
        doctorsList.innerHTML = doctors.map(doctor => `
            <div class="doctor-item">
                <div>
                    <strong>${doctor.full_name}</strong>
                    <p>Логин: ${doctor.username}</p>
                    <p>Роль: ${doctor.role === 'admin' ? 'Администратор' : 'Врач'}</p>
                </div>
                <button class="btn btn-primary" onclick="showDoctorPatients(${doctor.id}, '${doctor.full_name}')">
                    Посмотреть пациентов
                </button>
            </div>
        `).join('');
    } catch (error) {
        doctorsList.innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
        console.error(error);
    }
}

async function showDoctorPatients(doctorId, doctorName) {
    try {
        const patients = await API.getDoctorPatients(doctorId);
        
        document.getElementById('doctors-list').classList.add('hidden');
        document.getElementById('show-add-doctor-btn').classList.add('hidden');
        document.getElementById('add-doctor-form').classList.add('hidden');
        document.getElementById('doctor-patients-section').classList.remove('hidden');
        document.getElementById('selected-doctor-name').textContent = doctorName;
        
        const patientsListDiv = document.getElementById('doctor-patients-list');
        
        if (patients.length === 0) {
            patientsListDiv.innerHTML = '<p>У этого врача пока нет пациентов</p>';
            return;
        }
        
        patientsListDiv.innerHTML = patients.map(p => `
            <div class="patient-card" onclick="viewPatient(${p.id})">
                <h3>${p.fullName}</h3>
                <div class="patient-info">
                    <p><strong>Карта №:</strong> ${p.cardNumber}</p>
                    <p><strong>Дата рождения:</strong> ${p.birthDate || 'Не указана'}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

document.getElementById('back-to-doctors').addEventListener('click', () => {
    document.getElementById('doctors-list').classList.remove('hidden');
    document.getElementById('show-add-doctor-btn').classList.remove('hidden');
    document.getElementById('doctor-patients-section').classList.add('hidden');
});