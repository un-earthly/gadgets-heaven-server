const router = require("express").Router();
const {
    getProductList,
    getProduct,
    createProduct,
    deleteProduct,
    updateProduct,
    updateProductQuantity
} = require("../controllers/product.controller.js");
router.get("/list", getProductList)
router.get("/:id", getProduct)
router.post("/create", createProduct)
router.patch("/update/:id", updateProduct)
router.patch("/update_quantity/:id", updateProductQuantity)
router.patch("/delete/:id", deleteProduct)
module.exports = router