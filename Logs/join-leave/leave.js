const { Events, EmbedBuilder } = require('discord.js');

const logChannelId = '1388100686507409519';

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const logChannel = member.guild.channels.cache.get(logChannelId);
    const avatar = member.user.displayAvatarURL({ dynamic: true });

    const embed = new EmbedBuilder()
      .setTitle('🔴 Member Left')
      .setDescription(`**${member.user.tag}** left or was removed from the server.`)
      .setThumbnail(avatar)
      .setColor(0xED4245)
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  }
};
