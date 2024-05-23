import { Router } from 'express'
import * as controller from '../controllers/webController.js'
import adminValidator from '../middlewares/adminValidator.js'


const router = Router()

router.get('/get-all-payment-method', controller.getAllPayments)

router.get('/get-all-payment-method-admin', controller.getAllPaymentsAdmin)
router.get('/get-web-public', controller.getWebPublic)

router.post('/update-payment-method', adminValidator, controller.updatePayment)

router.get('/get-one-translation', controller.getOneLang)

router.get('/get-all-translation-name', controller.getAllLangName)

router.post('/update-one-translation', adminValidator, controller.updateLanguage)

router.post('/add-new-translation', adminValidator, controller.duplicateRandomLanguage)

router.post('/del-one-translation', adminValidator, controller.deleteLanguage)

router.post('/update-app-config', adminValidator, controller.updateAppConfig)

router.get('/install-app', controller.checkApp)

router.post('/install-app', controller.installApp)


export default router
