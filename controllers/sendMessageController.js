import { sendMessageMain, saveAsTemplet, addMessageLog, sendMediaMessage, checkLeftMessage, runCampaign } from '../functions/function.js'
import query from '../database/dbpromise.js'
import moment from 'moment'
import { getSession, formatPhone, sendMessage, isExists, getGroupData } from '../middlewares/req.js'

const sendMessageFunction = async (req, res) => {
    try {

        if (!req.body.content || !req.body.mobile || !req.body.client_id) {
            return res.json({ msg: "pelase send all required fields" })
        }

        if (req.body.saveAsTemplet && !req.body.fromTemplet) {
            await saveAsTemplet(req.decode.uid, req.body.name || "NA", req.body.content, req.body.type || "NA")
            if (req.body.onlySave) {
                return res.json({ msg: "The templet was saved", success: true })
            }
        }
        // adding log 
        await addMessageLog(req.decode.uid, req.body.mobile, req.body.content, req.body.type || "NA", "single")

        console.log(req.body.client_id, req.body.mobile, req.body.content, req.decode.uid)
        // sending message 
        const sendRes = await sendMessageMain(req.body.client_id, req.body.mobile, req.body.content, req.decode.uid)

        res.json({ msg: sendRes.message, success: sendRes.success, err: sendRes?.err })

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const sendMessageWithMedia = async (req, res) => {
    try {
        console.log(req.body)
        if (!req.body.mobile || !req.body.client_id) {
            return res.json({ msg: "Please send required fields" })
        }

        if (req.body.fromTemplet === "false") {
            if (!req.files.file) {
                return res.json({ msg: "Please send file" })
            }
        }

        let filename = ""

        if (req.body.fromTemplet === "true") {
            filename = req.body.filename
        } else {
            if (req.files) {
                if (req.files.file !== undefined) {
                    const file = req.files.file
                    filename = ("" + Math.random()).substring(2, 7) + Date.now() + file.name
                    const currentDir = process.cwd();

                    file.mv(`${currentDir}/client/public/media/${filename}`, err => {
                        if (err) {
                            console.log(err)
                            return res.json({ err })
                        }
                    })
                } else {
                    return res.json({ msg: "Please send file" })
                }
            }
        }

        const respp = await sendMediaMessage(req.body.client_id, req.body.mobile, filename, req.body.message == 'null' ? req.body.caption : req.body.message, req.decode.uid, req.body.type, req)

        res.json({ msg: respp.msg, success: true })


    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const sendBulkTask = async (req, res) => {
    try {
        function delayUntil(timestamp) {
            return new Promise((resolve) => {
                const targetTime = new Date(timestamp).getTime();
                const currentTime = Date.now();
                const delay = Math.max(targetTime - currentTime, 0);
                setTimeout(resolve, delay);
            });
        }

        const campaign_id = Date.now()


        if (req.body.sending_type === 'manual') {
            req.body.templetID = "manual message"
        }


        if (!req.body.campaignName || !req.body.templetID || !req.body.phoneBookName || req.body.client_id.length < 1) {
            return res.json({ msg: "please send all required fields" })
        }

        if (req.body.client_id?.length > 1) {
            // checking if multi instance allowed 
            const getUser = await query(`SELECT * FROM user WHERE uid = ?`, req.decode.uid)

            if (getUser[0].allow_multi_instance !== 1) {
                return res.json({ msg: "Your plan does not allow yout to use multi instance please use one instance" })
            }
        }

        // getting phone book 
        const phoneNumbers = await query(`SELECT * FROM phonebook_contacts WHERE phonebook_name = ? and uid = ? `, [req.body.phoneBookName, req.decode.uid])
        const leftMsg = await checkLeftMessage(req.decode.uid)


        const templetData = await query(`SELECT * FROM templet WHERE id = ?`, [req.body.templetID])


        if (leftMsg.msgLeft < phoneNumbers.length) {
            return res.json({ msg: `You have ${leftMsg.msgLeft} left in your account and your templet has ${phoneNumbers.length} please upgrade or reduce numbers` })
        }

        if (!req.body.schedule) {
            const datanew = new Date()
            req.body.scheduleTimestamp = datanew
        }

        console.log(req.body.scheduleTimestamp)


        await query(`INSERT INTO campaign (uid, campaign_id, name, templet_id, phonebook_name, status ) VALUES (?,?,?,?,?,?) `, [
            req.decode.uid, campaign_id, req.body.campaignName, req.body.templetID, req.body.phoneBookName, `scheduled for ${moment(req.body.scheduleTimestamp).format("DD/MM/YY hh:mm")}`
        ])

        const content = req.body.sending_type == 'manual' ? { text: req.body.typedMsg } : JSON.parse(templetData[0]?.content)


        res.json({ msg: "Your campaign was scheduled", success: true })

        console.log(`${req.body.schedule} and ${req.body.scheduleTimestamp}`)

        await delayUntil(req.body.schedule ? req.body.scheduleTimestamp : 0)

        console.log("hit the campaign")

        const client_id = req.body.client_id?.map((i) => i.client_id)

        const status = await runCampaign(req.decode.uid, content, phoneNumbers, client_id, req, campaign_id)

        // updaing campaign 
        await query(`UPDATE campaign SET status = ? WHERE campaign_id = ? `, [status.msg, campaign_id])


    } catch (err) {
        console.log(err)
        // res.json({ err, msg: "server error" })
    }
}


const sendToGroup = async (req, res) => {
    try {

        function hasTagAll(sentence) {
            const tagAllRegex = /@tagall/i;
            return tagAllRegex.test(sentence);
        }

        if (req.body.type == 'type') {

            if (hasTagAll(req.body.typedMsg)) {
                // gettings group data 
                let participants = []
                const session = getSession(req.body.client_id)

                let message = req.body.typedMsg + "\n\n" || "";
                const groups = await getGroupData(session, req.body.groupData?.id)
                participants = groups?.participants
                participants.forEach((participant) => {
                    message += "@" + participant.id.split("@")[0] + " "
                });

                let jids = [];
                for (let member of groups?.participants) {
                    jids.push(member.id);
                }

                await sendMessage(session, req.body.groupData?.id, {
                    text: message.replace("@tagall", ""),
                    mentions: jids
                })

                // adding log 
                await addMessageLog(req.decode.uid, req.body.groupData?.name || "NA", {
                    text: message
                }, req.body.type || "NA", "group")

                const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
                const userMsg = parseInt(user[0].msglimit)
                const leftMessage = userMsg - 1
                await query(`UPDATE user SET msglimit = ? WHERE uid = ?`, [leftMessage, req.decode.uid])
                res.json({ success: true, msg: "Message was sent" })
            } else {

                const session = getSession(req.body.client_id)

                await sendMessage(session, req.body.groupData?.id, {
                    text: req.body.typedMsg,
                })
                // adding log 
                await addMessageLog(req.decode.uid, req.body.groupData?.name, {
                    text: req.body.typedMsg,
                }, req.body.type || "NA", "group")

                const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
                const userMsg = parseInt(user[0].msglimit)
                const leftMessage = userMsg - 1
                await query(`UPDATE user SET msglimit = ? WHERE uid = ?`, [leftMessage, req.decode.uid])
                res.json({ success: true, msg: "Message was sent" })
            }

        } else {

            const session = getSession(req.body.client_id)
            await sendMessage(session, req.body.groupData?.id, req.body.selectedTemplet)

            // adding log 
            await addMessageLog(req.decode.uid, req.body.groupData?.name, req.body.selectedTemplet, req.body.type || "NA", "group")

            const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
            const userMsg = parseInt(user[0].msglimit)
            const leftMessage = userMsg - 1
            await query(`UPDATE user SET msglimit = ? WHERE uid = ?`, [leftMessage, req.decode.uid])

            res.json({ success: true, msg: "Message was sent" })
        }


    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}


const getGroupsData = async (req, res) => {
    try {
        if (!req.body.client_id) {
            return res.json({
                msg: "No client ID found"
            })
        }
        const session = getSession(req.body.client_id)
        const groups = await getGroupData(session, req.body.jid)

        res.json({ data: groups, success: true })


    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}


export { sendMessageFunction, sendMessageWithMedia, sendBulkTask, sendToGroup, getGroupsData }
