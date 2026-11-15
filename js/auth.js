/**
 * Yohoo School - Authentication System
 * Discord OAuth2 Integration + Auto-routing ตามสถานะตัวละคร
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.hasCharacter = null; // null = ยังไม่เช็ค, true/false = เช็คแล้ว
        this.init();
    }

    init() {
        this.checkAuthFromHash();
        this.token = this.getToken();
    }

    checkAuthFromHash() {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            const tokenType = params.get('token_type');
            const expiresIn = params.get('expires_in');

            if (token) {
                const authData = {
                    token,
                    tokenType,
                    expiresIn,
                    timestamp: Date.now()
                };
                localStorage.setItem('discord_auth', JSON.stringify(authData));
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    getToken() {
        const authData = localStorage.getItem('discord_auth');
        if (!authData) return null;

        try {
            const data = JSON.parse(authData);
            const expiresAt = data.timestamp + (data.expiresIn * 1000);

            if (Date.now() > expiresAt) {
                this.clearAuth();
                return null;
            }

            return data.token;
        } catch (error) {
            this.clearAuth();
            return null;
        }
    }

    async getUser() {
        if (this.user) return this.user;

        const token = this.getToken();
        if (!token) return null;

        try {
            const response = await fetch('https://discord.com/api/users/@me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user');
            }

            this.user = await response.json();
            return this.user;
        } catch (error) {
            console.error('Auth error:', error);
            this.clearAuth();
            return null;
        }
    }

    getAuthUrl() {
        const params = new URLSearchParams({
            client_id: CONFIG.discord.clientId,
            redirect_uri: CONFIG.discord.redirectUri,
            response_type: 'token',
            scope: CONFIG.discord.scopes.join(' ')
        });

        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }

    login() {
        window.location.href = this.getAuthUrl();
    }

    logout() {
        this.clearAuth();
        // กลับ index.html แบบ clean (ไม่ต้อง login ใหม่ถ้า token ยังไม่หมด)
        window.location.href = 'index.html';
    }

    clearAuth() {
        localStorage.removeItem('discord_auth');
        this.token = null;
        this.user = null;
        this.hasCharacter = null;
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    async requireAuth() {
        if (!this.isAuthenticated()) {
            return false;
        }
        const user = await this.getUser();
        return !!user;
    }

    // ============================================
    // 🆕 ฟังก์ชันใหม่: เช็คสถานะตัวละครจาก Supabase
    // ============================================
    async checkCharacter() {
        // ถ้าเช็คแล้ว ใช้ cache ได้ (แต่ถ้าอยากได้สดๆ ให้ข้าม cache)
        if (this.hasCharacter !== null) return this.hasCharacter;

        const user = await this.getUser();
        if (!user || !user.id) {
            this.hasCharacter = false;
            return false;
        }

        try {
            const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`);
            // 200 = มีตัวละคร, 404 = ยังไม่มี
            this.hasCharacter = res.ok;
            return this.hasCharacter;
        } catch (error) {
            console.error('❌ checkCharacter error:', error);
            this.hasCharacter = false;
            return false;
        }
    }

    // ============================================
    // 🆕 ฟังก์ชันใหม่: Auto-route หลัง Login สำเร็จ
    // ============================================
    async routeAfterLogin() {
        if (!this.isAuthenticated()) {
            // ยังไม่ login → ไป Discord OAuth
            this.login();
            return;
        }

        const hasChar = await this.checkCharacter();

        if (!hasChar) {
            // login แล้ว แต่ยังไม่มีตัวละคร → เด้งไป register.html
            console.log('📝 ยังไม่มีตัวละคร → redirect ไป register.html');
            window.location.href = 'register.html';
        } else {
            // มีตัวละครแล้ว → อยู่หน้า index.html (ProfileManager จะแสดงข้อมูลเอง)
            console.log('✅ มีตัวละครแล้ว → แสดง profile');
        }
    }
}

// Global auth instance
const auth = new AuthManager();

// ============================================
// 🆕 Global functions สำหรับ HTML onclick
// ============================================

// ปุ่ม "เข้าสู่ระบบ" / "เริ่มลงทะเบียน" ใน Navbar + Hero
// → behavior ใหม่: เช็คก่อนว่ามีตัวละครหรือยัง
function handleLoginClick() {
    if (!auth.isAuthenticated()) {
        // ยังไม่ login → ไป Discord OAuth
        auth.login();
        return;
    }

    // login แล้ว → เช็คตัวละคร แล้วค่อยตัดสินใจ
    auth.checkCharacter().then(hasChar => {
        if (hasChar) {
            // มีตัวละครแล้ว → scroll ไปหน้า profile ใน index.html
            const profileSection = document.getElementById('profileSection');
            if (profileSection) {
                profileSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // ยังไม่มี → ไป register.html
            window.location.href = 'register.html';
        }
    });
}

// ปุ่ม "เข้าสู่ระบบ" แบบเดิม (ถ้าอยากให้ไปหน้า login ตรงๆ)
function loginWithDiscord() {
    auth.login();
}

// ปุ่ม "ออกจากระบบ"
function logout() {
    auth.logout();
}

// ============================================
// 🆕 Auto-run หลัง Login กลับมา (OAuth redirect)
// ============================================
// ถ้าอยู่หน้า index.html + login แล้ว + ยังไม่เช็คตัวละคร
// → ให้เช็คอัตโนมัติ (ไม่ต้อง auto-redirect เพราะอาจกวนผู้ใช้)
// แต่จะ set flag ไว้ให้ ProfileManager ใช้
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        if (auth.isAuthenticated()) {
            // เช็คเงียบๆ ไว้ให้ ProfileManager render
            await auth.checkCharacter();
        }
    }
});
