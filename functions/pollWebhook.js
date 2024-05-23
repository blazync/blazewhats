import query from '../database/dbpromise.js'
import { } from '../functions/function.js'
import { getSession } from '../middlewares/req.js'

function findObjectWithNonEmptyVoters(arr) {
    return arr.find(obj => obj.voters.length > 0);
}

function updateVotes(vote, existingVotes) {
    const index = existingVotes.findIndex((existingVote) => existingVote?.name === vote?.name);

    if (index !== -1) {
        const voters = existingVotes[index].voters;
        const voterIndex = voters.indexOf(vote.voters[0]);

        if (voterIndex !== -1) {
            voters.splice(voterIndex, 1); // Remove the voter if already exists
        } else {
            voters.push(vote.voters[0]); // Add the voter if not already present
        }
    }

    return existingVotes;
}

const webhookPoll = async (uid, client_name, sessionId, pollResponse, pollCreation, wa, update) => {
    console.log('came to poll')

    const pollMsg = pollCreation?.pollCreationMessage
    const session = getSession(sessionId)
    const userData = session?.authState?.creds?.me || session.user

    // check if this user has poll 
    const user = await query(`SELECT * FROM user WHERE uid = ?`, [uid])
    const isActive = parseInt(user[0]?.poll_status) > 0 ? true : false

    if (!isActive) return

    // check if the poll already exist 
    const oldPoll = await query(`SELECT * FROM polls WHERE content = ? `, [JSON.stringify(pollMsg)])

    const newVote = findObjectWithNonEmptyVoters(pollResponse)


    if (oldPoll.length > 0) {
        const existingVotes = JSON.parse(oldPoll[0]?.answer)
        const updatedVoteArr = updateVotes(newVote, existingVotes);

        console.log({ existingVotes, up: JSON.stringify(updatedVoteArr), newVote })

        await query(`UPDATE polls SET answer = ? WHERE content = ? and client_id = ?`, [JSON.stringify(updatedVoteArr), JSON.stringify(pollMsg), sessionId])
        console.log('updated the old vote')

    } else {

        await query(`INSERT INTO polls (uid, content, answer, client_id, client_name ) VALUES (
            ?,?,?,?,?
        )`, [
            uid,
            JSON.stringify(pollMsg),
            JSON.stringify(pollResponse),
            sessionId,
            JSON.stringify(userData)
        ])
        console.log("new poll found inserted")
    }

    // console.log({ sender: JSON.stringify(pollResponse), obj: findObjectWithNonEmptyVoters(pollResponse) })
    // console.log({ uid, client_name, sessionId, pollResponse: JSON.stringify(pollResponse), pollMsg, userData, update: JSON.stringify(pollResponse) })
}
export { webhookPoll }
