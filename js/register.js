import { checkAuth, saveUserData } from './auth.js';
import { API_CONFIG } from './config.js';

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const authRequired = document.getElementById('authRequired');
const registerContainer = document.getElementById('registerContainer');
const loginBtn = document.getElementById('loginBtn');
const registerForm = document.getElementById('registerForm');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitBtn = document.getElementById('submitBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const successMessage = document.getElementById('successMessage');
const summaryContent = document.getElementById('summaryContent');
const progressFill = document.getElementById('progressFill');
const steps = document.querySelectorAll('.step');
const formSteps = document.querySelectorAll('.form-step');

// State
let currentStep = 1;
let userData = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // จำลอง loading
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        
        // ตรวจสอบ authentication
        userData = checkAuth();
        
        if (!userData) {
            authRequired.style.display = 'flex';
            registerContainer.style.display = 'none';
        } else {
            authRequired.style.display = 'none';
            registerContainer.style.display = 'block';
            displayUserData();
        }
    }, 1500);
});

// แสดงข้อมูล user
function displayUserData() {
    if (userData) {
        document.getElementById('userName').textContent = userData.username || userData.global_name || 'User';
        document.getElementById('userDiscord').textContent = `#${userData.discriminator || '0000'}`;
        
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator) % 5}.png`;
        
        document.getElementById('userAvatar').src = avatarUrl;
    }
}

// Event Listeners
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        window.loginWithDiscord();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (validateStep1()) {
            showStep(2);
            updateSummary();
        }
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        showStep(1);
    });
}

if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRegistration();
    });
}

// ตรวจสอบความถูกต้องของ Step 1
function validateStep1() {
    let isValid = true;
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const gender = document.querySelector('input[name="gender"]:checked');
    
    // ตรวจสอบชื่อ
    if (!firstName) {
        showError('firstNameError', 'กรุณากรอกชื่อจริง');
        isValid = false;
    } else {
        clearError('firstNameError');
    }
    
    // ตรวจสอบนามสกุล
    if (!lastName) {
        showError('lastNameError', 'กรุณากรอกนามสกุล');
        isValid = false;
    } else {
        clearError('lastNameError');
    }
    
    // ตรวจสอบวันเกิด
    if (!dateOfBirth) {
        showError('dateOfBirthError', 'กรุณาเลือกวันเดือนปีเกิด');
        isValid = false;
    } else {
        const age = calculateAge(dateOfBirth);
        if (age < 10 || age > 100) {
            showError('dateOfBirthError', 'อายุต้องอยู่ระหว่าง 10 - 100 ปี');
            isValid = false;
        } else {
            clearError('dateOfBirthError');
        }
    }
    
    // ตรวจสอบเพศ
    if (!gender) {
        showError('genderError', 'กรุณาเลือกเพศ');
        isValid = false;
    } else {
        clearError('genderError');
    }
    
    return isValid;
}

// คำนวณอายุ
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// แสดง Step
function showStep(step) {
    currentStep = step;
    
    // อัปเดต progress bar
    const progress = ((step - 1) / (formSteps.length - 1)) * 100;
    progressFill.style.width = `${progress}%`;
    
    // อัปเดต step indicators
    steps.forEach((s, index) => {
        if (index + 1 <= step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
    
    // แสดง/ซ่อน form steps
    formSteps.forEach((fs, index) => {
        if (index + 1 === step) {
            fs.classList.add('active');
        } else {
            fs.classList.remove('active');
        }
    });
}

// อัปเดตสรุปข้อมูล
function updateSummary() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const gender = document.querySelector('input[name="gender"]:checked');
    
    const genderText = {
        'male': 'ชาย',
        'female': 'หญิง',
        'other': 'อื่นๆ'
    };
    
    const age = calculateAge(dateOfBirth);
    
    summaryContent.innerHTML = `
        <div class="summary-item">
            <span class="summary-label"><i class="fas fa-user"></i> ชื่อ-นามสกุล:</span>
            <span class="summary-value">${firstName} ${lastName}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label"><i class="fas fa-cake-candles"></i> วันเกิด:</span>
            <span class="summary-value">${formatDate(dateOfBirth)} (อายุ ${age} ปี)</span>
        </div>
        <div class="summary-item">
            <span class="summary-label"><i class="fas fa-venus-mars"></i> เพศ:</span>
            <span class="summary-value">${genderText[gender.value]}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label"><i class="fab fa-discord"></i> Discord:</span>
            <span class="summary-value">${userData?.username || 'User'}#${userData?.discriminator || '0000'}</span>
        </div>
    `;
}

// จัดรูปแบบวันที่
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('th-TH', options);
}

// ส่งฟอร์ม
async function submitRegistration() {
    loadingOverlay.style.display = 'flex';
    
    const formData = {
        discordId: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        dateOfBirth: document.getElementById('dateOfBirth').value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        registeredAt: new Date().toISOString()
    };
    
    try {
        // ส่งข้อมูลไปยัง API
        const response = await fetch(`${API_CONFIG.BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('discord_token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            // สำเร็จ
            registerForm.style.display = 'none';
            successMessage.style.display = 'block';
            
            // ซ่อน progress bar
            document.querySelector('.progress-container').style.display = 'none';
        } else {
            const error = await response.json();
            alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถลงทะเบียนได้'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Helper functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}
