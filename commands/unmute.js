const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const MODLOG_CHANNEL_ID = '1388100557989740635';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Removes mute (timeout) from a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to unmute')
        .setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');

    if (!target) {
      return interaction.reply({ content: '❌ Could not find that user.', flags: 64 });
    }

    try {
      await target.timeout(null); // Remove timeout

      // Log infraction
      const existing = await db.get(`infractions_${target.id}`) || [];
      existing.push({
        type: 'Unmute',
        reason: 'Manual unmute',
        timestamp: new Date().toISOString(),
        moderator: interaction.user.tag
      });
      await db.set(`infractions_${target.id}`, existing);

      await interaction.reply({
        content: `✅ ${target.user.tag} has been unmuted.`,
        flags: 64
      });

      // Modlog embed
      const logEmbed = new EmbedBuilder()
        .setTitle('🔈 Member Unmuted')
        .addFields(
          { name: 'Member', value: `${target.user.tag} (${target.id})` },
          { name: 'Moderator', value: `${interaction.user.tag}` },
          { name: 'Reason', value: `Manual unmute` }
        )
        .setColor(0x77dd77)
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
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to unmute the member.', flags: 64 });
    }
  }
};
