import { Router } from 'express'
import * as controller from '../controllers/sendMessageController.js'
import userValidator from '../middlewares/userValidator.js'
import { checkLeftMessage, checkPlanExpiry } from '../middlewares/userPlanValidator.js'

const router = Router()

router.post('/send', userValidator, checkPlanExpiry, checkLeftMessage, controller.sendMessageFunction)

router.post('/send-media', userValidator, checkPlanExpiry, checkLeftMessage, controller.sendMessageWithMedia)

router.post('/send-bulk', userValidator, checkPlanExpiry, checkLeftMessage, controller.sendBulkTask)

router.post('/send-to-group', userValidator, checkPlanExpiry, checkLeftMessage, controller.sendToGroup)

router.post('/get-groups-data', userValidator, controller.getGroupsData)

export default router
