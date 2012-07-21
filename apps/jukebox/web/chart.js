	<script type="text/javascript">
	    var w = 960,
	        h = 500,
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
	            .attr("class", "Reds")
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
	        circle.exit().transition().attr("r", 0).remove();

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
	</script>