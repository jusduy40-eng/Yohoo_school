require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
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

if (!CONFIG.botToken || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    console.error('❌ ERROR: ตรวจสอบไฟล์ .env ให้ครบ');
    process.exit(1);
}

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', botReady: client.isReady() });
});

app.post('/api/register', async (req, res) => {
    const { user_id, username, first_name, last_name, date_of_birth, gender, steam_hex, fivem_license } = req.body;

    if (!user_id || !first_name || !last_name || !steam_hex || !fivem_license) {
        return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบ' });
    }

    try {
        // 1. บันทึกลง Supabase
        const { error: dbError } = await supabase
            .from('players')
            .insert([{
                discord_id: user_id,
                discord_username: username,
                steam_hex,
                fivem_license,
                first_name,
                last_name,
                date_of_birth,
                gender,
                is_whitelisted: true,
                status: 'approved'
            }]);

        if (dbError) {
            if (dbError.code === '23505') {
                return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
            }
            throw new Error(dbError.message);
        }

        // 2. ส่ง Webhook
        if (CONFIG.webhookUrl) {
            const genderLabels = { male: 'ชาย', female: 'หญิง', other: 'อื่นๆ' };
            await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '✅ **ลงทะเบียนใหม่!**',
                    embeds: [{
                        title: '📝 ผู้เล่นใหม่',
                        color: 0x10B981,
                        fields: [
                            { name: '👤 ชื่อ', value: `${first_name} ${last_name}`, inline: true },
                            { name: '🎂 เกิด', value: new Date(date_of_birth).toLocaleDateString('th-TH'), inline: true },
                            { name: '⚧ เพศ', value: genderLabels[gender], inline: true },
                            { name: '💬 Discord', value: `<@${user_id}>`, inline: false },
                            { name: '🎮 Steam', value: `\`${steam_hex}\``, inline: true },
                            { name: '🎟️ FiveM', value: `\`${fivem_license}\``, inline: true }
                        ]
                    }]
                })
            });
        }

        // 3. ให้ Role
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(user_id);
        if (!member.roles.cache.has(CONFIG.memberRoleId)) {
            await member.roles.add(CONFIG.memberRoleId);
        }

        res.json({ success: true, message: 'ลงทะเบียนสำเร็จ!' });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 10007) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้ใน Discord' });
        }
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาด' });
    }
});

client.once('ready', () => {
    console.log(`✅ Bot: ${client.user.tag}`);
});

async function start() {
    app.listen(CONFIG.port, () => {
        console.log(`🌐 API: http://localhost:${CONFIG.port}`);
        console.log(`💾 Supabase: ${CONFIG.supabaseUrl}`);
    });
    await client.login(CONFIG.botToken);
}

start();
