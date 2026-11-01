/**
 * Yohoo School - Configuration
 * Professional Discord Integration System
 */

const CONFIG = {
    // Discord OAuth2 Settings
    discord: {
        clientId: 'YOUR_DISCORD_CLIENT_ID',
        redirectUri: window.location.origin + '/register.html',
        botToken: 'YOUR_BOT_TOKEN',
        guildId: 'YOUR_GUILD_ID',
        memberRoleId: 'YOUR_MEMBER_ROLE_ID',
        webhookUrl: 'YOUR_DISCORD_WEBHOOK_URL',
        scopes: ['identify', 'email']
    },

    // API Settings
    api: {
        baseUrl: window.location.origin,
        timeout: 10000
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
