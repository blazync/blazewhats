import { isSessionExists, createSession, getSession, deleteSession } from '../middlewares/req.js'
import response from './../response.js'
import query from '../database/dbpromise.js'

const getByuser = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM campaign WHERE uid = ?`, [req.decode.uid])
        res.json({ success: true, data })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const getLogsByCampaignID = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM logs WHERE campaign_id = ?`, [req.body.campaign_id])
        res.json({ data, success: true })
    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const delCampaign = async (req, res) => {
    try {
        await query(`DELETE FROM campaign WHERE id = ?`, [req.body.id])
        res.json({ msg: "campaign was deleted", success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

export { getByuser, getLogsByCampaignID, delCampaign }
