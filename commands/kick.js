const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const MODLOG_CHANNEL_ID = '1388100557989740635';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return interaction.reply({ content: '❌ Could not find that user.', flags: 64 });
    }

    if (!target.kickable) {
      return interaction.reply({ content: '❌ I cannot kick this user. Check role hierarchy.', flags: 64 });
    }

    try {
      await target.kick(reason);

      // Save to DB
      const previous = await db.get(`infractions_${target.id}`) || [];
      previous.push({
        type: 'Kick',
        reason: reason,
        timestamp: new Date().toISOString(),
        moderator: interaction.user.tag
      });
      await db.set(`infractions_${target.id}`, previous);

      await interaction.reply({ content: `✅ ${target.user.tag} has been kicked.`, flags: 64 });

      // Log embed
      const logEmbed = new EmbedBuilder()
        .setTitle('👢 Member Kicked')
        .addFields(
          { name: 'Member', value: `${target.user.tag} (${target.id})` },
          { name: 'Moderator', value: `${interaction.user.tag}` },
          { name: 'Reason', value: reason }
        )
        .setColor(0xffcc00)
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
      await interaction.reply({ content: '❌ Failed to kick the member.', flags: 64 });
    }
  }
};
