const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ThreadAutoArchiveDuration } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const MODLOG_CHANNEL_ID = '1388102363255930920'; // Ticket log channel
const TICKET_CHANNEL_ID = '1388018356212465765'; // Only allowed here

module.exports = {
  data: new SlashCommandBuilder()
    .setName('open')
    .setDescription('Open a private support ticket')
    .addSubcommand(sub =>
      sub.setName('ticket')
        .setDescription('Create a private support ticket')
    ),

  async execute(interaction) {
    if (interaction.channel.id !== TICKET_CHANNEL_ID) {
      return interaction.reply({
        content: '❌ You can only use this command in the designated ticket channel.',
        ephemeral: true
      });
    }

    try {
      // Fetch and increment user's ticket count
      const userId = interaction.user.id;
      let ticketCount = await db.get(`ticketCount_${userId}`) || 0;
      ticketCount++;
      await db.set(`ticketCount_${userId}`, ticketCount);

      // Create private thread
      const thread = await interaction.channel.threads.create({
        name: `ticket-${interaction.user.username}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        type: 12, // Private Thread
        reason: 'User opened support ticket'
      });

      await thread.members.add(userId);

      // Send welcome embed inside the thread
      const embed = new EmbedBuilder()
        .setTitle('🎟️ Ticket Opened')
        .setDescription(`Hello <@${userId}>! This is your Ticket No. **${ticketCount}**.\nUse </close ticket> once your issue is resolved.`)
        .setColor(0x00b0f4)
        .setTimestamp();

      await thread.send({ embeds: [embed], content: `<@${userId}>` });

      // Log in modlog
      const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;
      const logEmbed = new EmbedBuilder()
        .setTitle('📥 New Ticket Created')
        .setDescription(`👤 User: <@${userId}> (${userId})\n🧵 Thread: [${thread.name}](https://discord.com/channels/${interaction.guild.id}/${thread.id})\n🔢 Ticket No: **${ticketCount}**\n🕒 Created at: ${timestamp}`)
        .setColor(0x00b0f4)
        .setTimestamp();

      const logChannel = await interaction.guild.channels.fetch(MODLOG_CHANNEL_ID);
      if (logChannel?.isTextBased()) {
        await logChannel.send({ embeds: [logEmbed] });
      }

      await interaction.reply({ content: '✅ Ticket created!', ephemeral: true });

    } catch (err) {
      console.error('❌ Error opening ticket:', err);
      await interaction.reply({
        content: '⚠️ Failed to create ticket. Please contact staff.',
        ephemeral: true
      });
    }
  }
};
