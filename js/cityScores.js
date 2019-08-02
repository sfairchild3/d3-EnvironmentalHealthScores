 (function () {
 	//psuedo-global variables from enviroData to join to bayArea census tracts
 	var attrArray = ["Overall Score",
		"Asthma", "Cleanup Sites", "Pollution Burden", "Poverty", "Solid Waste"]

 	var expressed = attrArray[0] //first attribute in array

 	//create variable for data 
 	var evData = d3.map();


 	//chart frame dimensions
 	var chartWidth = 480,
 		chartHeight = 230,
 		leftPadding = 25,
 		rightPadding = 2,
 		topBottomPadding = 5,
 		chartInnerWidth = chartWidth - leftPadding - rightPadding,
 		chartInnerHeight = chartHeight - topBottomPadding * 2,
 		translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

 	//chart scale 
 	var yScale = d3.scaleLinear()
 		.range([0, chartHeight])
 		.domain([0, 105]);

 	var cityOrder = []


 	var axisScale = d3.scaleLinear()
 		.range([0, chartHeight])
 		.domain([105, -5]);

 	window.onload = setMap();

 	/** Initializes function to create map and import data to map.
 	 * Calls rest of script functions except changeAttribute which is called
 	 * in createDropdown */

 	function setMap() {

 		//set height, projection, and svg container for the map
 		var height = 450;

 		var map = d3.select("#map")
 			.append("svg")
 			.attr("class", "map")
 			//			.attr("width", width)
 			.attr("height", height);


 		//		var projection = d3.geoMercator()
 		//			.scale(30000)
 		//			.center([-121.9, 37.6])
 		//			.translate([240, height / 2])
 		//					.rotate([0, 0, 0])

 		//good projecion for bay area overview in geoAlbersUSA
 		//		var projection = d3.geoAlbersUsa()
 		//			.scale(15000)
 		//			.translate([5500, 900])

 		//geoAlbersUSA projection focused on SF Bay Area
 		var projection = d3.geoAlbersUsa()
 			.scale(48000)
 			.translate([16700, 1700])


 		var path = d3.geoPath()
 			.projection(projection);

 		// d3.queue is deprecated in d3.v5. Data imported using Promises 

 		//set files to variable names 
 		var bayShapes = "data/BAShapes_v2.topojson"
 		//		var enviroScreen = "data/BayAreaCalEnviroScreen_2018.csv"
 		var enviroScreen = "data/Alameda_data.csv"
 		var bayWater = "data/BayWaters.topojson"
 		var bayCounties = "data/Bay_Area_Counties.topojson"
 		var CA = "data/CA.topojson"
 		var alameda = "data/Alameda_4326.topojson"
 		var USA = "data/country.json"
 		var city_bounds = "data/city_boundaries.topojson"
 		var city_avgs = "data/city_avgs.csv"


 		//call file variables in Promises
 		Promise.all([d3.json(alameda),
					 d3.csv(city_avgs,
 				function (d) {
 					evData.set(d.id, +d[expressed])
 				}),
					d3.json(bayWater),
					d3.json(bayCounties),
					d3.json(CA),
					d3.json(USA),
					d3.csv(city_avgs),
					d3.csv(enviroScreen),
					d3.json(city_bounds),
					]).then(function (data) {


 			var alameda = data[0];
 			var bayWater = data[2];
 			var counties = data[3];
 			var state = data[4];
 			//			var country = data[5]
 			var cities = data[6];
 			var enviroData = data[7];
 			var cityBoundaries = data[8]




 			//create overlays for reference from promise data
 			var cal = topojson.feature(state, state.objects.CA);

 			//alameda county census tract layer
 			var alameda = topojson.feature(alameda, alameda.objects.Alameda_4326).features;

 			//add city boundaries
 			var cityBounds = topojson.feature(cityBoundaries, cityBoundaries.objects.AlamedaCounty_CV).features;
 			//            console.log(cityBounds)

 			var cityMesh =
 				topojson.feature(cityBoundaries, cityBoundaries.objects.AlamedaCounty_CV).features;


 			//add water overlay as reference
 			var water = topojson.feature(bayWater, bayWater.objects.bay_waters_geojson);

 			//add county overlay as reference
 			var county = topojson.feature(counties, counties.objects.Bay_Area_Counties);

 			map.append("path")
 				.datum(cal)
 				.attr("class", "cali")
 				.attr("d", path(cal))
 				.attr("fill", "#CDCDCD")
 				.attr("stroke", "transparent");

 			//US overlay to help with positioning area of interest using projection 
 			//			var us = topojson.feature(country, country.objects.states, (a, b) => a !== b);
 			//			console.log(us)
 			//
 			//			map.append("path")
 			//				.datum(us)
 			//				.attr("d", path(us))
 			//				.attr("fill", "#fff")
 			//				.attr("stroke", "#fff");



 			//parse id for data join 
 			cityBounds = JSON.parse(JSON.stringify(cityBounds).split('"name":').join('"id":'));

 			cityMesh =
 				JSON.parse(JSON.stringify(cityMesh).split('"name":').join('"id":'));


 			cityBounds = joinData(cityBounds, cities);

 			cityMesh = joinData(cityMesh, cities)


 			var colorScale = makeColorScale(cities);

 			enumerateRegions(cityBounds, map, path, cities, colorScale);

 			addOverlays(map, path, water, county, cityMesh);

 			setChart(cities, colorScale);

 			createDropdown(cities, cityBounds, map, path, water, county, cityMesh);
 		});

 	} //end of setMap


 	//adds referenence layers to map

 	function addOverlays(map, path, water, county, cityMesh) {



 		map.append("path")
 			.datum(water)
 			.attr("d", path(water))
 			.attr("class", "water")
 			.attr("fill", "aqua")
 			.attr("stroke", "transparent");



 		map.append("path")
 			.datum(county)
 			.attr("d", path(county))
 			.attr("class", "countyLines")
 			.attr("fill", "transparent")
 			.attr("stroke", "white")
 			.attr("text", "Alameda County");

 		//         map.append("path")
 		//             .datum(cityMesh)
 		//             .attr("d", path(cityMesh))
 		//             .attr("fill", "transparent")
 		//             .attr("stroke", "blue")
 		//             .on("mouseover", function (d, i) {
 		//                 console.log(d.features[i].properties)
 		//             })

 		var cityOverlay = map.selectAll(".cityMesh")
 			.data(cityMesh)
 			.enter()
 			.append("path")
 			.attr("class",
 				function (d) {
 					return "city " + d.properties.id;
 				})
 			.attr("d", path)
 			.attr("fill", "transparent")
 			.on("mouseover", function (d) {
 				highlight(d.properties);
 			})
 			.on("mouseout", function (d) {
 				dehighlight(d.properties)
 			})
 			.on("mousemove", moveLabel);
 		// 			.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');

 		//         var desc = cityOverlay.append("desc")
 		//             .text('{"stroke": "#000", "stroke-width": "0.5px"}');

 		return cityOverlay
 	}



 	function joinData(location, csvData) {

 		//loop through csv to assign each set of csv attribute values to geojson region
 		for (var i = 0; i < csvData.length; i++) {
 			var csvRegion = csvData[i]; //the current region
 			var csvKey = csvRegion.id; //the CSV primary key

 			//loop through geojson regions to find correct region
 			for (var a = 0; a < location.length; a++) {


 				var geojsonProps = location[a].properties; //the current region geojson properties
 				var geojsonKey = geojsonProps.id; //the geojson primary key

 				//where primary keys match, transfer csv data to geojson properties object
 				if (geojsonKey == csvKey) {
 					//assign all attributes and values
 					attrArray.forEach(function (attr) {
 						var val = parseFloat(csvRegion[attr]); //get csv attribute value
 						geojsonProps[attr] = val; //assign attribute and value to geojson properties
 					});
 				}
 			}
 		}
 		return location
 	}

 	//takes variable data and returns color scale using Natural Breaks
 	function makeColorScale(csvData) {

 		//reject null values in array because geoseries doesn't like them
 		var domainArray = [];
 		for (var i = 0; i < csvData.length; i++) {
 			var val = parseFloat(csvData[i][expressed])
 			if (!isNaN(val)) {
 				domainArray.push(val);
 			}
 		}

 		//get Natural break (jenks) values using geostats.js 
 		var geoSeries = new geostats(domainArray);

 		var jenks = geoSeries.getClassJenks(9);
 		jenks.shift()

 		//use natural breaks jenks function as choropleth's domain value breaks
 		var color = d3.scaleThreshold()
 			.domain(jenks)
 			.range(d3.schemeOrRd[9]);

 		return color
 	}

 	//color map using Natural breaks from return of makeColorScale
 	function enumerateRegions(input, map, path, csvData, colorScale) {

 		var region = map.selectAll(".region")
 			.data(input)
 			.enter()
 			.append("path")
 			.attr("class",
 				function (d) {
 					return "region " + d.properties.id;
 				})
 			.attr("d", path)
 			.attr("stroke", "white")
 			.attr("fill",
 				function (d) {
 					return choropleth(d.properties, colorScale);
 				})

 		return region

 	} //end of enumerate regions

 	//function to test for data value and return color
 	function choropleth(props, colorScale) {
 		//make sure attribute value is a number
 		var val = parseFloat(props[expressed]);
 		//if attribute value exists, assign a color; otherwise assign gray
 		if (typeof val == 'number' && !isNaN(val)) {
 			return colorScale(val);
 		} else {
 			return "#111111";
 		}
 	}

 	//intializes chart using cities data
 	function setChart(cities, colorScale) {

 		//create a svg element to hold the bar chart
 		var chart = d3.select("#chart")
 			.append("svg")
 			//			.attr("width", chartWidth)
 			.attr("height", chartHeight)
 			.attr("class", "chart");

 		//set bars for each city 
 		var bars = chart.selectAll(".bars")
 			.data(cities)
 			.enter()
 			.append("rect")
 			.sort(function (a, b) {
 				return parseFloat(a[expressed]) - parseFloat(b[expressed])
 			})
 			.attr("class", function (d) {
 				return "bars " + d.id
 			})
 			.attr("width", 455 / cities.length - 1)
 			.attr("x", function (d, i) {
 				return i * (455 / cities.length);
 			})
 			.attr("transform", "translate(25,0)")
 			.on("mouseover", highlight)
 			.on("mouseout", dehighlight)
 			.on("mousemove", moveLabel);
 		//       )             .on("mouseover", function (d) {
 		//                 highlight(d.properties);
 		//             })
 		//             .on("mouseout", function (d) {
 		//                 dehighlight(d.properties);
 		//             })

 		var barDesc = bars.append("desc")
 			.text('{"stroke": "none", "stroke-width": "0px"}');

 		//annotate bars with attribute value text
 		var numbers = chart.selectAll(".numbers")
 			.data(cities)
 			.enter()
 			.append("text")
 			.sort(function (a, b) {
 				return parseFloat(a[expressed]) - parseFloat(b[expressed])
 				//				return a[expressed] - b[expressed]
 			})
 			.attr("class", function (d) {
 				return "numbers ";
 			})
 			.attr("text-anchor", "middle")
 			.attr("x", function (d, i) {
 				var fraction = 455 / cities.length;
 				return i * fraction + (fraction - 1) / 2;
 			})
 			.attr("transform", "translate(25,0)")


 		//create a text element for the chart title
 		var chartTitle = chart.append("text")
 		// 			.attr("x", 225)
 		// 			.attr("y", 480)
 		// 			.attr("class", "chartTitle")

 		//create vertical axis generator
 		var yAxis = d3.axisLeft()
 			.scale(axisScale)


 		//create array of city names for x axis
 		var cityNames = [];
 		for (var i = 0; i < cities.length; i++) {
 			var val = cities[i].id
 			cityNames.push(val);
 		}


 		//set scale for x axis
 		var xScale = d3.scaleOrdinal()
 			.domain(0, 16)
 			.range([0, 455]);

 		//create horizontal axis generator
 		var xAxis = d3.axisBottom()
 			.scale(xScale)

 		var margin = {
 			top: 20
 		}


 		//			.orient("left");

 		//place axes
 		var leftAxis = chart.append("g")
 			.attr("class", "yaxis")
 			.attr("transform", translate)
 			.call(yAxis)

 		//		var bottomAxis = chart.append("g")
 		//			.attr("class", "xaxis")
 		//			.attr("transform",
 		//				"translate(25,150)")
 		//			//				  " + (chartWidth / 2) + " ," +
 		//			//				(chartHeight + margin.top + 5) + ")")
 		//
 		//			.style("text-anchor", "middle")
 		//			//			.text(cityNames)
 		//			.call(xAxis);
 		chartChanges(bars, numbers, chartTitle, colorScale)


 	} //end of setChart




 	//function to create a dropdown menu for attribute selection
 	function createDropdown(csvData, layer, map, path, water, county, cityMesh) {

 		//add select element
 		var dropdown = d3.select("#filter")
 			.append("select")
 			.attr("class", "select-var")
 			.on("change", function () {
 				changeAttribute(this.value, csvData, layer, map, path, water, county, cityMesh)
 			});

 		//add initial option
 		var titleOption = dropdown.append("option")
 			.attr("class", "titleOption")
 			.attr("disabled", "true")
 			.text("Select Attribute");

 		//add attribute name options
 		var attrOptions = dropdown.selectAll("attrOptions")
 			.data(attrArray)
 			.enter()
 			.append("option")
 			.attr("value", function (d) {
 				return d
 			})
 			.text(function (d) {
 				return d
 			});

 	} //end of createDropdown


 	//dropdown change listener handler
 	function changeAttribute(attribute, csvData, layer, map, path, water, county, cityMesh) {

 		//change the expressed attribute
 		expressed = attribute;

 		//updata evData map object with selected variables
 		for (var i = 0; i < csvData.length; i++) {
 			evData.set(csvData[i].id, +csvData[i][expressed]);
 		}


 		//recreate the color scale
 		var colorScale = makeColorScale(csvData);

 		//remove layers to replace with updated layers based on user selection
 		d3.select(".water").remove();
 		d3.select(".countyLines").remove();
 		d3.select(".cityMesh").remove();

 		//recolor map based on user selection
 		var region = d3.selectAll(".region");
 		region.attr("fill", function (d) {
 			return choropleth(d.properties, colorScale)
 		})
 		//
 		//re-add overlays 
 		addOverlays(map, path, water, county, cityMesh)

 		//initialize chart changes
 		var bars = d3.selectAll(".bars")
 		var numbers = d3.selectAll(".numbers")
 		var chartTitle = d3.selectAll(".chartTitle")

 		chartChanges(bars, numbers, chartTitle, colorScale)

 		return region

 	}

 	//attributes called at map initialization and during user selection changes
 	function chartChanges(bars, numbers, chartTitle, colorScale) {
 		bars.sort(function (a, b) {
 				return parseFloat(a[expressed]) - parseFloat(b[expressed])
 			})
 			.attr("height", function (d) {
 				return yScale(parseFloat(d[expressed]));
 			})
 			.attr("y", function (d) {
 				return chartHeight - yScale(parseFloat(d[expressed]));
 			})
 			.attr("fill", function (d) {
 				return colorScale(d[expressed])
 			})


 		numbers.sort(function (a, b) {
 				return sortHelper(a, b)

 				//				return parseFloat(a[expressed]) - parseFloat(b[expressed])
 			})
 			.attr("y", function (d) {
 				return chartHeight - yScale(parseFloat(d[expressed]) + 1);
 			})
 			.text(function (d) {
 				var val = parseFloat(d[expressed]);
 				return (val.toFixed(1));

 			});

 		chartTitle.text("Health Score: " + expressed);

 	} // end of chartChanges

 	function sortHelper(a, b) {


 		//      console.log(xAxisCityNames(a, cityOrder))

 		var c = parseFloat(a[expressed])
 		var d = parseFloat(b[expressed])
 		var sorted = c - d

 		return sorted
 	}

 	function xAxisCityNames(a, cityOrder) {

 		if (cityOrder.length === 0) {
 			cityOrder.push(a.id)
 		} else {
 			cityOrder.length = 0;
 			cityOrder.push(a.id)
 		}

 		return cityOrder

 	}


 	function highlight(props) {

 		//change stroke
 		var selected = d3.selectAll("." + props.id)
 			.style("stroke", "#00FF00")
 			.style("stroke-width", "2");

 		setLabel(props)

 	}


 	//function to reset the element style on mouseout
 	function dehighlight(props) {
 		//         console.log(props)
 		var selected = d3.selectAll("." + props.id)
 			.style("stroke", "transparent")
 		//             .style("stroke-width", "2");

 		//             .style("stroke", function () {
 		//                 return getStyle(this, "stroke")
 		//             })
 		//             .style("stroke-width", function () {
 		//                 return getStyle(this, "stroke-width")
 		//             });
 		//
 		//
 		//         function getStyle(element, styleName) {
 		//             var styleText = d3.select(element)
 		//                 .select("desc")
 		//                 .text();
 		//             console.log(styleText)
 		//
 		//             var styleObject = JSON.parse(styleText);
 		//
 		//
 		//             return styleObject[styleName];
 		//         };

 		d3.select(".infolabel")
 			.remove();
 	};

 	//function to create dynamic label
 	function setLabel(props) {
 		//label content
 		var labelAttribute = "<h1>" + props.id +
 			"</h1><b>" + Math.floor(props[expressed]) + "% " + expressed + "</b>";

 		//create info label div
 		var infolabel = d3.select("#map")
 			.append("div")
 			.attr("class", "infolabel")
 			.attr("id", props.id + "_label")
 			.html(labelAttribute);

 		var regionName = infolabel.append("div")
 			.attr("class", "labelname")
 			.html(props.name);
 	};


 	//function to move info label with mouse
 	function moveLabel() {

 		//get width of label
 		var labelWidth = d3.select(".infolabel")
 			.node()
 			.getBoundingClientRect()
 			.width;
 		//use coordinates of mousemove event to set label coordinates
 		var x1 = d3.event.clientX + 2,
 			y1 = d3.event.clientY - 15,
 			x2 = d3.event.clientX - labelWidth - 10,
 			y2 = d3.event.clientY + 25;

 		//horizontal label coordinate, testing for overflow
 		var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
 		//vertical label coordinate, testing for overflow
 		var y = d3.event.clientY < 75 ? y2 : y1;

 		d3.select(".infolabel")
 			.style("left", x + "px")
 			.style("top", y + "px");
 	};

 })(); //last line of main.js
