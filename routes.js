import { Router } from 'express'
import sessionsRoute from './routes/sessionsRoute.js'
import chatsRoute from './routes/chatsRoute.js'
import groupsRoute from './routes/groupsRoute.js'
import userRoute from './routes/userRoute.js'
import response from './response.js'
import adminRoute from './routes/adminRoute.js'
import planRoute from './routes/planRoute.js'
import pingRoute from './routes/pingRoute.js'
import botRoute from './routes/botRoute.js'
import templetRoute from './routes/templetRoute.js'
import sendMessageRoute from './routes/sendMessageRoute.js'
import phonebookRoute from './routes/phonebookRoute.js'
import campaignRoute from './routes/campaignRoute.js'
import pollRoute from './routes/pollRoute.js'
import webRouts from './routes/webRouts.js'
import metaRouts from './routes/metaRouts.js'
import bulkCampaignRoutes from './campaign/campaign.js'

const router = Router()

router.use('/sessions', sessionsRoute)
router.use('/chats', chatsRoute)
router.use('/groups', groupsRoute)
router.use('/user', userRoute)
router.use('/admin', adminRoute)
router.use('/plan', planRoute)
router.use('/ping', pingRoute)
router.use('/bot', botRoute)

router.use('/send-message', sendMessageRoute)

router.use('/templet', templetRoute)

router.use('/phonebook', phonebookRoute)

router.use('/web', webRouts)

router.use('/campaign', campaignRoute)

router.use('/poll', pollRoute)

router.use('/meta', metaRouts)

router.use('/bulk_campaign', bulkCampaignRoutes)

router.all('*', (req, res) => {
    response(res, 404, false, 'The requested url cannot be found.')
})

export default router
