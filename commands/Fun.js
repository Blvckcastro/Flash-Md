
const { axios } = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { franceking } = require('../main');

module.exports = [
  {
  name: 'exchange',
  aliases: ['rate', 'rates'],
  category: 'Finance',
  description: 'Convert currency using live exchange rate',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    if (args.length < 3) {
      return king.sendMessage(fromJid, {
        text: 'Please provide the amount, from currency, and to currency.\n\nExample: *.exchange 100 usd kes*'
      }, { quoted: msg });
    }

    const [amountRaw, fromCurrency, toCurrency] = args;
    const amount = parseFloat(amountRaw);

    if (isNaN(amount)) {
      return king.sendMessage(fromJid, {
        text: 'Invalid amount. Please enter a valid number.'
      }, { quoted: msg });
    }

    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`);
      const rates = response.data.rates;

      if (!rates[toCurrency.toUpperCase()]) {
        return king.sendMessage(fromJid, {
          text: 'Currency conversion rate not available.'
        }, { quoted: msg });
      }

      const convertedAmount = (amount * rates[toCurrency.toUpperCase()]).toFixed(2);

      return king.sendMessage(fromJid, {
        text: `${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount} ${toCurrency.toUpperCase()}`
      }, { quoted: msg });

    } catch (error) {
      return king.sendMessage(fromJid, {
        text: '❌ An error occurred while converting currency. Please try again later.'
      }, { quoted: msg });
    }
  }
}, 
{
  name: 'currency',
  description: 'Converts one currency to another using live exchange rates',
  category: 'Finance',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    if (!args[0] || args.length < 3) {
      return king.sendMessage(fromJid, {
        text: "Please provide the amount, from currency, and to currency. Example: *.currency 100 usd kes*"
      }, { quoted: msg });
    }

    const [amountRaw, fromCurrency, toCurrency] = args;
    const amount = parseFloat(amountRaw);

    if (isNaN(amount)) {
      return king.sendMessage(fromJid, {
        text: "Invalid amount. Please provide a number. Example: *.currency 50 eur usd*"
      }, { quoted: msg });
    }

    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`);
      const data = response.data;
      const rates = data.rates;

      if (!rates[toCurrency.toUpperCase()]) {
        return king.sendMessage(fromJid, {
          text: `Invalid target currency *${toCurrency.toUpperCase()}*. Use *.currencyinfo* to view supported currencies.`
        }, { quoted: msg });
      }

      const convertedAmount = (amount * rates[toCurrency.toUpperCase()]).toFixed(2);
      const updateDate = new Date(data.time_last_updated * 1000);

      let info = `*💱 Currency Conversion 💱*\n\n`;
      info += `🌍 Base: ${data.base}\n`;
      info += `🔄 Updated: ${updateDate.toLocaleDateString()} - ${updateDate.toLocaleTimeString()}\n\n`;
      info += `💵 ${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount} ${toCurrency.toUpperCase()}\n`;
      info += `💸 Rate: 1 ${fromCurrency.toUpperCase()} = ${rates[toCurrency.toUpperCase()]} ${toCurrency.toUpperCase()}`;

      await king.sendMessage(fromJid, { text: info }, { quoted: msg });

    } catch (error) {
      await king.sendMessage(fromJid, {
        text: "❌ An error occurred while converting currency.\nMake sure your currency codes are valid.\nUse *.currencyinfo* to see all supported currencies."
      }, { quoted: msg });
    }
  }
}, 
  {
  name: 'imdb',
  aliases: ['movie', 'film'],
  description: 'Search for a movie or series using IMDb API',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    if (!args[0]) {
      return king.sendMessage(fromJid, {
        text: '🎬 Provide the name of a movie or series. Example: *.imdb Inception*'
      }, { quoted: msg });
    }

    const query = args.join(" ");
    try {
      const response = await axios.get(`http://www.omdbapi.com/?apikey=742b2d09&t=${encodeURIComponent(query)}&plot=full`);
      const imdb = response.data;

      if (imdb.Response === 'False') {
        return king.sendMessage(fromJid, {
          text: `❌ Could not find results for "${query}".`
        }, { quoted: msg });
      }

      let info = "⚍⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚍\n";
      info += " ``` 𝕀𝕄𝔻𝔹 𝕊𝔼𝔸ℝℂℍ```\n";
      info += "⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎\n";
      info += `🎬 Title: ${imdb.Title}\n`;
      info += `📅 Year: ${imdb.Year}\n`;
      info += `⭐ Rated: ${imdb.Rated}\n`;
      info += `📆 Release: ${imdb.Released}\n`;
      info += `⏳ Runtime: ${imdb.Runtime}\n`;
      info += `🌀 Genre: ${imdb.Genre}\n`;
      info += `👨🏻‍💻 Director: ${imdb.Director}\n`;
      info += `✍ Writers: ${imdb.Writer}\n`;
      info += `👨 Actors: ${imdb.Actors}\n`;
      info += `📃 Synopsis: ${imdb.Plot}\n`;
      info += `🌐 Language: ${imdb.Language}\n`;
      info += `🌍 Country: ${imdb.Country}\n`;
      info += `🎖️ Awards: ${imdb.Awards}\n`;
      info += `📦 Box Office: ${imdb.BoxOffice}\n`;
      info += `🏙️ Production: ${imdb.Production}\n`;
      info += `🌟 IMDb Rating: ${imdb.imdbRating}\n`;
      info += `❎ IMDb Votes: ${imdb.imdbVotes}\n`;
      info += `🎥 Watch Online: https://www.google.com/search?q=watch+${encodeURIComponent(imdb.Title)}+online\n`;

      await king.sendMessage(fromJid, {
        image: { url: imdb.Poster },
        caption: info
      }, { quoted: msg });

    } catch (error) {
      return king.sendMessage(fromJid, {
        text: "❌ An error occurred while searching IMDb."
      }, { quoted: msg });
    }
  }
}, 
  {
  name: 'emomix',
  aliases: ['emojimix'],
  category: 'Converter',
  description: 'Mixes two emojis into one sticker',
  
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    if (!args[0] || args.length !== 1) {
      return king.sendMessage(fromJid, {
        text: "Incorrect use. Example: *.emomix 😀;🥰*"
      }, { quoted: msg });
    }

    const emojis = args.join(' ').split(';');
    if (emojis.length !== 2) {
      return king.sendMessage(fromJid, {
        text: "Please specify two emojis using a `;` separator."
      }, { quoted: msg });
    }

    const emoji1 = emojis[0].trim();
    const emoji2 = emojis[1].trim();

    try {
      const response = await axios.get(`https://levanter.onrender.com/emix?q=${emoji1}${emoji2}`);

      if (response.data?.status) {
        const stickerMess = new Sticker(response.data.result, {
          pack: 'FLASH-MD',
          type: StickerTypes.CROPPED,
          categories: ['🤩', '🎉'],
          id: '12345',
          quality: 70,
          background: 'transparent'
        });

        const buffer = await stickerMess.toBuffer();
        await king.sendMessage(fromJid, {
          sticker: buffer
        }, { quoted: msg });

      } else {
        return king.sendMessage(fromJid, {
          text: 'Unable to create emoji mix.'
        }, { quoted: msg });
      }

    } catch (err) {
      return king.sendMessage(fromJid, {
        text: 'An error occurred while creating the emoji mix: ' + err.message
      }, { quoted: msg });
    }
  }
}, 
  {
  name: 'hack',
  aliases: ['fakehack', 'h4ck'],
  description: 'Fake hack for fun 😈',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const creatorNumbers = ['254757835036', '254742063632'];
    const senderNumber = fromJid.replace(/[^0-9]/g, '');

    if (creatorNumbers.includes(senderNumber)) {
      return king.sendMessage(fromJid, {
        text: '🛑 No way, I can\'t hack my creator 🤝🐐'
      }, { quoted: msg });
    }

    const randomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const fakeFiles = ['passwords.txt', 'bank_logins.csv', 'nudes.zip', 'crypto_keys.txt', 'facebook_tokens.json'];
    const randomDevice = [
      'Samsung Galaxy A52', 'Tecno Spark 10', 'Infinix Hot 30',
      'Huawei Y9 Prime', 'iTel S23+', 'Xiaomi Redmi Note 11',
      'Nokia G21', 'Oppo A58', 'Realme C35', 'Vivo Y33s',
      'OnePlus Nord N20', 'HTC U20', 'Motorola G Stylus', 'Sony Xperia 10'
    ];

    const progressSteps = [
      `[▓░░░░░░░░░] 10%`,
      `[▓▓░░░░░░░░] 20%`,
      `[▓▓▓░░░░░░░] 30%`,
      `[▓▓▓▓░░░░░░] 40%`,
      `[▓▓▓▓▓░░░░░] 50%`,
      `[▓▓▓▓▓▓░░░░] 60%`,
      `[▓▓▓▓▓▓▓░░░] 70%`,
      `[▓▓▓▓▓▓▓▓░░] 80%`,
      `[▓▓▓▓▓▓▓▓▓░] 90%`,
      `[▓▓▓▓▓▓▓▓▓▓] 100%`
    ];

    const messages = [
      `🔌 Connecting to device: ${randomDevice[Math.floor(Math.random() * randomDevice.length)]}`,
      `🌐 IP Address: ${randomIP()}`,
      `📡 Signal strength: ▓▓▓▓▓▓▓▓▓▒ 95%`,
      `🧬 Accessing personal files...`,
      `📂 File found: *${fakeFiles[Math.floor(Math.random() * fakeFiles.length)]}*`,
      `📂 File found: *${fakeFiles[Math.floor(Math.random() * fakeFiles.length)]}*`,
      `🧾 Reading browser history...`,
      `🔍 Found suspicious activity on dark web...`,
      `💸 Linked bank accounts detected...`,
      `🚨 Transferring ₿ crypto assets...`,
      `🧪 Injecting malware into WhatsApp backup...`,
      `💾 Download complete.`,
      `🧹 Deleting traces...`,
      `💀 Hack complete. Target is now under our control.`,
      `🛑 *Warning:* This hack has triggered a report to Interpol. Good luck 😈`
    ];

    const progressMsg = await king.sendMessage(fromJid, {
      text: `💻 Hacking progress:\n${progressSteps[0]}`
    }, { quoted: msg });

    for (let i = 1; i < progressSteps.length; i++) {
      await sleep(1000);
      await king.relayMessage(
        fromJid,
        {
          protocolMessage: {
            key: progressMsg.key,
            type: 14,
            editedMessage: {
              conversation: `💻 Hacking progress:\n${progressSteps[i]}`
            }
          }
        },
        {}
      );
    }

    for (const line of messages) {
      await sleep(1500);
      await king.sendMessage(fromJid, {
        text: line
      }, { quoted: msg });
    }
  }
  }, 
 {
  name: 'love',
  aliases: ['compatibility', 'lovetest'],
  description: 'Calculate love compatibility between two people ❤️',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const senderName = msg.pushName || 'User';
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const quotedName = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
    let user1 = senderName;
    let user2 = '';

    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      user2 = quotedName.replace(/@s\.whatsapp\.net$/, '');
    } else if (args.length > 0) {
      user2 = args.join(' ');
    } else {
      return king.sendMessage(fromJid, {
        text: 'Please mention someone or reply to their message. Example: *.love @Marie*'
      }, { quoted: msg });
    }

    const percentage = Math.floor(Math.random() * 101);
    let emoji = '❤️';
    if (percentage < 25) emoji = '💔';
    else if (percentage < 50) emoji = '🤔';
    else if (percentage < 75) emoji = '😊';
    else emoji = '💖';

    const response = `--- Compatibility Test ---\n\n` +
                     `❤️ Person 1: *${user1}*\n` +
                     `❤️ Person 2: *${user2}*\n\n` +
                     `Their compatibility is: *${percentage}%* ${emoji}`;

    await king.sendMessage(fromJid, { text: response }, { quoted: msg });
  }
}, 
   {
  name: 'flip',
  aliases: ['coin', 'toss'],
  description: 'Toss a coin and get HEADS or TAILS 🪙',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const coinMsg = await king.sendMessage(fromJid, {
      text: '🪙 Tossing the coin in the air...'
    }, { quoted: msg });

    await sleep(1000);

    await king.relayMessage(
      fromJid,
      {
        protocolMessage: {
          key: coinMsg.key,
          type: 14,
          editedMessage: {
            conversation: '🌀 The coin is spinning... spinning...'
          }
        }
      },
      {}
    );

    await sleep(1500);

    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';

    const finalText = `🪙 The coin has landed!\n\nResult: It's *${result}*!`;

    await king.relayMessage(
      fromJid,
      {
        protocolMessage: {
          key: coinMsg.key,
          type: 14,
          editedMessage: {
            conversation: finalText
          }
        }
      },
      {}
    );
  }
} ];
