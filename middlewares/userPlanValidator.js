import query from '../database/dbpromise.js'
import { daysDiff } from '../functions/function.js'

const addInstance = async (req, res, next) => {
    try {
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        const plan = getUser[0].plan
        if (!plan) {
            return res.json({ msg: "you dont have a plan please buy one" })
        }

        const daysLeft = daysDiff(getUser[0].planexpire)
        if (daysLeft < 1) {
            return res.json({ msg: "Your plan has been expired please renew." })
        }

        // getting users instance 
        const addedIns = await query(`SELECT * FROM instance WHERE uid = ?`, [req.decode.uid])
        const instances = parseInt(JSON.parse(plan).instance)
        if (!instances) {
            res.json({ msg: `Your allowed instances are ${instances} you can not added more.` })
        } else {
            if (addedIns.length < instances) {
                next()
                return
            } else {
                res.json({ msg: `Your allowed instances are ${instances} you can not added more. ${addedIns.length}` })
            }
        }

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}

const checkLeftMessage = async (req, res, next) => {
    try {
        const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        const plan = JSON.parse(getUser[0].plan)
        if (!plan) {
            return res.json({ msg: "You dont have a plan please get one" })
        }
        const messages = getUser[0].msglimit
        if (parseInt(messages) < 1) {
            return res.json({ msg: "You dont have messages left in your account please renew" })
        }
        req.messageLeft = parseInt(messages)
        next()
    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}

const checkPlanExpiry = async (req, res, next) => {
    const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
    const plan = getUser[0].plan
    if (!plan) {
        return res.json({ msg: "you dont have a plan please buy one" })
    }

    const daysLeft = daysDiff(getUser[0].planexpire)
    if (daysLeft < 1) {
        return res.json({ msg: "Your plan has been expired please renew." })
    }
    req.planExpire = daysLeft
    next()
}

const checkIfWebhookAllowed = async (req, res, next) => {
    const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
    const plan = getUser[0].plan

    if (!plan) {
        return res.json({ msg: "you dont have a plan please buy one" })
    }

    const isAllowed = JSON.parse(getUser[0].plan).allow_webhook === 1 ? true : false

    if (!isAllowed) {
        return res.json({ success: false, msg: "Your plan does not allow you to use webhook" })
    }

    next()

}

export { addInstance, checkLeftMessage, checkPlanExpiry, checkIfWebhookAllowed }