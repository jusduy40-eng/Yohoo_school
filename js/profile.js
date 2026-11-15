/**
 * Yohoo School - Profile Manager (Optimized Real-time Version)
 * ดึงข้อมูลตัวละคร + ระบบขอเปลี่ยนชื่อ + อัปเดตเงินอัตโนมัติแบบไม่แลค
 */

const ProfileManager = {
    currentData: null,
    currentUser: null,
    refreshInterval: null,
    lastMoney: 0,
    lastBank: 0,

    async init() {
        const isAuth = await auth.requireAuth();

        const navProfile = document.getElementById('navProfile');
        const btnLogin = document.getElementById('btnLoginNav');
        const btnLogout = document.getElementById('btnLogoutNav');
        const profileSection = document.getElementById('profileSection');

        if (!isAuth) {
            if (navProfile) navProfile.style.display = 'none';
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (btnLogout) btnLogout.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            this.stopAutoRefresh();
            return;
        }

        if (navProfile) navProfile.style.display = 'block';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'inline-flex';
        if (profileSection) profileSection.style.display = 'block';

        const user = await auth.getUser();
        if (!user || !user.id) return;
        this.currentUser = user;

        await this.loadProfileData(user);
        this.startAutoRefresh(); // ✅ เริ่มระบบอัปเดตอัตโนมัติ
        this.setupVisibilityListener(); // ✅ เริ่มระบบพักการทำงานเมื่อสลับแท็บ
    },

    async loadProfileData(user) {
        this.showState('loading');

        try {
            const response = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`);
            const result = await response.json();

            if (response.status === 404 || !result.success) {
                this.showState('empty');
                return;
            }

            this.currentData = result.data;
            this.renderProfile(result.data, user);
            this.showState('filled');

        } catch (error) {
            console.error('❌ Profile load error:', error);
            this.showState('empty');
        }
    },

    showState(state) {
        document.getElementById('profileLoading').style.display = 'none';
        document.getElementById('profileEmpty').style.display = 'none';
        document.getElementById('profileFilled').style.display = 'none';

        const targetId = state === 'loading' ? 'profileLoading'
                       : state === 'empty' ? 'profileEmpty'
                       : 'profileFilled';
        document.getElementById(targetId).style.display = 'flex';
    },

    renderProfile(data, user) {
        // Avatar
        const avatarEl = document.getElementById('profileAvatar');
        if (user.avatar) {
            avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
        } else {
            const defaultAvatar = BigInt(user.id) >> 22n % 5n;
            avatarEl.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
        }

        // ชื่อ
        document.getElementById('profileName').textContent =
            `${data.firstname || ''} ${data.lastname || ''}`.trim() || 'ไม่ระบุชื่อ';
        document.getElementById('profileIdentifier').textContent = `Identifier: ${data.identifier}`;

        // วันเกิด
        if (data.dateofbirth) {
            const dob = new Date(data.dateofbirth);
            document.getElementById('profileDob').textContent =
                dob.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        // เพศ
        const genderMap = { 'm': 'ชาย 👨', 'f': 'หญิง 👩', 'u': 'ไม่ระบุ 🧑' };
        document.getElementById('profileGender').textContent = genderMap[data.sex] || data.sex;

        // ส่วนสูง / อาชีพ
        document.getElementById('profileHeight').textContent = data.height ? `${data.height} ซม.` : '-';
        const jobMap = {
            'unemployed': 'ว่างงาน', 'student': 'นักเรียน', 'police': 'ตำรวจ',
            'ambulance': 'แพทย์', 'mechanic': 'ช่างยนต์'
        };
        document.getElementById('profileJob').textContent = jobMap[data.job] || data.job || 'ว่างงาน';

        // ✅ บันทึกค่าเริ่มต้นเพื่อใช้เปรียบเทียบตอนอัปเดต
        this.lastMoney = Number(data.money || 0);
        this.lastBank = Number(data.bank || 0);
        
        document.getElementById('profileMoney').textContent = `$${this.lastMoney.toLocaleString()}`;
        document.getElementById('profileBank').textContent = `$${this.lastBank.toLocaleString()}`;

        // ===== จัดการสถานะ "รออนุมัติเปลี่ยนชื่อ" =====
        const pendingAlert = document.getElementById('profilePendingAlert');
        const btnChange = document.getElementById('btnRequestNameChange');

        if (data.name_change_pending) {
            pendingAlert.style.display = 'flex';
            pendingAlert.querySelector('span').textContent =
                `🟡 กำลังรอแอดมินอนุมัติเปลี่ยนชื่อเป็น: ${data.pending_firstname || ''} ${data.pending_lastname || ''}`;
            btnChange.style.display = 'none';
        } else {
            pendingAlert.style.display = 'none';
            btnChange.style.display = 'inline-flex';
        }
    },

    // ==========================================
    // ⚡ ระบบอัปเดตเงินอัตโนมัติแบบ Smart (ไม่แลค)
    // ==========================================
    startAutoRefresh() {
        this.stopAutoRefresh(); // ป้องกันการซ้อนทับ
        
        // อัปเดตทุก 10 วินาที (สมดุลที่สุด: รู้สึกว่า Real-time + เซิร์ฟเวอร์รับได้สบาย)
        this.refreshInterval = setInterval(async () => {
            if (!this.currentUser || document.hidden) return; // ✅ หยุดทำงานทันทีถ้าผู้ใช้สลับแท็บไปเล่นเกมหรือดูอย่างอื่น

            try {
                const response = await fetch(`/api/profile?user_id=${encodeURIComponent(this.currentUser.id)}`);
                const result = await response.json();

                if (result.success && result.data) {
                    const newData = result.data;
                    let hasChanged = false;

                    // เช็คเงินติดตัว
                    const newMoney = Number(newData.money || 0);
                    if (newMoney !== this.lastMoney) {
                        this.lastMoney = newMoney;
                        this.animateValue('profileMoney', newMoney);
                        hasChanged = true;
                    }

                    // เช็คเงินธนาคาร
                    const newBank = Number(newData.bank || 0);
                    if (newBank !== this.lastBank) {
                        this.lastBank = newBank;
                        this.animateValue('profileBank', newBank);
                        hasChanged = true;
                    }

                    if (hasChanged) {
                        console.log('💰 [Auto-Sync] เงินอัปเดตเรียบร้อย!');
                    }
                }
            } catch (error) {
                // ไม่ต้อง log error บ่อยๆ เพื่อป้องกัน console เต็ม
            }
        }, 10000); // 10,000 ms = 10 วินาที
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    // ✅ ฟังก์ชันพักการทำงานเมื่อผู้ใช้ไม่ได้อยู่ที่แท็บนี้ (ประหยัดทรัพยากร 100%)
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else if (this.currentUser) {
                this.startAutoRefresh();
                this.loadProfileData(this.currentUser); // โหลดข้อมูลล่าสุดทันทีที่กลับมา
            }
        });
    },

    // ✅ ฟังก์ชันทำให้ตัวเลขวิ่ง (Animation) ดูสมูทและโปร
    animateValue(elementId, endValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.innerText.replace(/[^0-9]/g, '')) || 0;
        if (startValue === endValue) return;

        const duration = 800; // ความเร็วในการวิ่ง (ms)
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (easeOutQuad) เพื่อให้ตัวเลขวิ่งเร็วตอนแรกแล้วค่อยๆ ช้าลง
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);

            element.textContent = `$${currentVal.toLocaleString()}`;

            if (progress < 1) {
                requestAnimationFrame(animate); // ใช้ requestAnimationFrame แทน setInterval เพื่อความลื่นไหลสูงสุด
            } else {
                element.textContent = `$${endValue.toLocaleString()}`;
                // Effect กระพริบสีเขียวเล็กน้อยเพื่อบอกว่าเงินเปลี่ยน
                element.style.color = '#4ade80'; 
                setTimeout(() => { element.style.color = ''; }, 1000);
            }
        };
        requestAnimationFrame(animate);
    },

    // ================= ระบบขอเปลี่ยนชื่อ =================
    openModal() {
        if (!this.currentData) return;
        document.getElementById('modalError').style.display = 'none';
        document.getElementById('newFirstName').value = '';
        document.getElementById('newLastName').value = '';
        document.getElementById('nameChangeModal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('nameChangeModal').style.display = 'none';
    },

    async submitNameChange() {
        const first = document.getElementById('newFirstName').value.trim();
        const last = document.getElementById('newLastName').value.trim();
        const errEl = document.getElementById('modalError');

        errEl.style.display = 'none';
        if (!first || !last) return this._showModalError('กรุณากรอกชื่อและนามสกุลใหม่ให้ครบ');
        if (first.length < 2 || first.length > 25 || last.length < 2 || last.length > 25) {
            return this._showModalError('ชื่อ/นามสกุล ต้องยาว 2-25 ตัวอักษร');
        }
        if (!/^[A-Za-zก-๙]+$/.test(first) || !/^[A-Za-zก-๙]+$/.test(last)) {
            return this._showModalError('ห้ามมีตัวเลขหรืออักขระพิเศษในชื่อ');
        }
        if (first === this.currentData.firstname && last === this.currentData.lastname) {
            return this._showModalError('ชื่อใหม่ซ้ำกับชื่อปัจจุบัน');
        }

        if (!this.currentUser) return;

        try {
            const response = await fetch('/api/request-name-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    new_first_name: first,
                    new_last_name: last
                })
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal();
                alert('✅ ส่งคำขอเปลี่ยนชื่อเรียบร้อยแล้ว! รอทีมงานอนุมัติ');
                this.loadProfileData(this.currentUser);
            } else {
                this._showModalError(result.error || 'ส่งคำขอไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Submit error:', error);
            this._showModalError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    },

    _showModalError(msg) {
        const errEl = document.getElementById('modalError');
        errEl.textContent = '⚠️ ' + msg;
        errEl.style.display = 'block';
    }
};

// ===== Global functions สำหรับ onclick ใน HTML =====
window.loadProfile = () => {
    auth.getUser().then(user => {
        if (user) ProfileManager.loadProfileData(user);
    });
};
window.openNameChangeModal = () => ProfileManager.openModal();
window.closeNameChangeModal = () => ProfileManager.closeModal();
window.submitNameChange = () => ProfileManager.submitNameChange();
window.handleLogoutClick = () => {
    ProfileManager.stopAutoRefresh(); // หยุดก่อน logout
    auth.logout();
};

document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});
