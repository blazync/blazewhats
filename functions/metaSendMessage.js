import fs from 'fs';
import fetch from 'node-fetch';
import query from '../database/dbpromise.js';

const sendText = async (user, msgObj, msgFrom) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'text',
            text: {
                preview_url: msgObj?.preview_url,
                body: msgObj?.body,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

function findMatchingObject(array, text) {
    for (const obj of array) {
        if (obj.reply_type === 'exact-words' && obj.keyword?.toLowerCase() === text?.toLowerCase()) {
            return obj;
        }
    }
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
    return null;
}

const sendLocation = async (user, msgObj, msgFrom) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'location',
            location: {
                latitude: msgObj?.latitude,
                longitude: msgObj?.longitude,
                name: msgObj?.name,
                address: msgObj?.address,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
}

const sendDoc = async (user, msgObj, msgFrom) => {
    try {
        const fileURL = `${process.env.URI}/media/${msgObj?.filename}`;
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'document',
            document: {
                link: fileURL,
                caption: msgObj?.caption,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const sendImage = async (user, msgObj, msgFrom) => {
    try {
        const fileURL = `${process.env.URI}/media/${msgObj?.filename}`;
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'image',
            image: {
                link: fileURL,
                caption: msgObj?.caption,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const sendVideo = async (user, msgObj, msgFrom) => {
    try {
        const fileURL = `${process.env.URI}/media/${msgObj?.filename}`;
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'video',
            video: {
                link: fileURL,
                caption: msgObj?.caption,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const sendQuickReply = async (user, msgObj, msgFrom) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: {
                    text: msgObj?.bodyText,
                },
                action: {
                    buttons: msgObj?.buttons,
                },
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const sendList = async (user, msgObj, msgFrom) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const newSection = msgObj?.action?.sections.map((i) => {
            return {
                title: i.title,
                rows: [i.rows],
            };
        });
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: {
                    type: 'text',
                    text: msgObj?.header,
                },
                body: {
                    text: msgObj?.body,
                },
                footer: {
                    text: msgObj?.footer,
                },
                action: {
                    button: msgObj?.action?.button,
                    sections: newSection,
                },
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const sendContact = async (user, msgObj, msgFrom) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${user?.phone_number_id}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msgFrom,
            type: 'contacts',
            contacts: [msgObj],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user?.whatsapp_token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false };
    }
};

const foundMatchAndreturnTemplet = async (incomingtext, uid, user, msgFrom) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log({ incomingtext })
            const botData = await query(`SELECT * FROM meta_bots WHERE uid = ? AND active = ?`, [uid, 1]);

            let isSent = false;

            const getExcludingNum = await query(`SELECT * FROM phonebook_contacts WHERE name = ?`, [botData?.excluding_phonebook]);
            const excludeNumArr = getExcludingNum?.map(num => num.mobile);

            if (botData.reply_type === "exact-words") {
                console.log("exact-words ran");

                const resultForExactWords = findMatchingObject(botData, incomingtext);

                if (resultForExactWords?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                    await sendText(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                    await sendLocation(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                    await sendDoc(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                    await sendImage(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                    await sendVideo(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                    await sendQuickReply(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                    await sendList(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForExactWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                    await sendContact(user, JSON.parse(resultForExactWords?.content), msgFrom);
                    isSent = true;
                }
            } else {
                console.log("matching-words ran");
                const resultForMatchingWords = findMatchingObjectMatching(botData, incomingtext);

                if (resultForMatchingWords?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                    await sendText(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                    await sendLocation(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                    await sendDoc(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                    await sendImage(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                    await sendVideo(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                    await sendQuickReply(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                    await sendList(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
                else if (resultForMatchingWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                    await sendContact(user, JSON.parse(resultForMatchingWords?.content), msgFrom);
                    isSent = true;
                }
            }

            if (isSent) {
                console.log({ isSent: isSent });
                resolve();
                return;
            } else {
                const getForAll = await query(`SELECT * FROM meta_bots WHERE templet_type = ?`, ["ALL"]);
                if (getForAll.length < 1) {
                    return resolve();
                } else {
                    const resultForExactWords = findMatchingObject(botData, incomingtext);

                    if (getForAll[0]?.templet_type === "TEXT" && !excludeNumArr.includes(msgFrom)) {
                        await sendText(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "LOCATION" && !excludeNumArr.includes(msgFrom)) {
                        await sendLocation(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "DOC" && !excludeNumArr.includes(msgFrom)) {
                        await sendDoc(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "IMAGE" && !excludeNumArr.includes(msgFrom)) {
                        await sendImage(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "VIDEO" && !excludeNumArr.includes(msgFrom)) {
                        await sendVideo(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "QUICK-REPLY" && !excludeNumArr.includes(msgFrom)) {
                        await sendQuickReply(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (getForAll[0]?.templet_type === "LIST" && !excludeNumArr.includes(msgFrom)) {
                        await sendList(user, JSON.parse(getForAll[0]?.content), msgFrom);
                    }
                    else if (resultForExactWords?.templet_type === "CONTACT" && !excludeNumArr.includes(msgFrom)) {
                        await sendContact(user, JSON.parse(resultForExactWords?.content), msgFrom);
                        isSent = true;
                    }
                    return resolve();
                }
            }
        } catch (error) {
            console.log(`error found in foundMatchAndreturnTemplet()`, error);
            reject(error);
        }
    });
}


export { sendText, foundMatchAndreturnTemplet }