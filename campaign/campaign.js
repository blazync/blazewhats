import { Router } from 'express'
import userValidator from './../middlewares/userValidator.js'
import { checkLeftMessage, checkPlanExpiry } from '../middlewares/userPlanValidator.js'
import randomString from 'randomstring'
import query from '../database/dbpromise.js'

const router = Router()

router.get("/add_campaign", (req, res) => {
    res.json("add_campaign")
})

router.post('/add_campaign', userValidator, checkPlanExpiry, checkLeftMessage, async (req, res) => {
    try {

        const { templetID, phoneBookName, client_id, campaignName, schedule, timezone, scheduleTimestamp } = req.body

        const checkTemp = req.body.sending_type == 'manual' ? true : templetID ? true : false

        if (!checkTemp || !phoneBookName || !timezone || !campaignName) {
            return res.json({ success: false, msg: "Please fill required details" })
        }

        if (client_id.length < 1) {
            return res.json({ msg: "Please select at least 1 instance" })
        }

        const campaign_id = randomString.generate()

        const getPhoneBookNumbers = await query(`SELECT * FROM phonebook_contacts WHERE phonebook_name = ? AND uid = ?`, [phoneBookName, req.decode.uid])

        if (getPhoneBookNumbers.length < 1) {
            return res.json({ success: false, msg: "The phonebook you selected does not have any mobile number in it" })
        }

        // get templet using id 
        const getTemplet = await query(`SELECT * FROM templet WHERE uid = ? AND id = ?`, [req.decode.uid, templetID])

        const content = req.body.sending_type == 'manual' ? { text: req.body.typedMsg } : JSON.parse(getTemplet[0]?.content)

        if (getTemplet.length < 1 && req.body.sending_type !== 'manual') {
            return res.json({ success: false, msg: "There is no templet found" })
        }

        const logs = getPhoneBookNumbers.map((i) => [
            req.decode.uid,
            campaign_id,
            JSON.stringify(content),
            "QUEUE",
            JSON.stringify(i),
            i?.mobile,
        ]);

        await query(`
            INSERT INTO bulk_campaign_log (
                uid,
                campaign_id,
                content,
                status,
                phonebook_json,
                mobile
            ) VALUES ?`, [logs]);

        const scheduleDate = scheduleTimestamp ? new Date(scheduleTimestamp) : null;


        await query(`INSERT INTO bulk_campaign (campaign_id, uid, title, templet_id, templet_content, phonebook_name, instance, schedule, timezone, status) VALUES (
            ?,?,?,?,?,?,?,?,?,?
        )`, [
            campaign_id,
            req.decode.uid,
            campaignName,
            templetID,
            JSON.stringify(getTemplet[0]),
            phoneBookName,
            JSON.stringify(client_id),
            scheduleDate,
            timezone,
            "QUEUE"
        ])

        res.json({ success: true, msg: "Your campaign has been started sending" })

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "something went wrong", success: false })
    }
})


// get all campaign 
router.get('/get_mine', userValidator, async (req, res) => {
    try {
        const data = await query(`SELECT * FROM bulk_campaign WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "something went wrong", success: false })
    }
})

function separateStatusArrays(array) {
    // Filter the array into two separate arrays based on the 'status' property
    const successArray = array.filter(obj => obj.status === 'SUCCESS');
    const otherArray = array.filter(obj => obj.status !== 'SUCCESS');

    return { successArray, otherArray };
}

// get logs by campaign 
router.post('/get_logs', userValidator, async (req, res) => {
    try {
        const { campaign_id } = req.body
        const data = await query(`SELECT * FROM bulk_campaign_log WHERE campaign_id = ?`, [campaign_id])

        const { successArray, otherArray } = separateStatusArrays(data);

        res.json({ data, success: true, successArray: successArray.length, otherArray: otherArray.length })

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "something went wrong", success: false })
    }
})

// update campaign 
router.post('/change_status', userValidator, async (req, res) => {
    try {
        const { campaign_id, status } = req.body

        await query(`UPDATE bulk_campaign SET status = ? WHERE campaign_id = ?`, [status, campaign_id])
        res.json({ success: true, msg: "Updated" })

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "something went wrong", success: false })
    }
})

// del campaign 
router.post('/del_campaign', userValidator, async (req, res) => {
    try {
        const { campaign_id } = req.body

        await query(`DELETE FROM bulk_campaign WHERE campaign_id = ? AND uid = ?`, [campaign_id, req.decode.uid])
        await query(`DELETE FROM bulk_campaign_log WHERE campaign_id = ? AND uid = ?`, [campaign_id, req.decode.uid])

        res.json({ success: true, msg: "Campaigns and logs deleted" })
    } catch (err) {
        console.log(err)
        res.json({ err, msg: "something went wrong", success: false })
    }
})

export default router
