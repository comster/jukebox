exports = module.exports.config = {
    env: "dev",
    version: .101,
    webPort: 8888,
    tmp: __dirname+'/../tmp',
    filters: [
	{parser:{}},
        {session:{houseGuest:{
		guestName: "Anonymous Punk",
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
        //url: process.env.MONGOHQ_URL
	server: 'localhost',
        db: 'jukebox'
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
