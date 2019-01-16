require('dotenv').config();

const knex = require('knex')(require('./knexfile'));

const request = require('request');
const url = require('url');
const Crawler = require("simplecrawler");

var types = [
	'web-templates', 
	'stock-video', 
	'video-templates', 
	'audio', 
	'sound-effects', 
	'graphic-templates', 
	'graphics', 
	'presentation-templates', 
	'photos', 
	'fonts', 
	'add-ons', 
	'cms-templates', 
	'wordpress', 
	'3d',
];
var crawler = [];
types.forEach(function(type, index) {
	// console.log(index);
	initCrawler(index, type);
});

function initCrawler(index, type) {
	crawler[index] = new Crawler('https://elements.envato.com/api/v1/items.json?type='+type+'&page=1&languageCode=en');
	crawler[index].on("fetchcomplete", function(queueItem, buffer, res) {
		var uri = queueItem.url;
		console.log('Crawler uri: ', uri);
		var type = url.parse(uri, true).query.type;
		var continues = this.wait();
		var data = buffer.toString("utf8");
		var json = JSON.parse(data);
		json.type = type;
		doSomeDiscovery(json, function(foundURLs) {
			foundURLs.forEach(crawler[index].queueURL.bind(crawler[index]));
			continues();
		});
	});
	crawler[index].on("complete", function() {
		console.log('Crawler completed');
		// initCrawler(type);
		// process.exit();
	});

	crawler[index].start();
}

function doSomeDiscovery(json, callback) {
	var type = json.type;
	var nextUrl;
	var foundURLs = [];
	// var json = JSON.parse(data);
	var currentPage = json.data.attributes.currentPage;
	var totalPages = json.data.attributes.totalPages;
	var items = json.data.attributes.items;

	saveItems(items, type);
	if(currentPage < totalPages) {
		foundURLs.push('https://elements.envato.com/api/v1/items.json?type='+type+'&page='+ (currentPage + 1) +'&languageCode=en');
	}
	callback(foundURLs);
}

function saveItems(items, type) {
	var rows = [];
	items.forEach(function(item, index) {
		var id = item.id;
		var title = item.title;
		var slug = item.slug;
		var name = item.id;
		var size = item.fileSizeBytes;
		var description = item.description;

		rows.push({
			file_id: id,
			title: title,
			size: size,
			type: type,
			slug: slug,
			name: name,
			//description: description,
		});
	});
	if(rows.length) {
		knex('files').insert(rows)// .into('files')
		.then(function (id) {
			console.log("Returning story for %s", id);
		})
		.catch(function (err) {
			console.error("Insert failed", err.message);
			// throw err;
			// process.exit(1);
		});
	}
	
}
