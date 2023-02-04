module.exports = {
    loginService: async (user_data) => {
        try {
            console.log({ user_data })
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    signUpService: async (user_data) => {
        try {
            console.log({ user_data })
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
    socialSignUpService: async (user_data) => {
        try {
            console.log({ user_data })
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    },
}