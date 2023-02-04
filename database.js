// const { MongoClient } = require("mongodb");
// const connectionString = process.env.ATLAS_URI;
// const client = new MongoClient(connectionString, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

const {
    MongoClient,
    ServerApiVersion,
} = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.34b5j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});

const connectToDb = () => {
    try {

        client.connect()

        console.info("connection established")

    } catch (err) {
        console.log(err)
    }
};

const getDbCollections = (dbName, collectionName) => {
    connectToDb()
    const dbCollections = client.db(dbName).collection(collectionName)
    return dbCollections
};

const inventoryCollection = getDbCollections("gadgetsDB", "gadgets")

module.exports = {
    client,
    connectToDb,
    getDbCollections,
    inventoryCollection
} 