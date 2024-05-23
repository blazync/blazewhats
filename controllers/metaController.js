import { isSessionExists, createSession, getSession, deleteSession } from '../middlewares/req.js'
import response from './../response.js'
import query from '../database/dbpromise.js'
import { fetchProfileFun } from '../functions/metaFunction.js'
import randomstring from 'randomstring'
import express from 'express'
import { Router } from 'express'
const router = Router()
import { foundMatchAndreturnTemplet } from '../functions/metaSendMessage.js'
import { getNumberByPhonebok } from '../functions/function.js'

router.use(express.urlencoded())

const fetchProfile = async (req, res) => {
    try {
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        if (!getUser[0]?.whatsapp_token || !getUser[0]?.phone_number_id) {
            return res.json({ success: false, msg: "Please fill the meta token and mobile id" })
        }
        const fetchProfile = await fetchProfileFun(getUser[0]?.phone_number_id, getUser[0]?.whatsapp_token)

        res.json(fetchProfile)
    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTemplet = async (req, res) => {
    try {

        const body = req.body
        console.log(body)
        if (!body.title || !body.content || !body.type) {
            return res.json({
                success: false, msg: "Please fill all details"
            })
        }

        await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
            req.decode.uid, body.title, JSON.stringify(body.content), body.type
        ])

        res.json({ success: true, msg: "Templet was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const getTemplet = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM meta_templet WHERE uid = ?`, [req.decode.uid])
        res.json({ success: true, data })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const delTemplet = async (req, res) => {
    try {
        await query(`DELETE FROM meta_templet WHERE id = ?`, [req.body.id])
        res.json({ success: true, msg: "Templet was deleted" })
    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

function getFileExtension(fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex !== -1 && dotIndex !== 0) {
        const extension = fileName.substring(dotIndex + 1);
        return extension.toLowerCase();
    }
    return '';
}


const addTempletMedia = async (req, res) => {
    try {
        const body = req.body
        if (req.files) {
            if (req.files.file !== undefined) {

                if (!body.title) {
                    return res.json({ success: false, msg: "Please enter the title" })
                }

                const randomString = randomstring.generate()
                const file = req.files.file

                const filename = `${randomString}.${getFileExtension(file.name)}`
                const dirName = process.cwd()
                file.mv(`${dirName}/client/public/media/${filename}`, err => {
                    if (err) {
                        console.log(err)
                        return res.json({ err })
                    }
                })

                const content = { filename, caption: body.caption === "NULL" ? null : body.caption }

                await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
                    req.decode.uid,
                    body.title,
                    JSON.stringify(content),
                    "IMAGE"
                ])

                res.json({ success: true, msg: "Your templet was addedd" })

            } else {
                return res.json({ success: false, msg: "Image not found" })
            }
        } else {
            return res.json({ success: false, msg: "Image not found." })
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTempletDoc = async (req, res) => {
    try {

        const body = req.body
        if (req.files) {
            if (req.files.file !== undefined) {

                if (!body.title) {
                    return res.json({ success: false, msg: "Please enter the title" })
                }

                const randomString = randomstring.generate()
                const file = req.files.file
                const filename = `${randomString}.${getFileExtension(file.name)}`
                const dirName = process.cwd()
                file.mv(`${dirName}/client/public/media/${filename}`, err => {
                    if (err) {
                        console.log(err)
                        return res.json({ err })
                    }
                })

                const content = { filename, caption: body.caption === "NULL" ? null : body.caption }

                await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
                    req.decode.uid,
                    body.title,
                    JSON.stringify(content),
                    "DOC"
                ])

                res.json({ success: true, msg: "Your templet was addedd" })

            } else {
                return res.json({ success: false, msg: "Doc file not found" })
            }
        } else {
            return res.json({ success: false, msg: "Doc file not found." })
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTempletVideo = async (req, res) => {
    try {

        if (!req.files || !req.files.file) {
            return res.json({ success: false, msg: "Video file not found" });
        }

        const body = req.body;

        if (!body.title) {
            return res.json({ success: false, msg: "Please enter the title" });
        }

        const randomString = randomstring.generate();
        const file = req.files.file;
        const filename = `${randomString}.${getFileExtension(file.name)}`;
        const dirName = process.cwd();

        file.mv(`${dirName}/client/public/media/${filename}`, async (err) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, err });
            }

            const content = { filename, caption: body.caption === "NULL" ? null : body.caption };

            // Insert data into the database
            await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
                req.decode.uid,
                body.title,
                JSON.stringify(content),
                "VIDEO"
            ]);

            res.json({ success: true, msg: "Your templet was added" });
        });
    } catch (err) {
        console.error(err);
        res.json({ msg: 'server error', err });
    }
};


const addTempletQuickReply = async (req, res) => {
    try {
        const body = req.body

        if (!body.title || !body.bodyText || !body.buttons?.length > 0) {
            return res.json({ success: false, msg: "Please fill the all details" })
        }

        const content = {
            bodyText: body.bodyText,
            buttons: body.buttons
        }

        await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
            req.decode.uid,
            body.title,
            JSON.stringify(content),
            "QUICK-REPLY"
        ])

        res.json({ success: true, msg: "Your templet was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTempletList = async (req, res) => {
    try {
        const body = req.body

        if (!body.title || !body.listHeader || !body.listFooter || !body.body || !body.listOpenBtnText || !body.sections > 0) {
            return res.json({ success: false, msg: "Please fill the details completly" })
        }

        const content = {
            body: body.body,
            header: body.listHeader,
            footer: body.listFooter,
            action: {
                button: body.listOpenBtnText,
                sections: body.sections
            }
        }

        await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
            req.decode.uid,
            body.title,
            JSON.stringify(content),
            "LIST"
        ])

        res.json({ success: true, msg: "Your templet was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTempletLocation = async (req, res) => {
    try {
        const body = req.body
        if (!body.title || !body.locTitle || !body.locDes || !body.latitude || !body.longitude) {
            return res.json({ success: false, msg: "Please fill the details" })
        }

        const content = {
            latitude: body.latitude,
            longitude: body.longitude,
            name: body.locTitle,
            address: body.locDes
        }

        await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
            req.decode.uid,
            body.title,
            JSON.stringify(content),
            "LOCATION"
        ])

        res.json({ success: true, msg: "Your templet was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addTempletCOntact = async (req, res) => {
    try {
        const body = req.body
        if (!body.title || !body.phoneNumber || !body.fName || !body.formatedName) {
            return res.json({ success: false, msg: "Please fill the details" })
        }

        const content = {
            addresses: [
                {
                    street: body.street ?? "",
                    city: body.city ?? "",
                    state: body.state ?? "",
                    zip: body.zip ?? "",
                    country: body.country ?? "",
                    country_code: body.country_code ?? "",
                    type: body.addressType ?? "",
                },
            ],
            birthday: body.birthday ?? "",
            emails: [
                {
                    email: body.email ?? "",
                    type: body.emailType ?? "",
                },
            ],
            name: {
                formatted_name: body.formatedName ?? "",
                first_name: body.fName ?? "",
                last_name: body.lName ?? "",
                middle_name: "",
                suffix: "",
                prefix: "",
            },
            org: {
                company: body.company ?? "",
                department: body.department ?? "",
                title: body.companyTitle ?? "",
            },
            phones: [
                {
                    phone: body.phoneNumber ?? "",
                    wa_id: (body.phoneNumber ?? "").toString().replace("+", "") || "",
                    type: body.phoneNumberType ?? "",
                },
            ],
            urls: [
                {
                    url: body.linkOptional ?? "",
                    type: body.linkTitle ?? "",
                },
            ],
        };

        await query(`INSERT INTO meta_templet (uid, title, content, type) VALUES (?,?,?,?)`, [
            req.decode.uid,
            body.title,
            JSON.stringify(content),
            "CONTACT"
        ])

        res.json({ success: true, msg: "Your templet was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const addChatbot = async (req, res) => {
    try {
        const body = req.body
        if (!body.reply_type || !body.templet_type || !body.keyword || !body.content) {
            return res.json({ success: false, msg: "Please fill the details" })
        }
        let content

        if (body.reply_choice === "write-text") {
            content = JSON.stringify(body.content)
        } else {
            content = body.content
        }

        await query(`INSERT INTO meta_bots (uid, active, reply_type, templet_type, keyword, content, comment, excluding_phonebook)
        VALUES (?,?,?,?,?,?,?,?)`, [
            req.decode.uid, 1, body.reply_type, body.templet_type, body.keyword, content, "ADDED", body.phonebook || null
        ])
        res.json({ success: true, msg: "New bot was added" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const getChatbot = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM meta_bots WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const switchChatbot = async (req, res) => {
    try {
        await query(`UPDATE meta_bots SET active = ? WHERE id = ?`, [req.body.status ? 1 : 0, req.body.id])
        res.json({ success: true, msg: "Success" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const delChatBot = async (req, res) => {
    try {
        await query(`DELETE FROM meta_bots WHERE id = ?`, [req.body.id])
        res.json({ success: true, msg: "Bot was deleted" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}


const metaWebhook = async (req, res) => {
    const queryParan = req.query
    const body = req.body
    console.log({ query: JSON.stringify(queryParan) })
    console.log({ body: JSON.stringify(body) })

    try {
        let verify_token = ""
        const dynamicValue = req.params.uid;
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [dynamicValue])
        if (getUser.length < 1) {
            verify_token = "NULL"
            res.json({ success: false, msg: "Token not verified", dynamicValue })

        } else {
            verify_token = dynamicValue

            console.log({ reqQuery: req.query })

            let mode = req.query["hub.mode"];
            let token = req.query["hub.verify_token"];
            let challenge = req.query["hub.challenge"];

            // Check if a token and mode were sent
            if (mode && token) {
                // Check the mode and token sent are correct
                if (mode === "subscribe" && token === verify_token) {
                    // Respond with 200 OK and challenge token from the request
                    console.log("WEBHOOK_VERIFIED");
                    res.status(200).send(challenge);
                } else {
                    // Responds with '403 Forbidden' if verify tokens do not match
                    res.sendStatus(403);
                }
            } else {
                res.json({ success: false, msg: "Token not verified", dynamicValue, token: "FOUND" })
            }

        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const metaWebHookIncoming = async (req, res) => {
    try {

        const body = req.body
        const userUID = req.params.uid;

        // check if user has plan
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [userUID])
        const userPlan = getUser[0]?.plan

        if (!userPlan) {
            return res.sendStatus(200);
        }

        // check is plan allowed the bot 
        const checkBot = JSON.parse(userPlan)?.allow_official_wa_bot === 1 ? true : false
        if (!checkBot) {
            return res.sendStatus(200);
        }

        let incomingtext = null

        if (body?.entry[0]?.changes[0]?.value?.messages[0]?.text?.body) {
            incomingtext = body?.entry[0]?.changes[0]?.value?.messages[0]?.text?.body
        } else if (body?.entry[0]?.changes[0]?.value?.messages[0]?.interactive?.button_reply?.title) {
            incomingtext = body?.entry[0]?.changes[0]?.value?.messages[0]?.interactive?.button_reply?.title
        } else if (body?.entry[0]?.changes[0]?.value?.messages[0]?.interactive?.list_reply?.title) {
            incomingtext = body?.entry[0]?.changes[0]?.value?.messages[0]?.interactive?.list_reply?.title
        }

        const incomingImg = body?.entry[0]?.changes[0]?.value?.messages[0]?.type === "image" ? true : false
        const msgFrom = body?.entry[0]?.changes[0]?.value?.messages[0]?.from

        console.log({
            incomingtext,
            incomingImg
        })

        if (incomingtext || incomingImg) {

            await foundMatchAndreturnTemplet(incomingtext, userUID, getUser[0], msgFrom)
            return res.sendStatus(200);
        } else {
            res.sendStatus(200);
            console.log("not messages found to send")
            return
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

export { fetchProfile, delChatBot, addTempletCOntact, metaWebHookIncoming, metaWebhook, switchChatbot, getChatbot, addChatbot, addTempletLocation, addTempletList, addTempletDoc, addTempletQuickReply, addTempletVideo, addTempletMedia, addTemplet, getTemplet, delTemplet }
