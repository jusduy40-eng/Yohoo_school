/**
 * Yohoo School - Registration System (2 Steps)
 */

let currentStep = 1;
const totalSteps = 2; // เปลี่ยนจาก 3 เป็น 2

document.addEventListener('DOMContentLoaded', () => {
    initializeRegistration();
});

async function initializeRegistration() {
    const loadingScreen = document.getElementById('loadingScreen');
    const authRequired = document.getElementById('authRequired');
    const registerContainer = document.getElementById('registerContainer');

    try {
        const isAuthenticated = await auth.requireAuth();

        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }

            if (!isAuthenticated) {
                if (authRequired) authRequired.style.display = 'flex';
                if (registerContainer) registerContainer.style.display = 'none';
            } else {
                if (authRequired) authRequired.style.display = 'none';
                if (registerContainer) registerContainer.style.display = 'block';
                loadUserInfo();
                setupFormValidation();
            }
        }, 800);
    } catch (error) {
        console.error('Auth error:', error);
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            loadingScreen.style.display = 'none';
        }
        if (authRequired) authRequired.style.display = 'flex';
        if (registerContainer) registerContainer.style.display = 'none';
    }
}

async function loadUserInfo() {
    try {
        const user = await auth.getUser();
        if (user) {
            const userNameEl = document.getElementById('userName');
            const userDiscordEl = document.getElementById('userDiscord');
            const userAvatarEl = document.getElementById('userAvatar');
            
            if (userNameEl) userNameEl.textContent = user.global_name || user.username;
            if (userDiscordEl) userDiscordEl.textContent = `${user.username}#${user.discriminator}`;
            
            const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
            
            if (userAvatarEl) userAvatarEl.src = avatarUrl;
        }
    } catch (error) {
        console.error('Load user info error:', error);
    }
}

function setupFormValidation() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => clearInputError(input));
        input.addEventListener('blur', () => validateInput(input));
    });

    // Date of birth validation
    const dobInput = document.getElementById('dateOfBirth');
    if (dobInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - CONFIG.validation.minAge, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - CONFIG.validation.maxAge, today.getMonth(), today.getDate());
        
        dobInput.max = maxDate.toISOString().split('T')[0];
        dobInput.min = minDate.toISOString().split('T')[0];
    }

    // Form submission
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

function validateInput(input) {
    const value = input.value.trim();
    const errorElement = document.getElementById(input.id + 'Error');

    if (!value && input.hasAttribute('required')) {
        showInputError(input, 'กรุณากรอกข้อมูลนี้', errorElement);
        return false;
    }

    if ((input.id === 'firstName' || input.id === 'lastName') && value.length < CONFIG.validation.nameMinLength) {
        showInputError(input, `ต้องมีความยาวอย่างน้อย ${CONFIG.validation.nameMinLength} ตัวอักษร`, errorElement);
        return false;
    }

    clearInputError(input);
    return true;
}

function showInputError(input, message, errorElement) {
    input.classList.add('error');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearInputError(input) {
    input.classList.remove('error');
    const errorElement = document.getElementById(input.id + 'Error');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

function nextStep(step) {
    if (!validateCurrentStep()) return;

    currentStep = step;
    updateStepUI();

    if (step === 2) {
        updateSummary();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    currentStep = step;
    updateStepUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
    const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!currentFormStep) return false;
    
    const inputs = currentFormStep.querySelectorAll('.form-input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });

    // Special validation for gender in step 1
    if (currentStep === 1) {
        const genderSelected = document.querySelector('input[name="gender"]:checked');
        const genderError = document.getElementById('genderError');
        
        if (!genderSelected) {
            if (genderError) {
                genderError.textContent = 'กรุณาเลือกเพศ';
            }
            isValid = false;
        } else if (genderError) {
            genderError.textContent = '';
        }
    }

    return isValid;
}

function updateStepUI() {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show current step
    const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (currentFormStep) {
        currentFormStep.classList.add('active');
    }

    // Update progress indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
            step.classList.add('completed');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
        }
    });

    // Update progress fill
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }
}

function updateSummary() {
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const dobEl = document.getElementById('dateOfBirth');
    const genderEl = document.querySelector('input[name="gender"]:checked');

    if (!firstNameEl || !lastNameEl || !dobEl) {
        console.error('Form elements not found');
        return;
    }

    const genderLabels = {
        male: 'ชาย 👨',
        female: 'หญิง 👩',
        other: 'อื่นๆ 🧑'
    };

    const formattedDob = dobEl.value ? new Date(dobEl.value).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '-';

    const summaryContent = document.getElementById('summaryContent');
    if (summaryContent) {
        summaryContent.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">ชื่อ-นามสกุล</span>
                <span class="summary-value">${firstNameEl.value} ${lastNameEl.value}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">วันเดือนปีเกิด</span>
                <span class="summary-value">${formattedDob}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">เพศ</span>
                <span class="summary-value">${genderLabels[genderEl?.value] || '-'}</span>
            </div>
        `;
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const user = await auth.getUser();
        if (!user) {
            throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
        }

        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const dobEl = document.getElementById('dateOfBirth');
        const genderEl = document.querySelector('input[name="gender"]:checked');

        if (!firstNameEl || !lastNameEl || !dobEl || !genderEl) {
            throw new Error('ไม่พบฟอร์มข้อมูล กรุณารีเฟรชหน้าเว็บ');
        }

        const formData = {
            user_id: user.id,
            username: user.username,
            first_name: firstNameEl.value.trim(),
            last_name: lastNameEl.value.trim(),
            date_of_birth: dobEl.value,
            gender: genderEl.value
        };

        console.log('Sending to:', `${CONFIG.api.botApiUrl}/api/register`);
        console.log('Data:', formData);

        const response = await fetch(`${CONFIG.api.botApiUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server ตอบกลับไม่เป็น JSON');
        }

        if (!response.ok || !result.success) {
            throw new Error(result.error || CONFIG.messages.error.server);
        }

        // Show success
        const form = document.getElementById('registerForm');
        const progressContainer = document.querySelector('.progress-container');
        const formHeader = document.querySelector('.form-header');
        const successMessage = document.getElementById('successMessage');

        if (form) form.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (formHeader) formHeader.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';

    } catch (error) {
        console.error('Registration error:', error);
        alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}
