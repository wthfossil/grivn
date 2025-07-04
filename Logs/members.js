const { Events, EmbedBuilder } = require('discord.js');

const logChannelId = '1388100848151953489'; // Your log channel

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const logs = [];

    // Nickname (Display Name) Change
    if (oldMember.displayName !== newMember.displayName) {
      logs.push(`**Nickname Changed:**\n\`${oldMember.displayName}\` ➜ \`${newMember.displayName}\``);
    }

    // Avatar Change
    if (oldMember.user.displayAvatarURL() !== newMember.user.displayAvatarURL()) {
      logs.push('**Avatar Changed:**');

      logs.push({ avatarChanged: true });
    }

    // Username Change
    if (oldMember.user.username !== newMember.user.username) {
      logs.push(`**Username Changed:**\n\`${oldMember.user.username}\` ➜ \`${newMember.user.username}\``);
    }

    // If no changes, exit
    if (logs.length === 0) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${newMember.user.tag}`, iconURL: newMember.user.displayAvatarURL() })
      .setDescription(
        logs
          .filter(log => typeof log === 'string')
          .join('\n\n')
      )
      .setColor(0x0099ff)
      .setTimestamp();

    // If avatar changed, add both old and new avatars
    const avatarChange = logs.find(l => typeof l === 'object' && l.avatarChanged);
    if (avatarChange) {
      embed.setThumbnail(oldMember.user.displayAvatarURL({ size: 256 }))
           .setImage(newMember.user.displayAvatarURL({ size: 512 }));
    }

    const logChannel = await newMember.guild.channels.fetch(logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  }
};
