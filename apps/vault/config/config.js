exports = module.exports.config = {
    version: 0.001,
    favicon: 'vaulticon.ico',
    iosicon: 'vaulticon.png',
    routes: [ {
        vault: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
