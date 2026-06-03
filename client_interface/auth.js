let currentUser = null;

// При загрузке страницы — всегда показываем экран входа
// Не восстанавливаем сессию автоматически
document.addEventListener('DOMContentLoaded', () => {
    // Очищаем сохранённого пользователя при загрузке страницы
    localStorage.removeItem('currentUser');
    
    // Всегда показываем экран входа
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const login = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    
    try {
        const user = await API.login(login, password);
        currentUser = user;
        
        // Сохраняем текущего пользователя
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        showMainScreen();
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка входа';
    }
});

function showMainScreen() {
    // Скрываем экран входа
    document.getElementById('login-screen').classList.remove('active');
    
    // Показываем главный экран
    document.getElementById('main-screen').classList.add('active');
    
    // Обновляем информацию о пользователе
    document.getElementById('current-user').textContent = currentUser.name;
    
    // Устанавливаем роль
    const roleBadge = document.getElementById('user-role');
    const adminBtn = document.getElementById('admin-btn');
    
    if (currentUser.role === 'admin') {
        roleBadge.textContent = 'Администратор';
        roleBadge.style.background = '#e74c3c';
        adminBtn.style.display = 'block';
    } else {
        roleBadge.textContent = 'Врач';
        roleBadge.style.background = '#3498db';
        adminBtn.style.display = 'none';
    }
    
    // Сбрасываем навигацию на пациентов
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const patientsBtn = document.querySelector('[data-section="patients"]');
    if (patientsBtn) patientsBtn.classList.add('active');
    
    // Показываем секцию пациентов
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const patientsSection = document.getElementById('patients-section');
    if (patientsSection) patientsSection.classList.add('active');
    
    // Загружаем список пациентов
    loadPatients();
}

// Выход из системы
document.getElementById('logout-btn').addEventListener('click', () => {
    // Очищаем данные
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    // Скрываем главный экран
    document.getElementById('main-screen').classList.remove('active');
    
    // Показываем экран входа
    document.getElementById('login-screen').classList.add('active');
    
    // Сбрасываем форму
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
});