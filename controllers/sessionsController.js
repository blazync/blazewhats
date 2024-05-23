import { isSessionExists, createSession, getSession, deleteSession } from '../middlewares/req.js'
import response from './../response.js'
import query from '../database/dbpromise.js'
import fs from 'fs'

function saveAsJson(data, filePath) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonData);
        console.log('JSON file saved successfully.');
    } catch (err) {
        console.error('Error saving JSON file:', err);
    }
}

const find = (req, res) => {
    response(res, 200, true, 'Session found.')
}

function saveJsonToFile(jsonData, filePath) {
    const jsonString = JSON.stringify(jsonData, null, 2);

    fs.writeFile(filePath, jsonString, (error) => {
        if (error) {
            console.error('Error saving JSON:', error);
        } else {
            console.log('JSON saved successfully.');
        }
    });
}

const status = async (req, res) => {
    try {
        const states = ['connecting', 'connected', 'disconnecting', 'disconnected']
        const session = getSession(res.locals.sessionId)
        let state = states[session.ws.readyState]

        state =
            state === 'connected' && typeof (session.isLegacy ? session.state.legacy.user : session.user) !== 'undefined'
                ? 'authenticated'
                : state

        const userData = session?.authState?.creds?.me || session.user
        const status = session.user ? true : false

        // Send the response after all processing is done
        response(res, 200, status, '', { status: state, loginStatus: userData })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const add = async (req, res) => {
    const { id, isLegacy } = req.body

    const getPairCode = false

    if (isSessionExists(id)) {
        return response(res, 409, false, 'Session already exists, please use another id.')
    }

    // adding new client in database for this user
    await query(`INSERT INTO instance (uid, client_id, name) VALUES (?,?,?)`, [
        req.decode.uid, id, req.body.name
    ])

    createSession(id, isLegacy === 'true', res, req, getPairCode)
}

const addWithPairCode = async (req, res) => {
    try {
        const { id, name, mobile, isLegacy } = req.body

        const getPairCode = true

        if (!name || !mobile) {
            return res.json({ success: false, msg: "Please give instance a name and mobile" })
        }

        if (isSessionExists(id)) {
            return response(res, 409, false, 'Session already exists, please use another id.')
        }

        // adding new client in database for this user
        await query(`INSERT INTO instance (uid, client_id, name) VALUES (?,?,?)`, [
            req.decode.uid, id, req.body.name
        ])

        createSession(id, isLegacy === 'true', res, req, getPairCode)

    } catch (error) {
        console.log(error)
        res.json({ success: false, msg: "Server error" })
    }
}

const del = async (req, res) => {
    const { id } = req.params
    const session = getSession(id)

    try {
        await session.logout()
    } catch {
    } finally {
        deleteSession(id, session.isLegacy)
    }
    response(res, 200, true, 'The session has been successfully deleted.', { msg: "The session was deleted" })
}

// get all users sessions 
const getUserSessions = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM instance WHERE uid = ?`, [req.decode.uid])
        res.json({ success: true, data: data })
    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}


function readJsonArrayFromFile(filePath) {
    try {
        // Read the file synchronously
        const data = fs.readFileSync(filePath, 'utf-8');

        // Parse the JSON data into an array
        const jsonArray = JSON.parse(data);

        // Check if it's an array and not empty
        if (Array.isArray(jsonArray) && jsonArray.length > 0) {
            return jsonArray;
        } else {
            return null; // Return null if the array is empty
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist
            return null;
        } else {
            // Some other error occurred
            throw error;
        }
    }
}

const importContacts = async (req, res) => {
    try {
        const body = req.body
        const method = body.method
        const clientId = body.clientId
        const mobileNumber = body.mobileNumber

        const cwd = process.cwd()

        const filePathOne = `${cwd}/contacts/${clientId}__${method}.json`

        const phoneArray = readJsonArrayFromFile(filePathOne)

        // getting esisting one 
        const getone = await query(`SELECT * FROM phonebook WHERE name = ? and uid = ?`, [`${mobileNumber}_method_${method}`, req.decode.uid])
        if (getone.length > 0) {
            return res.json({ msg: "Duplicate phonebook name found. please choose another name or delete exising one" })
        }

        const data = await query(`INSERT INTO phonebook (uid, name) VALUES (?,?)`, [
            req.decode.uid, `${mobileNumber}_method_${method}`
        ])


        if (!phoneArray || phoneArray.length < 1) {
            return res.json({ msg: "No contacts found to import or re-add your instance if you have contacts", success: false })
        }

        const getUser = await query(`SELECT * FROM user WHERE uid =?`, [req.decode.uid])
        const contactsLimits = parseInt(getUser[0].contactlimit)

        if (phoneArray.length > contactsLimits) {
            return res.json({ success: false, msg: "You dont have enough space available in your phonebook, Please delete existing ones or increase phonebook" })
        }

        const values = phoneArray.map((contacts) => [
            req.decode.uid,
            contacts.name,
            `${mobileNumber}_method_${method}`,
            contacts.id?.replace("@s.whatsapp.net")
        ])

        await query(`INSERT INTO phonebook_contacts (uid, name, phonebook_name, mobile) VALUES ?`, [values])

        setTimeout(async () => {
            await query(`DELETE FROM phonebook_contacts WHERE mobile IS NULL`, [])

            // checking limit 
            const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
            const limit = user[0].contactlimit

            await query(`UPDATE user SET contactlimit = ? WHERE uid = ?`, [parseInt(limit) - phoneArray?.length, req.decode.uid])
        }, 3000);


        res.json({ msg: "Your contacts were imported", success: true })

    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}

function isValidURL(url) {
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;
    return urlPattern.test(url);
}

const addWehook = async (req, res) => {
    try {
        const { webhookURL, id } = req.body
        if (!isValidURL(webhookURL)) {
            return res.json({ success: false, msg: "Please add a valid URL" })
        }
        console.log({ webhookURL, id })
        await query(`UPDATE instance SET webhook = ? WHERE id = ?`, [webhookURL, id])
        res.json({ success: true, msg: "Webhook URL added" })
    } catch (err) {
        console.log(err)
        res.json({ err, msg: "server error" })
    }
}

export { find, status, addWehook, addWithPairCode, importContacts, add, del, getUserSessions }
