const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');
const db = require('quick.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('View a member’s infractions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const members = await interaction.guild.members.fetch();
    const userOptions = members.map(member => ({
      label: member.user.tag,
      value: member.id
    })).slice(0, 25); // Limit dropdown to 25 due to Discord API

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('infractions_select')
      .setPlaceholder('Select a user to view infractions')
      .addOptions(userOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: 'Select a user to view their infractions:',
      components: [row],
      ephemeral: true
    });
  }
};
