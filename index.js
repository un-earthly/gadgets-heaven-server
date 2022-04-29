const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 80
// middle Ware
app.use(cors())
app.use(express.json())


// db

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.34b5j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    try {
        client.connect()
        console.log('success')

        const inventoryCollection = client.db('gadgetsDB').collection('gadgets')
        // serve all api
        app.get('/inventory', async (req, res) => {
            res.send(await inventoryCollection.find().toArray())
        })

        //
    } finally {

    }
}

run()
// serving / api
app.get('/', (req, res) => {
    res.send('server is running')
})


app.listen(port)