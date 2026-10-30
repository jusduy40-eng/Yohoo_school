let currentStep = 1;
const totalSteps = 2; // เปลี่ยนจาก 3 เป็น 2

document.addEventListener('DOMContentLoaded', () => {
    initializeRegistration();
});

async function initializeRegistration() {
    const loadingScreen = document.getElementById('loadingScreen');
    const authRequired = document.getElementById('authRequired');
    const registerContainer = document.getElementById('registerContainer');

    const isAuthenticated = await auth.requireAuth();

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);

        if (!isAuthenticated) {
            authRequired.style.display = 'flex';
            registerContainer.style.display = 'none';
        } else {
            authRequired.style.display = 'none';
            registerContainer.style.display = 'block';
            loadUserInfo();
            setupFormValidation();
        }
    }, 800);
}

async function loadUserInfo() {
    const user = await auth.getUser();
    if (user) {
        document.getElementById('userName').textContent = user.global_name || user.username;
        document.getElementById('userDiscord').textContent = `${user.username}#${user.discriminator}`;
        
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
        
        document.getElementById('userAvatar').src = avatarUrl;
    }
}

function setupFormValidation() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => clearInputError(input));
        input.addEventListener('blur', () => validateInput(input));
    });

    const dobInput = document.getElementById('dateOfBirth');
    if (dobInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - CONFIG.validation.minAge, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - CONFIG.validation.maxAge, today.getMonth(), today.getDate());
        dobInput.max = maxDate.toISOString().split('T')[0];
        dobInput.min = minDate.toISOString().split('T')[0];
    }

    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

function validateInput(input) {
    const value = input.value.trim();
    const errorElement = document.getElementById(input.id + 'Error');
    let isValid = true;
    let errorMsg = '';

    if (!value && input.hasAttribute('required')) {
        isValid = false;
        errorMsg = 'กรุณากรอกข้อมูลนี้';
    } else if ((input.id === 'firstName' || input.id === 'lastName') && value.length < CONFIG.validation.nameMinLength) {
        isValid = false;
        errorMsg = `ต้องมีความยาวอย่างน้อย ${CONFIG.validation.nameMinLength} ตัวอักษร`;
    }

    if (!isValid) {
        showInputError(input, errorMsg, errorElement);
    } else {
        clearInputError(input);
    }
    return isValid;
}

function showInputError(input, message, errorElement) {
    input.classList.add('error');
    if (errorElement) errorElement.textContent = message;
}

function clearInputError(input) {
    input.classList.remove('error');
    const errorElement = document.getElementById(input.id + 'Error');
    if (errorElement) errorElement.textContent = '';
}

function nextStep(step) {
    if (!validateCurrentStep()) return;
    currentStep = step;
    updateStepUI();
    if (step === 2) updateSummary(); // เปลี่ยนจาก 3 เป็น 2
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    currentStep = step;
    updateStepUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
    const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const inputs = currentFormStep.querySelectorAll('.form-input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateInput(input)) isValid = false;
    });

    if (currentStep === 1) {
        const genderSelected = document.querySelector('input[name="gender"]:checked');
        const genderError = document.getElementById('genderError');
        if (!genderSelected) {
            if (genderError) genderError.textContent = 'กรุณาเลือกเพศ';
            isValid = false;
        } else if (genderError) {
            genderError.textContent = '';
        }
    }
    return isValid;
}

function updateStepUI() {
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (currentFormStep) currentFormStep.classList.add('active');

    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < currentStep) step.classList.add('completed');
        else if (stepNum === currentStep) step.classList.add('active');
    });

    const progressFill = document.getElementById('progressFill');
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${progressPercentage}%`;
}

function updateSummary() {
    const genderLabels = { male: 'ชาย 👨', female: 'หญิง 👩', other: 'อื่นๆ ' };
    const dob = document.getElementById('dateOfBirth').value;
    const formattedDob = dob ? new Date(dob).toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) : '-';

    document.getElementById('summaryContent').innerHTML = `
        <div class="summary-item">
            <span class="summary-label">ชื่อ-นามสกุล</span>
            <span class="summary-value">${document.getElementById('firstName').value} ${document.getElementById('lastName').value}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">วันเดือนปีเกิด</span>
            <span class="summary-value">${formattedDob}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">เพศ</span>
            <span class="summary-value">${genderLabels[document.querySelector('input[name="gender"]:checked')?.value] || '-'}</span>
        </div>
    `;
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    const user = await auth.getUser();
    if (!user) {
        loadingOverlay.style.display = 'none';
        alert('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
        auth.login();
        return;
    }

    // ส่งแค่ข้อมูลส่วนตัว (ไม่มี steam, license แล้ว)
    const formData = {
        user_id: user.id,
        username: user.username,
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        date_of_birth: document.getElementById('dateOfBirth').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value
    };

    try {
        // ⚠️ ตรวจสอบว่า CONFIG.api.botApiUrl ตั้งค่าถูกต้อง
        const apiUrl = `${CONFIG.api.botApiUrl}/api/register`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || CONFIG.messages.error.server);
        }

        // แสดงหน้าสำเร็จ
        document.getElementById('registerForm').style.display = 'none';
        document.querySelector('.progress-container').style.display = 'none';
        document.querySelector('.form-header').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';

    } catch (error) {
        console.error('Registration error:', error);
        alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}
