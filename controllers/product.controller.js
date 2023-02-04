const {
    getProductListService,
    getProductService,
    createProductService,
    deleteProductService,
    updateProductService,
    updateProductQuantityService,
} = require("../services/product.service.js")

module.exports = {
    getProductList: (req, res) => {
        getProductListService(req.query)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data,
                    message: "Products loaded successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error loading products",
                    error: err.message,
                });
            });
    },
    getProduct: (req, res) => {
        getProductService(req.params.id)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data,
                    message: "Product loaded successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error loading product",
                    error: err.message,
                });
            });
    },
    createProduct: (req, res) => {
        createProductService(req.body, req.files)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data: {
                        data,
                    },
                    message: "User created successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error creating user",
                    error: err.message,
                });
            });
    },

    updateProduct: (req, res) => {
        updateProductService(req.body)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data: {
                        data,
                    },
                    message: "Updated product successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error updating product",
                    error: err.message,
                });
            });
    },

    deleteProduct: (req, res) => {
        deleteProductService(req.body)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data: {
                        data,
                    },
                    message: "Deleted product successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error deleting product",
                    error: err.message,
                });
            });
    },

    updateProductQuantity: (req, res) => {
        updateProductQuantityService(req.body)
            .then((data) => {
                return res.status(200).json({
                    status: 200,
                    data: {
                        data,
                    },
                    message: "Successfully updated product quantity",
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Error updating product quantity",
                    error: err.message,
                });
            });
    }

}