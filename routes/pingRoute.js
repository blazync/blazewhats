import { Router } from 'express'
import * as controller from '../controllers/pingController.js'
import validateAdmin from '../middlewares/adminValidator.js'

const router = Router()

router.post('/admin-reply', validateAdmin, controller.adminReply)

export default router
