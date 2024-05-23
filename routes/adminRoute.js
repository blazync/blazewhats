import { Router } from 'express'
import * as controller from '../controllers/adminController.js'
import validateAdmin from '../middlewares/adminValidator.js'

const router = Router()

router.post('/login', controller.login)
router.get('/get-users', validateAdmin, controller.getUsers)
router.post('/edit-user', validateAdmin, controller.editUser)
router.post('/del-user', validateAdmin, controller.delUser)
router.post('/update-user-plan', validateAdmin, controller.updateUserPlan)

router.get('/get-all-pings', validateAdmin, controller.getAllPings)
router.post('/reply-ping', validateAdmin, controller.replyPing)

router.post('/add-page', validateAdmin, controller.addPage)
router.get('/get-all-page', controller.getAllPage)
router.post('/del-page', validateAdmin, controller.delPage)
router.post('/get-page-by-slug', controller.getBySlug)


router.post('/add-testimonial', validateAdmin, controller.addTesti)
router.post('/del-testimonial', validateAdmin, controller.delTesti)
router.get('/get-all', controller.getAllTesi)


router.post('/add-faq', validateAdmin, controller.addFaq)
router.post('/del-faq', validateAdmin, controller.delFaq)
router.get('/get-all-faq', controller.getAllFaq)

router.post('/add-features', validateAdmin, controller.addFeatures)
router.post('/del-feature', validateAdmin, controller.delFeature)
router.get('/get-all-features', controller.getAllFeatures)

router.get('/get-all-orders', validateAdmin, controller.getAllOrders)
router.post('/get-user-by-uid', validateAdmin, controller.getUserByUID)
router.post('/del-order', validateAdmin, controller.delOrder)

router.post('/del-ping', validateAdmin, controller.delPing)

router.post('/direct-user-login', validateAdmin, controller.directUserLogin)

router.get('/get-admin', validateAdmin, controller.getAdmin)
router.post('/update-admin', validateAdmin, controller.updateAdmin)

router.get('/get-dashboard', validateAdmin, controller.getDashboard)

router.post('/send_recovery', controller.adminRecovery)
router.post('/modify_admin', validateAdmin, controller.updateRecoverPass)

export default router
