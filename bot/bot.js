// bot/bot.js - Discord Bot (Optional - รันแยกต่างหากถ้าต้องการ)
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');

const CONFIG = {
  botToken: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  memberRoleId: process.env.DISCORD_MEMBER_ROLE_ID,
  port: process.env.PORT || 3000
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', botReady: client.isReady() });
});

client.once('ready', () => {
  console.log(`✅ Bot: ${client.user.tag}`);
});

async function start() {
  app.listen(CONFIG.port, () => {
    console.log(`🌐 API: http://localhost:${CONFIG.port}`);
  });
  if (CONFIG.botToken) {
    await client.login(CONFIG.botToken);
  }
}

start();
