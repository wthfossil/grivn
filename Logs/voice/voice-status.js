const { Events, EmbedBuilder } = require('discord.js');
const logChannelId = '1390614408992129034';

const voiceJoinTimestamps = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    const logChannel = await member.guild.channels.fetch(logChannelId);

    // Join
    if (!oldState.channel && newState.channel) {
      voiceJoinTimestamps.set(member.id, Date.now());

      const embed = new EmbedBuilder()
        .setTitle('🔊 Voice Join')
        .setDescription(`<@${member.id}> joined **${newState.channel.name}**`)
        .setColor(0x57F287)
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // Switch
    else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
      const embed = new EmbedBuilder()
        .setTitle('🔄 Voice Channel Switch')
        .setDescription(`<@${member.id}> moved from **${oldState.channel.name}** to **${newState.channel.name}**`)
        .setColor(0x5865F2)
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // Leave
    else if (oldState.channel && !newState.channel) {
      const joinedAt = voiceJoinTimestamps.get(member.id);
      const duration = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';
      voiceJoinTimestamps.delete(member.id);

      const embed = new EmbedBuilder()
        .setTitle('📤 Voice Leave')
        .setDescription(`<@${member.id}> left **${oldState.channel.name}**\n**Time Spent:** \`${duration}\``)
        .setColor(0xED4245)
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  }
};

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const secs = (totalSec % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}
