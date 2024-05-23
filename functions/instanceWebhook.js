import query from '../database/dbpromise.js'
import { decodeObject } from '../functions/function.js'
import { getSession } from '../middlewares/req.js'
import fetch from 'node-fetch'

async function sendPostRequest(url, data) {
    try {
        // Set a timeout for the fetch operation (20 seconds)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Request timed out'));
            }, 20000);
        });

        // Send the POST request and wait for it to complete or time out
        const response = await Promise.race([fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        }), timeoutPromise]);

        if (response.status === 200) {
            return true; // Request was successful
        } else {
            return false; // Invalid URL or not found
        }
    } catch (error) {
        return false; // Error occurred (e.g., network issue)
    }
}


function removeAfterAt(inputString) {
    const atIndex = inputString.indexOf('@');
    if (atIndex !== -1) {
        return inputString.substring(0, atIndex);
    }
    return inputString;
}

function endsWithGus(str) {
    const target = "@g.us";
    return str.toLowerCase().endsWith(target);
}

const instanceWebhookFunction = async (m, wa, sessionId) => {
    const { uid, client_id } = decodeObject(sessionId)

    const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [uid])
    const plan = getUser[0].plan


    if (!plan) {
        return
    }

    const isWebHookAllowed = JSON.parse(plan)?.allow_webhook === 1 ? true : false
    if (!isWebHookAllowed) {
        return
    }

    // getting webhook url 
    const webhookUrl = await query(`SELECT * FROM instance WHERE client_id = ?`, [sessionId])

    if (!webhookUrl[0]?.webhook) {
        return
    }

    const incomeMsg = m?.messages[0]?.message?.conversation?.toLowerCase() || m.messages[0]?.message?.extendedTextMessage?.text?.toLowerCase() || m.messages[0]?.message?.listResponseMessage?.title?.toLowerCase() || m.messages[0]?.message?.buttonsResponseMessage?.selectedDisplayText.toLowerCase()

    const msgJson = {
        name: m?.messages[0]?.pushName,
        message: incomeMsg,
        mobile: removeAfterAt(m?.messages[0]?.key?.remoteJid),
        userUID: uid,
        clientID: sessionId,
        messageType: endsWithGus(m?.messages[0]?.key?.remoteJid) ? "Group" : "Direct Message",
        json_all: m
    }

    const senDta = await sendPostRequest(webhookUrl[0]?.webhook, msgJson)
    console.log({ senDta, url: webhookUrl[0]?.webhook })
}
export { instanceWebhookFunction }
