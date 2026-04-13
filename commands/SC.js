import axios from 'axios';

export const commands = [
  {
    name: 'repo',
    aliases: ['sc', 'script'],
    description: 'Sends the official GitHub repository and stats for FLASH-MD',
    execute: async ({ sock, from, config, msg }) => {
      const botName = config.BOT_NAME || 'Flash-MD'
      const botVersion = config.BOT_VERSION || '3.0.0'
      const repoApiUrl = 'https://api.github.com/repos/franceking1/Flash-Md-V3';
      const repoUrl = 'https://github.com/franceking1/Flash-Md-V3';

      try {
        const { data } = await axios.get(repoApiUrl);

        const stars = data.stargazers_count.toLocaleString();
        const forks = data.forks_count.toLocaleString();
        const watchers = data.watchers_count.toLocaleString();
        const createdAt = new Date(data.created_at).toLocaleDateString('en-GB');
        const lastUpdated = new Date(data.pushed_at).toLocaleDateString('en-GB');

        const repoInfo = `*🤖 ${botName.toUpperCase()} ${botVersion}*

A powerful, open-source WhatsApp bot built for speed, reliability, and ease of use.

*📂 GitHub Repository:*
${repoUrl}

*📊 Repository Stats:*
⭐ *Stars:* ${stars}
🍴 *Forks:* ${forks}
👀 *Watchers:* ${watchers}
📅 *Created:* ${createdAt}
♻️ *Last Updated:* ${lastUpdated}

*⚡ Powered by ${botName} ${botVersion}*

_Star ⭐ the repository if you like the bot and want to support future development!_
_Don't forget to fork 🍴 and watch 👀 for updates!_`;

        await sock.sendMessage(from, { 
          text: repoInfo,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

      } catch (error) {
        console.error('GitHub Repo Error:', error.message);
        await sock.sendMessage(from, {
          text: `❌ Failed to fetch repository information. Please try again later.\n\n⚡ Powered by ${botName}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      }
    }
  }
];
