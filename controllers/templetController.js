import con from '../database/config.js'
import query from '../database/dbpromise.js'
// import { } from '../functions/function.js'


const getTemplet = async (req, res) => {
    try {

        if (req.body.type === 'all') {
            const data = await query(`SELECT * FROM templet WHERE uid = ?`, [req.decode.uid])
            res.json({ data, success: true })
            return
        }

        const data = await query(`SELECT * FROM templet WHERE uid = ? and type = ?`, [req.decode.uid, req.body.type])
        res.json({ data, success: true })
    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const updateTemplet = async (req, res) => {
    try {

        await query(`UPDATE templet SET name = ?, content = ? WHERE id = ? `, [
            req.body.name, JSON.stringify(req.body.content), req.body.id
        ])
        res.json({ msg: "Templet was updated", success: true })
    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const delTemplet = async (req, res) => {
    try {
        await query(`DELETE FROM templet WHERE id = ?`, [req.body.id])
        res.json({ success: true, msg: "Templet was deleted" })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}


export { getTemplet, updateTemplet, delTemplet }
