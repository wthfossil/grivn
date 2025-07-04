// 🟢 Web Server to keep Replit alive
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send("I'm alive!"));
app.listen(PORT, () => console.log(`🟢 Web server running on port ${PORT}`));

// Discord bot setup
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  ChannelType
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();
const joinLeaveLogChannelId = '1388100686507409519';
const voiceLogChannelId = '1390614408992129034';
const inviteCache = new Map();
const joinTimestamps = new Map();
const voiceJoinTimes = new Map(); // For tracking time spent in VC

// Load all commands (including subfolders)
const commandsPath = path.join(__dirname, 'Commands');
function loadCommandsRecursively(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsRecursively(fullPath);
    } else if (file.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[⚠️] Skipping command '${file}' — missing "data" or "execute".`);
      }
    }
  }
}
loadCommandsRecursively(commandsPath);

// Slash commands + select menu handler
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`❌ Error in command /${interaction.commandName}:`, err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ An error occurred while executing the command.', ephemeral: true });
      }
    }
  }

  // Handle select menus (e.g., for interactive infraction viewer)
  else if (interaction.isStringSelectMenu()) {
    try {
      const handlerPath = path.join(__dirname, 'events', 'infractionsSelect.js');
      if (fs.existsSync(handlerPath)) {
        const handler = require(handlerPath);
        await handler.execute(interaction);
      }
    } catch (err) {
      console.error('❌ Error handling select menu interaction:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Error handling selection.', ephemeral: true });
      }
    }
  }
});

// Load button/event handlers
function loadEventListeners(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      loadEventListeners(fullPath);
    } else if (file.endsWith('.js')) {
      const event = require(fullPath);
      if (event.name && event.execute) {
        client.on(event.name, (...args) => event.execute(...args));
      }
    }
  }
}
loadEventListeners(commandsPath);

// Invite Tracker
client.on(Events.ClientReady, async () => {
  const guild = client.guilds.cache.first();
  const invites = await guild.invites.fetch();
  inviteCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Member Join
client.on(Events.GuildMemberAdd, async member => {
  const joinTime = Date.now();
  joinTimestamps.set(member.id, joinTime);

  const welcomeMessage = `Hey ${member.displayName}!!

Welcome to Bhaichara! Just a quick heads-up to keep you safe while you're here:

1. Please don’t share your personal information with anyone — even if they seem friendly.  
2. Be cautious with any links you receive in DMs or channels.  
3. Avoid sending photos that might reveal your location or private details.  
4. Stay alert for scams — if it feels fishy, it probably is.  
5. If anyone makes you feel unsafe, reach out to us (Owner/Admins/Guardians). We’ll listen — and we **will** act.

You're Family now — your safety matters to us!`;

  try {
    await member.send(welcomeMessage);
  } catch (e) {
    console.warn(`❌ Couldn't send welcome DM to ${member.user.tag}`);
  }

  const oldInvites = inviteCache.get(member.guild.id);
  const newInvites = await member.guild.invites.fetch();
  inviteCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
  const usedInvite = [...newInvites.values()].find(i => oldInvites.has(i.code) && i.uses > oldInvites.get(i.code));
  const inviter = usedInvite?.inviter?.tag || 'Unknown';

  const joinEmbed = new EmbedBuilder()
    .setTitle('📥 Member Joined')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'Username', value: `${member.user.tag}`, inline: true },
      { name: 'User ID', value: member.id, inline: true },
      { name: 'Invited By', value: inviter, inline: false }
    )
    .setColor(0x00ff00)
    .setTimestamp();

  const logChannel = await client.channels.fetch(joinLeaveLogChannelId);
  if (logChannel?.isTextBased()) {
    logChannel.send({ embeds: [joinEmbed] });
  }
});

// Member Leave
client.on(Events.GuildMemberRemove, async member => {
  const leaveTime = Date.now();
  const joined = joinTimestamps.get(member.id);
  const timeSpent = joined ? Math.round((leaveTime - joined) / 1000) : null;
  const timeString = timeSpent ? `${Math.floor(timeSpent / 3600)}h ${Math.floor((timeSpent % 3600) / 60)}m` : 'Unknown';

  const leaveEmbed = new EmbedBuilder()
    .setTitle('📤 Member Left')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'Username', value: `${member.user.tag}`, inline: true },
      { name: 'User ID', value: member.id, inline: true },
      { name: 'Time Spent in Server', value: timeString, inline: false }
    )
    .setColor(0xff0000)
    .setTimestamp();

  const logChannel = await client.channels.fetch(joinLeaveLogChannelId);
  if (logChannel?.isTextBased()) {
    logChannel.send({ embeds: [leaveEmbed] });
  }

  joinTimestamps.delete(member.id);
});

// Voice Logging
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member;
  const now = new Date();
  const logChannel = await newState.guild.channels.fetch(voiceLogChannelId).catch(() => null);
  if (!logChannel?.isTextBased()) return;

  const userTag = `${member.user.tag}`;

  // Join
  if (!oldState.channel && newState.channel) {
    voiceJoinTimes.set(member.id, now);
    const embed = new EmbedBuilder()
      .setTitle('🔊 Voice Join')
      .setDescription(`${userTag} joined <#${newState.channel.id}>`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00b0f4)
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }

  // Leave
  if (oldState.channel && !newState.channel) {
    const joinTime = voiceJoinTimes.get(member.id);
    const duration = joinTime ? Math.floor((now - joinTime) / 1000) : null;
    voiceJoinTimes.delete(member.id);

    const embed = new EmbedBuilder()
      .setTitle('🔇 Voice Leave')
      .setDescription(`${userTag} left <#${oldState.channel.id}>`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xff5555)
      .addFields(duration ? [{
        name: 'Time Spent',
        value: `<t:${Math.floor(joinTime / 1000)}:R> — <t:${Math.floor(now / 1000)}:R> (${duration}s)`
      }] : [])
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }

  // Switch
  if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
    const joinTime = voiceJoinTimes.get(member.id);
    const duration = joinTime ? Math.floor((now - joinTime) / 1000) : null;
    voiceJoinTimes.set(member.id, now);

    const embed = new EmbedBuilder()
      .setTitle('🔁 Voice Switch')
      .setDescription(`${userTag} moved from <#${oldState.channel.id}> to <#${newState.channel.id}>`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xffd700)
      .addFields(duration ? [{
        name: 'Time in Previous Channel',
        value: `<t:${Math.floor(joinTime / 1000)}:R> — <t:${Math.floor(now / 1000)}:R> (${duration}s)`
      }] : [])
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }
});

// Crash logging
process.on('unhandledRejection', err => {
  console.error('🛑 Unhandled promise rejection:', err);
});

client.login(process.env.TOKEN);
