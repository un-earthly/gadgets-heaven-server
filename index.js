const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 80
// middle Ware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('server is running')
})


app.listen(port)