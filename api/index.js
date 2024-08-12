import path from 'path'
import dotenv from 'dotenv'
import express from 'express'
import Stripe from 'stripe'
import schedule from 'node-schedule'
import { initApp } from './src/initApp.js'
import { Cart, Product, User } from './db/index.js'
import { status } from './src/utils/constant/enums.js'
const app = express()
// schedule.scheduleJob('1 1 1 * * *', async function () {
//     const users = await User.find({ status: status.PENDING, createdAt: { $lte: Date.now() - 30 * 24 * 60 * 60 * 1000 } }).lean()
//     const userIds = users.map((user) => { return user._id })
//     await User.deleteMany({ _id: { $in: userIds } })
//     // delete images

// });
// schedule.scheduleJob('1 1 1 * * *', async () => {
//     const users = await User.find({ status: status.DELETED, updatedAt: Date.now() - 3 * 30 * 24 * 60 * 60 * 1000 })

// })

dotenv.config({ path: path.resolve('./config/.env') })
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'].toString();
    const stripe = new Stripe(process.env.STRIPE_KEY)
    let event;

    event = stripe.webhooks.constructEvent(req.body, sig, "whsec_507668cffb0f3fb8dc1126f548fdd01243b463356b05d8cec8f7f06eeab54ebf");

    if (event.type == 'checkout.session.completed') {
        const object = event.data.object;
        // logic
        // cart
        console.log(object.client_reference_id);
        
        const cart = await Cart.findById(object.client_reference_id)
        for (const product of cart.products) {
            await Product.findByIdAndUpdate(product.productId, { $set: { $inc: { stock: -product.quantity } } })
        }
        cart.products = []
        await cart.save()
    }
    // Return a 200 res to acknowledge receipt of the event
    res.send();
});
initApp(app, express)
