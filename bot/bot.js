/**
 * Yohoo School - Discord Bot & API Server
 * Handles secure registration, webhook notifications, and role assignment
 */

// ⚠️ สำคัญ: ต้องอยู่บรรทัดแรกสุดเพื่อโหลดค่าจากไฟล์ .env
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// 1. Configuration (ดึงจาก .env)
// ==========================================
const CONFIG = {
    botToken: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    memberRoleId: process.env.DISCORD_MEMBER_ROLE_ID,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    port: process.env.PORT || 3000
};

// ตรวจสอบว่าตั้งค่า .env ครบหรือไม่
if (!CONFIG.botToken || !CONFIG.guildId || !CONFIG.memberRoleId) {
    console.error('❌ ERROR: กรุณาตรวจสอบไฟล์ .env ให้ครบถ้วน (BOT_TOKEN, GUILD_ID, MEMBER_ROLE_ID)');
    process.exit(1);
}

// ==========================================
// 2. Initialize Discord Client
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// 3. Initialize Express Server
// ==========================================
const app = express();
app.use(express.json());

// Middleware: Logging แบบง่าย
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// 4. API Endpoints
// ==========================================

// ✅ Health Check (ไว้เช็คว่า Bot รันอยู่ไหม)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        botReady: client.isReady(),
        timestamp: new Date().toISOString()
    });
});

// ✅ Unified Registration Endpoint (รับข้อมูล -> ส่ง Webhook -> ให้ Role)
app.post('/api/register', async (req, res) => {
    const { user_id, username, first_name, last_name, date_of_birth, gender, steam_hex, fivem_license } = req.body;

    // 1. Validation: ตรวจสอบข้อมูลพื้นฐาน
    if (!user_id || !first_name || !last_name || !steam_hex || !fivem_license) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields. กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }

    try {
        // 2. Send Webhook Notification (ทำโดย Bot เพื่อความปลอดภัย)
        if (CONFIG.webhookUrl) {
            const genderLabels = { male: 'ชาย 👨', female: 'หญิง 👩', other: 'อื่นๆ 🧑' };
            
            const embed = {
                title: '📝 มีการลงทะเบียนใหม่',
                color: 0x10B981, // สีเขียวมิ้นต์
                timestamp: new Date().toISOString(),
                fields: [
                    { name: '👤 ชื่อ-นามสกุล', value: `${first_name} ${last_name}`, inline: true },
                    { name: '🎂 วันเดือนปีเกิด', value: new Date(date_of_birth).toLocaleDateString('th-TH'), inline: true },
                    { name: '⚧ เพศ', value: genderLabels[gender] || 'ไม่ระบุ', inline: true },
                    { name: '💬 Discord', value: `<@${user_id}> (${username || 'Unknown'})`, inline: false },
                    { name: '🎮 Steam ID', value: `\`${steam_hex}\``, inline: true },
                    { name: '🎟️ FiveM License', value: `\`${fivem_license}\``, inline: true }
                ],
                footer: { text: 'Yohoo School Registration System' }
            };

            await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '✅ **มีผู้ลงทะเบียนใหม่!** กำลังดำเนินการให้ยศ...',
                    embeds: [embed]
                })
            });
            console.log('✅ Webhook sent successfully');
        }

        // 3. Assign Discord Role
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(user_id);
        
        // ตรวจสอบว่ามียศนี้อยู่แล้วหรือยัง เพื่อป้องกัน Error
        if (member.roles.cache.has(CONFIG.memberRoleId)) {
            console.log(`⚠️ User ${user_id} already has the member role.`);
        } else {
            await member.roles.add(CONFIG.memberRoleId);
            console.log(`✅ Role assigned to ${member.user.tag}`);
        }

        // 4. Respond to Frontend
        res.json({
            success: true,
            message: 'ลงทะเบียนสำเร็จและได้รับยศ Member แล้ว',
            user: member.user.tag
        });

    } catch (error) {
        console.error('❌ Registration Error:', error.message);
        
        // จัดการ Error กรณีหา User ไม่เจอ (เช่น ยังไม่ได้เข้าเซิร์ฟเวอร์ Discord)
        if (error.code === 10007) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบผู้ใช้ในเซิร์ฟเวอร์ Discord กรุณาเข้าร่วมเซิร์ฟเวอร์ก่อนลงทะเบียน'
            });
        }

        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง'
        });
    }
});

// ==========================================
// 5. Discord Bot Events
// ==========================================
client.once('ready', () => {
    console.log('========================================');
    console.log(`✅ Bot logged in as: ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);
    console.log('========================================');
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

// ==========================================
// 6. Start Services
// ==========================================
async function startServices() {
    try {
        // Start HTTP Server First
        app.listen(CONFIG.port, () => {
            console.log(`🌐 HTTP API Server running on port ${CONFIG.port}`);
            console.log(`📋 Available Endpoints:`);
            console.log(`   - GET  /health`);
            console.log(`   - POST /api/register`);
        });

        // Login to Discord
        await client.login(CONFIG.botToken);
    } catch (error) {
        console.error('❌ Failed to start services:', error);
        process.exit(1);
    }
}

// ==========================================
// 7. Graceful Shutdown
// ==========================================
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Start everything
startServices();
