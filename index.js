const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 80
// middle Ware
app.use(cors())
app.use(express.json())


// db

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.34b5j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    try {
        client.connect()

        const inventoryCollection = client.db('gadgetsDB').collection('gadgets')
        // serve all api
        app.get('/inventory', async (req, res) => {
            res.send(await inventoryCollection.find().toArray())
        })

        // serve one by filtering with id
        app.get('/inventory/:id', async (req, res) => {
            res.send(await inventoryCollection.findOne({ _id: ObjectId(req.params.id) }))
        })

        // create data api
        app.post('/additem', async (req, res) => {
            res.send(await inventoryCollection.insertOne(req.body))
        })

        //delete data api
        app.delete('/delete/:id', async (req, res) => {
            const result = await inventoryCollection.deleteOne({ _id: ObjectId(req.params.id) })
            res.send(result)
        })
        // 
        // filter by email
        app.get('/byemail', async (req, res) => {
            res.send(await inventoryCollection.find({ email: req.query.email }).toArray())
        })

        // update one
        app.put('/update/:id', async (req, res) => {
            const updateItem = req.body;
            const filter = { _id: ObjectId(req.params.id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    title: updateItem.title,
                    price: updateItem.price,
                    desc: updateItem.desc,
                    dist: updateItem.dist,
                    supplier: updateItem.supplier,
                    img1: updateItem.img1,
                    img2: updateItem.img2,
                    img3: updateItem.img3,
                    brand: updateItem.brand,
                    category: updateItem.category,
                    quantity: updateItem.quantity,
                    target: updateItem.target,
                    sold: updateItem.sold,
                    lastmonthsold: updateItem.lastmonthsold,
                    ratings: updateItem.ratings,
                    platform: updateItem.platform
                }
            };
            const result = await inventoryCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
            // console.log(req.body)
        })
    } finally {

    }
}

run()
// serving / api
app.get('/', (req, res) => {
    res.send('server is running')
})


app.listen(port)