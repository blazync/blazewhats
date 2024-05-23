import query from '../database/dbpromise.js'
import fetch from 'node-fetch'
import mime from 'mime-types'
import nodemailer from 'nodemailer'
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import moment from 'moment'
import fs from 'fs'
import { getSession, isExists, sendMessage, formatPhone } from '../middlewares/req.js'
const URI = `https://graph.facebook.com/v17.0`

// let a = {
//     verified_name: 'Purple Bot Graph Number',
//     code_verification_status: 'EXPIRED',
//     display_phone_number: '+44 7513 954308',
//     quality_rating: 'GREEN',
//     platform_type: 'CLOUD_API',
//     throughput: { level: 'STANDARD' },
//     id: '100861746396873'
// }


function fetchProfileFun(mobileId, token) {
    return new Promise(async (resolve, reject) => {
        try {

            const response = await fetch(`${URI}/${mobileId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                return resolve({ success: false, msg: data.error?.message })
            } else {
                return resolve({ success: true, data: data })
            }

        } catch (error) {
            console.log({ error })
            reject(error)
        }
    })
}


export { fetchProfileFun }