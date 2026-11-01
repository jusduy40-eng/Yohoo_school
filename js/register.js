/**
 * Yohoo School - Registration System
 */

let currentStep = 1;
const totalSteps = 3;

document.addEventListener('DOMContentLoaded', () => {
    initializeRegistration();
});

async function initializeRegistration() {
    const loadingScreen = document.getElementById('loadingScreen');
    const authRequired = document.getElementById('authRequired');
    const registerContainer = document.getElementById('registerContainer');

    // Check authentication
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
        input.addEventListener('input', () => {
            clearInputError(input);
        });

        input.addEventListener('blur', () => {
            validateInput(input);
        });
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

    if (input.id === 'firstName' || input.id === 'lastName') {
        if (value.length < CONFIG.validation.nameMinLength) {
            showInputError(input, `ต้องมีความยาวอย่างน้อย ${CONFIG.validation.nameMinLength} ตัวอักษร`, errorElement);
            return false;
        }
    }

    if (input.id === 'steamHex') {
        if (!/^steam:\d+$/.test(value)) {
            showInputError(input, 'รูปแบบไม่ถูกต้อง (เช่น steam:110000123456789)', errorElement);
            return false;
        }
    }

    if (input.id === 'fivemLicense') {
        if (!/^license:[a-zA-Z0-9]+$/.test(value)) {
            showInputError(input, 'รูปแบบไม่ถูกต้อง (เช่น license:xxxxxxxx)', errorElement);
            return false;
        }
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

    if (step === 3) {
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
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${progressPercentage}%`;
}

function updateSummary() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const dob = document.getElementById('dateOfBirth').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const steamHex = document.getElementById('steamHex').value;
    const fivemLicense = document.getElementById('fivemLicense').value;

    const genderLabels = {
        male: 'ชาย',
        female: 'หญิง',
        other: 'อื่นๆ'
    };

    const formattedDob = dob ? new Date(dob).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '-';

    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">ชื่อ-นามสกุล</span>
            <span class="summary-value">${firstName} ${lastName}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">วันเดือนปีเกิด</span>
            <span class="summary-value">${formattedDob}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">เพศ</span>
            <span class="summary-value">${genderLabels[gender] || '-'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Steam ID</span>
            <span class="summary-value">${steamHex}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">FiveM License</span>
            <span class="summary-value">${fivemLicense}</span>
        </div>
    `;
}

async function handleSubmit(e) {
    e.preventDefault();

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    const user = await auth.getUser();
    const formData = {
        discord_id: user ? `${user.username}#${user.discriminator}` : '',
        discord_user_id: user ? user.id : '',
        username: user ? user.username : '',
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        date_of_birth: document.getElementById('dateOfBirth').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value,
        steam_hex: document.getElementById('steamHex').value.trim(),
        fivem_license: document.getElementById('fivemLicense').value.trim(),
        registered_at: new Date().toISOString()
    };

    try {
        // Send to Discord Webhook
        await sendToWebhook(formData);

        // Try to assign Discord role (optional, may fail if bot not running)
        try {
            await assignDiscordRole(user.id);
        } catch (roleError) {
            console.warn('Role assignment failed:', roleError);
        }

        // Show success
        document.getElementById('registerForm').style.display = 'none';
        document.querySelector('.progress-container').style.display = 'none';
        document.querySelector('.form-header').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';

    } catch (error) {
        console.error('Registration error:', error);
        alert('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

async function sendToWebhook(data) {
    const genderLabels = {
        male: 'ชาย',
        female: 'หญิง',
        other: 'อื่นๆ'
    };

    const embed = {
        title: ' มีการลงทะเบียนใหม่',
        color: 0x10B981,
        timestamp: new Date().toISOString(),
        fields: [
            {
                name: 'ชื่อ-นามสกุล',
                value: `${data.first_name} ${data.last_name}`,
                inline: true
            },
            {
                name: 'วันเดือนปีเกิด',
                value: new Date(data.date_of_birth).toLocaleDateString('th-TH'),
                inline: true
            },
            {
                name: 'เพศ',
                value: genderLabels[data.gender] || '-',
                inline: true
            },
            {
                name: 'Discord',
                value: data.discord_id,
                inline: false
            },
            {
                name: 'Steam ID',
                value: data.steam_hex,
                inline: true
            },
            {
                name: 'FiveM License',
                value: data.fivem_license,
                inline: true
            }
        ],
        footer: {
            text: 'Yohoo School Registration System'
        }
    };

    const response = await fetch(CONFIG.discord.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: '✅ **ลงทะเบียนสำเร็จ!**',
            embeds: [embed]
        })
    });

    if (!response.ok) {
        throw new Error('Webhook request failed');
    }
}

async function assignDiscordRole(userId) {
    const response = await fetch(`${CONFIG.api.baseUrl}:3000/give-role`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: userId,
            role_id: CONFIG.discord.memberRoleId,
            guild_id: CONFIG.discord.guildId
        })
    });

    if (!response.ok) {
        throw new Error('Role assignment failed');
    }

    return response.json();
}
