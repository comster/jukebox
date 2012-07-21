exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        applications: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
