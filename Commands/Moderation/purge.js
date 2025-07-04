const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of recent messages from a channel.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const channel = interaction.channel;

    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: 'Please choose a number between 1 and 100.', ephemeral: true });
    }

    const fetched = await channel.messages.fetch({ limit: amount });

    const logText = fetched.map(m =>
      `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`
    ).reverse().join('\n') || 'No messages to log.';

    const fileName = `purge-${Date.now()}.txt`;
    fs.writeFileSync(fileName, logText);

    await channel.bulkDelete(fetched, true).catch(err => {
      console.error(err);
      return interaction.reply({ content: '❌ Failed to delete messages. They might be too old (14+ days).', ephemeral: true });
    });

    const logEmbed = new EmbedBuilder()
      .setTitle('🧹 Purge Executed')
      .setDescription(`**Channel:** <#${channel.id}>\n**Moderator:** ${interaction.user.tag}\n**Messages Deleted:** ${fetched.size}`)
      .setColor(0xFFA500)
      .setTimestamp();

    const modlogChannel = interaction.client.channels.cache.get('1388100598880272494');
    if (modlogChannel) {
      await modlogChannel.send({
        embeds: [logEmbed],
        files: [new AttachmentBuilder(fileName)]
      });
    }

    fs.unlinkSync(fileName);

    await interaction.reply({
      content: `✅ Deleted ${fetched.size} messages from this channel.`,
      ephemeral: true
    });
  }
};
