const {
    pageCountEmailService,
    pageCountService,
    filterByEmailService,
} = require("../services/utility.service.js")

module.exports = {
    pageCountEmailController: (req, res) => {
        pageCountEmailService(req.query.email)
            .then(data =>  {
                return res.status(200).json({
                    status: 200,
                    data,
                    message: "Products loaded successfully",
                });
            })
            .catch(err => console.log(err))
    },
    pageCountController: (req, res) => {
        pageCountService()
            .then(data => {
                return res.status(200).json({
                    status: 200,
                    data,
                    message: "Products loaded successfully",
                });
            })
            .catch(err => console.log(err))
    },
    filterByEmailController: (req, res) => {
        filterByEmailService(req.query)
            .then(data => {
                return res.status(200).json({
                    status: 200,
                    data,
                    message: "Products loaded successfully",
                });
            })
            .catch(err => console.log(err))
    },

}
