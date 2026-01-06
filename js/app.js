// ============================================
// GŁÓWNA APLIKACJA
// ============================================

// Stan aplikacji
const state = {
  
    profile: JSON.parse(localStorage.getItem('profile')) || {
        name: 'Twoje Imię',
        avatar: '👤'
    },
    visibleTabs: JSON.parse(localStorage.getItem('visibleTabs')) || {
        tasks: true,
        workouts: true,
        calories: true,
        projects: true,
        sleep: true,
        charts: true,
        health: true
    },
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    workouts: JSON.parse(localStorage.getItem('workouts')) || [],
    meals: JSON.parse(localStorage.getItem('meals')) || [],
    projects: JSON.parse(localStorage.getItem('projects')) || [],
    sleep: JSON.parse(localStorage.getItem('sleep')) || [],
    supplements: JSON.parse(localStorage.getItem('supplements')) || [
        { id: 1, name: 'Kreatyna', dose: '5g', time: 'rano', icon: '💪' },
        { id: 2, name: 'Ashwagandha', dose: '600mg', time: 'wieczorem', icon: '🧘' }
    ],
    supplementLogs: JSON.parse(localStorage.getItem('supplementLogs')) || [],
    weight: JSON.parse(localStorage.getItem('weight')) || [],
    weightGoal: JSON.parse(localStorage.getItem('weightGoal')) || { start: null, goal: null },
     profile: JSON.parse(localStorage.getItem('profile')) || { name: 'Twoje Imię', avatar: '👤' },
    visibleTabs: JSON.parse(localStorage.getItem('visibleTabs')) || { tasks: true, workouts: true, calories: true, projects: true, sleep: true, charts: true, health: true },
    
    settings: JSON.parse(localStorage.getItem('settings')) || {
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 250,
        fatsGoal: 65
  
    },
    achievements: JSON.parse(localStorage.getItem('achievements')) || []
};

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderAll();
    updateStats();
    checkAchievements();
     registerServiceWorker();
});

// ============================================
// NAWIGACJA
// ============================================

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Usuń active ze wszystkich
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Dodaj active do klikniętego
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
    
    // Filtry zadań
    document.querySelectorAll('.filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.filter);
        });
    });
}

// ============================================
// ZADANIA (TASKS)
// ============================================

function openTaskModal(taskId = null) {
    const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${task ? 'Edytuj Zadanie' : 'Nowe Zadanie'}</h3>
        <form onsubmit="saveTask(event, ${taskId})">
            <div class="form-group">
                <label>Nazwa zadania</label>
                <input type="text" id="task-title" required value="${task?.title || ''}" 
                       placeholder="Co chcesz zrobić?">
            </div>
            <div class="form-group">
                <label>Priorytet</label>
                <select id="task-priority">
                    <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Niski</option>
                    <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Średni</option>
                    <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>Wysoki</option>
                </select>
            </div>
            <div class="form-group">
                <label>Punkty za wykonanie</label>
                <input type="number" id="task-points" value="${task?.points || 10}" min="1" max="100">
            </div>
            <div class="form-group">
                <label>Termin (opcjonalnie)</label>
                <input type="date" id="task-deadline" value="${task?.deadline || ''}">
            </div>
            <button type="submit" class="submit-btn">
                ${task ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            </button>
        </form>
    `;
    
    openModal();
}

function saveTask(e, editId = null) {
    e.preventDefault();
    
    const task = {
        id: editId || Date.now(),
        title: document.getElementById('task-title').value,
        priority: document.getElementById('task-priority').value,
        points: parseInt(document.getElementById('task-points').value),
        deadline: document.getElementById('task-deadline').value,
        completed: editId ? state.tasks.find(t => t.id === editId)?.completed : false,
        completedAt: null,
        createdAt: editId ? state.tasks.find(t => t.id === editId)?.createdAt : new Date().toISOString()
    };
    
    if (editId) {
        const index = state.tasks.findIndex(t => t.id === editId);
        state.tasks[index] = task;
    } else {
        state.tasks.push(task);
    }
    
    saveData();
    renderTasks();
    updateStats();
    closeModal();
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    
    saveData();
    renderTasks();
    updateStats();
    checkAchievements();
    
    if (task.completed) {
        showNotification(`+${task.points} punktów! 🎉`);
    }
}

function deleteTask(id) {
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        updateStats();
    }
}

function renderTasks(filter = 'all') {
    const list = document.getElementById('task-list');
    let tasks = [...state.tasks];
    
    // Filtrowanie
    if (filter === 'active') tasks = tasks.filter(t => !t.completed);
    if (filter === 'done') tasks = tasks.filter(t => t.completed);
    
    // Sortowanie - aktywne najpierw, potem po priorytecie
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    list.innerHTML = tasks.length === 0 
        ? '<p style="text-align:center; color: #999; padding: 40px;">Brak zadań</p>'
        : tasks.map(task => `
            <li class="item ${task.completed ? 'completed' : ''}">
                <div class="item-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="toggleTask(${task.id})"></div>
                <div class="item-content" onclick="openTaskModal(${task.id})">
                    <div class="item-title">${task.title}</div>
                    <div class="item-meta">
                        <span class="priority-tag priority-${task.priority}">
                            ${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} 
                            ${task.priority}
                        </span>
                        <span>+${task.points} pkt</span>
                        ${task.deadline ? `<span>📅 ${formatDate(task.deadline)}</span>` : ''}
                    </div>
                </div>
                <button class="item-delete" onclick="deleteTask(${task.id})">🗑️</button>
            </li>
        `).join('');
}

// ============================================
// TRENINGI (WORKOUTS)
// ============================================

function openWorkoutModal(workoutId = null) {
    const workout = workoutId ? state.workouts.find(w => w.id === workoutId) : null;
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${workout ? 'Edytuj Trening' : 'Nowy Trening'}</h3>
        <form onsubmit="saveWorkout(event, ${workoutId})">
            <div class="form-group">
                <label>Rodzaj treningu</label>
                <select id="workout-type">
                    <option value="strength" ${workout?.type === 'strength' ? 'selected' : ''}>💪 Siłowy</option>
                    <option value="cardio" ${workout?.type === 'cardio' ? 'selected' : ''}>🏃 Cardio</option>
                    <option value="flexibility" ${workout?.type === 'flexibility' ? 'selected' : ''}>🧘 Rozciąganie</option>
                    <option value="sports" ${workout?.type === 'sports' ? 'selected' : ''}>⚽ Sport</option>
                    <option value="other" ${workout?.type === 'other' ? 'selected' : ''}>🏋️ Inny</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nazwa/Opis</label>
                <input type="text" id="workout-name" value="${workout?.name || ''}" 
                       placeholder="np. Push day, Bieganie 5km">
            </div>
            <div class="form-group">
                <label>Czas trwania (minuty)</label>
                <input type="number" id="workout-duration" required 
                       value="${workout?.duration || 30}" min="1">
            </div>
            <div class="form-group">
                <label>Spalone kalorie (szacunkowo)</label>
                <input type="number" id="workout-calories" 
                       value="${workout?.calories || 200}" min="0">
            </div>
            <div class="form-group">
                <label>Notatki</label>
                <textarea id="workout-notes" rows="3" 
                          placeholder="Ćwiczenia, ciężary, odczucia...">${workout?.notes || ''}</textarea>
            </div>
            <button type="submit" class="submit-btn">
                ${workout ? 'Zapisz zmiany' : 'Zapisz trening'}
            </button>
        </form>
    `;
    
    openModal();
}

function saveWorkout(e, editId = null) {
    e.preventDefault();
    
    const workout = {
        id: editId || Date.now(),
        type: document.getElementById('workout-type').value,
        name: document.getElementById('workout-name').value,
        duration: parseInt(document.getElementById('workout-duration').value),
        calories: parseInt(document.getElementById('workout-calories').value),
        notes: document.getElementById('workout-notes').value,
        date: editId ? state.workouts.find(w => w.id === editId)?.date : new Date().toISOString()
    };
    
    if (editId) {
        const index = state.workouts.findIndex(w => w.id === editId);
        state.workouts[index] = workout;
    } else {
        state.workouts.push(workout);
    }
    
    saveData();
    renderWorkouts();
    updateStats();
    checkAchievements();
    closeModal();
    
    showNotification('Trening zapisany! 💪');
}

function deleteWorkout(id) {
    if (confirm('Usunąć ten trening?')) {
        state.workouts = state.workouts.filter(w => w.id !== id);
        saveData();
        renderWorkouts();
        updateStats();
    }
}

function renderWorkouts() {
    const list = document.getElementById('workout-list');
    const workouts = [...state.workouts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Statystyki
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekAgo);
    
    document.getElementById('weekly-workouts').textContent = weeklyWorkouts.length;
    document.getElementById('total-workouts').textContent = workouts.length;
    document.getElementById('total-duration').textContent = 
        workouts.reduce((sum, w) => sum + w.duration, 0);
    
    const typeIcons = {
        strength: '💪',
        cardio: '🏃',
        flexibility: '🧘',
        sports: '⚽',
        other: '🏋️'
    };
    
    list.innerHTML = workouts.length === 0
        ? '<p style="text-align:center; color: #999; padding: 40px;">Brak treningów</p>'
        : workouts.map(w => `
            <li class="item" onclick="openWorkoutModal(${w.id})">
                <div style="font-size: 24px;">${typeIcons[w.type]}</div>
                <div class="item-content">
                    <div class="item-title">${w.name || w.type}</div>
                    <div class="item-meta">
                        <span>⏱️ ${w.duration} min</span>
                        <span>🔥 ${w.calories} kcal</span>
                        <span>📅 ${formatDate(w.date)}</span>
                    </div>
                </div>
                <button class="item-delete" onclick="event.stopPropagation(); deleteWorkout(${w.id})">🗑️</button>
            </li>
        `).join('');
}

// ============================================
// KALORIE (MEALS)
// ============================================

function openMealModal(mealId = null) {
    const meal = mealId ? state.meals.find(m => m.id === mealId) : null;
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${meal ? 'Edytuj Posiłek' : 'Nowy Posiłek'}</h3>
        <form onsubmit="saveMeal(event, ${mealId})">
            <div class="form-group">
                <label>Nazwa posiłku</label>
                <input type="text" id="meal-name" required value="${meal?.name || ''}"
                       placeholder="np. Śniadanie, Kurczak z ryżem">
            </div>
            <div class="form-group">
                <label>Kalorie (kcal)</label>
                <input type="number" id="meal-calories" required 
                       value="${meal?.calories || ''}" min="0" placeholder="np. 500">
            </div>
            <div class="form-group">
                <label>Białko (g)</label>
                <input type="number" id="meal-protein" 
                       value="${meal?.protein || 0}" min="0">
            </div>
            <div class="form-group">
                <label>Węglowodany (g)</label>
                <input type="number" id="meal-carbs" 
                       value="${meal?.carbs || 0}" min="0">
            </div>
            <div class="form-group">
                <label>Tłuszcze (g)</label>
                <input type="number" id="meal-fats" 
                       value="${meal?.fats || 0}" min="0">
            </div>
            <button type="submit" class="submit-btn">
                ${meal ? 'Zapisz zmiany' : 'Dodaj posiłek'}
            </button>
        </form>
    `;
    
    openModal();
}

function saveMeal(e, editId = null) {
    e.preventDefault();
    
    const meal = {
        id: editId || Date.now(),
        name: document.getElementById('meal-name').value,
        calories: parseInt(document.getElementById('meal-calories').value),
        protein: parseInt(document.getElementById('meal-protein').value) || 0,
        carbs: parseInt(document.getElementById('meal-carbs').value) || 0,
        fats: parseInt(document.getElementById('meal-fats').value) || 0,
        date: editId ? state.meals.find(m => m.id === editId)?.date : new Date().toISOString()
    };
    
    if (editId) {
        const index = state.meals.findIndex(m => m.id === editId);
        state.meals[index] = meal;
    } else {
        state.meals.push(meal);
    }
    
    saveData();
    renderMeals();
    closeModal();
}

function deleteMeal(id) {
    if (confirm('Usunąć ten posiłek?')) {
        state.meals = state.meals.filter(m => m.id !== id);
        saveData();
        renderMeals();
    }
}

function renderMeals() {
    const list = document.getElementById('meal-list');
    const today = new Date().toDateString();
    const todayMeals = state.meals.filter(m => 
        new Date(m.date).toDateString() === today
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Suma dzisiejszych kalorii i makro
    const totals = todayMeals.reduce((acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    // Aktualizuj wyświetlanie
    document.getElementById('calories-eaten').textContent = totals.calories;
    document.getElementById('calories-goal').textContent = state.settings.calorieGoal;
    document.getElementById('protein').textContent = totals.protein + 'g';
    document.getElementById('carbs').textContent = totals.carbs + 'g';
    document.getElementById('fats').textContent = totals.fats + 'g';
    
    // Aktualizuj ring progress
    const progress = Math.min(totals.calories / state.settings.calorieGoal, 1);
    const dashoffset = 283 - (283 * progress);
    document.getElementById('calorie-progress').style.strokeDashoffset = dashoffset;
    
    list.innerHTML = todayMeals.length === 0
        ? '<p style="text-align:center; color: #999; padding: 40px;">Brak posiłków dzisiaj</p>'
        : todayMeals.map(m => `
            <li class="item" onclick="openMealModal(${m.id})">
                <div style="font-size: 24px;">🍽️</div>
                <div class="item-content">
                    <div class="item-title">${m.name}</div>
                    <div class="item-meta">
                        <span>🔥 ${m.calories} kcal</span>
                        <span>🥩 ${m.protein}g</span>
                        <span>🍞 ${m.carbs}g</span>
                        <span>🧈 ${m.fats}g</span>
                    </div>
                </div>
                <button class="item-delete" onclick="event.stopPropagation(); deleteMeal(${m.id})">🗑️</button>
            </li>
        `).join('');
}

// ============================================
// RANKING & OSIĄGNIĘCIA
// ============================================

const ACHIEVEMENTS = [
    { id: 'first_task', icon: '📋', name: 'Pierwsze Zadanie', condition: () => state.tasks.filter(t => t.completed).length >= 1 },
    { id: 'task_10', icon: '🎯', name: '10 Zadań', condition: () => state.tasks.filter(t => t.completed).length >= 10 },
    { id: 'task_50', icon: '⭐', name: '50 Zadań', condition: () => state.tasks.filter(t => t.completed).length >= 50 },
    { id: 'task_100', icon: '🏅', name: '100 Zadań', condition: () => state.tasks.filter(t => t.completed).length >= 100 },
    { id: 'first_workout', icon: '💪', name: 'Pierwszy Trening', condition: () => state.workouts.length >= 1 },
    { id: 'workout_10', icon: '🏋️', name: '10 Treningów', condition: () => state.workouts.length >= 10 },
    { id: 'workout_30', icon: '🔥', name: '30 Treningów', condition: () => state.workouts.length >= 30 },
    { id: 'points_100', icon: '💯', name: '100 Punktów', condition: () => getTotalPoints() >= 100 },
    { id: 'points_500', icon: '🚀', name: '500 Punktów', condition: () => getTotalPoints() >= 500 },
    { id: 'points_1000', icon: '👑', name: '1000 Punktów', condition: () => getTotalPoints() >= 1000 },
];

function getTotalPoints() {
    const taskPoints = state.tasks
        .filter(t => t.completed)
        .reduce((sum, t) => sum + t.points, 0);
    const workoutPoints = state.workouts.length * 25;
    return taskPoints + workoutPoints;
}

function getLevel(points) {
    if (points >= 1000) return { name: 'Legenda', color: '#ffd700' };
    if (points >= 500) return { name: 'Ekspert', color: '#c0c0c0' };
    if (points >= 200) return { name: 'Zaawansowany', color: '#cd7f32' };
    if (points >= 50) return { name: 'Regularny', color: '#48bb78' };
    return { name: 'Początkujący', color: '#667eea' };
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
        if (!state.achievements.includes(ach.id) && ach.condition()) {
            state.achievements.push(ach.id);
            showNotification(`🎖️ Nowe osiągnięcie: ${ach.name}!`);
        }
    });
    saveData();
    renderRanking();
}

function renderRanking() {
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalWorkouts = state.workouts.length;
    const totalPoints = getTotalPoints();
    const level = getLevel(totalPoints);
    
    document.getElementById('rank-tasks').textContent = `${completedTasks} ukończonych`;
    document.getElementById('rank-workouts').textContent = `${totalWorkouts} treningów`;
    document.getElementById('rank-total').textContent = `${totalPoints} punktów`;
    
    document.getElementById('level-tasks').textContent = `Poziom: ${getLevel(completedTasks * 10).name}`;
    document.getElementById('level-workouts').textContent = `Poziom: ${getLevel(totalWorkouts * 25).name}`;
    document.getElementById('level-total').textContent = `Poziom: ${level.name}`;
    document.getElementById('level-total').style.color = level.color;
    
    // Osiągnięcia
    const achievementsList = document.getElementById('achievements-list');
    achievementsList.innerHTML = ACHIEVEMENTS.map(ach => `
        <div class="achievement ${state.achievements.includes(ach.id) ? 'unlocked' : ''}" 
             title="${ach.name}">
            ${ach.icon}
        </div>
    `).join('');
}

// ============================================
// STATYSTYKI GLOBALNE
// ============================================

function updateStats() {
    document.getElementById('total-points').textContent = getTotalPoints();
    document.getElementById('streak').textContent = calculateStreak();
}

function calculateStreak() {
    const dates = [
        ...state.tasks.filter(t => t.completedAt).map(t => t.completedAt),
        ...state.workouts.map(w => w.date)
    ].map(d => new Date(d).toDateString());
    
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let date of uniqueDates) {
        if (new Date(date).toDateString() === currentDate.toDateString()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// ============================================
// POMOCNICZE
// ============================================

function formatDate(date) {
    return new Date(date).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short'
    });
}

function saveData() {
    localStorage.setItem('profile', JSON.stringify(state.profile));
    localStorage.setItem('visibleTabs', JSON.stringify(state.visibleTabs));
    localStorage.setItem('tasks', JSON.stringify(state.tasks));
    localStorage.setItem('workouts', JSON.stringify(state.workouts));
    localStorage.setItem('meals', JSON.stringify(state.meals));
    localStorage.setItem('projects', JSON.stringify(state.projects));
    localStorage.setItem('sleep', JSON.stringify(state.sleep));
    localStorage.setItem('supplements', JSON.stringify(state.supplements));           
    localStorage.setItem('supplementLogs', JSON.stringify(state.supplementLogs));     
    localStorage.setItem('weight', JSON.stringify(state.weight));                     
    localStorage.setItem('weightGoal', JSON.stringify(state.weightGoal)); 
    localStorage.setItem('profile', JSON.stringify(state.profile));
    localStorage.setItem('visibleTabs', JSON.stringify(state.visibleTabs));   
    localStorage.setItem('settings', JSON.stringify(state.settings));
    localStorage.setItem('achievements', JSON.stringify(state.achievements));
}

function openModal() {
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #48bb78;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 300;
        animation: slideDown 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2500);
}

function renderAll() {
    renderTasks();
    renderWorkouts();
    renderMeals();
    renderProjects();
    renderSleep(); 
    renderCharts();
    renderHealth();
    renderProfile();
}

// ============================================
// PWA - SERVICE WORKER
// ============================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('SW registered'))
            .catch(err => console.log('SW error:', err));
    }
}
// ============================================
// PROJEKTY (PROJECTS)
// ============================================

function openProjectModal(projectId = null) {
    const project = projectId ? state.projects.find(p => p.id === projectId) : null;
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${project ? 'Edytuj Projekt' : 'Nowy Projekt'}</h3>
        <form onsubmit="saveProject(event, ${projectId})">
            <div class="form-group">
                <label>Nazwa projektu</label>
                <input type="text" id="project-title" required 
                       value="${project?.title || ''}" 
                       placeholder="np. Nauka programowania">
            </div>
            <div class="form-group">
                <label>Opis (opcjonalnie)</label>
                <textarea id="project-description" rows="3" 
                          placeholder="O czym jest ten projekt?">${project?.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Kategoria</label>
                <select id="project-category">
                    <option value="personal" ${project?.category === 'personal' ? 'selected' : ''}>🏠 Osobiste</option>
                    <option value="work" ${project?.category === 'work' ? 'selected' : ''}>💼 Praca</option>
                    <option value="learning" ${project?.category === 'learning' ? 'selected' : ''}>📚 Nauka</option>
                    <option value="health" ${project?.category === 'health' ? 'selected' : ''}>💪 Zdrowie</option>
                    <option value="other" ${project?.category === 'other' ? 'selected' : ''}>📁 Inne</option>
                </select>
            </div>
            <div class="form-group">
                <label>Termin ukończenia (opcjonalnie)</label>
                <input type="date" id="project-deadline" value="${project?.deadline || ''}">
            </div>
            <button type="submit" class="submit-btn">
                ${project ? 'Zapisz zmiany' : 'Utwórz projekt'}
            </button>
        </form>
    `;
    
    openModal();
}

function saveProject(e, editId = null) {
    e.preventDefault();
    
    const project = {
        id: editId || Date.now(),
        title: document.getElementById('project-title').value,
        description: document.getElementById('project-description').value,
        category: document.getElementById('project-category').value,
        deadline: document.getElementById('project-deadline').value,
        tasks: editId ? state.projects.find(p => p.id === editId)?.tasks || [] : [],
        completed: editId ? state.projects.find(p => p.id === editId)?.completed : false,
        createdAt: editId ? state.projects.find(p => p.id === editId)?.createdAt : new Date().toISOString()
    };
    
    if (editId) {
        const index = state.projects.findIndex(p => p.id === editId);
        state.projects[index] = project;
    } else {
        state.projects.push(project);
    }
    
    saveData();
    renderProjects();
    closeModal();
    showNotification(editId ? 'Projekt zaktualizowany! ✏️' : 'Projekt utworzony! 📂');
}

function deleteProject(id) {
    if (confirm('Czy na pewno chcesz usunąć ten projekt i wszystkie jego zadania?')) {
        state.projects = state.projects.filter(p => p.id !== id);
        saveData();
        renderProjects();
        showNotification('Projekt usunięty 🗑️');
    }
}

function toggleProjectComplete(id) {
    const project = state.projects.find(p => p.id === id);
    project.completed = !project.completed;
    saveData();
    renderProjects();
    
    if (project.completed) {
        showNotification('Projekt ukończony! 🎉');
        checkAchievements();
    }
}

function addProjectTask(projectId) {
    const input = document.getElementById(`new-task-${projectId}`);
    const taskText = input.value.trim();
    
    if (!taskText) return;
    
    const project = state.projects.find(p => p.id === projectId);
    project.tasks.push({
        id: Date.now(),
        text: taskText,
        done: false
    });
    
    input.value = '';
    saveData();
    renderProjects();
}

function toggleProjectTask(projectId, taskId) {
    const project = state.projects.find(p => p.id === projectId);
    const task = project.tasks.find(t => t.id === taskId);
    task.done = !task.done;
    
    saveData();
    renderProjects();
    
    if (task.done) {
        showNotification('+5 punktów! ✓');
    }
}

function deleteProjectTask(projectId, taskId) {
    const project = state.projects.find(p => p.id === projectId);
    project.tasks = project.tasks.filter(t => t.id !== taskId);
    
    saveData();
    renderProjects();
}

function getProjectProgress(project) {
    if (project.tasks.length === 0) return 0;
    const done = project.tasks.filter(t => t.done).length;
    return Math.round((done / project.tasks.length) * 100);
}

function renderProjects() {
    const container = document.getElementById('projects-list');
    const projects = [...state.projects].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const activeProjects = projects.filter(p => !p.completed).length;
    const completedProjects = projects.filter(p => p.completed).length;
    const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    
    document.getElementById('active-projects').textContent = activeProjects;
    document.getElementById('completed-projects').textContent = completedProjects;
    document.getElementById('total-project-tasks').textContent = totalTasks;
    
    const categoryLabels = {
        personal: '🏠 Osobiste',
        work: '💼 Praca',
        learning: '📚 Nauka',
        health: '💪 Zdrowie',
        other: '📁 Inne'
    };
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-projects">
                <span>📂</span>
                <p>Nie masz jeszcze żadnych projektów</p>
                <p>Kliknij "+ Nowy projekt" aby dodać pierwszy!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => {
        const progress = getProjectProgress(project);
        const doneTasks = project.tasks.filter(t => t.done).length;
        
        return `
            <div class="project-card ${project.completed ? 'completed' : ''}">
                <div class="project-header">
                    <div>
                        <h3 class="project-title">${project.title}</h3>
                        <span class="project-category category-${project.category}">
                            ${categoryLabels[project.category]}
                        </span>
                    </div>
                    <div class="project-actions">
                        <button onclick="toggleProjectComplete(${project.id})" title="${project.completed ? 'Oznacz jako aktywny' : 'Oznacz jako ukończony'}">
                            ${project.completed ? '↩️' : '✅'}
                        </button>
                        <button onclick="openProjectModal(${project.id})" title="Edytuj">✏️</button>
                        <button onclick="deleteProject(${project.id})" title="Usuń">🗑️</button>
                    </div>
                </div>
                
                ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
                
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${doneTasks} z ${project.tasks.length} zadań</span>
                        <span>${progress}%</span>
                    </div>
                </div>
                
                <div class="project-tasks">
                    <h4>Zadania w projekcie:</h4>
                    <ul class="project-task-list">
                        ${project.tasks.map(task => `
                            <li class="project-task-item ${task.done ? 'done' : ''}">
                                <div class="mini-checkbox ${task.done ? 'checked' : ''}" 
                                     onclick="toggleProjectTask(${project.id}, ${task.id})">
                                    ${task.done ? '✓' : ''}
                                </div>
                                <span>${task.text}</span>
                                <button onclick="deleteProjectTask(${project.id}, ${task.id})" 
                                        style="margin-left:auto; background:none; border:none; cursor:pointer; opacity:0.5;">
                                    ✕
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                    
                    ${!project.completed ? `
                        <div class="add-task-input">
                            <input type="text" id="new-task-${project.id}" 
                                   placeholder="Nowe zadanie..." 
                                   onkeypress="if(event.key==='Enter'){addProjectTask(${project.id})}">
                            <button onclick="addProjectTask(${project.id})">+</button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="project-meta">
                    ${project.deadline ? `<span>📅 Termin: ${formatDate(project.deadline)}</span>` : ''}
                    <span>📆 Utworzono: ${formatDate(project.createdAt)}</span>
                </div>
            </div>
        `;
    }).join('');
}
// ============================================
// SEN (SLEEP)
// ============================================

function openSleepModal(sleepId = null) {
    const sleepEntry = sleepId ? state.sleep.find(s => s.id === sleepId) : null;
    
    // Domyślne wartości dla nowego wpisu
    const now = new Date();
    const defaultBedtime = sleepEntry?.bedtime || '23:00';
    const defaultWakeup = sleepEntry?.wakeup || '07:00';
    const defaultDate = sleepEntry?.date || now.toISOString().split('T')[0];
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${sleepEntry ? 'Edytuj Sen' : 'Dodaj Sen'} 😴</h3>
        <form onsubmit="saveSleep(event, ${sleepId})">
            <div class="form-group">
                <label>📅 Data</label>
                <input type="date" id="sleep-date" required value="${defaultDate}">
            </div>
            <div class="form-group">
                <label>🌙 Godzina zaśnięcia</label>
                <input type="time" id="sleep-bedtime" required value="${defaultBedtime}">
            </div>
            <div class="form-group">
                <label>☀️ Godzina przebudzenia</label>
                <input type="time" id="sleep-wakeup" required value="${defaultWakeup}">
            </div>
            <div class="form-group">
                <label>⭐ Jakość snu</label>
                <select id="sleep-quality">
                    <option value="great" ${sleepEntry?.quality === 'great' ? 'selected' : ''}>😊 Świetna</option>
                    <option value="good" ${sleepEntry?.quality === 'good' ? 'selected' : ''}>🙂 Dobra</option>
                    <option value="ok" ${sleepEntry?.quality === 'ok' ? 'selected' : ''}>😐 W porządku</option>
                    <option value="poor" ${sleepEntry?.quality === 'poor' ? 'selected' : ''}>😫 Słaba</option>
                </select>
            </div>
            <div class="form-group">
                <label>📝 Notatki (opcjonalnie)</label>
                <textarea id="sleep-notes" rows="2" 
                          placeholder="Jak się czułeś? Śniłeś coś?">${sleepEntry?.notes || ''}</textarea>
            </div>
            <button type="submit" class="submit-btn">
                ${sleepEntry ? 'Zapisz zmiany' : 'Zapisz sen'}
            </button>
        </form>
    `;
    
    openModal();
}

function calculateSleepDuration(bedtime, wakeup) {
    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = wakeup.split(':').map(Number);
    
    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    
    // Jeśli przebudzenie jest przed zaśnięciem, dodaj 24h
    if (wakeMinutes <= bedMinutes) {
        wakeMinutes += 24 * 60;
    }
    
    return wakeMinutes - bedMinutes;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
}

function formatDurationShort(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}m`;
}

function saveSleep(e, editId = null) {
    e.preventDefault();
    
    const bedtime = document.getElementById('sleep-bedtime').value;
    const wakeup = document.getElementById('sleep-wakeup').value;
    const duration = calculateSleepDuration(bedtime, wakeup);
    
    const sleepEntry = {
        id: editId || Date.now(),
        date: document.getElementById('sleep-date').value,
        bedtime: bedtime,
        wakeup: wakeup,
        duration: duration,
        quality: document.getElementById('sleep-quality').value,
        notes: document.getElementById('sleep-notes').value,
        createdAt: editId ? state.sleep.find(s => s.id === editId)?.createdAt : new Date().toISOString()
    };
    
    if (editId) {
        const index = state.sleep.findIndex(s => s.id === editId);
        state.sleep[index] = sleepEntry;
    } else {
        state.sleep.push(sleepEntry);
    }
    
    saveData();
    renderSleep();
    closeModal();
    showNotification(editId ? 'Sen zaktualizowany! 😴' : 'Sen zapisany! 😴');
    checkAchievements();
}

function deleteSleep(id) {
    if (confirm('Usunąć ten wpis snu?')) {
        state.sleep = state.sleep.filter(s => s.id !== id);
        saveData();
        renderSleep();
        showNotification('Wpis usunięty 🗑️');
    }
}

function getSleepStats() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekSleep = state.sleep.filter(s => new Date(s.date) >= weekAgo);
    
    // Średnia z 7 dni
    const avgDuration = weekSleep.length > 0 
        ? Math.round(weekSleep.reduce((sum, s) => sum + s.duration, 0) / weekSleep.length)
        : 0;
    
    // Najdłuższy sen
    const bestSleep = state.sleep.length > 0
        ? Math.max(...state.sleep.map(s => s.duration))
        : 0;
    
    // Dzisiejszy sen
    const today = now.toISOString().split('T')[0];
    const todaySleep = state.sleep.find(s => s.date === today);
    
    // Dni z celem (8h = 480min)
    const goalMet = state.sleep.filter(s => s.duration >= 480).length;
    
    return {
        avgDuration,
        bestSleep,
        todaySleep: todaySleep?.duration || 0,
        totalEntries: state.sleep.length,
        goalMet,
        weekSleep
    };
}

function renderSleep() {
    const container = document.getElementById('sleep-list');
    const stats = getSleepStats();
    
    // Aktualizuj statystyki
    document.getElementById('avg-sleep').textContent = formatDuration(stats.avgDuration);
    document.getElementById('total-sleeps').textContent = stats.totalEntries;
    document.getElementById('best-sleep').textContent = stats.bestSleep > 0 ? formatDurationShort(stats.bestSleep) : '-';
    document.getElementById('sleep-streak').textContent = stats.goalMet;
    
    // Jakość snu badge
    const qualityBadge = document.getElementById('sleep-quality-badge');
    if (stats.avgDuration >= 480) {
        qualityBadge.textContent = '✨ Świetnie!';
        qualityBadge.className = 'sleep-quality good';
    } else if (stats.avgDuration >= 360) {
        qualityBadge.textContent = '👍 OK';
        qualityBadge.className = 'sleep-quality ok';
    } else if (stats.avgDuration > 0) {
        qualityBadge.textContent = '😴 Za mało!';
        qualityBadge.className = 'sleep-quality bad';
    } else {
        qualityBadge.textContent = 'Brak danych';
        qualityBadge.className = 'sleep-quality';
    }
    
    // Cel snu - progress bar
    const goalProgress = Math.min((stats.todaySleep / 480) * 100, 100);
    document.getElementById('sleep-goal-progress').style.width = goalProgress + '%';
    document.getElementById('today-sleep').textContent = formatDurationShort(stats.todaySleep);
    document.getElementById('sleep-goal-display').textContent = '8h';
    
    // Wykres ostatnich 7 dni
    renderSleepChart();
    
    // Lista wpisów
    const sleepEntries = [...state.sleep].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    const qualityLabels = {
        great: '😊 Świetna',
        good: '🙂 Dobra',
        ok: '😐 OK',
        poor: '😫 Słaba'
    };
    
    if (sleepEntries.length === 0) {
        container.innerHTML = `
            <div class="empty-sleep">
                <span>😴</span>
                <p>Brak zapisanych danych o śnie</p>
                <p>Kliknij "+ Dodaj sen" aby dodać pierwszy wpis!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sleepEntries.map(entry => `
        <li class="sleep-item" onclick="openSleepModal(${entry.id})">
            <div class="sleep-item-icon">
                ${entry.duration >= 480 ? '😊' : entry.duration >= 360 ? '😐' : '😫'}
            </div>
            <div class="sleep-item-content">
                <div class="sleep-item-duration">${formatDuration(entry.duration)}</div>
                <div class="sleep-item-times">
                    🌙 ${entry.bedtime} → ☀️ ${entry.wakeup}
                </div>
                ${entry.notes ? `<div class="sleep-item-times">📝 ${entry.notes}</div>` : ''}
            </div>
            <div>
                <div class="sleep-item-quality quality-${entry.quality}">
                    ${qualityLabels[entry.quality]}
                </div>
                <div class="sleep-item-date">${formatDate(entry.date)}</div>
            </div>
            <button class="item-delete" onclick="event.stopPropagation(); deleteSleep(${entry.id})">🗑️</button>
        </li>
    `).join('');
}

function renderSleepChart() {
    const barsContainer = document.getElementById('sleep-chart-bars');
    const labelsContainer = document.getElementById('sleep-chart-labels');
    
    // Ostatnie 7 dni
    const days = [];
    const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const sleepEntry = state.sleep.find(s => s.date === dateStr);
        
        days.push({
            date: dateStr,
            dayName: dayNames[date.getDay()],
            duration: sleepEntry?.duration || 0
        });
    }
    
    const maxDuration = Math.max(...days.map(d => d.duration), 480); // minimum 8h dla skali
    
    barsContainer.innerHTML = days.map(day => {
        const height = day.duration > 0 ? (day.duration / maxDuration) * 100 : 5;
        return `
            <div class="sleep-bar" style="height: ${height}%" title="${formatDuration(day.duration)}">
                ${day.duration > 0 ? `<span class="sleep-bar-value">${formatDurationShort(day.duration)}</span>` : ''}
            </div>
        `;
    }).join('');
    
    labelsContainer.innerHTML = days.map(day => `
        <span>${day.dayName}</span>
    `).join('');
}
// ============================================
// WYKRESY (CHARTS)
// ============================================

let currentPeriod = 'week';

// Inicjalizacja przycisków okresu
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            renderCharts();
        });
    });
});

function getDateRange(period) {
    const now = new Date();
    const dates = [];
    let days;
    
    switch(period) {
        case 'week':
            days = 7;
            break;
        case 'month':
            days = 30;
            break;
        case 'all':
            days = 90; // max 90 dni dla czytelności
            break;
        default:
            days = 7;
    }
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push({
            date: date.toISOString().split('T')[0],
            dayName: date.toLocaleDateString('pl-PL', { weekday: 'short' }),
            dayNum: date.getDate()
        });
    }
    
    return dates;
}

function formatLabel(dateInfo, period) {
    if (period === 'week') {
        return dateInfo.dayName;
    } else if (period === 'month') {
        return dateInfo.dayNum;
    } else {
        return dateInfo.dayNum;
    }
}

function renderCharts() {
    const dates = getDateRange(currentPeriod);
    
    renderTasksChart(dates);
    renderWorkoutsChart(dates);
    renderCaloriesChart(dates);
    renderSleepChartDetailed(dates);
    renderPointsChart(dates);
    renderDetailedStats();
    updateChartsSummary();
}

function updateChartsSummary() {
    // Całkowite punkty
    const totalPoints = getTotalPoints();
    document.getElementById('chart-total-points').textContent = totalPoints;
    
    // Aktywne dni (dni z jakąkolwiek aktywnością)
    const allDates = new Set([
        ...state.tasks.filter(t => t.completedAt).map(t => new Date(t.completedAt).toDateString()),
        ...state.workouts.map(w => new Date(w.date).toDateString()),
        ...state.meals.map(m => new Date(m.date).toDateString()),
        ...state.sleep.map(s => new Date(s.date).toDateString())
    ]);
    document.getElementById('chart-active-days').textContent = allDates.size;
}

function renderTasksChart(dates) {
    const container = document.getElementById('tasks-chart');
    const labelsContainer = document.getElementById('tasks-chart-labels');
    
    // Pobierz dane dla każdego dnia
    const data = dates.map(d => {
        const count = state.tasks.filter(t => 
            t.completedAt && 
            new Date(t.completedAt).toISOString().split('T')[0] === d.date
        ).length;
        return { ...d, value: count };
    });
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    document.getElementById('tasks-chart-total').textContent = `${total} zadań`;
    
    container.innerHTML = data.map(d => {
        const height = (d.value / maxValue) * 100;
        return `
            <div class="chart-bar tasks" style="height: ${Math.max(height, 3)}%">
                <span class="chart-bar-value">${d.value}</span>
            </div>
        `;
    }).join('');
    
    // Etykiety - pokaż co N-tą zależnie od okresu
    const step = currentPeriod === 'week' ? 1 : currentPeriod === 'month' ? 5 : 10;
    labelsContainer.innerHTML = data.map((d, i) => `
        <span>${i % step === 0 || i === data.length - 1 ? formatLabel(d, currentPeriod) : ''}</span>
    `).join('');
}

function renderWorkoutsChart(dates) {
    const container = document.getElementById('workouts-chart');
    const labelsContainer = document.getElementById('workouts-chart-labels');
    
    const data = dates.map(d => {
        const dayWorkouts = state.workouts.filter(w => 
            new Date(w.date).toISOString().split('T')[0] === d.date
        );
        return { 
            ...d, 
            value: dayWorkouts.length,
            types: dayWorkouts.map(w => w.type)
        };
    });
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    document.getElementById('workouts-chart-total').textContent = `${total} treningów`;
    
    container.innerHTML = data.map(d => {
        const height = (d.value / maxValue) * 100;
        const mainType = d.types[0] || 'other';
        const typeClass = mainType === 'strength' ? 'strength' : mainType === 'cardio' ? 'cardio' : '';
        return `
            <div class="chart-bar workouts ${typeClass}" style="height: ${Math.max(height, 3)}%">
                <span class="chart-bar-value">${d.value}</span>
            </div>
        `;
    }).join('');
    
    const step = currentPeriod === 'week' ? 1 : currentPeriod === 'month' ? 5 : 10;
    labelsContainer.innerHTML = data.map((d, i) => `
        <span>${i % step === 0 || i === data.length - 1 ? formatLabel(d, currentPeriod) : ''}</span>
    `).join('');
}

function renderCaloriesChart(dates) {
    const container = document.getElementById('calories-line-chart');
    const labelsContainer = document.getElementById('calories-chart-labels');
    const goalLine = document.getElementById('calories-goal-line');
    
    const data = dates.map(d => {
        const dayMeals = state.meals.filter(m => 
            new Date(m.date).toISOString().split('T')[0] === d.date
        );
        const totalCal = dayMeals.reduce((sum, m) => sum + m.calories, 0);
        return { ...d, value: totalCal };
    });
    
    const maxValue = Math.max(...data.map(d => d.value), state.settings.calorieGoal, 1);
    const avgValue = data.filter(d => d.value > 0).length > 0
        ? Math.round(data.filter(d => d.value > 0).reduce((sum, d) => sum + d.value, 0) / data.filter(d => d.value > 0).length)
        : 0;
    
    document.getElementById('calories-chart-total').textContent = `${avgValue} kcal średnio`;
    
    // Pozycja linii celu
    const goalPosition = 100 - (state.settings.calorieGoal / maxValue) * 100;
    goalLine.style.top = goalPosition + '%';
    
    // Generuj punkty dla wykresu liniowego
    const width = 300;
    const height = 100;
    const padding = 5;
    
    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - (d.value / maxValue) * (height - padding * 2);
        return { x, y, value: d.value };
    });
    
    // Ścieżka linii
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Ścieżka wypełnienia
    const areaPath = linePath + ` L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;
    
    container.innerHTML = `
        <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:#667eea;stop-opacity:0.05" />
            </linearGradient>
        </defs>
        <path class="chart-area" d="${areaPath}" />
        <path class="chart-line" d="${linePath}" />
        ${points.map(p => `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="4" />`).join('')}
    `;
    
    const step = currentPeriod === 'week' ? 1 : currentPeriod === 'month' ? 5 : 10;
    labelsContainer.innerHTML = data.map((d, i) => `
        <span>${i % step === 0 || i === data.length - 1 ? formatLabel(d, currentPeriod) : ''}</span>
    `).join('');
}

function renderSleepChartDetailed(dates) {
    const container = document.getElementById('sleep-chart-detailed');
    
    // Ostatnie 7 dni dla wykresu snu (zawsze 7)
    const sleepDates = dates.slice(-7);
    
    const data = sleepDates.map(d => {
        const sleepEntry = state.sleep.find(s => s.date === d.date);
        return { 
            ...d, 
            value: sleepEntry?.duration || 0,
            quality: sleepEntry?.quality || 'none'
        };
    });
    
    const maxValue = Math.max(...data.map(d => d.value), 600); // 10h max
    const avgValue = data.filter(d => d.value > 0).length > 0
        ? Math.round(data.filter(d => d.value > 0).reduce((sum, d) => sum + d.value, 0) / data.filter(d => d.value > 0).length)
        : 0;
    
    document.getElementById('sleep-chart-total').textContent = formatDuration(avgValue) + ' średnio';
    
    const goalPosition = (480 / maxValue) * 100; // 8h = 480 min
    
    container.innerHTML = data.map(d => {
        const width = d.value > 0 ? (d.value / maxValue) * 100 : 0;
        const qualityClass = d.quality !== 'none' ? d.quality : 'ok';
        return `
            <div class="horizontal-bar-row">
                <span class="horizontal-bar-label">${d.dayName}</span>
                <div class="horizontal-bar-container">
                    <div class="horizontal-bar-fill ${qualityClass}" style="width: ${width}%">
                        ${d.value > 0 ? `<span class="horizontal-bar-value">${formatDurationShort(d.value)}</span>` : ''}
                    </div>
                    <div class="horizontal-bar-goal" style="left: ${goalPosition}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPointsChart(dates) {
    const container = document.getElementById('points-chart');
    const labelsContainer = document.getElementById('points-chart-labels');
    
    const data = dates.map(d => {
        // Punkty z zadań
        const taskPoints = state.tasks
            .filter(t => t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === d.date)
            .reduce((sum, t) => sum + t.points, 0);
        
        // Punkty z treningów (25 pkt za trening)
        const workoutPoints = state.workouts
            .filter(w => new Date(w.date).toISOString().split('T')[0] === d.date)
            .length * 25;
        
        // Punkty z projektów (5 pkt za zadanie w projekcie)
        const projectPoints = state.projects
            .flatMap(p => p.tasks)
            .filter(t => t.done)
            .length * 5;
        
        return { ...d, value: taskPoints + workoutPoints };
    });
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    document.getElementById('points-chart-total').textContent = `${total} pkt`;
    
    container.innerHTML = data.map(d => {
        const height = (d.value / maxValue) * 100;
        return `
            <div class="chart-bar points" style="height: ${Math.max(height, 3)}%">
                <span class="chart-bar-value">${d.value}</span>
            </div>
        `;
    }).join('');
    
    const step = currentPeriod === 'week' ? 1 : currentPeriod === 'month' ? 5 : 10;
    labelsContainer.innerHTML = data.map((d, i) => `
        <span>${i % step === 0 || i === data.length - 1 ? formatLabel(d, currentPeriod) : ''}</span>
    `).join('');
}

function renderDetailedStats() {
    // Zadania
    const tasksCompleted = state.tasks.filter(t => t.completed).length;
    const tasksPending = state.tasks.filter(t => !t.completed).length;
    document.getElementById('stat-tasks-completed').textContent = `${tasksCompleted} ukończonych`;
    document.getElementById('stat-tasks-pending').textContent = `${tasksPending} oczekujących`;
    
    // Treningi
    const totalWorkouts = state.workouts.length;
    const totalTime = state.workouts.reduce((sum, w) => sum + w.duration, 0);
    document.getElementById('stat-workouts-total').textContent = `${totalWorkouts} treningów`;
    document.getElementById('stat-workouts-time').textContent = `${totalTime} minut`;
    
    // Kalorie
    const mealsWithCal = state.meals.filter(m => m.calories > 0);
    const avgCalories = mealsWithCal.length > 0
        ? Math.round(mealsWithCal.reduce((sum, m) => sum + m.calories, 0) / mealsWithCal.length)
        : 0;
    const totalCalories = state.meals.reduce((sum, m) => sum + m.calories, 0);
    document.getElementById('stat-calories-avg').textContent = `${avgCalories} kcal średnio`;
    document.getElementById('stat-calories-total').textContent = `${totalCalories} kcal łącznie`;
    
    // Sen
    const sleepEntries = state.sleep.filter(s => s.duration > 0);
    const avgSleep = sleepEntries.length > 0
        ? Math.round(sleepEntries.reduce((sum, s) => sum + s.duration, 0) / sleepEntries.length)
        : 0;
    const bestSleep = sleepEntries.length > 0
        ? Math.max(...sleepEntries.map(s => s.duration))
        : 0;
    document.getElementById('stat-sleep-avg').textContent = formatDurationShort(avgSleep) + ' średnio';
    document.getElementById('stat-sleep-best').textContent = formatDurationShort(bestSleep) + ' najdłuższy';
    
    // Projekty
    const activeProjects = state.projects.filter(p => !p.completed).length;
    const doneProjects = state.projects.filter(p => p.completed).length;
    document.getElementById('stat-projects-active').textContent = `${activeProjects} aktywnych`;
    document.getElementById('stat-projects-done').textContent = `${doneProjects} ukończonych`;
    
    // Seria
    const currentStreak = calculateStreak();
    document.getElementById('stat-streak-current').textContent = `${currentStreak} dni obecna`;
    document.getElementById('stat-streak-best').textContent = `${currentStreak} dni najlepsza`; // uproszczone
}
// ============================================
// ZDROWIE - WAGA I SUPLEMENTY
// ============================================

function renderHealth() {
    renderSupplementsToday();
    renderSupplementsList();
    renderWeight();
}

// ==================== SUPLEMENTY ====================

function renderSupplementsToday() {
    const container = document.getElementById('supplements-checklist');
    const today = new Date().toISOString().split('T')[0];
    
    // Ustaw datę
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    if (state.supplements.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; opacity: 0.8;">
                Brak suplementów. Dodaj swoje suplementy poniżej.
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.supplements.map(supp => {
        const isChecked = state.supplementLogs.some(log => 
            log.supplementId === supp.id && log.date === today
        );
        
        return `
            <div class="supplement-check-item ${isChecked ? 'checked' : ''}" 
                 onclick="toggleSupplement(${supp.id})">
                <div class="supplement-checkbox">
                    ${isChecked ? '✓' : ''}
                </div>
                <div class="supplement-info">
                    <div class="supplement-name">${supp.icon} ${supp.name}</div>
                    <div class="supplement-dose">${supp.dose}</div>
                </div>
                <div class="supplement-time">${supp.time}</div>
            </div>
        `;
    }).join('');
    
    // Oblicz serię
    updateSupplementsStreak();
}

function toggleSupplement(supplementId) {
    const today = new Date().toISOString().split('T')[0];
    const existingLog = state.supplementLogs.find(log => 
        log.supplementId === supplementId && log.date === today
    );
    
    if (existingLog) {
        // Usuń log
        state.supplementLogs = state.supplementLogs.filter(log => 
            !(log.supplementId === supplementId && log.date === today)
        );
    } else {
        // Dodaj log
        state.supplementLogs.push({
            id: Date.now(),
            supplementId: supplementId,
            date: today,
            time: new Date().toISOString()
        });
        showNotification('Suplement przyjęty! 💊');
    }
    
    saveData();
    renderSupplementsToday();
}

function updateSupplementsStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Sprawdź czy wszystkie suplementy zostały wzięte tego dnia
        const allTaken = state.supplements.every(supp => 
            state.supplementLogs.some(log => 
                log.supplementId === supp.id && log.date === dateStr
            )
        );
        
        if (allTaken && state.supplements.length > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    
    document.getElementById('supplements-streak').textContent = streak;
}

function renderSupplementsList() {
    const container = document.getElementById('supplements-list');
    
    if (state.supplements.length === 0) {
        container.innerHTML = `
            <div class="empty-supplements">
                <p>Brak suplementów</p>
                <p>Kliknij "+ Dodaj" aby dodać pierwszy suplement</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.supplements.map(supp => `
        <li class="supplement-item">
            <div class="supplement-item-icon">${supp.icon}</div>
            <div class="supplement-item-info">
                <div class="supplement-item-name">${supp.name}</div>
                <div class="supplement-item-details">${supp.dose} • ${supp.time}</div>
            </div>
            <div class="supplement-item-actions">
                <button onclick="openSupplementModal(${supp.id})" title="Edytuj">✏️</button>
                <button onclick="deleteSupplement(${supp.id})" title="Usuń">🗑️</button>
            </div>
        </li>
    `).join('');
}

function openSupplementModal(supplementId = null) {
    const supp = supplementId ? state.supplements.find(s => s.id === supplementId) : null;
    
    const icons = ['💊', '💪', '🧘', '🌿', '🧪', '💉', '🩺', '❤️', '🧠', '🦴'];
    
    document.getElementById('modal-content').innerHTML = `
        <h3>${supp ? 'Edytuj Suplement' : 'Nowy Suplement'} 💊</h3>
        <form onsubmit="saveSupplement(event, ${supplementId})">
            <div class="form-group">
                <label>Ikona</label>
                <div class="time-options">
                    ${icons.map(icon => `
                        <span class="time-option ${supp?.icon === icon ? 'selected' : ''}" 
                              onclick="selectIcon(this, '${icon}')">${icon}</span>
                    `).join('')}
                </div>
                <input type="hidden" id="supplement-icon" value="${supp?.icon || '💊'}">
            </div>
            <div class="form-group">
                <label>Nazwa suplementu</label>
                <input type="text" id="supplement-name" required 
                       value="${supp?.name || ''}" 
                       placeholder="np. Kreatyna, Witamina D">
            </div>
            <div class="form-group">
                <label>Dawka</label>
                <input type="text" id="supplement-dose" required 
                       value="${supp?.dose || ''}" 
                       placeholder="np. 5g, 1000mg, 2 kapsułki">
            </div>
            <div class="form-group">
                <label>Pora przyjmowania</label>
                <div class="time-options">
                    <span class="time-option ${supp?.time === 'rano' ? 'selected' : ''}" 
                          onclick="selectTime(this, 'rano')">🌅 Rano</span>
                    <span class="time-option ${supp?.time === 'południe' ? 'selected' : ''}" 
                          onclick="selectTime(this, 'południe')">☀️ Południe</span>
                    <span class="time-option ${supp?.time === 'wieczorem' ? 'selected' : ''}" 
                          onclick="selectTime(this, 'wieczorem')">🌙 Wieczorem</span>
                    <span class="time-option ${supp?.time === 'przed treningiem' ? 'selected' : ''}" 
                          onclick="selectTime(this, 'przed treningiem')">💪 Przed treningiem</span>
                    <span class="time-option ${supp?.time === 'po treningu' ? 'selected' : ''}" 
                          onclick="selectTime(this, 'po treningu')">🏋️ Po treningu</span>
                </div>
                <input type="hidden" id="supplement-time" value="${supp?.time || 'rano'}">
            </div>
            <button type="submit" class="submit-btn">
                ${supp ? 'Zapisz zmiany' : 'Dodaj suplement'}
            </button>
        </form>
    `;
    
    openModal();
}

function selectIcon(element, icon) {
    document.querySelectorAll('#modal-content .time-options:first-of-type .time-option').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    document.getElementById('supplement-icon').value = icon;
}

function selectTime(element, time) {
    element.parentElement.querySelectorAll('.time-option').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    document.getElementById('supplement-time').value = time;
}

function saveSupplement(e, editId = null) {
    e.preventDefault();
    
    const supplement = {
        id: editId || Date.now(),
        name: document.getElementById('supplement-name').value,
        dose: document.getElementById('supplement-dose').value,
        time: document.getElementById('supplement-time').value,
        icon: document.getElementById('supplement-icon').value
    };
    
    if (editId) {
        const index = state.supplements.findIndex(s => s.id === editId);
        state.supplements[index] = supplement;
    } else {
        state.supplements.push(supplement);
    }
    
    saveData();
    renderHealth();
    closeModal();
    showNotification(editId ? 'Suplement zaktualizowany! 💊' : 'Suplement dodany! 💊');
}

function deleteSupplement(id) {
    if (confirm('Usunąć ten suplement?')) {
        state.supplements = state.supplements.filter(s => s.id !== id);
        state.supplementLogs = state.supplementLogs.filter(log => log.supplementId !== id);
        saveData();
        renderHealth();
        showNotification('Suplement usunięty 🗑️');
    }
}

// ==================== WAGA ====================

function renderWeight() {
    renderWeightSummary();
    renderWeightChart();
    renderWeightHistory();
}

function renderWeightSummary() {
    const weights = [...state.weight].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (weights.length === 0) {
        document.getElementById('current-weight').textContent = '--';
        document.getElementById('weight-change').textContent = '';
        document.getElementById('start-weight').textContent = '-- kg';
        document.getElementById('goal-weight').textContent = '-- kg';
        document.getElementById('weight-to-goal').textContent = '-- kg';
        document.getElementById('weight-progress-fill').style.width = '0%';
        return;
    }
    
    const current = weights[0].value;
    const previous = weights[1]?.value;
    
    document.getElementById('current-weight').textContent = current.toFixed(1);
    
    // Zmiana od ostatniego pomiaru
    if (previous) {
        const diff = current - previous;
        const changeEl = document.getElementById('weight-change');
        changeEl.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
        changeEl.className = 'weight-change ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
    }
    
    // Statystyki
    const startWeight = state.weightGoal.start || weights[weights.length - 1].value;
    const goalWeight = state.weightGoal.goal;
    
    document.getElementById('start-weight').textContent = startWeight.toFixed(1) + ' kg';
    document.getElementById('goal-weight').textContent = goalWeight ? goalWeight.toFixed(1) + ' kg' : '-- kg';
    
    if (goalWeight) {
        const toGoal = current - goalWeight;
        document.getElementById('weight-to-goal').textContent = 
            (toGoal > 0 ? '-' : '+') + Math.abs(toGoal).toFixed(1) + ' kg';
        
        // Progress bar
        const totalDiff = Math.abs(startWeight - goalWeight);
        const currentDiff = Math.abs(startWeight - current);
        const progress = totalDiff > 0 ? Math.min((currentDiff / totalDiff) * 100, 100) : 0;
        document.getElementById('weight-progress-fill').style.width = progress + '%';
        document.getElementById('weight-start-label').textContent = startWeight.toFixed(1) + ' kg';
        document.getElementById('weight-goal-label').textContent = goalWeight.toFixed(1) + ' kg';
    }
}

function renderWeightChart() {
    const container = document.getElementById('weight-chart-svg');
    const weights = [...state.weight]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30); // Ostatnie 30 pomiarów
    
    if (weights.length < 2) {
        container.innerHTML = `
            <text x="150" y="60" text-anchor="middle" fill="#999" font-size="12">
                Potrzeba min. 2 pomiarów
            </text>
        `;
        return;
    }
    
    const values = weights.map(w => w.value);
    const minVal = Math.min(...values) - 1;
    const maxVal = Math.max(...values) + 1;
    
    const width = 300;
    const height = 120;
    const padding = 10;
    
    const points = weights.map((w, i) => {
        const x = padding + (i / (weights.length - 1)) * (width - padding * 2);
        const y = height - padding - ((w.value - minVal) / (maxVal - minVal)) * (height - padding * 2);
        return { x, y, value: w.value };
    });
    
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;
    
    container.innerHTML = `
        <defs>
            <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:#667eea;stop-opacity:0.05" />
            </linearGradient>
        </defs>
        <path class="weight-area" d="${areaPath}" />
        <path class="weight-line" d="${linePath}" />
        ${points.map(p => `<circle class="weight-dot" cx="${p.x}" cy="${p.y}" r="3" />`).join('')}
    `;
}

function renderWeightHistory() {
    const container = document.getElementById('weight-history-list');
    const weights = [...state.weight].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (weights.length === 0) {
        container.innerHTML = `
            <div class="empty-weight">
                <p>Brak pomiarów wagi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = weights.slice(0, 20).map((w, i) => {
        const prev = weights[i + 1];
        let diffClass = 'same';
        let diffText = '-';
        
        if (prev) {
            const diff = w.value - prev.value;
            if (diff > 0) {
                diffClass = 'up';
                diffText = '+' + diff.toFixed(1);
            } else if (diff < 0) {
                diffClass = 'down';
                diffText = diff.toFixed(1);
            } else {
                diffText = '0';
            }
        }
        
        return `
            <li class="weight-history-item">
                <span class="weight-history-date">${formatDate(w.date)}</span>
                <span class="weight-history-value">${w.value.toFixed(1)} kg</span>
                <span class="weight-history-diff ${diffClass}">${diffText}</span>
                <button class="weight-history-delete" onclick="deleteWeight(${w.id})">🗑️</button>
            </li>
        `;
    }).join('');
}

function openWeightModal() {
    const today = new Date().toISOString().split('T')[0];
    const lastWeight = state.weight.length > 0 
        ? [...state.weight].sort((a, b) => new Date(b.date) - new Date(a.date))[0].value 
        : '';
    
    document.getElementById('modal-content').innerHTML = `
        <h3>⚖️ Dodaj pomiar wagi</h3>
        <form onsubmit="saveWeight(event)">
            <div class="form-group">
                <label>Data pomiaru</label>
                <input type="date" id="weight-date" required value="${today}">
            </div>
            <div class="form-group">
                <label>Waga (kg)</label>
                <input type="number" id="weight-value" required 
                       step="0.1" min="30" max="300"
                       value="${lastWeight}"
                       placeholder="np. 75.5">
            </div>
            <div class="form-group">
                <label>Notatka (opcjonalnie)</label>
                <input type="text" id="weight-note" 
                       placeholder="np. po treningu, rano na czczo">
            </div>
            <button type="submit" class="submit-btn">Zapisz pomiar</button>
        </form>
    `;
    
    openModal();
}

function saveWeight(e) {
    e.preventDefault();
    
    const weightEntry = {
        id: Date.now(),
        date: document.getElementById('weight-date').value,
        value: parseFloat(document.getElementById('weight-value').value),
        note: document.getElementById('weight-note').value,
        createdAt: new Date().toISOString()
    };
    
    // Sprawdź czy już istnieje pomiar z tego dnia
    const existingIndex = state.weight.findIndex(w => w.date === weightEntry.date);
    if (existingIndex !== -1) {
        state.weight[existingIndex] = weightEntry;
    } else {
        state.weight.push(weightEntry);
    }
    
    saveData();
    renderHealth();
    closeModal();
    showNotification('Pomiar zapisany! ⚖️');
}

function deleteWeight(id) {
    if (confirm('Usunąć ten pomiar?')) {
        state.weight = state.weight.filter(w => w.id !== id);
        saveData();
        renderHealth();
    }
}

function openWeightGoalModal() {
    const startWeight = state.weightGoal.start || 
        (state.weight.length > 0 ? [...state.weight].sort((a, b) => new Date(a.date) - new Date(b.date))[0].value : '');
    
    document.getElementById('modal-content').innerHTML = `
        <h3>🎯 Ustaw cel wagi</h3>
        <form onsubmit="saveWeightGoal(event)">
            <div class="form-group">
                <label>Waga początkowa (kg)</label>
                <input type="number" id="goal-start-weight" required 
                       step="0.1" min="30" max="300"
                       value="${startWeight}"
                       placeholder="np. 80">
            </div>
            <div class="form-group">
                <label>Waga docelowa (kg)</label>
                <input type="number" id="goal-target-weight" required 
                       step="0.1" min="30" max="300"
                       value="${state.weightGoal.goal || ''}"
                       placeholder="np. 75">
            </div>
            <button type="submit" class="submit-btn">Zapisz cel</button>
        </form>
    `;
    
    openModal();
}

function saveWeightGoal(e) {
    e.preventDefault();
    
    state.weightGoal = {
        start: parseFloat(document.getElementById('goal-start-weight').value),
        goal: parseFloat(document.getElementById('goal-target-weight').value)
    };
    
    saveData();
    renderHealth();
    closeModal();
    showNotification('Cel wagi ustawiony! 🎯');
}
// ============================================
// DARK MODE
// ============================================

function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    
    // Zapisz preferencję
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // Zmień ikonę przycisku
    const btn = document.querySelector('.darkmode-toggle');
    btn.textContent = isDark ? '☀️' : '🌙';
    
    // Powiadomienie
    showNotification(isDark ? 'Tryb ciemny włączony 🌙' : 'Tryb jasny włączony ☀️');
}

// Załaduj preferencję przy starcie
function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Użyj zapisanej preferencji lub systemowej
    if (darkMode === 'enabled' || (darkMode === null && prefersDark)) {
        document.body.classList.add('dark-mode');
        const btn = document.querySelector('.darkmode-toggle');
        if (btn) btn.textContent = '☀️';
    }
}

// Uruchom przy ładowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference();
});
// ============================================
// PROFIL
// ============================================

const ALL_TABS = [
    { id: 'tasks', name: 'Zadania', icon: '📋' },
    { id: 'workouts', name: 'Treningi', icon: '💪' },
    { id: 'calories', name: 'Kalorie', icon: '🍎' },
    { id: 'projects', name: 'Projekty', icon: '📂' },
    { id: 'sleep', name: 'Sen', icon: '😴' },
    { id: 'charts', name: 'Wykresy', icon: '📊' },
    { id: 'health', name: 'Zdrowie', icon: '💊' }
];

const PROFILE_ACHIEVEMENTS = [
    { id: 'first_task', icon: '📋', name: 'Pierwsze zadanie' },
    { id: 'task_10', icon: '🎯', name: '10 zadań' },
    { id: 'task_50', icon: '⭐', name: '50 zadań' },
    { id: 'first_workout', icon: '💪', name: 'Pierwszy trening' },
    { id: 'workout_10', icon: '🏋️', name: '10 treningów' },
    { id: 'streak_7', icon: '🔥', name: '7 dni serii' },
    { id: 'streak_30', icon: '🏆', name: '30 dni serii' },
    { id: 'points_100', icon: '💯', name: '100 punktów' }
];

function renderProfile() {
    // Imię i avatar
    document.getElementById('profile-name').textContent = state.profile.name;
    document.getElementById('profile-avatar-emoji').textContent = state.profile.avatar;
    
    // Statystyki
    const totalPoints = getTotalPoints();
    document.getElementById('profile-total-points').textContent = totalPoints;
    document.getElementById('profile-streak').textContent = calculateStreak();
    
    // Poziom
    const level = Math.floor(totalPoints / 100) + 1;
    const xpInLevel = totalPoints % 100;
    document.getElementById('profile-level').textContent = level;
    document.getElementById('level-progress-text').textContent = `${xpInLevel}/100 XP`;
    document.getElementById('level-progress-fill').style.width = `${xpInLevel}%`;
    
    // Tytuł poziomu
    const levelTitles = ['Początkujący', 'Adept', 'Regularny', 'Zaawansowany', 'Ekspert', 'Mistrz', 'Legenda'];
    document.getElementById('level-title').textContent = levelTitles[Math.min(level - 1, levelTitles.length - 1)];
    
    // Renderuj zakładki
    renderTabsToggle();
    
    // Renderuj osiągnięcia
    renderProfileAchievements();
    
    // Status dark mode
    updateDarkModeStatus();
    
    // Aktualizuj widoczność zakładek w nawigacji
    updateTabsVisibility();
}

function renderTabsToggle() {
    const container = document.getElementById('tabs-list');
    
    container.innerHTML = ALL_TABS.map(tab => `
        <div class="tab-toggle-item" onclick="toggleTabVisibility('${tab.id}')">
            <div class="tab-toggle-info">
                <span class="tab-toggle-icon">${tab.icon}</span>
                <span class="tab-toggle-name">${tab.name}</span>
            </div>
            <div class="tab-toggle-switch ${state.visibleTabs[tab.id] ? 'active' : ''}"></div>
        </div>
    `).join('');
}

function toggleTabVisibility(tabId) {
    state.visibleTabs[tabId] = !state.visibleTabs[tabId];
    
    // Upewnij się że przynajmniej jedna zakładka jest widoczna
    const visibleCount = Object.values(state.visibleTabs).filter(v => v).length;
    if (visibleCount === 0) {
        state.visibleTabs[tabId] = true;
        showNotification('Musi być widoczna przynajmniej jedna zakładka!');
        return;
    }
    
    saveData();
    renderTabsToggle();
    updateTabsVisibility();
    showNotification(state.visibleTabs[tabId] ? `${tabId} włączone ✓` : `${tabId} wyłączone`);
}

function updateTabsVisibility() {
    ALL_TABS.forEach(tab => {
        const navBtn = document.querySelector(`.nav-btn[data-tab="${tab.id}"]`);
        if (navBtn) {
            navBtn.style.display = state.visibleTabs[tab.id] ? 'flex' : 'none';
        }
    });
}

function renderProfileAchievements() {
    const container = document.getElementById('profile-achievements-grid');
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalWorkouts = state.workouts.length;
    const streak = calculateStreak();
    const points = getTotalPoints();
    
    // Sprawdź które osiągnięcia są odblokowane
    const unlocked = {
        'first_task': completedTasks >= 1,
        'task_10': completedTasks >= 10,
        'task_50': completedTasks >= 50,
        'first_workout': totalWorkouts >= 1,
        'workout_10': totalWorkouts >= 10,
        'streak_7': streak >= 7,
        'streak_30': streak >= 30,
        'points_100': points >= 100
    };
    
    container.innerHTML = PROFILE_ACHIEVEMENTS.map(ach => `
        <div class="achievement-item ${unlocked[ach.id] ? 'unlocked' : ''}" title="${ach.name}">
            <span class="achievement-icon">${ach.icon}</span>
            <span class="achievement-name">${ach.name}</span>
        </div>
    `).join('');
}

function changeAvatar() {
    const avatars = ['👤', '😊', '😎', '🤓', '🧑‍💻', '👨‍🎓', '🏃', '💪', '🧘', '🎮', '🎨', '🎵', '📚', '🌟', '🔥'];
    
    document.getElementById('modal-content').innerHTML = `
        <h3>Wybierz avatar</h3>
        <div class="avatar-grid">
            ${avatars.map(avatar => `
                <div class="avatar-option ${state.profile.avatar === avatar ? 'selected' : ''}" 
                     onclick="selectAvatar('${avatar}')">
                    ${avatar}
                </div>
            `).join('')}
        </div>
    `;
    
    openModal();
}

function selectAvatar(avatar) {
    state.profile.avatar = avatar;
    saveData();
    renderProfile();
    closeModal();
    showNotification('Avatar zmieniony! ' + avatar);
}

function editProfileName() {
    document.getElementById('modal-content').innerHTML = `
        <h3>Edytuj imię</h3>
        <form onsubmit="saveProfileName(event)">
            <div class="form-group">
                <label>Twoje imię</label>
                <input type="text" id="profile-name-input" required 
                       value="${state.profile.name}" 
                       placeholder="Wpisz swoje imię">
            </div>
            <button type="submit" class="submit-btn">Zapisz</button>
        </form>
    `;
    
    openModal();
}

function saveProfileName(e) {
    e.preventDefault();
    state.profile.name = document.getElementById('profile-name-input').value;
    saveData();
    renderProfile();
    closeModal();
    showNotification('Imię zmienione! 👤');
}

function updateDarkModeStatus() {
    const isDark = document.body.classList.contains('dark-mode');
    const statusEl = document.getElementById('darkmode-status');
    if (statusEl) {
        statusEl.textContent = isDark ? 'ON' : 'OFF';
        statusEl.className = 'setting-toggle' + (isDark ? ' on' : '');
    }
}

function exportData() {
    const data = {
        tasks: state.tasks,
        workouts: state.workouts,
        meals: state.meals,
        projects: state.projects,
        sleep: state.sleep,
        supplements: state.supplements,
        supplementLogs: state.supplementLogs,
        weight: state.weight,
        weightGoal: state.weightGoal,
        profile: state.profile,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifetracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Dane wyeksportowane! 📤');
}

function importData() {
    document.getElementById('modal-content').innerHTML = `
        <h3>Importuj dane</h3>
        <p style="color: var(--text-light); margin-bottom: 15px;">
            Wybierz plik backup JSON aby zaimportować dane.
        </p>
        <input type="file" id="import-file" accept=".json" onchange="handleImport(event)">
    `;
    
    openModal();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('Czy na pewno chcesz zaimportować dane? Obecne dane zostaną zastąpione.')) {
                if (data.tasks) state.tasks = data.tasks;
                if (data.workouts) state.workouts = data.workouts;
                if (data.meals) state.meals = data.meals;
                if (data.projects) state.projects = data.projects;
                if (data.sleep) state.sleep = data.sleep;
                if (data.supplements) state.supplements = data.supplements;
                if (data.supplementLogs) state.supplementLogs = data.supplementLogs;
                if (data.weight) state.weight = data.weight;
                if (data.weightGoal) state.weightGoal = data.weightGoal;
                if (data.profile) state.profile = data.profile;
                
                saveData();
                renderAll();
                closeModal();
                showNotification('Dane zaimportowane! 📥');
            }
        } catch (error) {
            showNotification('Błąd importu! Nieprawidłowy plik.');
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm('⚠️ Czy na pewno chcesz usunąć WSZYSTKIE dane? Tej operacji nie można cofnąć!')) {
        if (confirm('Na pewno? Wszystkie zadania, treningi, projekty i inne dane zostaną usunięte!')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// Aktualizuj dark mode toggle
const originalToggleDarkMode = typeof toggleDarkMode === 'function' ? toggleDarkMode : null;

function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    const btn = document.querySelector('.darkmode-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    
    updateDarkModeStatus();
    showNotification(isDark ? 'Tryb ciemny włączony 🌙' : 'Tryb jasny włączony ☀️');
}
// ============================================
// PROFIL
// ============================================


function renderProfile() {
    // Avatar i imię
    document.getElementById('profile-avatar').textContent = state.profile.avatar;
    document.getElementById('profile-name').textContent = state.profile.name;
    document.getElementById('profile-points').textContent = getTotalPoints();
    
    // Lista zakładek
    renderTabsToggleList();
    
    // Status dark mode
    updateDarkModeToggle();
    
    // Aktualizuj nawigację
    updateNavigation();
}

function renderTabsToggleList() {
    const container = document.getElementById('tabs-toggle-list');
    
    container.innerHTML = ALL_TABS.map(tab => `
        <div class="tab-toggle" onclick="toggleTab('${tab.id}')">
            <div class="tab-toggle-left">
                <span class="tab-toggle-icon">${tab.icon}</span>
                <span class="tab-toggle-name">${tab.name}</span>
            </div>
            <div class="toggle-switch ${state.visibleTabs[tab.id] ? 'active' : ''}"></div>
        </div>
    `).join('');
}

function toggleTab(tabId) {
    state.visibleTabs[tabId] = !state.visibleTabs[tabId];
    
    // Minimum 1 zakładka musi być widoczna
    const visibleCount = Object.values(state.visibleTabs).filter(v => v).length;
    if (visibleCount === 0) {
        state.visibleTabs[tabId] = true;
        showNotification('Minimum 1 zakładka musi być widoczna!');
        return;
    }
    
    saveData();
    renderTabsToggleList();
    updateNavigation();
}

function updateNavigation() {
    ALL_TABS.forEach(tab => {
        const btn = document.querySelector(`.nav-btn[data-tab="${tab.id}"]`);
        if (btn) {
            btn.style.display = state.visibleTabs[tab.id] ? 'flex' : 'none';
        }
    });
}

function updateDarkModeToggle() {
    const isDark = document.body.classList.contains('dark-mode');
    const toggle = document.getElementById('darkmode-toggle');
    if (toggle) {
        toggle.className = 'toggle-switch' + (isDark ? ' active' : '');
    }
}

function changeAvatar() {
    const avatars = ['👤', '😊', '😎', '🤓', '🧑‍💻', '💪', '🏃', '🧘', '🎮', '🎨', '📚', '🌟', '🔥', '❤️', '🦊'];
    
    document.getElementById('modal-content').innerHTML = `
        <h3>Wybierz avatar</h3>
        <div class="avatar-grid">
            ${avatars.map(a => `
                <div class="avatar-option ${state.profile.avatar === a ? 'selected' : ''}" 
                     onclick="selectAvatar('${a}')">${a}</div>
            `).join('')}
        </div>
    `;
    
    openModal();
}

function selectAvatar(avatar) {
    state.profile.avatar = avatar;
    saveData();
    renderProfile();
    closeModal();
    showNotification('Avatar zmieniony! ' + avatar);
}

function editProfileName() {
    document.getElementById('modal-content').innerHTML = `
        <h3>Edytuj imię</h3>
        <form onsubmit="saveProfileName(event)">
            <div class="form-group">
                <label>Twoje imię</label>
                <input type="text" id="new-profile-name" required 
                       value="${state.profile.name}" placeholder="Wpisz imię">
            </div>
            <button type="submit" class="submit-btn">Zapisz</button>
        </form>
    `;
    
    openModal();
}

function saveProfileName(e) {
    e.preventDefault();
    state.profile.name = document.getElementById('new-profile-name').value;
    saveData();
    renderProfile();
    closeModal();
    showNotification('Imię zmienione! 👤');
}

function exportData() {
    const data = {
        tasks: state.tasks,
        workouts: state.workouts,
        meals: state.meals,
        projects: state.projects,
        sleep: state.sleep,
        supplements: state.supplements,
        supplementLogs: state.supplementLogs,
        weight: state.weight,
        weightGoal: state.weightGoal,
        profile: state.profile,
        visibleTabs: state.visibleTabs,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifetracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Dane wyeksportowane! 📤');
}

function resetAllData() {
    if (confirm('⚠️ Usunąć WSZYSTKIE dane?')) {
        if (confirm('Na pewno? Nie można tego cofnąć!')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// Nadpisz toggleDarkMode żeby aktualizował toggle
const _originalToggleDarkMode = window.toggleDarkMode;
window.toggleDarkMode = function() {
    if (_originalToggleDarkMode) {
        _originalToggleDarkMode();
    } else {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        const btn = document.querySelector('.darkmode-toggle');
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
        showNotification(isDark ? 'Tryb ciemny 🌙' : 'Tryb jasny ☀️');
    }
    updateDarkModeToggle();
};