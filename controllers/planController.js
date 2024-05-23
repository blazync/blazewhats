import query from '../database/dbpromise.js'
import { convertToMySQLDate, updatePlan, createOrder, rzCapturePayment } from '../functions/function.js'
import fetch from 'node-fetch'
import { setting } from './zarnipal/zarnipal.js';
import * as Instamojo from './instamojo/instamojo.js'
import Stripe from 'stripe';
import mercadopago from 'mercadopago'

const add = async (req, res) => {
    try {
        const body = req.body
        if (!body.name ||
            !body.msglimit ||
            !body.contactlimit ||
            !body.templetlimit ||
            body.playDays < 1 ||
            !body.plantype) {
            return res.json({ msg: "Please fill all required fields" })
        }

        body.allow_official_wa_bot = body.allow_official_wa_bot ? 1 : 0

        await query(`INSERT INTO plan (
            name,
            instance,
            price,
            msglimit,
            contactlimit,
            templetlimit,
            allow_webhook,
            allowapi,
            allowchatbot,
            allowbulkmsg,
            allowschedulemsg,
            allow_data_extract,
            allow_multi_instance,
            allow_official_wa_bot,
            planexpire
        ) VALUE (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            body.name,
            body.instance_limit,
            body.price,
            body.msglimit,
            body.contactlimit,
            body.templetlimit,
            body.allow_webhook,
            body.allowapi,
            body.allowchatbot,
            body.allowbulkmsg,
            body.allowschedulemsg,
            body.allow_data_extract,
            body.allow_multi_instance,
            body.allow_official_wa_bot,
            body.playDays
        ])
        res.json({ msg: "Plan was addedd", success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const getAllPlan = async (req, res) => {
    try {
        const plans = await query(`SELECT * FROM plan`, [])
        res.json({ data: plans, success: true })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const delPlan = async (req, res) => {
    try {
        await query(`DELETE FROM plan WHERE id = ?`, [req.body.planid])
        res.json({ success: true, msg: "Plan was deleted" })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const payWithPaypal = async (req, res) => {
    try {
        const orderID = req.body.order_id
        const plan = req.body.plan
        if (!plan || !orderID) {
            return res.json({ msg: "order id and plan required" })
        }

        // getting web 
        const web = await query(`SELECT * from web`, [])
        // getting keys 
        const paypal = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['paypal'])

        const paypalClientId = paypal[0].payment_id
        const paypalClientSecret = paypal[0].payment_keys

        let response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${paypalClientId}:${paypalClientSecret}`, 'binary').toString('base64')
            }
        })

        let data = await response.json();

        let resp_order = await fetch(`https://api.sandbox.paypal.com/v1/checkout/orders/${orderID}`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + data.access_token
            }
        });

        let order_details = await resp_order.json()

        if (order_details.status === 'COMPLETED') {

            await updatePlan(req.decode.uid, JSON.stringify(plan))

            await createOrder(req.decode.uid, 'Paypal', plan.price, JSON.stringify(order_details))

            res.json({ success: true, msg: "Thank for your payment you are good to go now." })

        } else {
            res.json({ success: false, msg: "error_description" })
            return
        }


    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const payWithMer = async (req, res) => {
    try {
        const plan = req.body.plan
        const mercadopagoKey = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['mercadopago'])
        const web = await query(`SELECT * FROM web`, [])

        mercadopago.configure({
            access_token: "TEST-8855653290229697-072512-d7e41a875a0229ea09543ccb263b33f3-75148809"
        })

        const finalamt = parseInt(req.body.plan?.price) / parseInt(web[0].exchange_rate) * 80

        var preference = {
            items: [
                {
                    title: plan.name,
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: finalamt
                }
            ]
        };


        const respp = await mercadopago.preferences.create({
            items: [
                {
                    title: plan.name,
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: finalamt
                }
            ],
            back_urls: { success: "http://localhost:8000/plan/mercadopago-callback" },
            notification_url: "https://bd82-2405-201-682f-e06d-2d18-95a6-5457-b5f.ngrok.io/api/plan/mercadopago-callback"
        })

        console.log({ respp: respp })

        res.json({ success: true, data: respp, msg: "link generated" })
    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}


const callBackMerco = async (req, res) => {
    try {
        const query = req.query
        console.log({ query })
        res.json("OKAY")
    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}


const payWithPayStack = async (req, res) => {
    try {
        const planData = req.body.plan
        const trans_id = req.body.trans_id

        if (!planData || !trans_id) {
            return res.json({
                msg: "Order id and plan required"
            })
        }

        // getting plan 
        const plan = await query(`SELECT * FROM plan WHERE id = ?`, [planData.id])

        if (plan.length < 1) {
            return res.json({ msg: "Sorry this plan was not found" })
        }


        // getting keys 
        const paystack = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['paystack'])
        const cred = paystack[0]
        const paystackSecretKey = cred.payment_id;
        const transactionId = trans_id;

        var response = await fetch(`https://api.paystack.co/transaction/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json'
            }
        })

        const resp = await response.json()


        if (resp.data?.status !== 'success') {
            res.json({ success: false, msg: resp.message })
            return
        }

        await updatePlan(req.decode.uid, JSON.stringify(plan[0]))

        await createOrder(req.decode.uid, 'Paystack', plan[0].price, JSON.stringify(resp))

        res.json({ success: true, msg: "Thank for your payment you are good to go now." })


    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const payWithRazorpay = async (req, res) => {
    try {
        if (!req.body.rz_payment_id || !req.body.plan || !req.body.amount) {
            return res.json({ msg: "please send required fields" })
        }

        // getting web 
        const web = await query(`SELECT * from web`, [])
        const data = web[0]
        const planID = req.body.plan
        const mobile = req.body.mobile

        // getting plan 
        const plan = await query(`SELECT * FROM plan WHERE id = ?`, [planID.id])

        // getting keys 
        const razorpay = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['razorpay'])

        if (plan.length < 1) {
            return res.json({ msg: "Sorry this plan was not found" })
        }

        const finalamt = parseInt(req.body.amount) / parseInt(data.exchange_rate) * 80

        const resp = await rzCapturePayment(req.body.rz_payment_id, Math.round(finalamt) * 100, razorpay[0].payment_id, razorpay[0].payment_keys)

        if (!resp) {
            res.json({ success: false, msg: resp.description })
            return
        }

        await updatePlan(req.decode.uid, JSON.stringify(plan[0]))

        await createOrder(req.decode.uid, 'Razorpay', plan[0].price, JSON.stringify(resp))

        res.json({ success: true, msg: "Thank for your payment you are good to go now." })


    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const payWithPaytm = async (req, res) => {
    try {


    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const payWithZarnipal = async (req, res) => {
    try {
        const paymentToken = Date.now()
        const amount = req.body.amount
        const description = req.body.description
        const plan = req.body.plan

        if (!amount || !description || !plan) {
            return res.json({ msg: "please send required fields" })
        }
        // adding token 
        await query(`UPDATE payment_gateways SET payment_keys = ? WHERE code = ? `, [paymentToken, 'zarnipal'])

        // getting zrn keys 
        const zarni = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['zarnipal'])

        // getting user 
        const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])

        // getting web 
        const web = await query(`SELECT * FROM web`, [])

        // const zarniPal = new setting()

        const zarinpal = new setting(zarni[0].payment_id, false)

        const finalAmount = plan.price / web[0].exchange_rate * 80

        const authority = await zarinpal.requestPayment({ amount: Math.round(finalAmount), callbackUrl: process.env.URI + `/api/plan/verify-zarnipal?uid=${req.decode.uid}&plan_id=${plan.id}`, description: plan.name })

        const redirect = zarinpal.startPayUrl + authority

        res.json({ success: true, url: redirect })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}


const verifyZarnipal = async (req, res) => {
    try {
        if (!req.query.Authority) {
            res.json({ success: false, msg: "Invalid request" })
        }

        const plan_id = req.query.plan_id

        const getPlan = await query(`SELECT * FROM plan WHERE id = ?`, [plan_id])

        if (getPlan.length < 1) {
            return res.json({ msg: "This plan was not found. Contact custom support." })
        }

        // getting web 
        const web = await query(`SELECT * FROM web`, [])

        // getting zarni payment id 
        const zarni = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['zarnipal'])

        const finalAmount = getPlan[0].price / web[0].exchange_rate * 80

        const zarinpal = new setting(zarni[0].payment_id, false)


        const refId = await zarinpal.verifyPayment({ authority: req.query.Authority, amount: finalAmount })


        await updatePlan(req.query.uid, JSON.stringify(getPlan[0]))

        await createOrder(req.query.uid, 'Zarnipal', getPlan[0].price, JSON.stringify(refId))

        console.log(refId)

        if (refId) {
            res.send("<h1>Payment Success\nYou can login your account now</h1>")
        }


    } catch (err) {
        console.log(err)
        res.json({ msg: 'transaction error', err })
    }
}

const payWithStripe = async (req, res) => {
    try {
        // Retrieve keys from the database
        const stripeKeys = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['stripe']);
        const stripeSecretKey = stripeKeys[0]?.payment_keys;

        // Create a new Stripe instance
        const stripeClient = new Stripe(stripeSecretKey);

        // Get the request body
        const { token, amount } = req.body;

        console.log({ token, amount })

        // Create a charge with Stripe
        const charge = await stripeClient.charges.create({
            source: token?.id,
            amount: amount,
            currency: 'usd',
        });
        if (charge.paid) {
            // getting plan 
            const plan = await query(`SELECT * FROM plan WHERE id = ?`, [req.body?.plan?.id])
            await updatePlan(req.decode.uid, JSON.stringify(plan[0]))

            await createOrder(req.decode.uid, 'Stripe', plan[0].cost, JSON.stringify(charge))

            res.json({ success: true, msg: "Thanks for the payment youa re good to go now" })


        } else {
            res.json({ msg: "Something went wrong", charge })
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, msg: err?.raw?.message || "Something went wrong", err });
    }
}


const payWithInstamojo = async (req, res) => {
    try {

        const plan = req.body.plan
        const web = await query(`SELECT * FROM web`, [])
        const userData = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        const user = userData[0]
        const apiKeys = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['instamojo'])
        console.log(apiKeys[0].payment_id, apiKeys[0].payment_keys)

        Instamojo.isSandboxMode(false)
        Instamojo.setKeys(apiKeys[0].payment_id, apiKeys[0].payment_keys)

        const options = {
            purpose: plan.name, // REQUIRED
            amount: plan.price / web[0].exchange_rate * 80, // REQUIRED and must be > ₹3 (3 INR)
            currency: "INR",
            buyer_name: user.name,
            email: user.email,
            phone: null,
            send_email: false,
            send_sms: false,
            allow_repeated_payments: false,
            webhook: "",
            redirect_url: `${process.env.URI}/api/plan/verify-instamojo?uid=${req.decode.uid}&plan_id=${plan.id}`,
        };

        const paymentData = Instamojo.PaymentData(options);

        const response = await Instamojo.createNewPaymentRequest(paymentData);

        console.log({ response })

        if (response.success) {
            res.json({ success: true, url: response?.payment_request?.longurl })
        } else {
            res.json({ success: false, msg: "It seems instamojo api keys are not valid" })
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}


const verifyInstamojo = async (req, res) => {
    try {
        const payment_id = req.query.payment_id
        const payment_request_id = req.query.payment_request_id
        const uid = req.query.uid
        const plan_id = req.query.plan_id

        if (!payment_id || !payment_request_id || !plan_id || !uid) {
            return res.json({ msg: "Invalid request" })
        }

        const instamojo = await query(`SELECT * FROM payment_gateways WHERE code = ?`, ['instamojo'])

        const getPlan = await query(`SELECT * FROM plan WHERE id = ?`, [plan_id])

        if (getPlan.length < 1) {
            return res.json({ msg: "This plan was not found. Contact custom support." })
        }

        Instamojo.isSandboxMode(false)
        const resp = await Instamojo.getOnePayedPaymentDetails(payment_request_id, payment_id, instamojo[0].payment_id, instamojo[0].payment_keys, false)


        if (resp.success && resp.payment_request?.payment?.status == "Credit") {

            await updatePlan(uid, JSON.stringify(getPlan[0]))

            await createOrder(uid, 'Instamojo', getPlan[0].price, JSON.stringify(resp.payment_request?.payment))

            res.send("<h1>Payment Success\nYou can login your account now</h1>")
        } else {
            res.json({ msg: "Transaction failed, check your API keys" })
        }

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}

const payFree = async (req, res) => {
    try {
        const planid = req.body.plan_id
        const uid = req.decode.uid
        if (!planid) {
            return res.json({ msg: "No plan provided" })
        }
        const checPlan = await query(`SELECT * FROM plan WHERE id = ?`, [planid])
        if (checPlan.length < 1) {
            return res.json({ msg: "There is no plan found you requested for" })
        }
        if (checPlan[0].price > 0) {
            return res.json({ mgs: "This plan is not free" })
        }

        await updatePlan(uid, JSON.stringify(checPlan[0]))

        await createOrder(uid, 'Offline', checPlan[0].price, JSON.stringify("Offline payment"))

        res.json({ success: true, msg: "Your plan was activated you are good to go now." })

    } catch (err) {
        console.log(err)
        res.json({ msg: 'server error', err })
    }
}


export { add, getAllPlan, payFree, callBackMerco, payWithMer, payWithStripe, delPlan, verifyInstamojo, payWithPaypal, payWithInstamojo, verifyZarnipal, payWithPayStack, payWithRazorpay, payWithZarnipal }
