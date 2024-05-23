import query from '../database/dbpromise.js'
import bcrypt from 'bcrypt'
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import randomstring from 'randomstring'
import { sendMessageMain, checkPlanExpiry, sendRecoveryEmail, sendMediaMessage } from '../functions/function.js';
import jwt from 'jsonwebtoken'
import { grabData } from '../functions/fun.js';
import moment from 'moment'
import { getSession, formatPhone, isExists } from '../middlewares/req.js'

const signup = async (req, res) => {
    try {
        const body = req.body
        const name = body.name
        const email = body.email
        const pass = body.password

        if (!name || !email || !pass) {
            return res.json({ msg: "Please send all required fields" })
        }

        // check if user already has same email
        const findEx = await query(`SELECT * FROM user WHERE email = ?`, email)
        if (findEx.length > 0) {
            return res.json({ msg: "A user already exist with this email" })
        }

        const haspass = await bcrypt.hash(pass, 10)
        const uid = randomstring.generate();

        await query(`INSERT INTO user (uid, name, email, password) VALUES (?,?,?,?)`, [
            uid, name, email, haspass
        ])

        res.json({ msg: "Signup Success", success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const login = async (req, res) => {
    try {
        const body = req.body
        const email = body.email
        const pass = body.password

        console.log(req.body)

        if (!email || !pass) {
            return res.json({ msg: "please send required fields" })
        }

        // check for user 
        const userFind = await query(`SELECT * FROM user WHERE email = ?`, [email])
        if (userFind.length < 1) {
            return res.json({ msg: "Invalid credentials" })
        }
        const compare = await bcrypt.compare(pass, userFind[0].password)
        if (!compare) {
            return res.json({ msg: "Invalid credentials" })
        } else {
            const token = sign({ uid: userFind[0].uid, role: 'user', password: userFind[0].password, email: userFind[0].email }, process.env.JWTKEY, {})
            res.json({
                success: true, token
            })
        }


    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const getUserByToken = async (req, res) => {
    try {
        const userData = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        res.json({ success: true, data: userData[0] })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const getMessageLog = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM logs WHERE uid = ?`, [req.decode.uid])

        res.json({ success: true, data })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const GenAPI = async (req, res) => {
    try {
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        const token = sign({ uid: getUser[0].uid, role: 'user' }, process.env.JWTKEY, {})

        // saving keys to user 
        await query(`UPDATE user SET api = ? WHERE uid = ?`, [token, req.decode.uid])

        res.json({ success: true, token, msg: "New keys has been generated" })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const V2SendMesg = async (req, res) => {
    try {

        if (!req.body.mobile || !req.body.text || !req.body.client_id) {
            return res.json({ msg: "Please send all required fields", success: false })
        }

        const token = req.get('Authorization')
        if (!token) {
            return res.json({ msg: "No token found", token: token, logout: true })
        }

        jwt.verify(token.split(' ')[1], process.env.JWTKEY, async (err, decode) => {
            if (err) {
                return res.json({
                    success: 0,
                    msg: "Invalid token found",
                    token,
                    logout: true
                })
            } else {
                const getUser = await query(`SELECT * FROM user WHERE uid = ? `, [
                    decode.uid
                ])

                // checking api keys 
                if (getUser[0].api !== token.split(' ')[1]) {
                    return res.json({ msg: "Your API keys are invalid", success: false })
                }

                const checkExpire = await checkPlanExpiry(decode.uid)

                if (!checkExpire) {
                    return res.json({ success: false, msg: "Your plan was expired please renew your plan" })
                }

                const doesAllow = JSON.parse(getUser[0]?.plan)?.allowapi == 1 ? true : false

                if (!doesAllow) {
                    return res.json({ success: false, msg: "Your plan does not allow to use API " })
                }

                if (getUser[0].msglimit < 1) {
                    return res.json({ success: false, msg: "You dont have credits to send message" })
                }

                if (getUser.length < 1) {
                    return res.json({
                        success: false,
                        msg: "Invalid token found",
                        token,
                        logout: true
                    })
                }
                if (getUser[0].role === 'user') {

                    const content = { text: req.body.text }
                    const resp = await sendMessageMain(req.body.client_id, req.body.mobile, content, decode.uid)
                    res.json(resp)
                } else {
                    return res.json({
                        success: 0,
                        msg: "Unauthorized token",
                        token: token,
                        logout: true
                    })
                }
            }
        })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}



const V2SendMesgUrl = async (req, res) => {
    try {

        console.log(req.query)

        if (!req.query.mobile || !req.query.client_id) {
            return res.json({ msg: "Please send all required fields", success: false })
        }


        const token = req.query.token
        if (!token) {
            return res.json({ msg: "No token found", token: token, logout: true })
        }

        jwt.verify(token, process.env.JWTKEY, async (err, decode) => {
            if (err) {
                return res.json({
                    success: 0,
                    msg: "Invalid token found",
                    token,
                    logout: true
                })
            } else {
                const getUser = await query(`SELECT * FROM user WHERE uid = ? `, [
                    decode.uid
                ])

                // checking api keys 
                if (getUser[0].api !== token) {
                    return res.json({ msg: "Your API keys are invalid", success: false })
                }

                const checkExpire = await checkPlanExpiry(decode.uid)

                if (!checkExpire) {
                    return res.json({ success: false, msg: "Your plan was expired please renew your plan" })
                }

                const doesAllow = JSON.parse(getUser[0]?.plan)?.allowapi == 1 ? true : false

                if (!doesAllow) {
                    return res.json({ success: false, msg: "Your plan does not allow to use API " })
                }

                if (getUser[0].msglimit < 1) {
                    return res.json({ success: false, msg: "You dont have credits to send message" })
                }

                if (getUser.length < 1) {
                    return res.json({
                        success: false,
                        msg: "Invalid token found",
                        token,
                        logout: true
                    })
                }
                if (getUser[0].role === 'user') {

                    if (req.query.templet) {
                        const templetMsg = await query(`SELECT * FROM templet WHERE id = ?`, [req.query.templet])
                        if (templetMsg.length < 1) {
                            return res.json({ msg: `Templet id "${req.query.templet}" not found`, success: false })
                        }
                        const contentTemp = templetMsg[0]?.content
                        console.log({ contentTemp })
                        const respp = await sendMessageMain(req.query.client_id, req.query.mobile, JSON.parse(contentTemp), decode.uid)
                        res.json(respp)
                    } else {
                        const content = { text: req.query.text || "blank message" }
                        const resp = await sendMessageMain(req.query.client_id, req.query.mobile, content, decode.uid)
                        res.json(resp)
                    }

                } else {
                    return res.json({
                        success: 0,
                        msg: "Unauthorized token",
                        token: token,
                        logout: true
                    })
                }
            }
        })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const checkWA = async (req, res) => {
    try {
        const mobile = req.query.mobile
        const token = req.query.token
        const clientID = req.query.client_id

        if (!mobile || !token || !clientID) {
            return res.json({ success: false, msg: "Please provide all required fileds: [mobile, token, client_id]" })
        }

        if (!token) {
            return res.json({ msg: "No token found", token: token, logout: true })
        }

        jwt.verify(token, process.env.JWTKEY, async (err, decode) => {
            if (err) {
                return res.json({
                    success: false,
                    msg: "Invalid token found 1",
                    token
                })
            } else {
                const getUser = await query(`SELECT * FROM user WHERE uid = ? `, [
                    decode.uid
                ])

                // checking api keys 
                if (getUser[0].api !== token) {
                    return res.json({ msg: "Your API keys are invalid 2", success: false })
                }

                const checkExpire = await checkPlanExpiry(decode.uid)

                if (!checkExpire) {
                    return res.json({ success: false, msg: "Your plan was expired please renew your plan" })
                }

                if (getUser[0].msglimit < 1) {
                    return res.json({ success: false, msg: "YOu required at least 1 message left in order to use this feature" })
                }

                if (getUser.length < 1) {
                    return res.json({
                        success: false,
                        msg: "Invalid token found 3",
                    })
                }
                if (getUser[0].role === 'user') {

                    const session = getSession(clientID)
                    const receiver = formatPhone(mobile)

                    const exists = await isExists(session, receiver)

                    if (exists) {
                        res.json({
                            success: exists,
                            msg: "This number is exists on WhatsApp"
                        })
                    } else {
                        res.json({
                            success: exists,
                            msg: "This number does not exist on WhatsApp"
                        })
                    }

                } else {
                    return res.json({
                        success: false,
                        msg: "Unauthorized token 4"
                    })
                }
            }
        })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const V2SendTemp = async (req, res) => {
    try {

        if (!req.body.mobile || !req.body.templet_id || !req.body.client_id) {
            return res.json({ msg: "Please send all required fields", success: false })
        }

        const token = req.get('Authorization')
        if (!token) {
            return res.json({ msg: "No token found", token: token, logout: true })
        }

        jwt.verify(token.split(' ')[1], process.env.JWTKEY, async (err, decode) => {
            if (err) {
                return res.json({
                    success: 0,
                    msg: "Invalid token found",
                    token,
                    logout: true
                })
            } else {
                const getUser = await query(`SELECT * FROM user WHERE uid = ? `, [
                    decode.uid
                ])

                // checking api keys 
                if (getUser[0].api !== token.split(' ')[1]) {
                    return res.json({ msg: "Your API keys are invalid", success: false })
                }


                const checkExpire = await checkPlanExpiry(decode.uid)

                if (!checkExpire) {
                    return res.json({ success: false, msg: "Your plan was expired please renew your plan" })
                }

                const doesAllow = JSON.parse(getUser[0]?.plan)?.allowapi == 1 ? true : false

                if (!doesAllow) {
                    return res.json({ success: false, msg: "Your plan does not allow to use API " })
                }

                if (getUser[0].msglimit < 1) {
                    return res.json({ success: false, msg: "You dont have credits to send message" })
                }

                if (getUser.length < 1) {
                    return res.json({
                        success: false,
                        msg: "Invalid token found",
                        token,
                        logout: true
                    })
                }
                if (getUser[0].role === 'user') {

                    // getting templet 
                    const templet = await query(`SELECT * FROM templet WHERE id = ?`, [req.body.templet_id])

                    if (templet.length < 1) {
                        return res.json({ msg: "Templet not found", success: false })
                    }

                    const content = JSON.parse(templet[0]?.content)
                    const resp = await sendMessageMain(req.body.client_id, req.body.mobile, content, decode.uid)
                    res.json(resp)
                } else {
                    return res.json({
                        success: 0,
                        msg: "Unauthorized token",
                        token: token,
                        logout: true
                    })
                }
            }
        })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const startScrap = async (req, res) => {
    try {

        function removeProtocolAndTrailingSlash(domain) {
            let cleanedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, ''); // Remove 'http://', 'https://', and 'www.'
            cleanedDomain = cleanedDomain.replace(/\/$/, ''); // Remove trailing slash

            return cleanedDomain;
        }


        let i = 1
        const campaign_id = Date.now()
        if (!req.body.name || !req.body.site || req.body.query?.length < 1 || req.body.pages < 10) {
            return res.json({ msg: "Please check your values" })
        }

        // check if user does not have extractor
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        if (getUser[0].allow_data_extract !== 1) {
            return res.json({ msg: "You are not allowed to use data extractor please upgrade your plan." })
        }

        res.json({ success: true, msg: "You scrapping was started" })

        // inserting new campaign 
        await query(`INSERT INTO scrap_campaign (uid, campaign_id, name, site, query, status) VALUES (?,?,?,?,?,?)`, [
            req.decode.uid, campaign_id, req.body.name, req.body.site, JSON.stringify(req.body.query), "started"
        ])

        function delay(ms) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, [ms])
            })
        }
        const pages = Math.round(req.body.pages / 10)

        function insertData(data) {
            console.log({ data })
            return new Promise(async (resolve) => {
                const newDta = data.map((ii) => {
                    return [campaign_id, ii.number, ii.email, ii.username, ii.name, ii.other, req.decode.uid]
                })


                await query(`INSERT INTO scrap_entries (campaign_id, mobile, email, username, name, other, uid) VALUES ?`, [
                    newDta
                ])
                resolve()
            })
        }


        function getRandomDelay() {
            const minDelay = 1000; // 1 second
            const maxDelay = 10000; // 10 seconds
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            return delay;
        }

        async function runFunction() {
            await delay(getRandomDelay())
            console.log("scrap hit for ", i)

            const data = await grabData(removeProtocolAndTrailingSlash(req.body.site), req.body.query, i, req.body.countryCode, req.body.mobileLength)

            JSON.stringify("this is data: ", data)
            if (data.success) {
                if (Array.isArray(data.data)) {
                    if (data.data.length > 0) {
                        insertData(data.data)
                    }
                }
            }


            i += 1
            if (i < pages + 1) {
                runFunction()
                return
            }
            await query(`UPDATE scrap_campaign SET status = ?`, ["finished"])
            console.log("scrapping done ", campaign_id)
        }

        runFunction()


    } catch (err) {
        console.log(err)
        // res.json({ msg: "server error", err })
    }
}


const getScrapCampaign = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM scrap_campaign WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })


    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const getScrappingData = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM scrap_entries WHERE campaign_id = ? and uid = ?`, [req.body.campaign_id, req.decode.uid])
        res.json({ data, success: true })
    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const sendNewPing = async (req, res) => {
    try {
        await query(`INSERT INTO ping (uid, user_msg) VALUES (?,?)`, [
            req.decode.uid, req.body.msg
        ])
        res.json({ msg: "New message was sent", success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const getMyPing = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM ping WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const getDash = async (req, res) => {
    try {
        const getUser = await query(`SELECT * FROM user WHERE uid =?`, [req.decode.uid])
        const plan = getUser[0].plan ? JSON.parse(getUser[0].plan).name : false
        const leftMsg = plan ? getUser[0].msglimit : 0
        const contactLimit = plan ? getUser[0].contactlimit : 0
        const templetLimit = plan ? getUser[0].templetlimit : 0
        const allowmultiInstance = plan ? getUser[0].allow_multi_instance : false
        const allowDataScrap = plan ? getUser[0].allow_data_extract : false
        const allowAPI = getUser[0].plan ? JSON.parse(getUser[0].plan).allowapi == 1 ? true : false : false

        const allowedIns = plan ? JSON.parse(getUser[0].plan).instance : 0


        // getting total templets 
        const templets = await query(`SELECT * FROM templet WHERE uid = ?`, [req.decode.uid])

        // getting total instances 
        const instances = await query(`SELECT * FROM instance WHERE uid = ?`, [req.decode.uid])

        // get all live bot 
        const bots = await query(`SELECT * FROM bots WHERE uid = ? and active = ?`, [req.decode.uid, 1])


        // get total scrappnig 
        const scrapCampaig = plan ? getUser[0].allow_data_extract : false

        // getting pending campaign 
        const pings = await query(`SELECT * FROM ping WHERE uid = ?`, [req.decode.uid])
        const pendingPing = pings?.filter(i => i.admin_reply !== null)

        // total phone books 
        const phonebook = await query(`SELECT * FROM phonebook WHERE uid = ?`, [req.decode.uid])
        // getting total contacts 
        const contacts = await query(`SELECT * FROM phonebook_contacts WHERE uid = ?`, [req.decode.uid])

        // _______________ 

        // getting 24 hours data orders 
        const twentyFourHoursAgoLogs = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const formattedDateTimeLogs = twentyFourHoursAgoLogs.toISOString().slice(0, 19).replace('T', ' ');
        const dailyDataLogs = await query(`SELECT * FROM logs WHERE createdAt >= ? and uid = ?`, [formattedDateTimeLogs, req.decode.uid])

        // one month 
        const oneMonthAgoLogs = new Date();
        oneMonthAgoLogs.setMonth(oneMonthAgoLogs.getMonth() - 1);
        const formattedDateTimeMonthlyLogs = oneMonthAgoLogs.toISOString().slice(0, 19).replace('T', ' ');
        const monthBasedOrderLogs = await query(`SELECT * FROM logs WHERE createdAt >= ? and uid = ?`, [formattedDateTimeMonthlyLogs, req.decode.uid])

        // year based 
        const oneYearAgoLogs = new Date();
        oneYearAgoLogs.setFullYear(oneYearAgoLogs.getFullYear() - 1);
        const formattedDateTimeYearLogs = oneYearAgoLogs.toISOString().slice(0, 19).replace('T', ' ');
        const yearBasedOrdersLogs = await query(`SELECT * FROM logs WHERE createdAt >= ? and uid = ?`, [formattedDateTimeYearLogs, req.decode.uid])


        // get al logs 
        const logsAll = await query(`SELECT * FROM logs WHERE uid = ?`, [req.decode.uid])



        res.json({
            success: true,
            plan, leftMsg, contactLimit, templetLimit, allowmultiInstance, allowDataScrap, allowAPI, templets: templets.length,
            instances: instances.length, scrapCampaig: scrapCampaig.length, pendingPing: pendingPing.length,
            phonebook: phonebook.length, contacts: contacts.length, dailyDataLogs: dailyDataLogs.length, monthBasedOrderLogs: monthBasedOrderLogs.length,
            yearBasedOrdersLogs: yearBasedOrdersLogs.length, allowedIns, totalSent: logsAll.length, bots: bots.length
        })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const updateUser = async (req, res) => {
    try {

        if (req.body.newpass) {
            const hash = await bcrypt.hash(req.body.newpass, 10)
            await query(`UPDATE user SET email = ?, password = ? WHERE uid = ?`, [req.body.email, hash, req.decode.uid])
            res.json({ success: true, msg: "Admin was updated refresh the page" })
        } else {
            await query(`UPDATE user SET email = ? WHERE uid = ?`, [req.body.email, req.decode.uid])
            res.json({ success: true, msg: "Profile was updated refresh the page" })
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const userRecovery = async (req, res) => {
    try {
        const checkEmailValid = await query(`SELECT * FROM user WHERE email = ?`, [req.body.recovery_email])
        if (checkEmailValid.length < 1) {
            return res.json({ success: false, msg: "We have sent a recovery link if this email is associated with user account." })
        }

        await sendRecoveryEmail(checkEmailValid[0], "user", req)

        res.json({ success: true, msg: "We have sent a recovery link if this email is associated with user account." })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const updateRecoverPass = async (req, res) => {
    try {
        if (!req.body.password) {
            return res.json({ success: false, msg: "No input provided" })
        }

        if (moment(req.decode.time).diff(moment(new Date()), 'hours') > 1) {
            return res.json({ success: false, msg: "Token expired" })
        }

        const hashpassword = await bcrypt.hash(req.body.password, 10)

        const result = await query(`UPDATE user SET password = ? WHERE email = ?`, [hashpassword, req.decode.old_email])

        res.json({ success: true, msg: "User has been updated", data: result })


    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}


const delScrapping = async (req, res) => {

    try {
        await query(`DELETE FROM scrap_campaign WHERE campaign_id = ?`, [req.body.campaign_id])
        await query(`DELETE FROM scrap_entries WHERE campaign_id = ?`, [req.body.campaign_id])

        res.json({ success: true, msg: "The campaign and data was deleted" })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const delLogs = async (req, res) => {
    try {

        await query(`DELETE FROM logs WHERE id IN (?)`, [req.body.selected])
        res.json({ success: true, msg: "Log(s) were deleted" })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const updateMetaCreds = async (req, res) => {
    try {
        const body = req.body

        if (!body.whatsapp_token || !body.phone_number_id) {
            return res.json({ msg: "Please fill all the fields", success: false })
        }

        await query(`UPDATE user SET whatsapp_token = ?, phone_number_id = ? WHERE uid = ? `, [
            body.whatsapp_token,
            body.phone_number_id,
            req.decode.uid
        ])

        res.json({ success: true, msg: "Meta settings updated" })

    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

const testWebhook = async (req, res) => {
    try {
        console.log(req.body)
        res.json({ success: true })
    } catch (err) {
        console.log(err)
        res.json({ msg: "server error", err })
    }
}

export { signup, updateMetaCreds, testWebhook, login, delLogs, checkWA, V2SendMesgUrl, delScrapping, getDash, userRecovery, updateUser, updateRecoverPass, sendNewPing, getMyPing, getScrapCampaign, getScrappingData, startScrap, getUserByToken, getMessageLog, GenAPI, V2SendMesg, V2SendTemp }
