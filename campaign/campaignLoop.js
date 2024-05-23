import query from '../database/dbpromise.js'
import { checkLeftMessage, sendMessageMain } from '../functions/function.js';
import moment from 'moment-timezone'

function hasDatePassedInTimezone(timezone, date) {
    // Convert the provided date to a Moment object in the specified timezone
    const momentDate = moment.tz(date, timezone);

    // Get the current date and time in the specified timezone
    const currentMoment = moment.tz(timezone);

    // Compare the provided date with the current date
    return momentDate.isBefore(currentMoment);
}

function delayRandom(fromSeconds, toSeconds) {
    const randomSeconds = Math.random() * (toSeconds - fromSeconds) + fromSeconds;

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, randomSeconds * 1000);
    });
}

function replaceVariables(string, variables) {
    return string?.replace(/{(.*?)}/g, (match, variable) => {
        const value = variables[variable.trim()];
        return value !== undefined ? value : match;
    });
}

function getRandomStringFromArray(stringArray) {
    if (stringArray.length === 0) {
        return "Array is empty";
    }
    const randomIndex = Math.floor(Math.random() * stringArray.length);
    return stringArray[randomIndex];
}

async function runCampaign(campaign) {
    const clients = JSON.parse(campaign?.instance)

    const clietIdArr = clients.map((i) => i.client_id)

    const leftCLients = await query(`SELECT * FROM instance WHERE client_id IN (?)`, [clietIdArr])

    if (leftCLients.length < 1) {
        await query(`UPDATE bulk_campaign SET status = ? WHERE campaign_id = ?`, ["NO LEFT INSTANCES FOUND", campaign?.campaign_id])
        return
    }

    const getInstanceId = getRandomStringFromArray(leftCLients)

    const checkInDb = await query(`SELECT * FROM instance WHERE client_id = ?`, [getInstanceId?.client_id])

    if (checkInDb.length < 1) {
        return
    }

    const getMessage = await query(`SELECT * FROM bulk_campaign_log WHERE campaign_id = ? AND status = ? LIMIT ?`, [campaign?.campaign_id, "QUEUE", 1]);

    if (getMessage.length < 1) {
        await query(`UPDATE bulk_campaign SET status = ? WHERE campaign_id = ?`, ["COMPLETED", campaign?.campaign_id])
    } else {

        const check = await checkLeftMessage(campaign?.uid)

        if (!check.success) {
            await query(`UPDATE bulk_campaign SET status = ? WHERE campaign_id = ?`, ["NO CREDITS LEFT", campaign?.campaign_id])
            return
        }

        const content = JSON.parse(getMessage[0]?.content)

        if (content?.caption) {
            const replacedContent = { ...content, caption: replaceVariables(content.caption, JSON.parse(getMessage[0]?.phonebook_json)) }

            console.log({ mobile: getMessage[0]?.mobile })

            const isSent = await sendMessageMain(getInstanceId?.client_id, getMessage[0]?.mobile, replacedContent, campaign?.uid)

            console.log({ isSent: JSON.stringify(isSent) })

            if (isSent.success) {
                await query(`UPDATE bulk_campaign_log SET status = ?, sent_from = ? WHERE id = ?`, ["SUCCESS", getInstanceId?.name, getMessage[0]?.id])
            } else {
                await query(`UPDATE bulk_campaign_log SET status = ?, err = ? WHERE id = ?`, ["NUMBER NA", JSON.stringify(isSent), getMessage[0]?.id])
            }
        } else {
            const b = content.text ? { ...content, text: replaceVariables(content?.text ? content.text : "a", JSON.parse(getMessage[0]?.phonebook_json)) } : content

            console.log({ mobile: getMessage[0]?.mobile })

            const isSent = await sendMessageMain(getInstanceId?.client_id, getMessage[0]?.mobile, b, campaign?.uid)

            console.log({ isSentElse: JSON.stringify(isSent) })
            if (isSent.success) {
                await query(`UPDATE bulk_campaign_log SET status = ?, sent_from = ? WHERE id = ?`, ["SUCCESS", getInstanceId?.name, getMessage[0]?.id])
            } else {
                await query(`UPDATE bulk_campaign_log SET status = ?, err = ? WHERE id = ?`, ["NUMBER NA", JSON.stringify(isSent), getMessage[0]?.id])
            }
        }

    }
}

async function GetBulkCampaign() {
    const getBulkCampaign = await query(`SELECT * FROM bulk_campaign WHERE status = ?`, ["QUEUE"])
    getBulkCampaign.length > 0 && getBulkCampaign.forEach((campaign) => {
        if (campaign?.schedule && hasDatePassedInTimezone(campaign?.timezone, campaign?.schedule)) {
            runCampaign(campaign)
        }
    })
}

async function runLoop() {
    console.log("CAMe")
    GetBulkCampaign()
    await delayRandom(3, 30)
    runLoop()
}

export { runLoop }