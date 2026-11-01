/**
 * Yohoo School - Frontend Configuration
 * สำหรับหน้าเว็บ (รันใน Browser)
 */

const CONFIG = {
    discord: {
        clientId: '1525774458495959262',
        redirectUri: window.location.origin + '/register.html',
        scopes: ['identify', 'email']
    },

    api: {
        // ✅ ใช้ Vercel API Route โดยตรง
        botApiUrl: window.location.origin,
        timeout: 15000
    },

    validation: {
        minAge: 10,
        maxAge: 100,
        nameMinLength: 2,
        nameMaxLength: 50
    },

    messages: {
        success: {
            register: 'ลงทะเบียนสำเร็จ! คุณได้รับสิทธิ์เข้าเซิร์ฟเวอร์แล้ว'
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

// ทำให้ CONFIG เป็น global variable
window.CONFIG = CONFIG;
