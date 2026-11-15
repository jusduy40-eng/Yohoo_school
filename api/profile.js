/**
 * Yohoo School - Profile Manager
 * ดึงข้อมูลตัวละครจาก API และแสดงผลบนหน้าเว็บ
 */

const ProfileManager = {
    async init() {
        // 1. เช็คว่าล็อกอินหรือยัง
        const isAuth = await auth.requireAuth();
        
        const navProfile = document.getElementById('navProfile');
        const btnLogin = document.getElementById('btnLoginNav');
        const btnLogout = document.getElementById('btnLogoutNav');
        const profileSection = document.getElementById('profileSection');

        if (!isAuth) {
            // ยังไม่ล็อกอิน: ซ่อนส่วนโปรไฟล์และปุ่มต่างๆ
            if (navProfile) navProfile.style.display = 'none';
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (btnLogout) btnLogout.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            return;
        }

        // ล็อกอินแล้ว: แสดงส่วนโปรไฟล์และปรับปุ่ม Navbar
        if (navProfile) navProfile.style.display = 'block';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'inline-flex';
        if (profileSection) profileSection.style.display = 'block';

        // 2. ดึงข้อมูลผู้ใช้จาก Discord
        const user = await auth.getUser();
        if (!user || !user.id) {
            console.error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
            return;
        }

        // 3. โหลดข้อมูลตัวละคร
        this.loadProfileData(user);
    },

    async loadProfileData(user) {
        this.showState('loading');

        try {
            // เรียก API ที่เราสร้างไว้ (api/profile.js)
            const response = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`);
            const result = await response.json();

            if (response.status === 404 || !result.success) {
                // ไม่พบข้อมูลตัวละคร (สถานะ 404)
                this.showState('empty');
                return;
            }

            // พบข้อมูล: นำไปแสดงผล
            this.renderProfile(result.data, user);
            this.showState('filled');

        } catch (error) {
            console.error('❌ Profile load error:', error);
            this.showState('empty'); // Fallback ถ้า error ให้แสดงว่ายังไม่มีข้อมูล
        }
    },

    showState(state) {
        // ซ่อนทุกการ์ดก่อน
        document.getElementById('profileLoading').style.display = 'none';
        document.getElementById('profileEmpty').style.display = 'none';
        document.getElementById('profileFilled').style.display = 'none';

        // แสดงการ์ดตามสถานะ (ใช้ 'flex' เพื่อให้จัดกึ่งกลางตาม CSS)
        const targetId = state === 'loading' ? 'profileLoading' 
                       : state === 'empty' ? 'profileEmpty' 
                       : 'profileFilled';
        document.getElementById(targetId).style.display = 'flex';
    },

    renderProfile(data, user) {
        // 1. รูปโปรไฟล์ (ใช้รูปจาก Discord ถ้ามี)
        const avatarEl = document.getElementById('profileAvatar');
        if (user.avatar) {
            avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
        } else {
            // Fallback: รูปเริ่มต้นของ Discord (คำนวณจาก User ID)
            const defaultAvatar = BigInt(user.id) >> 22n % 5n;
            avatarEl.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
        }

        // 2. ชื่อ-นามสกุล
        document.getElementById('profileName').textContent = `${data.firstname || ''} ${data.lastname || ''}`.trim() || 'ไม่ระบุชื่อ';
        document.getElementById('profileIdentifier').textContent = `Identifier: ${data.identifier}`;

        // 3. วันเกิด (แปลงเป็นรูปแบบไทย)
        if (data.dateofbirth) {
            const dob = new Date(data.dateofbirth);
            document.getElementById('profileDob').textContent = dob.toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });
        }

        // 4. เพศ
        const genderMap = { 'm': 'ชาย 👨', 'f': 'หญิง 👩', 'u': 'ไม่ระบุ 🧑' };
        document.getElementById('profileGender').textContent = genderMap[data.sex] || data.sex;

        // 5. ส่วนสูง
        document.getElementById('profileHeight').textContent = data.height ? `${data.height} ซม.` : '-';

        // 6. อาชีพ
        const jobMap = { 
            'unemployed': 'ว่างงาน', 
            'student': 'นักเรียน', 
            'police': 'ตำรวจ', 
            'ambulance': 'แพทย์',
            'mechanic': 'ช่างยนต์'
        };
        document.getElementById('profileJob').textContent = jobMap[data.job] || data.job || 'ว่างงาน';

        // 7. เงิน (ใส่ลูกน้ำคั่นหลักพัน)
        document.getElementById('profileMoney').textContent = `$${Number(data.money || 0).toLocaleString()}`;
        document.getElementById('profileBank').textContent = `$${Number(data.bank || 0).toLocaleString()}`;
    },

    async deleteCharacter() {
        if (!confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบลักษณะตัวละคร?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้ และคุณจะต้องลงทะเบียนใหม่ทั้งหมด')) {
            return;
        }

        const user = await auth.getUser();
        if (!user || !user.id) return;

        try {
            const response = await fetch('/api/delete-character', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ ลบลักษณะตัวละครเรียบร้อยแล้ว');
                this.loadProfileData(user); // โหลดหน้าใหม่เพื่อแสดงสถานะ "ยังไม่มีตัวละคร"
            } else {
                alert('❌ เกิดข้อผิดพลาด: ' + (result.error || 'ไม่ทราบสาเหตุ'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    }
};

// ทำให้ฟังก์ชันเรียกใช้ได้จาก HTML (onclick)
window.loadProfile = () => {
    auth.getUser().then(user => {
        if (user) ProfileManager.loadProfileData(user);
    });
};

window.deleteCharacter = () => {
    ProfileManager.deleteCharacter();
};

window.handleLogoutClick = () => {
    auth.logout();
};

// เริ่มทำงานเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});
