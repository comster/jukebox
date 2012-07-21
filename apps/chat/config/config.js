exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        chat: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
