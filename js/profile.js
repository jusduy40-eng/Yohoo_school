/**
 * Yohoo School - Profile Manager
 * ดึงข้อมูลตัวละคร + ระบบขอเปลี่ยนชื่อ (รอแอดมินอนุมัติ)
 */

const ProfileManager = {
    currentData: null,
    currentUser: null,

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
            return;
        }

        if (navProfile) navProfile.style.display = 'block';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'inline-flex';
        if (profileSection) profileSection.style.display = 'block';

        const user = await auth.getUser();
        if (!user || !user.id) return;
        this.currentUser = user;

        this.loadProfileData(user);
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

        // ส่วนสูง / อาชีพ / เงิน
        document.getElementById('profileHeight').textContent = data.height ? `${data.height} ซม.` : '-';

        const jobMap = {
            'unemployed': 'ว่างงาน', 'student': 'นักเรียน', 'police': 'ตำรวจ',
            'ambulance': 'แพทย์', 'mechanic': 'ช่างยนต์'
        };
        document.getElementById('profileJob').textContent = jobMap[data.job] || data.job || 'ว่างงาน';
        document.getElementById('profileMoney').textContent = `$${Number(data.money || 0).toLocaleString()}`;
        document.getElementById('profileBank').textContent = `$${Number(data.bank || 0).toLocaleString()}`;

        // ===== จัดการสถานะ "รออนุมัติเปลี่ยนชื่อ" =====
        const pendingAlert = document.getElementById('profilePendingAlert');
        const btnChange = document.getElementById('btnRequestNameChange');

        if (data.name_change_pending) {
            // มีคำขอค้างอยู่ → แสดงข้อความเตือน + ปิดปุ่มขอเปลี่ยน
            pendingAlert.style.display = 'flex';
            pendingAlert.querySelector('span').textContent =
                `🟡 กำลังรอแอดมินอนุมัติเปลี่ยนชื่อเป็น: ${data.pending_firstname || ''} ${data.pending_lastname || ''}`;
            btnChange.style.display = 'none';
        } else {
            pendingAlert.style.display = 'none';
            btnChange.style.display = 'inline-flex';
        }
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

        // Validation
        errEl.style.display = 'none';
        if (!first || !last) {
            return this._showModalError('กรุณากรอกชื่อและนามสกุลใหม่ให้ครบ');
        }
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
                this.loadProfileData(this.currentUser); // โหลดใหม่เพื่อแสดงสถานะ pending
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
window.handleLogoutClick = () => auth.logout();

document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});
