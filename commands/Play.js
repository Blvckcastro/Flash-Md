import yts from 'yt-search';
import axios from 'axios';
import { API_CONFIG } from '../france/index.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

let ffmpegPath = null;

if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
  ffmpegPath = ffmpegStatic;
  try {
    execSync(`${ffmpegPath} -version`);
  } catch {
    ffmpegPath = null;
  }
}

if (!ffmpegPath) {
  try {
    execSync('ffmpeg -version');
    ffmpegPath = 'ffmpeg';
  } catch {
    try {
      execSync('/usr/bin/ffmpeg -version');
      ffmpegPath = '/usr/bin/ffmpeg';
    } catch {
      try {
        execSync('/usr/local/bin/ffmpeg -version');
        ffmpegPath = '/usr/local/bin/ffmpeg';
      } catch {
        ffmpegPath = null;
      }
    }
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export const commands = [
  {
    name: 'play',
    description: 'Search and download MP3 audio from YouTube (audio only).',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const botVersion = config.BOT_VERSION || '3.0.0';

      if (!text) {
        return sock.sendMessage(from, { text: `❗ Please provide a song name.\n\n⚡ Powered by ${botName} ${botVersion}` });
      }

      try {
        if (!API_CONFIG?.nayanApi?.youtube) {
          throw new Error('Nayan API not configured');
        }

        await sock.sendMessage(from, { text: '🔍 Searching for your song...' }, { quoted: msg });

        const search = await yts(text);
        const video = search.videos?.[0];

        if (!video) {
          return sock.sendMessage(from, { text: `❌ No results found for your query.\n\n⚡ Powered by ${botName} ${botVersion}` });
        }

        const videoUrl = `https://youtu.be/${video.videoId}`;
        const apiUrl = `${API_CONFIG.nayanApi.youtube}?url=${encodeURIComponent(videoUrl)}`;

        await sock.sendMessage(from, { text: '⬇️ Downloading your audio...' }, { quoted: msg });

        const response = await axios.get(apiUrl, {
          timeout: API_CONFIG.nayanApi.timeout || 30000
        });

        if (!response.data?.status || !response.data?.data?.audio) {
          return sock.sendMessage(from, { text: `❌ Failed to retrieve download link.\n\n⚡ Powered by ${botName} ${botVersion}` });
        }

        const downloadLink = response.data.data.audio;
        const videoInfo = response.data.data;

        const safeTitle = (video.title || 'audio').replace(/[\\/:*?"<>|]/g, '');
        const fileName = `${safeTitle}.mp3`;

        await sock.sendMessage(from, {
          image: { url: video.thumbnail || videoInfo.thumb || 'https://via.placeholder.com/300' },
          caption:
            `*🎵 ${botName.toUpperCase()} SONG PLAYER*\n\n` +
            `╭─❏ *Title:* ${videoInfo.title || video.title}\n` +
            `│ *Duration:* ${video.timestamp || 'N/A'}\n` +
            `│ *Views:* ${video.views?.toLocaleString() || 'N/A'}\n` +
            `│ *Uploaded:* ${video.ago || 'N/A'}\n` +
            `│ *Channel:* ${videoInfo.channel || video.author?.name}\n` +
            `│ *Quality:* ${videoInfo.quality || '128'}kbps\n` +
            `│ *Powered by:* ${botName}\n` +
            `╰─────────────\n\n` +
            `🔗 https://youtube.com/watch?v=${video.videoId}`
        }, { quoted: msg });

        const tempDir = process.env.TEMP_DIR || './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const audioRes = await axios.get(downloadLink, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!ffmpegPath) {
          await sock.sendMessage(from, { text: '📤 Sending your audio...' }, { quoted: msg });
          await sock.sendMessage(from, {
            audio: audioRes.data,
            mimetype: 'audio/mpeg',
            fileName
          }, { quoted: msg });
          return;
        }

        const inputPath = path.join(tempDir, `${Date.now()}.m4a`);
        const outputPath = path.join(tempDir, `${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, audioRes.data);

        await sock.sendMessage(from, { text: '🎧 Processing audio...' }, { quoted: msg });

        const conversionPromise = new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .audioBitrate(128)
            .audioCodec('libmp3lame')
            .toFormat('mp3')
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(outputPath);
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FFmpeg timeout')), 30000)
        );

        try {
          await Promise.race([conversionPromise, timeoutPromise]);
          
          await sock.sendMessage(from, { text: '📤 Sending your audio...' }, { quoted: msg });
          
          await sock.sendMessage(from, {
            audio: fs.readFileSync(outputPath),
            mimetype: 'audio/mpeg',
            fileName
          }, { quoted: msg });
          
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (conversionError) {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          
          await sock.sendMessage(from, { text: '📤 Sending original audio...' }, { quoted: msg });
          await sock.sendMessage(from, {
            audio: audioRes.data,
            mimetype: 'audio/mpeg',
            fileName
          }, { quoted: msg });
        }

      } catch (err) {
        console.error('Play command error:', err.message);
        if (err.response) {
          console.error('Response data:', err.response.data);
        }
        sock.sendMessage(from, { text: `❌ Error: ${err.message || 'Unknown error'}\n\n⚡ Powered by ${botName} ${botVersion}` });
      }
    }
  }
];
