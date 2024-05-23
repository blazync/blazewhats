import fs from 'fs';
import fetch from 'node-fetch';
import query from '../database/dbpromise.js'
import { getNumberByPhonebok } from './function.js';

const sendText = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "text",
                "text": {
                    "preview_url": msgObj?.preview_url,
                    "body": msgObj?.body
                }
            }
            console.log({ user, msgObj, msgFrom })
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log({ data: JSON.stringify(data) })
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

function findMatchingObject(array, text) {
    for (const obj of array) {
        if (obj.reply_type === 'exact-words' && obj.keyword?.toLowerCase() === text?.toLowerCase()) {
            return obj;
        }
    }
    // If no matching object is found, return an empty object
    return {};
}

function findMatchingObjectMatching(array, text) {
    for (const obj of array) {
        if (obj.reply_type === 'exact-words' && obj.keyword?.toLowerCase() === text?.toLowerCase()) {
            return obj;
        } else if (obj.reply_type === 'matching-words' && obj.keyword.includes(text?.toLowerCase())) {
            return obj;
        }
    }
    // If no matching object is found, return null
    return null;
}

const sendLocation = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "location",
                "location": {
                    "latitude": msgObj?.latitude,
                    "longitude": msgObj?.longitude,
                    "name": msgObj?.name,
                    "address": msgObj?.address
                }
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendDoc = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fileURL = `${process.env.URI}/media/${msgObj?.filename}`
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "document",
                "document": {
                    "link": fileURL,
                    "caption": msgObj?.caption
                }
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendImage = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fileURL = `${process.env.URI}/media/${msgObj?.filename}`
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "image",
                "image": {
                    "link": fileURL,
                    "caption": msgObj?.caption
                }
            }

            console.log({ fileURL })

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log({ data: JSON.stringify(data) })
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendVideo = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fileURL = `${process.env.URI}/media/${msgObj?.filename}`
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "video",
                "video": {
                    "link": fileURL,
                    "caption": msgObj?.caption
                }
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log({ dataaa: JSON.stringify(data) })
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendQuickReply = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {

            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {
                        "text": msgObj?.bodyText,
                    },
                    "action": {
                        "buttons": msgObj?.buttons
                    }
                }
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendList = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const newSection = msgObj?.action?.sections.map(i => {
                return {
                    title: i.title,
                    rows: [i.rows]
                }
            })
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "header": {
                        "type": "text",
                        "text": msgObj?.header
                    },
                    "body": {
                        "text": msgObj?.body
                    },
                    "footer": {
                        "text": msgObj?.footer
                    },
                    "action": {
                        "button": msgObj?.action?.button,
                        "sections": newSection
                    }
                }
            }

            console.log({ payload: JSON.stringify(payload) })

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log({ data: JSON.stringify(data) })
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const sendContact = (user, msgObj, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {

            const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`
            const payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": msgFrom,
                "type": "contacts",
                "contacts": [msgObj]
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.whatsapp_token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                resolve({ data, success: true })
            } catch (error) {
                resolve({ success: false })
                console.error('Error sending message:', error);
            }

        } catch (error) {
            console.log(`error found in sendText()`, error)
            reject(error)
        }
    })
}

const foundMatchAndreturnTemplet = async (incomingtext, uid, user, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log({ incomingtext })
            // get bots 
            const botData = await query(`SELECT * FROM meta_bots WHERE uid = ? AND active = ?`, [uid, 1])

            let isSent = false

            const getExcludingNum = await query(`SELECT * FROM phonebook_contacts WHERE name = ?`, [botData?.excluding_phonebook])
            const excludeNumArr = getExcludingNum?.map(num => num.mobile)

            if (botData.reply_type === "exact-words") {
                console.log("exact-words ran")

                // check which botData matched with incomingtext for exact-words
                const resultForExactWords = findMatchingObject(botData, incomingtext);

                if (resultForExactWords?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                    await sendText(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                    await sendLocation(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                    await sendDoc(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                    await sendImage(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                    await sendVideo(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                    await sendQuickReply(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                    await sendList(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                    await sendContact(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
            } else {
                console.log("matching-words ran")
                const resultForMatchingWords = findMatchingObjectMatching(botData, incomingtext);

                if (resultForMatchingWords?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                    await sendText(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                    await sendLocation(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                    await sendDoc(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                    await sendImage(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                    await sendVideo(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                    await sendQuickReply(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForMatchingWords?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                    await sendList(user, JSON.parse(resultForMatchingWords?.content), msgFrom)
                    isSent = true
                }
                else if (resultForExactWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                    await sendContact(user, JSON.parse(resultForExactWords?.content), msgFrom)
                    isSent = true
                }
            }

            if (isSent) {
                console.log({ isSent: isSent })
                resolve()
                return
            } else {
                // check if there is message to start convo 
                const getForAll = await query(`SELECT * FROM meta_bots WHERE templet_type = ?`, ["ALL"])
                if (getForAll.length < 1) {
                    return resolve()
                } else {


                    // check which botData matched with incomingtext for exact-words
                    const resultForExactWords = findMatchingObject(botData, incomingtext);

                    if (getForAll[0]?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                        await sendText(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                        await sendLocation(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                        await sendDoc(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                        await sendImage(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                        await sendVideo(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                        await sendQuickReply(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (getForAll[0]?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                        await sendList(user, JSON.parse(getForAll[0]?.content), msgFrom)
                    }
                    else if (resultForExactWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                        await sendContact(user, JSON.parse(resultForExactWords?.content), msgFrom)
                        isSent = true
                    }
                    return resolve()
                }
            }

        } catch (error) {
            console.log(`error found in foundMatchAndreturnTemplet()`, error)
            reject(error)
        }
    })
}

export { sendText, foundMatchAndreturnTemplet }