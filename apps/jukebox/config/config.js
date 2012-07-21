exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        jukebox: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
