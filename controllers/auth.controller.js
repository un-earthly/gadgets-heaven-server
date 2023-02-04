const {
    loginService,
    signUpService,
    socialSignUpService
} = require('../services/auth.service.js')


module.exports = {
    loginController: (req, res) => {
        loginService(req.body)
            .then(res => console.log(res))
            .catch(err => console.error(err))
    },
    signUpController: (req, res) => {
        signUpService(req.body)
            .then(res => console.log(res))
            .catch(err => console.error(err))
    },
    socialSignUpController: (req, res) => {
        socialSignUpService(req.body)
            .then(res => console.log(res))
            .catch(err => console.error(err))
    }
}