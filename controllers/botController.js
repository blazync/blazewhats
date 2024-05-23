import query from '../database/dbpromise.js'
import bcrypt from 'bcrypt'
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import { findIfUserHaveBotAllowed, decodeObject, checkPlanExpiry, getNumberByPhonebok, addMessageLog, sendMessageMain, checkForKeyword, getValueBeforeAtSymbol, checkLeftMessage } from '../functions/function.js'

function sentencesHaveMatchingWords(sentence1, sentence2) {
    // Convert sentences to lowercase and split into arrays of words
    const words1 = sentence1.toLowerCase().split(' ');
    const words2 = sentence2.toLowerCase().split(' ');

    // Check if there's any common word
    const commonWords = words1.filter(word => words2.includes(word));

    // Return true if there's at least one common word, otherwise false
    return commonWords.length > 0;
}

const webhook = async (m, wa, sessionId) => {
    function endsWithGus(str) {
        const target = "@g.us";
        return str.toLowerCase().endsWith(target);
    }

    return new Promise(async (resolve, reject) => {

        if (endsWithGus(m?.messages[0]?.key?.remoteJid)) {
            resolve()
            return
        }

        try {

            const { uid, client_id } = decodeObject(sessionId)

            const checkPlan = await checkPlanExpiry(uid)

            if (!checkPlan.success) {
                // add a function that delete all insatcnes 
                await query(`UPDATE bots SET active = ?, comment = ? WHERE uid = ?`, [0, "Bot not allowed", uid])
                resolve()
                return
            }

            const checkBotAllowed = await findIfUserHaveBotAllowed(uid)

            if (!checkBotAllowed) {
                await query(`UPDATE bots SET active = ?, comment = ? WHERE uid = ?`, [0, "Bot not allowed", uid])
                resolve()
                return
            }

            const checkMsg = await checkLeftMessage(uid)

            if (!checkMsg.success) {
                await query(`UPDATE bots SET active = ?, comment = ? WHERE uid = ?`, [0, "Messages limit exceed", uid])
                resolve()
                return
            }

            function checkMobileExistence(mobileNumber, dataArray) {
                return dataArray.some(obj => obj.mobile === mobileNumber);
            }


            console.log({ uid, sessionId })

            // getting all active bots of user 
            const allBots = await query(`
            SELECT * 
            FROM bots 
            WHERE uid = ? AND active = ? AND (client_id = ? OR select_all = ?)
          `, [uid, 1, sessionId, 1]);

            allBots.map(async (i) => {
                if (i.reply_type === 'exact-words' && m.type === 'notify') {
                    const mobile = getValueBeforeAtSymbol(m.messages[0]?.key?.remoteJid)

                    if (i.excluding_phonebook) {
                        const excludingNum = await getNumberByPhonebok(i.excluding_phonebook)
                        // console.log(excludingNum)
                        if (checkMobileExistence(mobile, excludingNum)) {
                            resolve()
                            return
                        }
                    }

                    if (i.reply_type === "exact-words") {

                    }

                    if (i.keyword?.toLowerCase() === m.messages[0]?.message?.conversation?.toLowerCase() ||
                        i.keyword?.toLowerCase() == m.messages[0]?.message?.extendedTextMessage?.text?.toLowerCase() ||
                        i.keyword?.toLowerCase() == m.messages[0]?.message?.listResponseMessage?.title?.toLowerCase() ||
                        i.keyword?.toLowerCase() == m.messages[0]?.message?.buttonsResponseMessage?.selectedDisplayText.toLowerCase()) {


                        // add reaction function here 
                        if (i.reaction) {
                            const reactionMessage = {
                                react: {
                                    text: i.reaction,
                                    key: m.messages[0].key
                                }
                            }
                            await sendMessageMain(sessionId, mobile, reactionMessage, uid)
                        }

                        if (i.enable_typing == 1) {
                            // wa.sendPresenceUpdate('available', m.messages[0].key.remoteJid)
                            wa.sendPresenceUpdate('composing', m.messages[0].key.remoteJid)

                            setTimeout(() => {
                                wa.sendPresenceUpdate('paused', m.messages[0].key.remoteJid)
                                // wa.sendPresenceUpdate('unavailable', m.messages[0].key.remoteJid)
                            }, 1000);
                        }
                        await addMessageLog(uid, mobile, JSON.parse(i.content), "bot", "chatbot")
                        await wa.readMessages([m.messages[0].key])
                        await sendMessageMain(sessionId, mobile, JSON.parse(i.content), uid)
                    }
                } else {

                    const mobile = getValueBeforeAtSymbol(m.messages[0]?.key?.remoteJid)

                    if (i.excluding_phonebook) {
                        const excludingNum = await getNumberByPhonebok(i.excluding_phonebook)
                        // console.log(excludingNum)
                        if (checkMobileExistence(mobile, excludingNum)) {
                            resolve()
                            return
                        }
                    }


                    if (i.reply_type === "exact-words") {
                        if (checkForKeyword(m.messages[0]?.message?.conversation, i.keyword) ||
                            checkForKeyword(m.messages[0]?.message?.extendedTextMessage?.text, i.keyword) ||
                            checkForKeyword(m.messages[0]?.message?.listResponseMessage?.title, i.keyword) ||
                            checkForKeyword(m.messages[0]?.message?.buttonsResponseMessage?.selectedDisplayText, i.keyword
                            )) {

                            // add reaction function here   
                            if (i.reaction) {
                                const reactionMessage = {
                                    react: {
                                        text: i.reaction,
                                        key: m.messages[0].key
                                    }
                                }
                                await sendMessageMain(sessionId, mobile, reactionMessage, uid)
                            }


                            if (i.enable_typing == 1) {
                                wa.sendPresenceUpdate('composing', m.messages[0].key.remoteJid)

                                setTimeout(() => {
                                    wa.sendPresenceUpdate('paused', m.messages[0].key.remoteJid)
                                }, 1000);
                            }
                            await addMessageLog(uid, mobile, JSON.parse(i.content), "bot", "chatbot")
                            await wa.readMessages([m.messages[0].key])
                            await sendMessageMain(sessionId, mobile, JSON.parse(i.content), uid)
                        }
                    } else {
                        if (sentencesHaveMatchingWords(m.messages[0]?.message?.conversation, i.keyword) ||
                            sentencesHaveMatchingWords(m.messages[0]?.message?.extendedTextMessage?.text, i.keyword) ||
                            sentencesHaveMatchingWords(m.messages[0]?.message?.listResponseMessage?.title, i.keyword) ||
                            sentencesHaveMatchingWords(m.messages[0]?.message?.buttonsResponseMessage?.selectedDisplayText, i.keyword
                            )) {

                            // add reaction function here   
                            if (i.reaction) {
                                const reactionMessage = {
                                    react: {
                                        text: i.reaction,
                                        key: m.messages[0].key
                                    }
                                }
                                await sendMessageMain(sessionId, mobile, reactionMessage, uid)
                            }


                            if (i.enable_typing == 1) {
                                wa.sendPresenceUpdate('composing', m.messages[0].key.remoteJid)

                                setTimeout(() => {
                                    wa.sendPresenceUpdate('paused', m.messages[0].key.remoteJid)
                                }, 1000);
                            }
                            await addMessageLog(uid, mobile, JSON.parse(i.content), "bot", "chatbot")
                            await wa.readMessages([m.messages[0].key])
                            await sendMessageMain(sessionId, mobile, JSON.parse(i.content), uid)
                        }
                    }

                }
            })

            resolve()

        } catch (error) {
            console.log(error)
        }
    })

}

const addBot = async (req, res) => {
    try {

        const check = await findIfUserHaveBotAllowed(req.decode.uid)
        if (!check) {
            return res.json({ msg: "Your plan does not allowed to add bot" })
        }
        await query(`INSERT INTO bots (uid, client_id, reply_type, reply_choice, keyword, content, enable_typing,reaction, comment, excluding_phonebook, select_all) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
            req.decode.uid, req.body.client_id, req.body.reply_type, req.body.reply_choice, req.body.keyword, JSON.stringify(req.body.content),
            req.body.enable_typing ? 1 : 0, req.body.reaction, req.body.comment, req.body.phonebook, req.body.select_all ? 1 : 0
        ])
        res.json({ success: true, msg: "Bot was addedd" })

    } catch (err) {
        res.json({ success: false, msg: "server error", err })
        console.log(err)
    }
}


const updateBot = async (req, res) => {
    try {

        const check = await findIfUserHaveBotAllowed(req.decode.uid)
        if (!check) {
            return res.json({ msg: "Your plan does not allowed to add bot" })
        }
        await query(
            `UPDATE bots SET 
              client_id = ?, 
              reply_type = ?, 
              reply_choice = ?, 
              keyword = ?, 
              content = ?, 
              enable_typing = ?, 
              reaction = ?, 
              comment = ?, 
              excluding_phonebook = ?
            WHERE uid = ? and id = ?`,
            [
                req.body.client_id,
                req.body.reply_type,
                req.body.reply_choice,
                req.body.keyword,
                JSON.stringify(req.body.content),
                req.body.enable_typing ? 1 : 0,
                req.body.reaction,
                req.body.comment,
                req.body.phonebook,
                req.decode.uid,
                req.body.id
            ]
        );


        // await query(`INSERT INTO bots (uid, client_id, reply_type, reply_choice, keyword, content, enable_typing,reaction, comment, excluding_phonebook) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
        //     req.decode.uid, req.body.client_id, req.body.reply_type, req.body.reply_choice, req.body.keyword, JSON.stringify(req.body.content),
        //     req.body.enable_typing ? 1 : 0, req.body.reaction, req.body.comment, req.body.phonebook
        // ])
        res.json({ success: true, msg: "Bot was addedd" })

    } catch (err) {
        res.json({ success: false, msg: "server error", err })
        console.log(err)
    }
}

const getAllBot = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM bots WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        res.json({ success: false, msg: "server error", err })
        console.log(err)
    }
}


const botOffOn = async (req, res) => {
    try {

        await query(`UPDATE bots SET active = ? WHERE id = ?`, [req.body.status ? 1 : 0, req.body.id])
        res.json({
            success: true,
            msg: req.body.status ? "Bot was on" : "Bot was off"
        })

    } catch (err) {
        res.json({ success: false, msg: "server error", err })
        console.log(err)
    }
}

const delBot = async (req, res) => {
    try {
        await query(`DELETE FROM bots WHERE id = ?`, [req.body.id])
        res.json({ success: true, msg: "The bot was deleted" })

    } catch (err) {
        res.json({ success: false, msg: "server error", err })
        console.log(err)
    }
}

export { webhook, addBot, updateBot, getAllBot, botOffOn, delBot }
