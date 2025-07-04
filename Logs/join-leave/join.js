const { Events, EmbedBuilder } = require('discord.js');

const welcomeChannelId = '1388100686507409519'; // Log channel for joins/leaves
const welcomeMessage = (user) => 
  `Hey ${user.displayName}!!\n\nWelcome to Bhaichara! Just a quick heads-up to keep you safe while you're here:\n
1. Please don’t share your personal information with anyone — even if they seem friendly.  
2. Be cautious with any links you receive in DMs or channels.  
3. Avoid sending photos that might reveal your location or private details.  
4. Stay alert for scams — if it feels fishy, it probably is.  
5. If anyone makes you feel unsafe, reach out to us (Owner/Admins/Guardians). We’ll listen — and we **will** act.\n
You're Family now — your safety matters to us!`;

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const logChannel = member.guild.channels.cache.get(welcomeChannelId);
    const avatar = member.user.displayAvatarURL({ dynamic: true });

    const embed = new EmbedBuilder()
      .setTitle('🟢 Member Joined')
      .setDescription(`**${member.user.tag}** joined the server.`)
      .setThumbnail(avatar)
      .setColor(0x57F287)
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }

    // DM the user
    try {
      await member.send(welcomeMessage(member));
    } catch (err) {
      console.warn(`❌ Could not send welcome DM to ${member.user.tag}`);
    }
  }
};
