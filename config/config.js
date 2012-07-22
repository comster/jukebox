exports = module.exports.config = {
    env: "dev",
    version: .101,
    webPort: 14401,
    webPortSecure: 8443,
    filters: [
        {parser:{}},
        {session:{houseGuest:{
                guestName: "Anonymous Coward",
                cookieDomain: "",
                ds: "mongo",
                col: "sessions"
        }}},
        {router:{simpleRoute:{routes:[
                {api: {api:{rest:{}}}},
        ]}}},
        {static:{paper:{
                publicFolder: "web"
        }}},
        {backDoor:{}}
    ],
  dataSources: {
    mongo: {
      mongodb: {
        url: process.env.MONGOHQ_URL
      }
    },
    memcache: {
      memcache: {
        server: 'localhost'
      }
    },
    fileSystem: {
      fs: {
        path: __dirname+'/../../'
      }
    },
    fileSystem: {
      fs: {
        path: '/tmp'
      }
    }
  }
};