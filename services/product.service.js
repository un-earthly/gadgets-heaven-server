const { inventoryCollection } = require("../database")


module.exports = {
    getProductListService: async (queryData) => {
        try {
            const activePage = parseInt(queryData.activePage)
            const pageSize = parseInt(queryData.pageSize)
            let items;
            if (pageSize || activePage) {
                items = await inventoryCollection.find().skip(pageSize * activePage).limit(pageSize).toArray()
            }
            else {
                items = await inventoryCollection.find().toArray()
            }
            return items
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    getProductService: async (productId) => {
        try {
            console.log({ productId })
            const item = await inventoryCollection.findOne({ _id: ObjectId(productId) })
            return item
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    createProductService: async (productData, files) => {
        try {
            console.log({ productData, files })

            const paymentProof = files?.paymentProof;
            var fileName = "";
            var fileLocation = "";
            if (paymentProof && paymentProof.length > 0) {
                fileLocation = paymentProof[0].location;
                fileName = fileLocation.split("/").pop();
            }

            if (!productData) {
                throw new Error("Please provide product data")
            }



            const newProduct = await inventoryCollection.insertOne(productData)
            return newProduct

        } catch (error) {
            if (paymentProof && paymentProof.length > 0) {
                await deleteFile(fileName);
            }
            console.log(error);
            throw new Error(error);
        }
    },

    updateProductService: async (user_data) => {
        try {
            console.log({ user_data })
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
            return result
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },

    updateProductQuantityService: async (user_data) => {
        try {
            console.log({ user_data })
            const toAdd = updateData.toAddQuantity
            const query = { _id: ObjectId(req.params.id) }
            const options = { upsert: true };
            const data = await inventoryCollection.findOne(query)
            let previousQuantity = parseInt(data.quantity)
            const newQuantity = toAdd ? previousQuantity + parseInt(req.body.quantity) :
                previousQuantity - 1
            const updateDoc = {
                $set: {
                    quantity: newQuantity
                }
            }
            res.send(await inventoryCollection.updateOne(query, updateDoc, options))

        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },

    deleteProductService: async (productData) => {
        try {
            console.log({ productData })
            const deletedItem = await inventoryCollection.deleteOne({ _id: ObjectId(productData.id) })
            return deletedItem
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },


}