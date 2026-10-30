/**
 * Yohoo School - Discord Bot & API Server
 * สำหรับ Backend (รันบน Node.js)
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
    botToken: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    memberRoleId: process.env.DISCORD_MEMBER_ROLE_ID,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    port: process.env.PORT || 3000,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// ตรวจสอบว่ามี .env ครบหรือไม่
if (!CONFIG.botToken || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    console.error('❌ ERROR: กรุณาตรวจสอบไฟล์ .env ให้ครบถ้วน');
    console.error('ต้องมี: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const app = express();

// ✅ CORS middleware
app.use(cors({
    origin: ['https://yohooschool.vercel.app', 'http://localhost:5500', 'http://127.0.0.1:5500', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        botReady: client.isReady(),
        timestamp: new Date().toISOString()
    });
});

// API Register
app.post('/api/register', async (req, res) => {
    const { user_id, username, first_name, last_name, date_of_birth, gender } = req.body;

    if (!user_id || !first_name || !last_name) {
        return res.status(400).json({ 
            success: false, 
            error: 'กรอกข้อมูลไม่ครบ' 
        });
    }

    try {
        // 1. บันทึกลง Supabase
        const { error: dbError } = await supabase
            .from('players')
            .insert([{
                discord_id: user_id,
                discord_username: username,
                first_name,
                last_name,
                date_of_birth,
                gender,
                is_whitelisted: true,
                status: 'approved'
            }])
            .select();

        if (dbError) {
            if (dbError.code === '23505') {
                return res.status(409).json({ 
                    success: false, 
                    error: 'บัญชีนี้ลงทะเบียนแล้ว' 
                });
            }
            throw new Error(dbError.message);
        }

        // 2. ส่ง Webhook
        if (CONFIG.webhookUrl) {
            const genderLabels = { 
                male: 'ชาย 👨', 
                female: 'หญิง 👩', 
                other: 'อื่นๆ ' 
            };
            
            await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '✅ **ลงทะเบียนใหม่!**',
                    embeds: [{
                        title: '📝 ผู้เล่นใหม่',
                        color: 0x10B981,
                        fields: [
                            { 
                                name: '👤 ชื่อ-นามสกุล', 
                                value: `${first_name} ${last_name}`, 
                                inline: true 
                            },
                            { 
                                name: '🎂 วันเกิด', 
                                value: new Date(date_of_birth).toLocaleDateString('th-TH'), 
                                inline: true 
                            },
                            { 
                                name: '⚧ เพศ', 
                                value: genderLabels[gender] || 'ไม่ระบุ', 
                                inline: true 
                            },
                            { 
                                name: '💬 Discord', 
                                value: `<@${user_id}>`, 
                                inline: false 
                            }
                        ],
                        timestamp: new Date().toISOString(),
                        footer: { text: 'Yohoo School Registration' }
                    }]
                })
            });
            console.log('✅ Webhook sent');
        }

        // 3. ให้ Role
        try {
            const guild = await client.guilds.fetch(CONFIG.guildId);
            const member = await guild.members.fetch(user_id);
            
            if (!member.roles.cache.has(CONFIG.memberRoleId)) {
                await member.roles.add(CONFIG.memberRoleId);
                console.log(`✅ Role assigned to ${member.user.tag}`);
            } else {
                console.log(`⚠️ User ${member.user.tag} already has the role`);
            }
        } catch (roleError) {
            console.error('️ Failed to assign role:', roleError.message);
        }

        res.json({ 
            success: true, 
            message: 'ลงทะเบียนสำเร็จ!' 
        });

    } catch (error) {
        console.error('❌ Registration Error:', error.message);
        
        if (error.code === 10007) {
            return res.status(404).json({ 
                success: false, 
                error: 'ไม่พบผู้ใช้ใน Discord กรุณาเข้าร่วมเซิร์ฟเวอร์ก่อน' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'เกิดข้อผิดพลาด: ' + error.message 
        });
    }
});

// Discord Bot Events
client.once('ready', () => {
    console.log('========================================');
    console.log(`✅ Bot logged in as: ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);
    console.log('========================================');
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

// Start Services
async function start() {
    try {
        // Start HTTP Server
        app.listen(CONFIG.port, () => {
            console.log(`🌐 API Server running on port ${CONFIG.port}`);
            console.log(`🔓 CORS enabled for: yohooschool.vercel.app`);
            console.log(`📍 Endpoints:`);
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

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n Shutting down...');
    client.destroy();
    process.exit(0);
});

// Start everything
start();
