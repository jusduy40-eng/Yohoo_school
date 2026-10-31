import { API_CONFIG, DISCORD_AUTH } from './config.js';

// ตรวจสอบว่า login หรือไม่
export function checkAuth() {
    const token = localStorage.getItem('discord_token');
    const user = localStorage.getItem('discord_user');
    
    if (!token || !user) {
        return false;
    }
    
    try {
        const userData = JSON.parse(user);
        return userData;
    } catch (e) {
        return false;
    }
}

// เข้าสู่ระบบด้วย Discord
export function loginWithDiscord() {
    const authUrl = `${DISCORD_AUTH.AUTHORIZE_URL}?client_id=${API_CONFIG.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(API_CONFIG.REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(DISCORD_AUTH.SCOPE)}`;
    window.location.href = authUrl;
}

// บันทึกข้อมูล user
export function saveUserData(userData, token) {
    localStorage.setItem('discord_token', token);
    localStorage.setItem('discord_user', JSON.stringify(userData));
}

// ออกจากระบบ
export function logout() {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_user');
    window.location.href = 'index.html';
}

// ทำให้ฟังก์ชันพร้อมใช้งานใน HTML
window.loginWithDiscord = loginWithDiscord;
window.logout = logout;
