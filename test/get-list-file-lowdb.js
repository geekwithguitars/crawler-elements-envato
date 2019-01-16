const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(__dirname + '/.data/db.json', {
	defaultValue: {types: {}},
});
const db = low(adapter);

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
var crawler;
types.forEach(function(type, index) {
	// console.log(index);
	var crawler = new Crawler('https://elements.envato.com/api/v1/items.json?type='+type+'&page=1&languageCode=en');
	crawler.passType = type;
	crawler.on("fetchcomplete", function(queueItem, buffer, res) {
		var uri = queueItem.url;
		console.log('Crawler uri: ', uri);
		var type = url.parse(uri, true).query.type;
		var continues = this.wait();
		var data = buffer.toString("utf8");
		var json = JSON.parse(data);
		json.type = type;
		doSomeDiscovery(json, function(foundURLs) {
			foundURLs.forEach(crawler.queueURL.bind(crawler));
			continues();
		});
	});

	crawler.start();
});

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
	items.forEach(function(item, index) {
		var id = item.id;
		if(!db.has('types.'+type).value()) {
			db.set('types.'+type, []).write();
		}
		if(db.get('types.'+type).find({ id: id }).value()) {
			console.error('Item ', id, ' exist');
		} else {
			db.get('types.'+type).push(item).write();
			// console.log('Save item: ', id);
		}
	});
}
