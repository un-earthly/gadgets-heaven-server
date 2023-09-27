const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 8000
const verifyJWT = require('./middleweres/verfiyJWT')
const authRoutes = require('./routes/auth.route.js')
// const userRoutes = require('./routes/user.route.js')
const productRoutes = require('./routes/product.route.js')
const utilityRoutes = require('./routes/utility.route.js')
const { connectToDb } = require('./database')
app.use(cors())
app.use(express.json())



app.use("/api/auth", authRoutes)
app.use("/api/product", productRoutes)
app.use("/api/utility", utilityRoutes)




// app.put('/addquanity/:id', async (req, res) => {
//     const query = { _id: ObjectId(req.params.id) }
//     const options = { upsert: true };
//     const data = await inventoryCollection.findOne(query)
//     let previousQuantity = parseInt(data.quantity)
//     const newQuantity = previousQuantity + parseInt(req.body.quantity)
//     const updateDoc = {
//         $set: {
//             quantity: newQuantity
//         }
//     }
//     res.send(await inventoryCollection.updateOne(query, updateDoc, options))
// })

// pagination
connectToDb()
app.get('/', (req, res) => {
    res.send('server is running')
})

 
app.listen(port, () => console.log("app running on port" + port))