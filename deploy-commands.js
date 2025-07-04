const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, 'Commands'); // ⬅️ Capitalized
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[⚠️ WARNING] The command at '${filePath}' is missing "data" or "execute". Skipping.`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('📦 Refreshing slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registered successfully.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
