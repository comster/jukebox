JukeBox.js
==========

[Create amazing music experiences with node.js](http://jukeboxjs.com)

[Jukebox Demo](http://jukeboxjs.com/jukebox/)



#Documentation

Docs are generated using [docco-husky](https://github.com/mbrevoort/docco-husky) and [available at /docs/out/index.html in the repo](https://github.com/comster/jukebox/tree/master/docs/out), and [available via github pages](http://comster.github.com/jukebox/docs/out/index.html).



#Requirements

 - [Node.js](http://nodejs.org/)
 - [House.js](https://github.com/comster/house) via npm
 - [Mongodb](http://www.mongodb.org/) can be configured via config/config.js
 - [Exiftool](http://owl.phy.queensu.ca/~phil/exiftool/) is used on the server to extract metadata from media files, for now.


#Installation

Check the default values in config/config.js for the web port and mongodb connection.

	git clone git://github.com/comster/jukebox.git

	cd jukebox

	npm install house

	house --start


