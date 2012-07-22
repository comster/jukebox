//
// app
//
//
//
//
(function(){

    var app = {};
    
    app.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['chat.js'], function(chat) {
                        require(['jukebox.js'], function(jukebox) {
                            console.log(jukebox)
                            require(['aurora.js'], function() {
                                require(['mp3.js'], function() {
                                    window.SelectAudio = function(files) {
                                        var file = files[0];
                                        if (file.type.match(/audio.*/)) {
                                            var player = Player.fromFile(file);
                                            player.play();
                                        }
                                    }
                                    $('body').append('<input type="file" onchange="SelectAudio(this.files)" />');
                                    
                                    window.testPlay = function() {
                                        var url = '/api/files/04%20Florida.mp3';
                                        var player = Player.fromURL(url);
                                        player.play();
                                    }
                                });
                            });
                            
                            require(['dancer.js'], function() {
                                Dancer.addPlugin( 'waveform', function( canvasEl, options ) {
                                  options = options || {};
                                  var
                                    ctx     = canvasEl.getContext( '2d' ),
                                    h       = canvasEl.height,
                                    w       = canvasEl.width,
                                    width   = options.width || ( Dancer.isSupported() === 'flash' ? 2 : 1 ),
                                    spacing = options.spacing || 0,
                                    count   = options.count || 1024;
                                
                                  ctx.lineWidth   = options.strokeWidth || 1;
                                  ctx.strokeStyle = options.strokeStyle || "white";
                                
                                  this.bind( 'update', function() {
                                    var waveform = this.getWaveform();
                                    ctx.clearRect( 0, 0, w, h );
                                    ctx.beginPath();
                                    ctx.moveTo( 0, h / 2 );
                                    for ( var i = 0, l = waveform.length; i < l && i < count; i++ ) {
										// links.push(i,7);
                                      ctx.lineTo( i * ( spacing + width ), ( h / 2 ) + waveform[ i ] * ( h / 2 ));
                                    }
                                    ctx.stroke();
                                    ctx.closePath();
                                  });
                                window.waveform = waveform;
                                  return this;
                                });
                                
                                var dancer = new Dancer( "/api/files/06%20Sleep%20Ft.%20Young%20Buck,%20Chamillionaire.m4a" ),
                                beat = dancer.createBeat({
                                  onBeat: function ( mag ) {
                                    console.log('Beat!');
                                  },
                                  offBeat: function ( mag ) {
                                    console.log('no beat :(');
                                  }
                                });
                                
								window.dancer = dancer;
                                beat.on();
                                
                                dancer.onceAt( 10, function() {
                                  // Let's set up some things once at 10 seconds
                                }).between( 10, 60, function() {
                                  // After 10s, let's do something on every frame for the first minute
                                }).after( 60, function() {
                                  // After 60s, let's get this real and map a frequency to an object's y position
                                  // Note that the instance of dancer is bound to "this"
                                  object.y = this.getFrequency( 400 );
                                }).onceAt( 120, function() {
                                  // After 120s, we'll turn the beat off as another object's y position is still being mapped from the previous "after" method
                                  beat.off();
                                });
                                $('body').append('<canvas id="waveform" />');
                                
                                var canvas = document.getElementById('waveform');
                                dancer.waveform( canvas, { strokeStyle: '#ff0077' });
                                
                                dancer.play();
                            });
                            if(callback) callback(chat, jukebox);
                        });
                    });
                });
            });
        });
    }
		    var w = 1000,
		        h = 700,
		        links = [],
		        voronoiVertices = [],
		        color = d3.scale.quantize().domain([7000, 10000]).range(d3.range(2, 9));
				
				

		    var numVertices = 100; 
		    var vertices = d3.range(numVertices).map(function(d) { return {x: d.x, y: d.y}; })
		    var prevEventScale = 1;
		    var zoom = d3.behavior.zoom().on("zoom", function(d,i) {
		        if (d3.event.scale > prevEventScale) {
		            vertices.push(function(d) { return {x: d.x, y: d.y}; })
		        } else if (vertices.length > 2) {
		            vertices.pop();
		        }
		        force.nodes(vertices).start()
		        prevEventScale = d3.event.scale;
		    });
			
		    var svg = d3.select("#chart")
		            .append("svg")
		            .attr("width", w)
		            .attr("height", h)
		            .attr("class", "Reds") //have the color be manipulated by admin user
		            .call(zoom)

		    var force = self.force = d3.layout.force()
		            .charge(-300)
		            .size([w, h])
		            .on("tick", update);

		    force.nodes(vertices).start();

		    var circle = svg.selectAll("circle");
		    var path = svg.selectAll("path");
		    var link = svg.selectAll("line");

		    function update(e) {
		        voronoiVertices = vertices.map(function(o){return [o.x,  o.y, o]})
				

		        path = path.data(d3.geom.voronoi(voronoiVertices))
		        path.enter().insert("path", "path") //group all the path elements first so they have the lowest z-order
		            .attr("class", function(d, i) { return "q"+color(d3.geom.polygon(d).area())+"-9"; })
		            .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
		        path.attr("class", function(d, i) { return "q"+color(d3.geom.polygon(d).area())+"-9"; })
		            .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
		        path.exit().remove();

		        circle = circle.data(vertices)
		        circle.enter().append("circle")
		              .call(force.drag)
		              .attr("r", 0)
		              .attr("cx", function(d) { return d.x; })
		              .attr("cy", function(d) { return d.y; })
		              .transition().duration(1000).attr("r", 5);
		        circle.attr("cx", function(d) { return d.x; })
		              .attr("cy", function(d) { return d.y; });
		        circle.exit().transition().attr("r", 0).remove(); //leave alone
				
				
		        links = []
		        d3.geom.delaunay(voronoiVertices).forEach(function(d) {
		            links.push(edge(d[0], d[1]));
		            links.push(edge(d[1], d[2]));
		            links.push(edge(d[2], d[0])); 
		        });

		        link = link.data(links)
		        link.enter().append("line")
		        link.attr("x1", function(d) { return d.source[2].x; })
		            .attr("y1", function(d) { return d.source[2].y; })
		            .attr("x2", function(d) { return d.target[2].x; })
		            .attr("y2", function(d) { return d.target[2].y; })

		        link.exit().remove()
		    }

		    function edge(a, b) {
		
				return {
		            source: a,
		            target: b
		        };
		    }

    
    if(define) {
        define(function () {
            return app;
        });
    }
})();