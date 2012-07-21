exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        files: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
