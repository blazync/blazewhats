import { Router } from 'express'
import * as controller from '../controllers/planController.js'
import validateAdmin from '../middlewares/adminValidator.js'
import userValidator from '../middlewares/userValidator.js'
import query from '../database/dbpromise.js'
import randomstring from 'randomstring'
import Stripe from 'stripe'
import { updatePlan } from '../functions/function.js'

const router = Router()

router.post('/add', validateAdmin, controller.add)
router.get('/get-all', controller.getAllPlan)
router.post('/delete', validateAdmin, controller.delPlan)
router.post('/pay-with-paypal', userValidator, controller.payWithPaypal)
router.post('/pay-with-paystack', userValidator, controller.payWithPayStack)

router.post('/pay-with-mercadopago', userValidator, controller.payWithMer)
router.get('/mercadopago-callback', controller.callBackMerco)

router.post('/pay-with-razorpay', userValidator, controller.payWithRazorpay)
router.post('/pay-with-zarnipal', userValidator, controller.payWithZarnipal)
router.get('/verify-zarnipal', controller.verifyZarnipal)
router.post('/pay-with-instamojo', userValidator, controller.payWithInstamojo)
router.get('/verify-instamojo', controller.verifyInstamojo)
router.post('/pay-with-stripe', userValidator, controller.payWithStripe)
router.post('/pay-free', userValidator, controller.payFree)


router.post('/create_stripe_session', userValidator, async (req, res) => {
    try {
        const getStripe = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['stripe'])

        if (!getStripe[0]?.payment_id || !getStripe[0]?.payment_keys) {
            return res.json({ msg: "Please check your stripe keys and ID" })
        }

        const stripeClient = new Stripe(getStripe[0]?.payment_keys);
        const { planId } = req.body

        const plan = await query(`SELECT * FROM plan WHERE id = ?`, [planId])

        if (plan.length < 1) {
            return res.json({ msg: "No plan found with the id" })
        }

        const randomSt = randomstring.generate()
        const orderID = `STRIPE_${randomSt}`

        await query(`INSERT INTO orders (uid, payment_mode, amount, data) VALUES (?,?,?,?)`, [
            req.decode.uid,
            "STRIPE",
            plan[0]?.price,
            orderID
        ])

        const protocol = req.protocol;
        const domain = req.get('host');
        const requestUrl = `${protocol}://${domain}`;

        const web = await query(`SELECT * FROM web`, [])

        const productStripe = [{
            price_data: {
                currency: web[0]?.currency_symbol,
                product_data: {
                    name: plan[0]?.name,
                    // images:[product.imgdata]
                },
                unit_amount: plan[0]?.price * 100,
            },
            quantity: 1
        }]

        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: productStripe,
            mode: "payment",
            success_url: `${requestUrl}/api/plan/stripe_payment?order=${orderID}&plan=${plan[0]?.id}`,
            cancel_url: `${requestUrl}/api/plan/stripe_payment?order=${orderID}&plan=${plan[0]?.id}`,
            locale: process.env.STRIPE_LANG || "en"
        });

        await query(`UPDATE orders SET s_token = ? WHERE data = ?`, [session?.id, orderID])

        res.json({ success: true, session: session })

    } catch (err) {
        res.json({ msg: err.toString(), err })
        console.log({ err, msg: JSON.stringify(err), string: err.toString() })
    }
})

function checlStripePayment(orderId) {
    return new Promise(async (resolve) => {
        try {
            const getStripe = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['stripe'])
            const stripeClient = new Stripe(getStripe[0]?.payment_keys);
            const getPay = await stripeClient.checkout.sessions.retrieve(orderId)

            console.log({ status: getPay?.payment_status })

            if (getPay?.payment_status === "paid") {
                resolve({ success: true, data: getPay })
            } else {
                resolve({ success: false })
            }

        } catch (err) {
            resolve({ success: false, data: {} })
        }
    })
}

function returnHtmlRes(msg) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="5;url=${process.env.URI}/user">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          text-align: center;
          margin: 0;
          padding: 0;
        }
    
        .container {
          background-color: #ffffff;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          margin: 100px auto;
          padding: 20px;
          width: 300px;
        }
    
        p {
          font-size: 18px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <p>${msg}</p>
      </div>
    </body>
    </html>
    `
    return html
}

router.get('/stripe_payment', async (req, res) => {
    try {
        const { order, plan } = req.query

        const getOrder = await query(`SELECT * FROM orders WHERE data = ?`, [order || ""])
        const getPlan = await query(`SELECT * plan WHERE id = ?`, [plan])

        if (getOrder.length < 1) {
            return res.send("Invalid payment found")
        }

        if (getPlan.length < 1) {
            return res.send("Invalid plan id found")
        }

        const checkPayment = await checlStripePayment(getOrder[0]?.s_token)


        if (checkPayment.success) {
            res.send(returnHtmlRes("Payment Success! Redirecting..."))

            await query(`UPDATE orders SET data = ? WHERE data = ?`, [
                JSON.stringify(checkPayment?.data),
                order
            ])

            await updatePlan(getOrder[0]?.uid, JSON.stringify(getPlan[0]))
        } else {
            res.send("Payment Failed! If the balance was deducted please contact to the HamWiz support. Redirecting...")
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: "Something went wrong", err, success: false })
    }
})

export default router
