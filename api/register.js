const express = require('express');
const router = express.Router();
const { REST, Routes } = require('discord.js');

// Discord Bot Token และ Guild ID
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID;

// REST instance
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { discordId, username, firstName, lastName, dateOfBirth, gender } = req.body;
        
        // ตรวจสอบว่ามี discordId หรือไม่
        if (!discordId) {
            return res.status(400).json({ message: 'Discord ID is required' });
        }
        
        // เพิ่ม Member role ให้ user
        try {
            await rest.put(
                Routes.guildMemberRole(GUILD_ID, discordId, MEMBER_ROLE_ID),
                {}
            );
            
            console.log(`Added Member role to ${username} (${discordId})`);
        } catch (discordError) {
            console.error('Failed to add Discord role:', discordError);
            // ไม่ throw error เพราะอาจเป็นกรณีที่ user ยังไม่ join server
        }
        
        // บันทึกข้อมูลลง database (ตัวอย่าง)
        // await db.collection('registrations').insertOne({
        //     discordId,
        //     username,
        //     firstName,
        //     lastName,
        //     dateOfBirth,
        //     gender,
        //     registeredAt: new Date()
        // });
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            data: { discordId, username }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

module.exports = router;
