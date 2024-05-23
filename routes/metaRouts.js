import { Router } from 'express'
import * as controller from '../controllers/metaController.js'
import userValidator from '../middlewares/userValidator.js'
import { checkLeftMessage, checkPlanExpiry } from '../middlewares/userPlanValidator.js'

const router = Router()

router.get('/fetch_profile', userValidator, checkPlanExpiry, controller.fetchProfile)
router.post('/add_templet', userValidator, controller.addTemplet)
router.post('/add_templet_media', userValidator, controller.addTempletMedia)
router.post('/add_templet_doc', userValidator, controller.addTempletDoc)
router.post('/add_templet_video', userValidator, controller.addTempletVideo)
router.post('/add_templet_quick_reply', userValidator, controller.addTempletQuickReply)
router.post('/add_templet_list', userValidator, controller.addTempletList)
router.post('/add_templet_location', userValidator, controller.addTempletLocation)

router.post('/add_templet_contact', userValidator, controller.addTempletCOntact)

router.post('/add_chatbot', userValidator, controller.addChatbot)
router.get('/get_chatbot', userValidator, controller.getChatbot)
router.post('/switch_chatbot', userValidator, controller.switchChatbot)
router.post('/del_chatbot', userValidator, controller.delChatBot)

router.get('/get_templet', userValidator, controller.getTemplet)
router.post('/del_templet', userValidator, controller.delTemplet)


router.get('/webhook/:uid', controller.metaWebhook)
router.post('/webhook/:uid', controller.metaWebHookIncoming)


export default router
