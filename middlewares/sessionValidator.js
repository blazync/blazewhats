import { isSessionExists } from '../middlewares/req.js'
import response from './../response.js'
import query from '../database/dbpromise.js'

const validate = async (req, res, next) => {
    const sessionId = req.query.id ?? req.params.id

    if (!isSessionExists(sessionId)) {
        await query(`DELETE FROM instance WHERE client_id = ?`, [sessionId])
        return response(res, 404, false, 'Session not found.')
    }

    res.locals.sessionId = sessionId
    next()
}

export default validate
