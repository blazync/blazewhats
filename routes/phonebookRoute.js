import { Router } from 'express'
import * as controller from '../controllers/phonebookController.js'
import userValidator from '../middlewares/userValidator.js'

const router = Router()

router.post('/add-phonebook', userValidator, controller.addPhoneBook)

router.post('/add-contact-paste', userValidator, controller.addPhoneNumPaste)

router.get('/get-phonebook', userValidator, controller.getPhoneBook)

router.post('/delete-phonebook', userValidator, controller.deletePhoneBook)

router.post('/add-contact', userValidator, controller.addContact)

router.get('/get-contact', userValidator, controller.getContacts)

router.post('/delete-contact', userValidator, controller.deleteContact)

router.post('/add-csv', userValidator, controller.adCSV)

router.post('/add-excel', userValidator, controller.adExcel)

export default router
