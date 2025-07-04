const { SlashCommandBuilder } = require('discord.js');
const ms = require('ms');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const MODLOG_CHANNEL_ID = '1388100557989740635';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Temporarily mutes a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g. 10m, 1h, 2d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const durationMs = ms(duration);

    if (!target) {
      return interaction.reply({ content: '❌ Could not find that user.', flags: 64 });
    }

    if (!durationMs || durationMs > 2419200000) { // Max 28 days
      return interaction.reply({ content: '❌ Invalid duration. Use formats like 10m, 1h, 2d (Max: 28 days)', flags: 64 });
    }

    try {
      await target.timeout(durationMs, reason);

      // Save infraction
      const existing = await db.get(`infractions_${target.id}`) || [];
      existing.push({
        type: 'Mute',
        reason,
        timestamp: new Date().toISOString(),
        moderator: interaction.user.tag,
        duration,
      });
      await db.set(`infractions_${target.id}`, existing);

      await interaction.reply({
        content: `✅ ${target.user.tag} has been muted for ${duration}.`,
        flags: 64
      });

      // Modlog embed
      const { EmbedBuilder } = require('discord.js');
      const logEmbed = new EmbedBuilder()
        .setTitle('🔇 Member Muted')
        .addFields(
          { name: 'Member', value: `${target.user.tag} (${target.id})` },
          { name: 'Moderator', value: `${interaction.user.tag}` },
          { name: 'Duration', value: duration },
          { name: 'Reason', value: reason }
        )
        .setColor(0xff9900)
        .setTimestamp();

      let logChannel;
      try {
        logChannel = interaction.guild.channels.cache.get(MODLOG_CHANNEL_ID)
          || await interaction.guild.channels.fetch(MODLOG_CHANNEL_ID);
      } catch (err) {
        console.error('❌ Could not fetch modlog channel:', err);
      }

      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({ embeds: [logEmbed] });
        console.log('✅ Mute log sent.');
      } else {
        console.log('❌ Modlog channel not found.');
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to mute the member.', flags: 64 });
    }
  }
};
