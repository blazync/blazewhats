import query from '../database/dbpromise.js'
import fetch from 'node-fetch'
import mime from 'mime-types'
import nodemailer from 'nodemailer'
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import moment from 'moment'
import fs from 'fs'
import { getSession, isExists, sendMessage, formatPhone } from '../middlewares/req.js'

function addDaysToToday(days) {
  const today = new Date();
  const targetDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const seconds = String(targetDate.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedDate;
}


function updatePlan(uid, plan) {
  return new Promise(async (resolve, reject) => {
    try {
      const days = addDaysToToday(JSON.parse(plan).planexpire)

      await query(`UPDATE user SET plan = ?, planexpire = ?, msglimit = ?, contactlimit = ?, templetlimit = ?, allow_multi_instance = ?, allow_data_extract = ? WHERE uid = ?`, [
        plan, days, JSON.parse(plan).msglimit, JSON.parse(plan).contactlimit, JSON.parse(plan).templetlimit, JSON.parse(plan).allow_multi_instance, JSON.parse(plan).allow_data_extract, uid,
      ])
      resolve(true)
    } catch (err) {
      reject(err)
    }
  })
}


const rzCapturePayment = (paymentId, amount, razorpayKey, razorpaySecret) => {
  const auth = 'Basic ' + Buffer.from(razorpayKey + ':' + razorpaySecret).toString('base64');

  return new Promise((resolve, reject) => {
    fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amount }), // Replace with the actual amount to capture
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error('Error capturing payment:', data.error);
          reject(data.error);
        } else {
          console.log('Payment captured successfully:', data);
          resolve(data);
        }
      })
      .catch((error) => {
        console.error('Error capturing payment:', error);
        reject(error);
      });
  });
};

function createOrder(uid, payment_mode, amount, data) {
  return new Promise(async (resolve, reject) => {
    try {
      await query(`INSERT INTO orders (uid,payment_mode, amount, data) VALUES (?,?,?,?)`, [
        uid, payment_mode, amount, data
      ])

      resolve()

    } catch (err) {
      reject(err)
    }
  })
}

function convertToMySQLDate(dateString) {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const minute = date.getUTCMinutes().toString().padStart(2, '0');
  const second = date.getUTCSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function daysDiff(dateString) {
  if (!dateString) return 0
  const targetDate = new Date(dateString);
  const currentDate = new Date();
  const timeDifference = targetDate.getTime() - currentDate.getTime();
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  if (daysDifference < 0) {
    return 0;
  } else {
    return daysDifference;
  }
}

function removeNumbersBeforeHyphen(string) {
  const hyphenIndex = string?.indexOf('-');

  if (hyphenIndex !== -1) {
    const stringWithoutNumbers = string?.substring(hyphenIndex + 1);
    return stringWithoutNumbers;
  }

  return string || "file";
}



function sendMediaMessage(client_id, receiver, filename, caption, uid, type, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const currentDir = process.cwd()

      const mimyType = mime.lookup(`${currentDir}/client/public/media/${filename}`)
      const fileType = mimyType.slice(0, mimyType.indexOf("/"))


      if (fileType == 'image') {
        var data = { image: { url: `${currentDir}/client/public/media/${filename}` }, caption: caption ? caption : null }
      }
      else if (fileType == 'video') {
        var data = { video: { url: `${currentDir}/client/public/media/${filename}` }, caption: caption ? caption : null }
      }
      else if (fileType == 'audio') {
        var data = { audio: { url: `${currentDir}/client/public/media/${filename}` }, mimetype: "audio/mpeg", mp3: true }
      }
      else {
        if (typeof (caption) === undefined) {
          caption = ""
        }
        var data = { document: { url: `${currentDir}/client/public/media/${filename}` }, mimetype: mimyType, fileName: removeNumbersBeforeHyphen(filename), caption: caption ? caption : null }
      }

      await addMessageLog(uid, receiver, data, type, "single")

      if (req.body.saveAsTemplet === 'true' && req.body.fromTemplet === "false") {
        await saveAsTemplet(uid, req.body.name, data, type, req.body.mimetype)

        if (req.body.onlySave === 'true') {
          return resolve({ msg: "Templet was saved" })
        }
      }

      await sendMessageMain(client_id, receiver, data, uid)

      resolve({ msg: "Message was sent" })
    } catch (err) {
      reject(err)
    }
  })
}



function sendMessageMain(client_id, receiverr, content, uid) {

  return new Promise(async (resolve, reject) => {

    const session = getSession(client_id)
    const receiver = formatPhone(receiverr)

    try {
      // const exists = await isExists(session, receiver)

      // if (!exists) {
      //   return resolve({ success: false, message: 'The receiver number does not exists.' })
      // }

      await sendMessage(session, receiver, content)

      resolve({ success: true, message: 'The message has been successfully sent.' })


      if (uid) {
        // descesing limit 
        const user = await query(`SELECT * FROM user WHERE uid = ?`, [uid])
        const userMsg = parseInt(user[0].msglimit)
        const leftMessage = userMsg - 1
        await query(`UPDATE user SET msglimit = ? WHERE uid = ?`, [leftMessage, uid])
      }

    } catch (err) {
      resolve({ success: false, message: 'Instance not available', err })
      console.log(err)
    }

  })
}

function saveAsTemplet(uid, name, content, type, mimetype) {
  return new Promise(async (resolve, reject) => {
    try {
      // checking user templet usage 
      const getUser = await query(`SELECT * FROM user WHERE uid  =?`, [uid])
      const leftTemplet = getUser[0].templetlimit

      if (parseInt(leftTemplet) > 0) {
        await query(`INSERT INTO templet (uid, name, content, type , mimetype) VALUES (?,?,?,?, ?)`, [
          uid, name, JSON.stringify(content), type, mimetype || "NA"
        ])
        // decreasing user templet
        const final = parseInt(leftTemplet) - 1

        await query(`UPDATE user SET templetlimit = ? WHERE uid = ? `, [final, uid])
      } else {
        console.log(`Can not add as templet as user limit was exceed with uid `, uid)
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

function addMessageLog(uid, mobile, content, message_type, send_type) {
  return new Promise(async (resolve, reject) => {
    try {
      const a = await query(`INSERT INTO logs (uid, mobile, content, message_type, send_type) VALUES (?,?,?,?,?)`, [
        uid, mobile, JSON.stringify(content), message_type, send_type
      ])
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

function encodeObject(obj) {
  const jsonString = JSON.stringify(obj);
  const base64String = Buffer.from(jsonString).toString('base64');
  return base64String;
}

function decodeObject(encodedString) {
  const jsonString = Buffer.from(encodedString, 'base64').toString();
  const obj = JSON.parse(jsonString);
  return obj;
}


function getValueBeforeAtSymbol(str) {
  const index = str.indexOf('@');
  return index !== -1 ? str.slice(0, index) : '';
}

function findIfUserHaveBotAllowed(uid) {
  return new Promise(async (resolve, reject) => {
    try {
      const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [uid])
      const find = JSON.parse(getUser[0].plan).allowchatbot == "1" ? true : false
      resolve(find)

    } catch (err) {
      reject(err)
    }
  })
}

function checkPlanExpiry(uid) {
  return new Promise(async (resolve, reject) => {
    try {
      const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [uid])
      const plan = getUser[0].plan
      if (!plan) {
        resolve({ success: false })
        return
      }

      const daysLeft = daysDiff(getUser[0].planexpire)
      if (daysLeft < 1) {
        resolve({ success: false })
        return
      }
      resolve({ success: true, daysLeft })

    } catch (err) {
      reject(err)
    }
  })
}

function checkLeftMessage(uid) {
  return new Promise(async (resolve, reject) => {
    try {

      const getUser = await query(`SELECT * FROM user WHERE uid = ?`, [uid])

      const plan = getUser[0].plan
      if (!plan) {
        resolve({ success: false })
        return
      }

      if (getUser[0].msglimit < 1) {
        resolve({ success: false })
        return
      }
      resolve({ success: true, msgLeft: getUser[0].msglimit })

    } catch (err) {
      reject(err)
    }
  })
}

function checkForKeyword(sentence, keyword) {

  if (!sentence) {
    sentence = ""
  }
  const words1 = sentence.toLowerCase().split(' ');
  const words2 = keyword.toLowerCase().split(' ');

  for (const word1 of words1) {
    if (words2.includes(word1)) {
      return true; // Found a matching word
    }
  }

  return false; // No matching words found
}

function getNumberByPhonebok(name) {
  return new Promise(async (resolve, reject) => {
    const numbers = await query(`SELECT * FROM phonebook_contacts WHERE phonebook_name = ?`, [name])
    resolve(numbers)
  })
}

function checkSessionStatus(client_id) {
  return new Promise(async (resolve, reject) => {
    try {
      const findSe = await fetch(`${process.env.URI}/api/sessions/status-internal/${client_id}`)
      console.log({ findSe: findSe })
      const json = findSe.json()
      resolve(json)

    } catch (err) {
      resolve({ msg: "error while checking session" })
    }
  })
}

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function delayFun(e) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, [e])
  })
}

function getRandomNumber(min, max) {
  const randomDecimal = Math.random();
  const randomNumber = randomDecimal * (max - min) + min;
  return Math.floor(randomNumber);
}


function replaceVariables(string, variables) {
  console.log({ variables })
  return string?.replace(/{(.*?)}/g, (match, variable) => {
    const value = variables[variable.trim()];
    return value !== undefined ? value : match;
  });
}

function runCampaign(uid, content, phoneNumbers, client_id, req, campaign_id) {
  return new Promise(async (resolve, reject) => {
    try {

      let i = 0

      async function runFunction() {

        console.log("one")

        const client_id_actual = client_id[getRandomNumber(0, client_id.length)]

        console.log("two")

        const waitfordelay = parseInt(randomIntFromInterval(parseInt(req.body.randomDelayFrom) || 0, parseInt(req.body.randomDelayTo) || 30)) * 1000
        console.log('waiting', waitfordelay)
        await delayFun(waitfordelay)

        console.log("three")

        // checking msg left 
        const check = await checkLeftMessage(uid)

        console.log({ check: check.msgLeft })
        if (!check.success) {
          resolve({ success: false, msg: "campaign could not completed due to insufficient messages left in account" })
          return
        }

        // console.log("four")

        // // checking session status 
        // const cehckSession = await checkSessionStatus(client_id_actual)

        // console.log({ cehckSession: cehckSession })
        // console.log("five")

        // // console.log({ cehckSession, errrorr: "This is me error" })

        // if (!cehckSession.success) {
        //   resolve({ msg: "Instance not found" })
        //   return
        // }


        if (content.caption) {
          const a = { ...content, caption: replaceVariables(content.caption, phoneNumbers[i]) }
          const isSent = await sendMessageMain(client_id_actual, phoneNumbers[i].mobile, a, uid)

          console.log({ isSent: JSON.stringify(isSent) })

          // adding log 
          await query(`INSERT INTO logs (uid, mobile, content, message_type, send_type, campaign_name, campaign_id, campaign_status) VALUES (?,?,?,?,?,?,?,?) `, [
            uid, phoneNumbers[i].mobile, JSON.stringify(a), 'bulk', 'bulk', req.body.campaignName, campaign_id, isSent.message
          ])

        } else {
          const b = content.text ? { ...content, text: replaceVariables(content?.text ? content.text : "a", phoneNumbers[i]) } : content
          const isSent = await sendMessageMain(client_id_actual, phoneNumbers[i].mobile, b, uid)

          // adding log 
          await query(`INSERT INTO logs (uid, mobile, content, message_type, send_type, campaign_name, campaign_id, campaign_status) VALUES (?,?,?,?,?,?,?,?) `, [
            uid, phoneNumbers[i].mobile, JSON.stringify(b), 'bulk', 'bulk', req.body.campaignName, campaign_id, isSent.message
          ])
        }


        i += 1
        if (i < phoneNumbers.length) {
          runFunction()
          return
        }
        resolve({ success: true, msg: "campaign was completed" })
      }

      runFunction()

    } catch (err) {
      console.log(err)
      resolve({ success: false, msg: "campaign failed" })
    }
  })
}


async function sendRecoveryEmail(user, type, req) {
  return new Promise(async (resolve, reject) => {
    try {

      const web = await query(`SELECT * FROM web`, [])

      let transporter = nodemailer.createTransport({
        host: `${web[0].smtp_host}`,
        port: `${web[0].smtp_port}`,
        secure: web[0].smtp_port === "465" ? true : false, // true for 465, false for other ports
        auth: {
          user: `${web[0].smtp_email}`, // generated ethereal user
          pass: `${web[0].smtp_pass}`, // generated ethereal password
        },
      });

      const jsontoken = sign({ old_email: req.body.recovery_email, email: req.body.recovery_email, time: moment(new Date()), password: user.password, role: type }, process.env.JWTKEY, {
      })

      let info = await transporter.sendMail({
        from: `${web[0].app_name} <${web[0].smtp_email}>`, // sender address
        to: req.body.recovery_email, // list of receivers
        subject: "Password Recover", // Subject line
        html: `<html>
                                        <head>
                                          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                                          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                                          <title>Simple Transactional Email</title>
                                          <style>
                                            /* -------------------------------------
                                                GLOBAL RESETS
                                            ------------------------------------- */
                            
                                            /*All the styling goes here*/
                            
                                            img {
                                              border: none;
                                              -ms-interpolation-mode: bicubic;
                                              max-width: 100%; 
                                            }
                            
                                            body {
                                              background-color: #f6f6f6;
                                              font-family: sans-serif;
                                              -webkit-font-smoothing: antialiased;
                                              font-size: 14px;
                                              line-height: 1.4;
                                              margin: 0;
                                              padding: 0;
                                              -ms-text-size-adjust: 100%;
                                              -webkit-text-size-adjust: 100%; 
                                            }
                            
                                            table {
                                              border-collapse: separate;
                                              mso-table-lspace: 0pt;
                                              mso-table-rspace: 0pt;
                                              width: 100%; }
                                              table td {
                                                font-family: sans-serif;
                                                font-size: 14px;
                                                vertical-align: top; 
                                            }
                            
                                            /* -------------------------------------
                                                BODY & CONTAINER
                                            ------------------------------------- */
                            
                                            .body {
                                              background-color: #f6f6f6;
                                              width: 100%; 
                                            }
                            
                                            /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
                                            .container {
                                              display: block;
                                              margin: 0 auto !important;
                                              /* makes it centered */
                                              max-width: 580px;
                                              padding: 10px;
                                              width: 580px; 
                                            }
                            
                                            /* This should also be a block element, so that it will fill 100% of the .container */
                                            .content {
                                              box-sizing: border-box;
                                              display: block;
                                              margin: 0 auto;
                                              max-width: 580px;
                                              padding: 10px; 
                                            }
                            
                                            /* -------------------------------------
                                                HEADER, FOOTER, MAIN
                                            ------------------------------------- */
                                            .main {
                                              background: #ffffff;
                                              border-radius: 3px;
                                              width: 100%; 
                                            }
                            
                                            .wrapper {
                                              box-sizing: border-box;
                                              padding: 20px; 
                                            }
                            
                                            .content-block {
                                              padding-bottom: 10px;
                                              padding-top: 10px;
                                            }
                            
                                            .footer {
                                              clear: both;
                                              margin-top: 10px;
                                              text-align: center;
                                              width: 100%; 
                                            }
                                              .footer td,
                                              .footer p,
                                              .footer span,
                                              .footer a {
                                                color: #999999;
                                                font-size: 12px;
                                                text-align: center; 
                                            }
                            
                                            /* -------------------------------------
                                                TYPOGRAPHY
                                            ------------------------------------- */
                                            h1,
                                            h2,
                                            h3,
                                            h4 {
                                              color: #000000;
                                              font-family: sans-serif;
                                              font-weight: 400;
                                              line-height: 1.4;
                                              margin: 0;
                                              margin-bottom: 30px; 
                                            }
                            
                                            h1 {
                                              font-size: 35px;
                                              font-weight: 300;
                                              text-align: center;
                                              text-transform: capitalize; 
                                            }
                            
                                            p,
                                            ul,
                                            ol {
                                              font-family: sans-serif;
                                              font-size: 14px;
                                              font-weight: normal;
                                              margin: 0;
                                              margin-bottom: 15px; 
                                            }
                                              p li,
                                              ul li,
                                              ol li {
                                                list-style-position: inside;
                                                margin-left: 5px; 
                                            }
                            
                                            a {
                                              color: #3498db;
                                              text-decoration: underline; 
                                            }
                            
                                            /* -------------------------------------
                                                BUTTONS
                                            ------------------------------------- */
                                            .btn {
                                              box-sizing: border-box;
                                              width: 100%; }
                                              .btn > tbody > tr > td {
                                                padding-bottom: 15px; }
                                              .btn table {
                                                width: auto; 
                                            }
                                              .btn table td {
                                                background-color: #ffffff;
                                                border-radius: 5px;
                                                text-align: center; 
                                            }
                                              .btn a {
                                                background-color: #ffffff;
                                                border: solid 1px #3498db;
                                                border-radius: 5px;
                                                box-sizing: border-box;
                                                color: #3498db;
                                                cursor: pointer;
                                                display: inline-block;
                                                font-size: 14px;
                                                font-weight: bold;
                                                margin: 0;
                                                padding: 12px 25px;
                                                text-decoration: none;
                                                text-transform: capitalize; 
                                            }
                            
                                            .btn-primary table td {
                                              background-color: #3498db; 
                                            }
                            
                                            .btn-primary a {
                                              background-color: #3498db;
                                              border-color: #3498db;
                                              color: #ffffff; 
                                            }
                            
                                            /* -------------------------------------
                                                OTHER STYLES THAT MIGHT BE USEFUL
                                            ------------------------------------- */
                                            .last {
                                              margin-bottom: 0; 
                                            }
                            
                                            .first {
                                              margin-top: 0; 
                                            }
                            
                                            .align-center {
                                              text-align: center; 
                                            }
                            
                                            .align-right {
                                              text-align: right; 
                                            }
                            
                                            .align-left {
                                              text-align: left; 
                                            }
                            
                                            .clear {
                                              clear: both; 
                                            }
                            
                                            .mt0 {
                                              margin-top: 0; 
                                            }
                            
                                            .mb0 {
                                              margin-bottom: 0; 
                                            }
                            
                                            .preheader {
                                              color: transparent;
                                              display: none;
                                              height: 0;
                                              max-height: 0;
                                              max-width: 0;
                                              opacity: 0;
                                              overflow: hidden;
                                              mso-hide: all;
                                              visibility: hidden;
                                              width: 0; 
                                            }
                            
                                            .powered-by a {
                                              text-decoration: none; 
                                            }
                            
                                            hr {
                                              border: 0;
                                              border-bottom: 1px solid #f6f6f6;
                                              margin: 20px 0; 
                                            }
                            
                                            /* -------------------------------------
                                                RESPONSIVE AND MOBILE FRIENDLY STYLES
                                            ------------------------------------- */
                                            @media only screen and (max-width: 620px) {
                                              table.body h1 {
                                                font-size: 28px !important;
                                                margin-bottom: 10px !important; 
                                              }
                                              table.body p,
                                              table.body ul,
                                              table.body ol,
                                              table.body td,
                                              table.body span,
                                              table.body a {
                                                font-size: 16px !important; 
                                              }
                                              table.body .wrapper,
                                              table.body .article {
                                                padding: 10px !important; 
                                              }
                                              table.body .content {
                                                padding: 0 !important; 
                                              }
                                              table.body .container {
                                                padding: 0 !important;
                                                width: 100% !important; 
                                              }
                                              table.body .main {
                                                border-left-width: 0 !important;
                                                border-radius: 0 !important;
                                                border-right-width: 0 !important; 
                                              }
                                              table.body .btn table {
                                                width: 100% !important; 
                                              }
                                              table.body .btn a {
                                                width: 100% !important; 
                                              }
                                              table.body .img-responsive {
                                                height: auto !important;
                                                max-width: 100% !important;
                                                width: auto !important; 
                                              }
                                            }
                            
                                            /* -------------------------------------
                                                PRESERVE THESE STYLES IN THE HEAD
                                            ------------------------------------- */
                                            @media all {
                                              .ExternalClass {
                                                width: 100%; 
                                              }
                                              .ExternalClass,
                                              .ExternalClass p,
                                              .ExternalClass span,
                                              .ExternalClass font,
                                              .ExternalClass td,
                                              .ExternalClass div {
                                                line-height: 100%; 
                                              }
                                              .apple-link a {
                                                color: inherit !important;
                                                font-family: inherit !important;
                                                font-size: inherit !important;
                                                font-weight: inherit !important;
                                                line-height: inherit !important;
                                                text-decoration: none !important; 
                                              }
                                              #MessageViewBody a {
                                                color: inherit;
                                                text-decoration: none;
                                                font-size: inherit;
                                                font-family: inherit;
                                                font-weight: inherit;
                                                line-height: inherit;
                                              }
                                              .btn-primary table td:hover {
                                                background-color: #34495e !important; 
                                              }
                                              .btn-primary a:hover {
                                                background-color: #34495e !important;
                                                border-color: #34495e !important; 
                                              } 
                                            }
                            
                                          </style>
                                        </head>
                                        <body>
                                          <span class="preheader">This is password recovery email from ${web[0].app_name}.</span>
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
                                            <tr>
                                              <td>&nbsp;</td>
                                              <td class="container">
                                                <div class="content">
                            
                                                  <!-- START CENTERED WHITE CONTAINER -->
                                                  <table role="presentation" class="main">
                            
                                                    <!-- START MAIN CONTENT AREA -->
                                                    <tr>
                                                      <td class="wrapper">
                                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                          <tr>
                                                            <td>
                                                              <p>Hi there,</p>
                                                              <p>Please click below button to recover your password.</p>
                                                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
                                                                <tbody>
                                                                  <tr>
                                                                    <td align="left">
                                                                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                                        <tbody>
                                                                          <tr>
                                                                            <td> <a style="cursor: pointer;" href=${req.headers.host + `/recovery-${type}/` + jsontoken} target="_blank">Click Here</a> </td>
                                                                          </tr>
                                                                        </tbody>
                                                                      </table>
                                                                    </td>
                                                                  </tr>
                                                                </tbody>
                                                              </table>
                                                              <p>If the above button is not working please copy and paste this url link to your browser tab!</p>
                                                              <p>${req.headers.host + `/recovery-${type}/` + jsontoken}</p>
                                                              <p style="font-weight:bold" >Good luck!</p>
                                                            </td>
                                                          </tr>
                                                        </table>
                                                      </td>
                                                    </tr>
                            
                                                  <!-- END MAIN CONTENT AREA -->
                                                  </table>
                                                  <!-- END CENTERED WHITE CONTAINER -->
                            
                                                  <!-- START FOOTER -->
                                                  <div class="footer">
                                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                      <tr>
                                                        <td class="content-block powered-by">
                                                          Powered by <a href=${req.headers.host}>${web[0].app_name}</a>.
                                                        </td>
                                                      </tr>
                                                    </table>
                                                  </div>
                                                  <!-- END FOOTER -->
                            
                                                </div>
                                              </td>
                                              <td>&nbsp;</td>
                                            </tr>
                                          </table>
                                        </body>
                                      </html>`, // html body
      });
      resolve()

    } catch (err) {
      reject(err)
    }
  })
}


function createJsonFile(filename, data) {
  const dirName = process.cwd()
  const filePath = `${dirName}/contacts/${filename}.json`;
  const jsonData = JSON.stringify(data, null, 2);

  fs.writeFileSync(filePath, jsonData);
  console.log(`${filename}.json file created or replaced successfully.`);
}


function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`${filePath} deleted successfully.`);
  } else {
    console.log(`${filePath} does not exist. Skipping deletion.`);
  }
}




export { updatePlan, createJsonFile, deleteFileIfExists, sendRecoveryEmail, getNumberByPhonebok, rzCapturePayment, createOrder, runCampaign, encodeObject, checkForKeyword, checkPlanExpiry, checkLeftMessage, findIfUserHaveBotAllowed, getValueBeforeAtSymbol, decodeObject, sendMessageMain, addMessageLog, saveAsTemplet, convertToMySQLDate, daysDiff, sendMediaMessage }