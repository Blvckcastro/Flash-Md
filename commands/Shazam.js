const acrcloud = require("acrcloud");
const yts = require("yt-search");
const { franceking } = require('../main');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require("fs");
const path = require("path");

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

async function identifySong(buffer) {
  const acr = new acrcloud({
    host: 'identify-us-west-2.acrcloud.com',
    access_key: '4ee38e62e85515a47158aeb3d26fb741',
    access_secret: 'KZd3cUQoOYSmZQn1n5ACW5XSbqGlKLhg6G8S8EvJ'
  });

  const result = await acr.identify(buffer);
  if (result.status.code !== 0 || !result.metadata?.music?.length) return null;
  return result.metadata.music[0];
}

module.exports = {
  name: 'shazam',
  aliases: ['whatsong', 'findsong', 'identify'],
  description: 'Identify a song from an audio or video clip.',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg) => {
    const fromJid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Reply to a short audio or video message (10–20 seconds) to identify the song.*'
      }, { quoted: msg });
    }

    const filePath = path.join(TEMP_DIR, `media-${Date.now()}.dat`);

    try {
      const stream = await downloadMediaMessage(
        { message: quoted },
        'stream',
        {},
        { logger: console }
      );

      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);
      await new Promise(resolve => writeStream.on('finish', resolve));

      let buffer = fs.readFileSync(filePath);
      const MAX_SIZE = 1 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) buffer = buffer.slice(0, MAX_SIZE);

      const matchedSong = await identifySong(buffer);

      if (!matchedSong) {
        return king.sendMessage(fromJid, {
          text: '❌ *Song could not be recognized.* Please try again with a clearer or more melodic part of the track.'
        }, { quoted: msg });
      }

      const { title, artists, album, genres, release_date } = matchedSong;
      const ytQuery = `${title} ${artists?.[0]?.name || ''}`;
      const ytSearch = await yts(ytQuery);

      let response = `🎶 *Song Identified!*\n\n`;
      response += `🎧 *Title:* ${title || 'Unknown'}\n`;
      if (artists) response += `👤 *Artist(s):* ${artists.map(a => a.name).join(', ')}\n`;
      if (album?.name) response += `💿 *Album:* ${album.name}\n`;
      if (genres?.length) response += `🎼 *Genre:* ${genres.map(g => g.name).join(', ')}\n`;
      if (release_date) {
        const [year, month, day] = release_date.split('-');
        response += `📅 *Released:* ${day}/${month}/${year}\n`;
      }
      if (ytSearch?.videos?.[0]?.url) response += `🔗 *YouTube:* ${ytSearch.videos[0].url}\n`;
      response += `\n*POWERED BY FLASH-MD V2*`;

      return king.sendMessage(fromJid, {
        text: response.trim(),
        contextInfo: {
          forwardingScore: 777,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });

    } catch (err) {
      console.error('[SHZ ERROR]', err);
      return king.sendMessage(fromJid, {
        text: '⚠️ *Error:* Unable to recognize the song. Please try again with a clear, short clip (10–20s).'
      }, { quoted: msg });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};
