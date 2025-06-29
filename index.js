const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send("I'm alive!");
});

app.listen(3000, () => {
  console.log('🟢 Web server running on port 3000');
});

// Bot imports
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] The command at ./commands/${file} is missing "data" or "execute".`);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '⚠️ There was an error executing that command.', ephemeral: true });
    }
  }

  // Button: Create Ticket
  if (interaction.isButton()) {
    if (interaction.customId === 'create_ticket') {
      const ticketChannel = interaction.guild.channels.cache.get('1388018356212465765'); // #tickets
      if (!ticketChannel) return;

      const threadName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

      try {
        const thread = await ticketChannel.threads.create({
          name: threadName,
          autoArchiveDuration: 1440,
          type: ChannelType.PrivateThread,
          reason: `Ticket opened by ${interaction.user.tag}`,
          invitable: false
        });

        // Add user + mod roles
        await thread.members.add(interaction.user.id);
        await thread.members.add('1387944131527053403'); // Big Bro
        await thread.members.add('1387945617636069447'); // Council
        await thread.members.add('1387945686535897088'); // Guardian

        const embed = new EmbedBuilder()
          .setTitle('🎫 Ticket Created')
          .setDescription(`Hello <@${interaction.user.id}>, please describe your issue.\nA team member will respond soon.`)
          .setColor(0x2f3136);

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await thread.send({ embeds: [embed], components: [closeButton] });

        await interaction.reply({ content: `✅ Ticket created: <#${thread.id}>`, ephemeral: true });
      } catch (err) {
        console.error('Error creating thread:', err);
        await interaction.reply({ content: '❌ Could not create ticket.', ephemeral: true });
      }
    }

    // Button: Close Ticket
    if (interaction.customId === 'close_ticket') {
      await interaction.reply({
        content: '✅ Closing this ticket in 5 seconds...',
        ephemeral: true
      });

      setTimeout(async () => {
        const thread = interaction.channel;
        if (thread.isThread()) {
          await thread.setArchived(true, 'Ticket closed');
        }
      }, 5000);
    }
  }
});

client.login(process.env.TOKEN);
