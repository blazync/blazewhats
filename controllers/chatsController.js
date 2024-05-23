import { getSession, getChatList, isExists, sendMessage, formatPhone } from '../middlewares/req.js'
import response from './../response.js'
import fs from 'fs'

function readJSONArrayFile(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const fileData = fs.readFileSync(filePath, 'utf8');
            const jsonArray = JSON.parse(fileData);
            return Array.isArray(jsonArray) ? jsonArray : [];
        } catch (error) {
            console.error(`Error reading JSON file: ${error}`);
            return [];
        }
    } else {
        console.log(`${filePath} does not exist. Returning an empty array.`);
        return [];
    }
}


const getList = (req, res) => {
    const dirName = process.cwd()
    const contacts = readJSONArrayFile(`${dirName}/contacts/${res.locals.sessionId}.json`)
    return response(res, 200, true, '', getChatList(res.locals.sessionId), contacts)
}

const send = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const receiver = formatPhone(req.body.receiver)
    const { message } = req.body

    try {
        const exists = await isExists(session, receiver)

        if (!exists) {
            return response(res, 400, false, 'The receiver number is not exists.')
        }

        await sendMessage(session, receiver, message)

        response(res, 200, true, 'The message has been successfully sent.')
    } catch {
        response(res, 500, false, 'Failed to send the message.')
    }
}

const sendBulk = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const errors = []

    for (const [key, data] of req.body.entries()) {
        if (!data.receiver || !data.message) {
            errors.push(key)

            continue
        }

        data.receiver = formatPhone(data.receiver)

        try {
            const exists = await isExists(session, data.receiver)

            if (!exists) {
                errors.push(key)

                continue
            }
            await sendMessage(session, data.receiver, data.message)
        } catch {
            errors.push(key)
        }
    }

    if (errors.length === 0) {
        return response(res, 200, true, 'All messages has been successfully sent.')
    }

    const isAllFailed = errors.length === req.body.length

    response(
        res,
        isAllFailed ? 500 : 200,
        !isAllFailed,
        isAllFailed ? 'Failed to send all messages.' : 'Some messages has been successfully sent.',
        { errors }
    )
}

export { getList, send, sendBulk }
