(function () {
	//psuedo-global variables from enviroData to join to bayArea census tracts
	var attrArray = ["CES_Percentile", "Asthma Pctl", "Cardiovascular Disease Pctl", "Cleanup Sites Pctl", "Drinking Water Pctl", "Haz. Waste Pctl", "Low Birth Weight Pctl", "Pollution Burden Pctl", "Poverty Pctl"]

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


		var projection = d3.geoMercator()
			.scale(30000)
			.center([-121.9, 37.6])
			.translate([240, height / 2])
		//					.rotate([0, 0, 0])

		//good projecion for bay area overview in geoAlbersUSA
		//		var projection = d3.geoAlbersUsa()
		//			.scale(15000)
		//			.translate([5500, 900])

		//geoAlbersUSA projection focused on SF Bay Area
		//		var projection = d3.geoAlbersUsa()
		//			.scale(53000)
		//			.translate([18500, 2000])


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
		var city_bounds = "data/Alameda_County_City_Boundaries.topojson"
		var city_avgs = "data/city_avgs.csv"


		//call file variables in Promises
		Promise.all([d3.json(alameda),
					 d3.csv(enviroScreen,
				function (d) {
					evData.set(d.id, +d[expressed])
				}),
					d3.json(bayWater),
					d3.json(bayCounties),
					d3.json(CA),
					d3.json(USA),
					d3.csv(city_avgs),
					d3.csv(enviroScreen),
					d3.json(city_bounds)]).then(function (data) {


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
			var cityBounds = topojson.feature(cityBoundaries, cityBoundaries.objects.Alameda_County_City_Boundaries);

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
			alameda = JSON.parse(JSON.stringify(alameda).split('"GEOID":').join('"ID":'));


			//			alameda = joinData(bay, enviroData);


			var colorScale = makeColorScale(evData);

			enumerateRegions(alameda, map, path, evData, colorScale);

			addOverlays(map, path, cityBounds, water, county);

			setChart(cities, colorScale);

			createDropdown(enviroData, alameda, map, path, water, county, cities, cityBounds);
		});

	}; //end of setMap


	//adds referenence layers to map

	function addOverlays(map, path, cityBounds, water, county) {
		map.append("path")
			.datum(cityBounds)
			.attr("d", path(cityBounds))
			.attr("class", "cityBounds")
			.attr("fill", "transparent")
			.attr("stroke", "#888888");

		map.append("path")
			.datum(water)
			.attr("d", path(water))
			.attr("class", "water")
			.attr("fill", "aqua")
			.attr("stroke", "transparent");
		//
		//		map.append("path")
		//			.datum(county)
		//			.attr("d", path(county))
		//			.attr("class", "countyLines")
		//			.attr("fill", "transparent")
		//			.attr("stroke", "#666666");
	}


	//	function joinData(location, enviroData) {
	//		//loop through csv to assign each set of csv attribute values to geojson region
	//		for (var i = 0; i < enviroData.length; i++) {
	//			var csvRegion = enviroData[i]; //the current region
	//			var csvKey = csvRegion.ID; //the CSV primary key
	//
	//			//loop through geojson regions to find correct region
	//			for (var a = 0; a < bay.length; a++) {
	//
	//
	//				var geojsonProps = location[a].properties; //the current region geojson properties
	//				var geojsonKey = geojsonProps.ID; //the geojson primary key
	//
	//				//where primary keys match, transfer csv data to geojson properties object
	//				if (geojsonKey == csvKey) {
	//
	//
	//					//assign all attributes and values
	//					attrArray.forEach(function (attr) {
	//						var val = parseFloat(csvRegion[attr]); //get csv attribute value
	//						geojsonProps[attr] = val; //assign attribute and value to geojson properties
	//					});
	//				};
	//			};
	//		}
	//		return location
	//	}S

	//takes variable data and returns color scale using Natural Breaks
	function makeColorScale(evData) {

		var evArray = Array.from(evData.values())

		//reject null values in array because geoseries doesn't like them
		var domainArray = [];
		for (var i = 0; i < evArray.length; i++) {
			var val = evArray[i]
			if (!isNaN(val)) {
				domainArray.push(val);
			};
		}

		//get Natural break (jenks) values using geostats.js 
		var geoSeries = new geostats(domainArray);

		var jenks = geoSeries.getClassJenks(9);
		jenks.shift()

		//use natural breaks jenks function as choropleth's domain value breaks
		var color = d3.scaleThreshold()
			.domain(jenks)
			.range(d3.schemeReds[9]);

		return color

	}

	//color map using Natural breaks from return of makeColorScale
	function enumerateRegions(input, map, path, evData, colorScale) {

		var tracts = map.selectAll(".tracts")
			.data(input)
			.enter()
			.append("path")
			.attr("class",
				function (d) {
					return "tracts" + d.properties.TRACTCE;
				})
			.attr("d", path)
			.attr("fill",
				function (d) {
					var id = d.properties.TRACTCE
					var ev = evData.get(id)
					var expressed = d.properties[expressed]
					expressed = ev

					if (typeof ev == 'number' && !isNaN(ev)) {
						return colorScale(expressed);
					} else {
						return "#FFFFFF";
					}
				})

		return tracts

	} //end of enumerate regions

	//intializes chart using cities data
	function setChart(cities, colorScale) {

		//create a svg element to hold the bar chart
		var chart = d3.select("#chart")
			.append("svg")
			//			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("class", "chart");

		//set bars for each province
		var bars = chart.selectAll(".bars")
			.data(cities)
			.enter()
			.append("rect")
			.sort(function (a, b) {
				return a[expressed] - b[expressed]
			})
			.attr("class", function (d) {
				return "bars " + d.City
			})
			.attr("width", 455 / cities.length - 1)
			.attr("x", function (d, i) {
				return i * (455 / cities.length);
			})
			.attr("transform", "translate(25,0)")

		//annotate bars with attribute value text
		var numbers = chart.selectAll(".numbers")
			.data(cities)
			.enter()
			.append("text")
			.sort(function (a, b) {
				return a[expressed] - b[expressed]
			})
			.attr("class", function (d) {
				return "numbers " + d.City;
			})
			.attr("text-anchor", "middle")
			.attr("x", function (d, i) {
				var fraction = 455 / cities.length;
				return i * fraction + (fraction - 1) / 2;
			})
			.attr("transform", "translate(25,0)")


		//create a text element for the chart title
		var chartTitle = chart.append("text")
			.attr("x", 100)
			.attr("y", 40)
			.attr("class", "chartTitle")


		//create vertical axis generator
		var yAxis = d3.axisLeft()
			.scale(axisScale)


		//create array of city names for x axis
		var cityNames = [];
		for (var i = 0; i < cities.length; i++) {
			var val = cities[i].City
			cityNames.push(val);
		};

		console.log(cityNames)
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
	function createDropdown(enviroData, alameda, map, path, water, county, cities, cityBounds) {

		//add select element
		var dropdown = d3.select("#filter")
			.append("select")
			.attr("class", "select-var")
			.on("change", function () {
				changeAttribute(this.value, enviroData, alameda, map, path, water, county, cities, cityBounds)
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

	}; //end of createDropdown


	//dropdown change listener handler
	function changeAttribute(attribute, enviroData, alameda, map, path, water, county, cities, cityBounds) {

		//change the expressed attribute
		expressed = attribute;

		//updata evData map object with selected variables
		for (var i = 0; i < enviroData.length; i++) {
			evData.set(enviroData[i].id, +enviroData[i][expressed]);
		}

		//recreate the color scale
		var colorScale = makeColorScale(evData);

		//remove layers to replace with updated layers based on user selection
		d3.select(".water").remove();
		d3.select(".cityBounds").remove();
		d3.selectAll(".tracts").remove();
		d3.select(".countyLines").remove();


		//recolor map based on selection
		enumerateRegions(alameda, map, path, evData, colorScale);

		//re-add overlays 
		addOverlays(map, path, cityBounds, water, county)

		//initialize 
		var bars = d3.selectAll(".bars")
		var numbers = d3.selectAll(".numbers")
		var chartTitle = d3.selectAll(".chartTitle")

		chartChanges(bars, numbers, chartTitle, colorScale)


	};

	//attributes called at map initialization and during user selection changes
	function chartChanges(bars, numbers, chartTitle, colorScale) {
		bars.sort(function (a, b) {
				return a[expressed] - b[expressed]
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
				return a[expressed] - b[expressed]
			})
			.attr("y", function (d) {
				return chartHeight - yScale(parseFloat(d[expressed]) + 1);
			})
			.text(function (d) {
				return Math.round(d[expressed]);
			});

		chartTitle.text("Health Score: " + expressed);


	}

})(); //last line of main.js
