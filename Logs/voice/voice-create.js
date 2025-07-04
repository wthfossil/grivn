const { Events, ChannelType, EmbedBuilder } = require('discord.js');
const logChannelId = '1390614408992129034';

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    if (channel.type !== ChannelType.GuildVoice) return;

    const logChannel = await channel.guild.channels.fetch(logChannelId);
    const embed = new EmbedBuilder()
      .setTitle('📢 Voice Channel Created')
      .setDescription(`**Name:** ${channel.name}\n**ID:** ${channel.id}`)
      .setColor(0x00B0F4)
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
};
