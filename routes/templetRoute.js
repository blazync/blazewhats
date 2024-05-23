import { Router } from 'express'
import * as controller from '../controllers/templetController.js'
import userValidator from '../middlewares/userValidator.js'
import { checkLeftMessage, checkPlanExpiry } from '../middlewares/userPlanValidator.js'

const router = Router()

router.post('/get-templet', userValidator, controller.getTemplet)

router.post('/update-templet', userValidator, controller.updateTemplet)

router.post('/delete-templet', userValidator, controller.delTemplet)

export default router
