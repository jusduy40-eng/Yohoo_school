/**
 * Yohoo School - Configuration (Frontend Safe)
 * Professional Discord Integration System
 */

const CONFIG = {
    // Discord OAuth2 Settings (เฉพาะข้อมูลที่ปลอดภัยสำหรับหน้าเว็บ)
    discord: {
        // ✅ ใส่ Client ID จริงจาก Discord Developer Portal ของคุณ
        clientId: '1525774458495959262', 
        
        // ✅ ปล่อยไว้แบบนี้ ระบบจะดึงโดเมนปัจจุบันมาต่อให้อัตโนมัติ
        redirectUri: window.location.origin + '/register.html',
        
        scopes: ['identify', 'email']
    },

    // API Settings (สำหรับเชื่อมต่อกับ Backend/Bot)
    api: {
        // 🔴 สำคัญ: แก้ไข URL นี้ให้ตรงกับที่คุณรัน Bot
        // - ถ้าทดสอบในเครื่อง (Local): 'http://localhost:3000'
        // - ถ้า Deploy ขึ้นเว็บแล้ว (เช่น Render/Railway): 'https://ชื่อโปรเจกต์-bot.onrender.com'
        botApiUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://your-bot-project.onrender.com', 
            
        timeout: 15000
    },

    // Validation Rules
    validation: {
        minAge: 10,
        maxAge: 100,
        nameMinLength: 2,
        nameMaxLength: 50
    },

    // Messages
    messages: {
        success: {
            register: 'ลงทะเบียนสำเร็จ! คุณได้รับยศ Member ใน Discord แล้ว',
            roleAssigned: 'เพิ่มยศ Member เรียบร้อย'
        },
        error: {
            authRequired: 'กรุณาเข้าสู่ระบบด้วย Discord ก่อน',
            invalidData: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ',
            duplicate: 'บัญชีนี้ลงทะเบียนแล้ว',
            network: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
            server: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์'
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
