/**
 * Yohoo School - Discord Bot
 * Handles role assignment and server management
 */

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');

// Configuration
const CONFIG = {
    botToken: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN',
    clientId: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
    guildId: process.env.GUILD_ID || 'YOUR_GUILD_ID',
    port: process.env.PORT || 3000
};

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize Express Server
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        bot: client.isReady(),
        timestamp: new Date().toISOString()
    });
});

// Role assignment endpoint
app.post('/give-role', async (req, res) => {
    const { user_id, role_id, guild_id } = req.body;

    if (!user_id || !role_id || !guild_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters'
        });
    }

    try {
        const guild = await client.guilds.fetch(guild_id);
        const member = await guild.members.fetch(user_id);
        
        await member.roles.add(role_id);

        res.json({
            success: true,
            message: 'Role assigned successfully',
            user: member.user.tag
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Remove role endpoint
app.post('/remove-role', async (req, res) => {
    const { user_id, role_id, guild_id } = req.body;

    if (!user_id || !role_id || !guild_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters'
        });
    }

    try {
        const guild = await client.guilds.fetch(guild_id);
        const member = await guild.members.fetch(user_id);
        
        await member.roles.remove(role_id);

        res.json({
            success: true,
            message: 'Role removed successfully',
            user: member.user.tag
        });
    } catch (error) {
        console.error('Error removing role:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Discord Bot Events
client.once('ready', () => {
    console.log('✅ Bot logged in as', client.user.tag);
    console.log('📡 Bot is ready to serve', client.guilds.cache.size, 'guilds');
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('Discord client warning:', warning);
});

// Start services
async function startServices() {
    try {
        // Login to Discord
        await client.login(CONFIG.botToken);
        console.log('🔑 Bot logged in successfully');

        // Start HTTP server
        app.listen(CONFIG.port, () => {
            console.log(`🌐 HTTP server running on port ${CONFIG.port}`);
            console.log(`📋 Endpoints:`);
            console.log(`   - GET  /health`);
            console.log(`   - POST /give-role`);
            console.log(`   - POST /remove-role`);
        });
    } catch (error) {
        console.error('Failed to start services:', error);
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
    console.log('\n🛑 Shutting down...');
    client.destroy();
    process.exit(0);
});

// Start
startServices();