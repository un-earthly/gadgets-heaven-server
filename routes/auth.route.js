const router = require('express').Router();
const {
    loginController,
    signUpController,
    socialSignUpController
} = require('../controllers/auth.controller.js');

router.post("/login", loginController)
router.post("/sign_up", signUpController)
router.post("/social_sign_up", socialSignUpController)


module.exports = router