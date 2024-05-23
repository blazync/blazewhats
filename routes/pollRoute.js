import { Router } from 'express'
import userValidator from './../middlewares/userValidator.js'
import query from '../database/dbpromise.js'

const router = Router()


router.get('/', userValidator, async (req, res) => {
    try {

    } catch (err) {
        res.json({ msg: "server error", err })
        console.log(JSON.stringify(err))
    }
})


// get polls by uid 
router.get('/get_my_poll', userValidator, async (req, res) => {
    try {
        const data = await query(`SELECT * FROM polls WHERE uid = ?`, [req.decode.uid])
        res.json({ data })
    } catch (err) {
        res.json({ msg: "server error", err })
        console.log(JSON.stringify(err))
    }
})


// switch poll status 
router.post('/switch_poll_status', userValidator, async (req, res) => {
    try {
        await query(`UPDATE user SET poll_status = ? WHERE uid = ?`, [req.body.isActive ? 1 : 0, req.decode.uid])
        res.json({ success: true, msg: `Poll was turned ${req.body.isActive ? 'On' : 'Off'}` })
    } catch (err) {
        res.json({ msg: "server error", err })
        console.log(JSON.stringify(err))
    }
})

// del a poll 
router.post('/del_poll', userValidator, async (req, res) => {
    try {
        await query(`DELETE FROM polls WHERE id = ? and uid = ?`, [req.body.id, req.decode.uid])
        res.json({ success: true, msg: "Poll was deleted" })
    } catch (err) {
        res.json({ msg: "server error", err })
        console.log(JSON.stringify(err))
    }
})

export default router
