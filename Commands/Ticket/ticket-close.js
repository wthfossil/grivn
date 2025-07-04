const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const ticketLogChannelId = '1388102363255930920';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close actions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ticket')
        .setDescription('Close the current ticket')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== 'ticket') return;

    const thread = interaction.channel;

    if (!thread.isThread()) {
      return interaction.reply({
        content: '❌ This command can only be used inside a ticket thread.',
        ephemeral: true
      });
    }

    try {
      // Fetch all messages from thread
      const fetchAllMessages = async (channel) => {
        let allMessages = [];
        let lastMessageId;

        while (true) {
          const options = { limit: 100 };
          if (lastMessageId) options.before = lastMessageId;

          const messages = await channel.messages.fetch(options);
          if (messages.size === 0) break;

          allMessages.push(...messages.values());
          lastMessageId = messages.last().id;
        }

        return allMessages.reverse(); // Chronological order
      };

      const messages = await fetchAllMessages(thread);
      const logLines = messages.map(msg => {
        const time = msg.createdAt.toISOString();
        const author = msg.author?.tag || 'Unknown User';
        return `[${time}] ${author}: ${msg.content}`;
      });

      const transcriptText = logLines.join('\n');
      const transcriptPath = path.join(__dirname, `../../transcript-${thread.id}.txt`);
      fs.writeFileSync(transcriptPath, transcriptText);
      const transcriptAttachment = new AttachmentBuilder(transcriptPath);

      // Prepare embed log
      const createdTimestamp = `<t:${Math.floor(thread.createdTimestamp / 1000)}:f>`;
      const closedTimestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

      const logEmbed = new EmbedBuilder()
        .setTitle('📁 Ticket Closed')
        .setDescription(`**Thread:** ${thread.name}\n**Closed by:** <@${interaction.user.id}>\n\n**Opened:** ${createdTimestamp}\n**Closed:** ${closedTimestamp}`)
        .setColor(0xff5555)
        .setFooter({ text: `Ticket ID: ${thread.id}` })
        .setTimestamp();

      const logChannel = await interaction.guild.channels.fetch(ticketLogChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send({
          embeds: [logEmbed],
          files: [transcriptAttachment]
        });
      }

      await interaction.reply({ content: '✅ Ticket closed and logged.', ephemeral: true });

      await thread.delete('Ticket closed');

      // Clean up transcript file
      fs.unlinkSync(transcriptPath);
    } catch (error) {
      console.error('❌ Error closing ticket:', error);
      await interaction.reply({
        content: '⚠️ Something went wrong while closing the ticket.',
        ephemeral: true
      });
    }
  }
};
