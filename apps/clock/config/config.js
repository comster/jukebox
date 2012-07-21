exports = module.exports.config = {
    version: 0.001,
    favicon: 'favicon.ico',
    iosicon: 'iosicon.png',
    routes: [ {
        clock: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
