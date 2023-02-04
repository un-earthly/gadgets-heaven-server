const router = require('express').Router();
const {
    pageCountEmailController,
    pageCountController,
    filterByEmailController
} = require('../controllers/utility.controller.js');
const verfiyJWT = require('../middleweres/verfiyJWT.js');

router.get("/page_count_email", pageCountEmailController)
router.get("/page_count", pageCountController)
router.get("/filter_by_email", filterByEmailController)


module.exports = router