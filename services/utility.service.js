const { inventoryCollection } = require("../database")

module.exports = {
    filterByEmailService: async (user_data) => {
        try {
            console.log({ user_data })
            const activePage = parseInt(user_data.activePage)
            const pageSize = parseInt(user_data.pageSize)
            const decodedEmail = user_data.email;
            const email = user_data.email;
            const query = { email }
            let items;

            if (email === decodedEmail) {
                if (pageSize || activePage) {
                    items = await inventoryCollection.find(query).skip(pageSize * activePage).limit(pageSize).toArray()
                }

            }
            return items
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    pageCountService: async () => {
        try {
            const count = await inventoryCollection.estimatedDocumentCount()
            return count
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    pageCountEmailService: async (user_data) => {
        try {
            console.log({ user_data })
            const query = { email: user_data }
            const count = await inventoryCollection.find(query).count()
            return count

        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
}