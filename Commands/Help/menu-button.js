const { Events, EmbedBuilder } = require('discord.js');
const db = require('quick.db');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'infractions_select') return;

    const userId = interaction.values[0];
    const user = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!user) {
      return await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    const infractions = db.get(`infractions_${userId}`) || [];

    if (infractions.length === 0) {
      return await interaction.reply({
        content: `✅ <@${userId}> has no recorded infractions.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📄 Infractions for ${user.user.tag}`)
      .setColor(0xffcc00)
      .setFooter({ text: `Total: ${infractions.length} infractions` })
      .setTimestamp();

    infractions.slice(-10).reverse().forEach((infraction, index) => {
      embed.addFields({
        name: `#${infractions.length - index}: ${infraction.type}`,
        value: `**Reason:** ${infraction.reason}\n**Moderator:** <@${infraction.moderator}>\n**Date:** <t:${Math.floor(infraction.timestamp / 1000)}:F>`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
