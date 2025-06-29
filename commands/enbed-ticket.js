const { Events, EmbedBuilder, ThreadAutoArchiveDuration, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const ticketLogChannelId = '1388102363255930920'; // Modlog or ticket-log channel ID
const allowedRoles = [
  '1387944131527053403', // Big Bro
  '1387945617636069447', // Council
  '1387945686535897088'  // Guardian
];

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // ✅ CREATE TICKET
    if (interaction.customId === 'create_ticket') {
      try {
        const thread = await interaction.channel.threads.create({
          name: `ticket-${interaction.user.username}`,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
          type: 12, // Private thread
          reason: 'Support ticket',
          invitable: false
        });

        await thread.members.add(interaction.user.id);

        // Ping support roles inside thread
        const mentions = allowedRoles.map(id => `<@&${id}>`).join(' ');
        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const closeRow = new ActionRowBuilder().addComponents(closeButton);

        await thread.send({
          content: `Hey <@${interaction.user.id}>! Your ticket has been created.\n${mentions}`,
          components: [closeRow]
        });

        // Log creation in modlog channel
        const logChannel = await interaction.guild.channels.fetch(ticketLogChannelId);
        const embed = new EmbedBuilder()
          .setTitle('🎟️ Ticket Created')
          .setDescription(`User: <@${interaction.user.id}> (${interaction.user.id})\nThread: [${thread.name}](https://discord.com/channels/${interaction.guild.id}/${thread.id})`)
          .setColor(0x00b0f4)
          .setTimestamp();
        if (logChannel?.isTextBased()) {
          await logChannel.send({ embeds: [embed] });
        }

        await interaction.reply({ content: '✅ Ticket created successfully!', ephemeral: true });
      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({ content: '⚠️ Could not create ticket. Please try again later.', ephemeral: true });
      }
    }

    // ✅ CLOSE TICKET
    if (interaction.customId === 'close_ticket') {
      const thread = interaction.channel;
      if (thread.isThread()) {
        await thread.send(`🔒 Ticket closed by <@${interaction.user.id}>. Archiving thread.`);
        await thread.setArchived(true, 'Ticket closed');
      }
    }
  }
};
