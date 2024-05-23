import { Router } from 'express'
import * as controller from '../controllers/campaignController.js'
import userValidator from '../middlewares/userValidator.js'
import { checkLeftMessage, checkPlanExpiry } from '../middlewares/userPlanValidator.js'

const router = Router()

router.get('/get-campaign', userValidator, controller.getByuser)
router.post('/get-logs-by-campaign-id', userValidator, controller.getLogsByCampaignID)
router.post('/del-campaign', userValidator, controller.delCampaign)


export default router
