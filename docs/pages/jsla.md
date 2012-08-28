JS.LA
=====

[Jukebox Home](http://JukeboxJs.com/)
[Jukebox Demo](http://JukeboxJs.com/jukebox/)
[Jukebox on Github](https://github.com/comster/jukebox/)
[About Me](https://www.jeffpelton.com/)

![JSLA](jukebox_jsla.png)



Contents
========
 - App Requirements
 - Technology Strategy
 - HTML5 App Features & Limitations
 - System Architecture
 - RESTful server, socketio, and static files
 - Backbone Client App
 - Organizing a backbone project
 - Chat & sockets
 - Audio in the browser using aurora.js
 - Metadata from audio, album art
 - HTML sliders and progress bars, drag and drop
 - Uploading with xhr2
 - Vizualizing audio using dancer.js & d3
 - Mobile approach using media queries and user agent
 - Where to go from here?




##App Requirements

 - HTML5 Web App
 - Audio Playback without Flash
 - Chat Rooms via Sockets
 - User Authentication
 - Media Server
 - Library Data
 - Queue Data




##Technology Strategy

_Open Source_.  Not targeting massive deployment to production.  Experimenting with the technology.

 - [mongodb](http://www.mongodb.org/)
 - [node.js](http://nodejs.org/)
 - [house.js](https://github.com/comster/house)
 - [socket.io.js](http://socket.io)
 - [jquery.js](http://jquery.com/)
 - [underscore.js](http://documentcloud.github.com/underscore/)
 - [backbone.js](http://backbonejs.org/)
 - [aurora.js](https://github.com/ofmlabs/aurora.js/)
 - [dancer.js](http://jsantell.github.com/dancer.js/)
 - [d3.js](http://d3js.org/)



##HTML5 App Features & Limitations

Applications targeting the browser.  HTML5, JS & CSS.
 
 - Browser compatability
 - URLs & SEO
 - Device screen resolutions
 - Network connection, Offline & Caching
 
 Resources
 - [HTML5rocks.com](http://www.html5rocks.com/)
 - [Can I Use.com](http://caniuse.com/)
 - [TodoMVC: JS framework list](http://todomvc.com/)




##System Architecture


### Server

 - House on Node.js
   - Users & Auth
   - Media Uploads
   - Library Data & Queue
   - Chat Room Sockets

### Client

 - Backbone App View
    - Nav View
    - Media Player View
      - Player Controls
      - Player Information
      - Player Visualization
    - Library View
      - Song List
         - Song Row
      - Song Upload
      - Song Search
    - Queue View
      - Song Queue List
      - Song Played List
    - Chat View
      - Room List
         - New Room Form
      - Open Room
         - Member List
         - Message List
            - Message Row
              - User Avatar & Name
              - Msg Txt
         - New Message Form




##RESTful server, socketio, and static files

Backbone friendly REST endpoints:

- [Authentication](endPoints/auth/index.js.html)
- [Media Files](endPoints/files/index.js.html)
- [Song Library](endPoints/songs/index.js.html)
- [Song Queue](endPoints/songq/index.js.html)
- [Songs Played](endPoints/songp/index.js.html)
- [Chat Rooms](endPoints/chat/index.js.html) REST & socket server

Backbone static files served from apps/jukebox/web to /jukebox



##Backbone Client App

 Organizing a backbone project

 - Routing URLs
 - [Can I Use?: History](http://caniuse.com/#feat=history)
 - [Require.js](http://requirejs.org/) & [Why AMD?](http://requirejs.org/docs/whyamd.html)

 Understand how Views, Models and Collections work together:

 - Views have a var $el, a render() function and can listen to dom events
 - Views often reference a Collection or Model. ex. ListView (has col) and RowView (has model).
 - Collections contain Models




##Chat & sockets

 - [Chat Server](endPoints/chat/index.js.html)
 - [Chat Backbone](apps/jukebox/web/houseChat.js.html)




##Audio in the browser using aurora.js

 - [Can I Use?: Audio API](http://caniuse.com/#feat=audio-api)




##Metadata from audio, album art




##HTML sliders and progress bars, drag and drop

 - [Can I Use?: Input range](http://caniuse.com/#feat=input-range)
 - [Can I Use?: Progress Meter](http://caniuse.com/#feat=progressmeter)
 - [Can I Use?: DragnDrop](http://caniuse.com/#feat=dragndrop)
 - [http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd](http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd)

Example:

    <input class="rating" type="range" min="0" max="100" title="Rating" value="50">
    
    <meter min="0.0" max="100.0" value="33.33"></meter>


Result:

<input class="rating" type="range" min="0" max="100" title="Rating" value="50">

<meter min="0.0" max="100.0" value="33.33"></meter>



##Uploading with xhr2

 - [XMLHttpRequest Level 2](http://dev.w3.org/2006/webapi/XMLHttpRequest-2/)
 - [HTML5rocks.com/en/tutorials/file/xhr2/](http://www.html5rocks.com/en/tutorials/file/xhr2/)
 - [Can I Use?: XHR2](http://caniuse.com/#feat=xhr2)


Example:

    var formData = new FormData();
    var xhr = new XMLHttpRequest();
    
    formData.append('files', blobOrFile);
    
    xhr.open('POST', '/api/files', true);
    
    // Listen to the upload progress.
    var progressBar = $row.find('progress');

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        progressBar.val((e.loaded / e.total) * 100);
        progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
      }
    };
    
    xhr.onload = function(e) {
        console.log('upload complete');
        var data = JSON.parse(e.target.response);
    };
    
    xhr.send(formData);

##Vizualizing audio using dancer.js & d3

 - [Basic D3 Sample](http://bl.ocks.org/1062544)
 - Dancer [patch](https://github.com/comster/dancer.js/commit/1b369a78dce26829b495b86d4aa0f5fddfeded1f) to work with Aurora [forked on github](https://github.com/comster/dancer.js)
 - [Dancer.js & Aurora Example](http://comster.github.com/dancer.js/examples/aurora/)
 - [Dancer API](http://jsantell.github.com/dancer.js/)

Example:

    var dancer = new Dancer();
    
    var kick = dancer.createKick({
        onKick: function ( mag ) {
          console.log('Kick!');
        },
        offKick: function ( mag ) {
          console.log('no kick :(');
        }
      }).on();


##Mobile approach using media queries and user agent

 - Target screen sizes using css media queries
 - Use browser user agent to determain iphone for limiting visualization
 - Not currently targeting network connection for media format & compression

Example of css media query to format app for smaller screens:

    @media only screen and (min-width: 767px) {
        nav li:hover {
            color: green;
        }
    }

Example of window.navigator.userAgent.indexOf('iphone');

##Where to go from here?

 - Web Workers
 - Reference files remotely, without CORS
 - Podcast player
 - Visualizations as plug-ins
 - Skins
 - Drag and drop images to chat
 - DJ more than the audio
 - Drag and drop queue
 - Round Robin Queue
 - Compress HTML app css & js.


<style>
h2 {
  margin: 180px 0px 15px 0px;
}
ul li {
  padding: 4px 0px;
}
</style>