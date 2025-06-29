const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const MODLOG_CHANNEL_ID = '1388100557989740635';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!targetUser) {
      console.log('❌ targetUser was null');
      return interaction.reply({
        content: '❌ Could not find that user.',
        flags: 64
      });
    }

    let member;
    try {
      member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id);
    } catch (err) {
      console.error('❌ Failed to fetch member:', err);
      return interaction.reply({
        content: '❌ That user is not in this server.',
        flags: 64
      });
    }

    if (!member) {
      return interaction.reply({
        content: '❌ That user is not in this server.',
        flags: 64
      });
    }

    if (member.user.bot) {
      return interaction.reply({
        content: '🤖 You cannot warn bots.',
        flags: 64
      });
    }

    const caseId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const logEmbed = new EmbedBuilder()
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: caseId }
      )
      .setColor(0xFFA500)
      .setTimestamp();

    await db.push(`infractions_${targetUser.id}`, {
      type: 'Warn',
      reason,
      date: new Date().toISOString(),
      mod: interaction.user.id,
      case: caseId
    });

    const logChannel = interaction.guild.channels.cache.get(MODLOG_CHANNEL_ID);
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({ embeds: [logEmbed] });
    }

    return interaction.reply({
      content: `✅ <@${targetUser.id}> has been warned.`,
      flags: 64
    });
  }
};
