import { Router } from 'express'
import * as controller from '../controllers/userController.js'
import userValidator from '../middlewares/userValidator.js'
import { checkPlanExpiry } from '../middlewares/userPlanValidator.js'

const router = Router()

router.post('/signup', controller.signup)
router.post('/login', controller.login)
router.get('/get-user-by-token', userValidator, controller.getUserByToken)
router.post('/get-messages-log', userValidator, controller.getMessageLog)
router.post('/del-logs', userValidator, controller.delLogs)

router.post('/start-scrapping', userValidator, checkPlanExpiry, controller.startScrap)
router.get('/get-scrapping-campaign', userValidator, controller.getScrapCampaign)
router.post('/get-scrapping-data', userValidator, controller.getScrappingData)
router.post('/del-scrapping', userValidator, controller.delScrapping)


router.post('/send-new-ping', userValidator, controller.sendNewPing)
router.get('/get-my-ping', userValidator, controller.getMyPing)


router.get('/generate-API', userValidator, checkPlanExpiry, controller.GenAPI)
router.post('/v2/send_message', controller.V2SendMesg)
router.get('/v2/send_message_url', controller.V2SendMesgUrl)
router.post('/v2/send_templet', controller.V2SendTemp)
router.get('/v2/check_wa', controller.checkWA)

router.get('/get-dashboard', userValidator, controller.getDash)
router.post('/update-profile', userValidator, controller.updateUser)

router.post('/send_recovery', controller.userRecovery)
router.post('/modify_user', userValidator, controller.updateRecoverPass)

router.post('/update_meta_creds', userValidator, controller.updateMetaCreds)

router.post('/test_webhook', controller.testWebhook)


export default router
