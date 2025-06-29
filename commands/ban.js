const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const MODLOG_CHANNEL_ID = '1388100557989740635';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return interaction.reply({ content: '❌ Could not find that user.', flags: 64 });
    }

    if (!target.bannable) {
      return interaction.reply({ content: '❌ I cannot ban this user. Check role hierarchy.', flags: 64 });
    }

    try {
      await target.ban({ reason });

      // Save infraction
      const existing = await db.get(`infractions_${target.id}`) || [];
      existing.push({
        type: 'Ban',
        reason,
        timestamp: new Date().toISOString(),
        moderator: interaction.user.tag
      });
      await db.set(`infractions_${target.id}`, existing);

      await interaction.reply({ content: `✅ ${target.user.tag} has been banned.`, flags: 64 });

      // Log embed
      const logEmbed = new EmbedBuilder()
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'Member', value: `${target.user.tag} (${target.id})` },
          { name: 'Moderator', value: `${interaction.user.tag}` },
          { name: 'Reason', value: reason }
        )
        .setColor(0xff4444)
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
      await interaction.reply({ content: '❌ Failed to ban the member.', flags: 64 });
    }
  }
};
