const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 80
const jwt = require('jsonwebtoken')
// middle Ware
app.use(cors())
app.use(express.json())

// jwt verify
// function verifyJWT(req, res, next) {
//     const authHeader = req.headers.authorization
//     if (!authHeader) {
//         return res.status(401).send({ message: 'Un Authorized Access' })
//     }
//     const token = authHeader.split(' ')[1]
//     jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
//         if (err) {
//             return res.status(403).send({ messege: 'forbideden' })
//         }
//         req.email = req.decoded

//     })
// }
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })
}
// db

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.34b5j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    try {
        client.connect()

        const inventoryCollection = client.db('gadgetsDB').collection('gadgets')



        // auth
        app.post('/login', async (req, res) => {
            const secret = process.env.ACCESS_TOKEN
            const token = jwt.sign(req.body, secret)
            res.send({ token })
        })

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
        app.get('/byemail', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                res.send(await inventoryCollection.find({ email: email }).toArray())
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }

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