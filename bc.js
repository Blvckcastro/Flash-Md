import moment from 'moment-timezone'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import CONFIG from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const seenStatusIds = new Set()

export function logStatus(participant, messageId, pushName, statusType = 'unknown', caption = '') {
  const timestamp = moment().tz(CONFIG.TZ).format('DD/MM/YYYY HH:mm:ss')
  const userPhone = getStatusUserPhone(participant)
  const formattedPhone = formatPhoneNumber(userPhone)

  console.log(`\n[📅 ${timestamp}] [📊 STATUS UPDATE]`)
  console.log(`├─ 👤 From: ${pushName || 'Unknown'} (${formattedPhone})`)
  console.log(`├─ 🔑 JID: ${participant}`)
  console.log(`├─ 🆔 Message ID: ${messageId}`)
  console.log(`├─ 📎 Type: ${statusType}`)
  if (caption) console.log(`├─ 📝 Content: ${caption.substring(0, 100)}`)
  console.log(`├─ 👁️ Auto View: ${CONFIG.AUTO_VIEW === true ? '✅ ON' : '❌ OFF'}`)
  console.log(`├─ ❤️ Auto Like: ${CONFIG.AUTO_LIKE === true ? '✅ ON' : '❌ OFF'}`)
  console.log(`└─ 📖 Auto Read: ${CONFIG.AUTO_READ === true ? '✅ ON' : '❌ OFF'}\n`)
}

export function getStatusUserPhone(statusJid) {
  if (!statusJid) return 'Unknown'
  return statusJid.split('@')[0]
}

function formatPhoneNumber(phone) {
  if (!phone || phone === 'Unknown') return 'Unknown'
  const cleaned = phone.replace(/[^\d+]/g, '')
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export async function processStatusMessage(msg, sock) {
  if (!msg.message) return

  const id = msg.key.id
  const remoteJid = msg.key.remoteJid
  const remoteJidAlt = msg.key.remoteJidAlt

  let statusPosterJid = null

  
  if (remoteJid === 'status@broadcast') {
    statusPosterJid = remoteJidAlt || null
  } else {
    statusPosterJid = remoteJid
  }

  if (!id || !statusPosterJid) {
    console.log('⚠️ Status message missing required fields:', JSON.stringify(msg.key))
    return
  }

  if (seenStatusIds.has(id)) {
    console.log(`⏩ Already processed status ${id}`)
    return
  }

  let statusType = 'unknown'
  let statusCaption = ''

  try {
    if (msg.message?.imageMessage) {
      statusType = 'image'
      statusCaption = msg.message.imageMessage.caption || ''
    } else if (msg.message?.videoMessage) {
      statusType = 'video'
      statusCaption = msg.message.videoMessage.caption || ''
    } else if (msg.message?.conversation) {
      statusType = 'text'
      statusCaption = msg.message.conversation
    } else if (msg.message?.extendedTextMessage) {
      statusType = 'text'
      statusCaption = msg.message.extendedTextMessage.text || ''
    } else if (msg.message?.audioMessage) {
      statusType = 'audio'
    } else if (msg.message?.documentMessage) {
      statusType = 'document'
    }

    seenStatusIds.add(id)
    if (seenStatusIds.size > 1000) {
      const firstKey = seenStatusIds.values().next().value
      seenStatusIds.delete(firstKey)
    }

    if (CONFIG.AUTO_VIEW === true) {
      try {
        await sock.readMessages([msg.key])
        console.log(`✅ Viewed status from: ${statusPosterJid}`)
      } catch (viewErr) {
        console.error(`❌ Failed to view status: ${viewErr.message}`)
      }
    }

    if (CONFIG.AUTO_LIKE === true) {
      setTimeout(async () => {
        try {
          await sock.sendMessage(
            'status@broadcast',
            {
              react: {
                text: '🤍',
                key: msg.key
              }
            }
          )
          console.log(`🤍 Liked status from: ${statusPosterJid}`)
        } catch (reactErr) {
          console.error(`❌ Failed to like status: ${reactErr.message}`)
        }
      }, 2000)
    }

    let senderName = msg.pushName || 'Unknown'
    try {
      const contact = await sock.onWhatsApp(statusPosterJid)
      if (contact && contact[0]) {
        senderName = contact[0].notify || senderName
      }
    } catch {}

    logStatus(statusPosterJid, id, senderName, statusType, statusCaption)

  } catch (statusErr) {
    console.error(`❌ Error processing status: ${statusErr.message}`)
  }
}

export async function handleStatusReply(msg, sock, senderJid) {
  const tempDir = '/tmp/flash-md-temp'
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  try {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    const quotedMsg = contextInfo?.quotedMessage
    const commandText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ''
    const normalizedCommand = commandText.toLowerCase().trim()
    const statusCommands = ['share', 'send', 'tuma', 'nitumie']
    const isStatusReply = contextInfo?.participant && quotedMsg

    if (statusCommands.includes(normalizedCommand) && isStatusReply) {
      const recipientJid = senderJid
      let sendMsg
      const quotedMsgWrapper = { message: quotedMsg }

      if (quotedMsg.imageMessage) {
        const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console })
        const filePath = path.join(tempDir, `${Date.now()}-status-image.jpg`)
        fs.writeFileSync(filePath, buffer)
        sendMsg = {
          image: { url: filePath },
          caption: '📸 Sent by *Flash-Md-V3* !'
        }
      } else if (quotedMsg.videoMessage) {
        const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console })
        const filePath = path.join(tempDir, `${Date.now()}-status-video.mp4`)
        fs.writeFileSync(filePath, buffer)
        sendMsg = {
          video: { url: filePath },
          caption: '🎥 Sent by *Flash-Md-V3* !'
        }
      } else if (quotedMsg.stickerMessage) {
        const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console })
        const filePath = path.join(tempDir, `${Date.now()}-status-sticker.webp`)
        fs.writeFileSync(filePath, buffer)
        sendMsg = {
          sticker: { url: filePath }
        }
      } else {
        return false
      }

      await sock.sendMessage(recipientJid, sendMsg, { quoted: msg })

      const fileUrl = sendMsg.image?.url || sendMsg.video?.url || sendMsg.sticker?.url
      if (fileUrl) {
        try {
          await fs.promises.unlink(fileUrl)
        } catch (e) {
          console.error(`Failed to delete temp file: ${fileUrl} - ${e.message}`)
        }
      }

      return true
    }
  } catch (err) {
    console.error(`Error in status reply: ${err.message}`)
  }

  return false
} 
