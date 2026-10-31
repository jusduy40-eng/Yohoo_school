/**
 * Yohoo School - Frontend Configuration
 * ไฟล์นี้ใช้สำหรับตั้งค่าค่าคงที่ต่างๆ ของฝั่ง Client
 */

export const CONFIG = {
    // --- การตั้งค่า API ---
    API: {
        // URL ของ Backend (เปลี่ยนเป็นโดเมนจริงเมื่อขึ้น Production)
        // Local: 'http://localhost:3000/api'
        // Production: 'https://api.yohooschool.com/api'
        BASE_URL: import.meta.env?.VITE_API_URL || 'http://localhost:3000/api',
        
        // Timeout สำหรับการเรียก API (มิลลิวินาที)
        TIMEOUT: 10000
    },

    // --- การตั้งค่า Discord OAuth2 ---
    DISCORD: {
        // Client ID จาก Discord Developer Portal
        CLIENT_ID: import.meta.env?.VITE_DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID_HERE',
        
        // Scope ที่ต้องการขอสิทธิ์ (identify = อ่านข้อมูลพื้นฐาน, guilds = อ่านเซิร์ฟเวอร์ที่อยู่)
        SCOPE: 'identify guilds',
        
        // URL ที่จะให้ Discord ส่งกลับมาหลังจาก Login สำเร็จ
        // ต้องตรงกับที่ตั้งค่าใน Discord Developer Portal เป๊ะๆ
        REDIRECT_URI: import.meta.env?.VITE_REDIRECT_URI || `${window.location.origin}/auth/callback.html`,
        
        // Discord API Base URL
        API_BASE: 'https://discord.com/api/v10'
    },

    // --- การตั้งค่ากฎการลงทะเบียน (Validation Rules) ---
    VALIDATION: {
        AGE: {
            MIN: 10,
            MAX: 100
        },
        NAME: {
            MIN_LENGTH: 2,
            MAX_LENGTH: 50,
            // Regex สำหรับตรวจสอบชื่อภาษาไทยและอังกฤษเท่านั้น
            PATTERN: /^[a-zA-Zก-๙\s]+$/ 
        }
    },

    // --- การตั้งค่า UI / UX ---
    UI: {
        LOADING_DELAY: 1500, // เวลาแสดง Loading Screen (ms)
        TOAST_DURATION: 3000 // เวลาแสดงข้อความแจ้งเตือน (ms)
    }
};

export default CONFIG;
