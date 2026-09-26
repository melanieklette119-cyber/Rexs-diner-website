import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { ActivityType } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Regeln für Rex's Diner
const dinerRules = `
**Willkommen bei Rex’s Diner!**

Wir freuen uns, dich bei uns begrüßen zu dürfen. Damit sich alle Gäste rundum wohlfühlen, bitten wir dich, unsere Hausregeln zu beachten:

- **Waffenverbot:** Zum Schutz aller Gäste ist das Mitführen von Waffen auf dem gesamten Gelände des Diners strengstens untersagt.
- **Respektvolles Miteinander:** Ein respektvolles Verhalten ist uns sehr wichtig. Belästigungen oder aggressive Verhaltensweisen werden nicht toleriert.
- **Haustiere:** Aus hygienischen Gründen sind Haustiere nicht erlaubt – außer es handelt sich um assistierende Tiere (z.B. Blindenhunde).
- **Ruhe und Ordnung:** Um eine angenehme Atmosphäre zu gewährleisten, bitten wir darum, laute Gespräche zu vermeiden.
- **Sauberkeit:** Bitte hinterlasse deinen Platz in einem ordentlichen Zustand.
- **Angemessene Kleidung:** Bekleidung, die unangemessen oder beleidigend ist, wird nicht gestattet.
- **Reservierungen:** Für größere Gruppen empfehlen wir, im Voraus zu reservieren.
- **Zahlungsmethoden:** Nur Kreditkartenzahlungen sind möglich.
- **Verhalten bei Notfällen:** Im Falle eines Notfalls bitten wir dich, ruhig zu bleiben und den Anweisungen unseres Personals zu folgen.

Wir danken dir herzlich für dein Verständnis und wünschen dir einen angenehmen Aufenthalt im Rex’s Diner.
`;

// Slash Command für die Registrierung
const commands = [
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('Zeigt die Hausregeln und den Registrierungsbutton an.')
];

const GUILD_ID = process.env.GUILD_ID; // Fetch the guild ID from the .env file

if (!GUILD_ID) {
  console.error('GUILD_ID is not defined. Please set it in the .env file.');
  process.exit(1);
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // Delete all existing commands in the guild
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (guild) {
      const commands = await guild.commands.fetch();
      for (const command of commands.values()) {
        await guild.commands.delete(command.id);
      }
      console.log('All existing commands deleted successfully!');
    } else {
      console.error('Guild not found. Please check the GUILD_ID.');
      return;
    }
  } catch (error) {
    console.error('Error deleting commands:', error);
    return;
  }

  // Register the new slash commands
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (guild) {
      await guild.commands.set(commands);
      console.log('Slash commands registered successfully!');
    } else {
      console.error('Guild not found. Please check the GUILD_ID.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Slash Command Registrierung


client.on('interactionCreate', async (interaction) => {
  // Handle slash command
  if (interaction.isCommand() && interaction.commandName === 'register') {
    const logoUrlTopRight = 'https://rexs-diner-srp.vercel.app/images/rex-dinner-logo.png'; // Replace with your top-right logo URL
    const logoUrlBottom = 'https://media.galaxybot.app/server/1466553950122672170/893ac245-7e8d-4a2d-9ed2-c60431e49a11.png'; // Replace with your bottom logo URL

    const rulesEmbed = new EmbedBuilder()
      .setTitle("Willkommen bei Rex's Diner")
      .setDescription(dinerRules)
      .setColor(0x00FF00)
      .setThumbnail(logoUrlTopRight) // Top-right logo
      .setImage(logoUrlBottom); // Bottom logo

    const registerButton = new ButtonBuilder()
      .setCustomId('register_button')
      .setLabel('Registrieren')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(registerButton);
    await interaction.reply({
      embeds: [rulesEmbed],
      components: [row]
    });
    return;
  }

  // Handle button interaction
  if (interaction.isButton() && interaction.customId === 'register_button') {
    const modal = new ModalBuilder()
      .setCustomId('registration_modal')
      .setTitle('Registrierung - Rex’s Diner');

    const nameInput = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Dein Name:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput)
    );
    await interaction.showModal(modal);
    return;
  }

  // Handle modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'registration_modal') {
    const name = interaction.fields.getTextInputValue('name');
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (member) {
      try {
        await member.setNickname(`${name}`);
        await interaction.reply({
          content: `Dein Name wurde erfolgreich geändert zu: ${name}`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error setting nickname:', error);
        await interaction.reply({
          content: 'Ich konnte deinen Namen nicht ändern. Bitte überprüfe, ob ich die erforderlichen Berechtigungen habe.',
          ephemeral: true
        });
      }
    } else {
      await interaction.reply({
        content: 'Mitglied konnte nicht gefunden werden.',
        ephemeral: true
      });
    }
    return;
  }
});

// Bot-Login mit Token
client.login(process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE');

// === Status & Game Rotator ===
const activities = [
  { name: 'TeamStadt Roleplay', type: ActivityType.Playing }, // Playing Teamstadt
  { name: 'Reservierungen prüfen', type: ActivityType.Watching }, // Watching
  { name: 'Bestellungen bearbeiten', type: ActivityType.Listening }, // Listening
  { name: 'rex-diner.de', type: ActivityType.Watching }, // Watching Website
  { name: 'im Diner arbeiten', type: ActivityType.Playing }, // Playing
  { name: 'Den Kochen Simulator', type: ActivityType.Playing }, // Playing
  { name: 'Gäste bedienen', type: ActivityType.Watching }, // Watching
  { name: 'Musik im Diner', type: ActivityType.Listening }, // Listening
  { name: 'TeamStadt Roleplay', type: ActivityType.Playing }, // Playing
  { name: 'Bestellungen prüfen', type: ActivityType.Watching }, // Watching
  { name: 'Kundenfeedback', type: ActivityType.Listening }, // Listening
  { name: 'im Büro arbeiten', type: ActivityType.Playing }, // Playing
  { name: 'Website-Updates', type: ActivityType.Watching }, // Watching
  { name: 'Team-Meetings', type: ActivityType.Listening }, // Listening
  { name: 'Spiele mit Gästen', type: ActivityType.Playing }, // Playing
  { name: 'Reservierungen verwalten', type: ActivityType.Watching }, // Watching
  { name: 'Kochrezepte', type: ActivityType.Listening }, // Listening
  { name: 'im Lager arbeiten', type: ActivityType.Playing }, // Playing
  { name: 'Bestellungen bearbeiten', type: ActivityType.Watching }, // Watching
  { name: 'Kundengespräche', type: ActivityType.Listening }, // Listening
  { name: 'TeamStadt Roleplay', type: ActivityType.Playing }, // Playing
  { name: 'Website-Besucher', type: ActivityType.Watching }, // Watching
  { name: 'Musik', type: ActivityType.Listening }, // Listening
  { name: 'im Diner putzen', type: ActivityType.Playing }, // Playing
  { name: 'Gäste begrüßen', type: ActivityType.Watching }, // Watching
  { name: 'Bestellungen aufnehmen', type: ActivityType.Listening }, // Listening
  { name: 'im Büro planen', type: ActivityType.Playing }, // Playing
  { name: 'Feedback', type: ActivityType.Listening }, // Listening
  { name: 'rex-dinner-ts.vercel.app', type: ActivityType.Playing }, // Playing
  { name: 'Überlegt, wie die Website Rex’s Diner übernehmen und zum Leben erwecken kann, um Geschäftsführer zu werden', type: ActivityType.Custom },
];
// Korrekte Status-Typen als String-Literal-Union
const statuses: ('online' | 'idle' | 'dnd')[] = ['online', 'idle', 'dnd'];

let activityIndex = 0;
let statusIndex = 0;

client.on('ready', () => {
  setInterval(() => {
    // Status rotieren
    client.user?.setStatus(statuses[statusIndex]);
    statusIndex = (statusIndex + 1) % statuses.length;
    // Aktivität rotieren
    const activity = activities[activityIndex];
    client.user?.setActivity(activity.name, { type: activity.type });
    activityIndex = (activityIndex + 1) % activities.length;
  }, 30000); // alle 30 Sekunden wechseln
});
