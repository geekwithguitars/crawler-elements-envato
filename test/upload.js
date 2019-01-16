const knex = require('knex')(require('./knexfile').development);
const exec = require('child_process').exec;
const _ = require('lodash');
const fs = require('fs');
const path = require("path");
const filesize = require("filesize");
const request = require('request');
const progress = require('request-progress');
const got = require('got');
const cookie = require('cookie');
const setCookie = require('set-cookie-parser');
const FormData = require('form-data');
const form = new FormData();

var gdrive = {};
var outputUpload = {};
function upload(file, filePath, callback) {
	console.log('Start upload: ', filePath);
	var id = file.id;
	var args = [
		'gdrive', 
		'--refresh-token "1/opm3kFx7GPx4byXbUoBWg-JjX3HaPktW001NnqcfiIU"', 
		'upload "'+filePath+'"', 
		'-p "14GyDdgsZvg2dweGMVtjjLJ0dI29AxHzg"',
		'--share'
	];
	var cmd = args.join(' ');
	outputUpload[id] = '';
	gdrive[id] = exec(cmd);
	gdrive[id].stdout.on('data', function(data) {
		var line = data.toString();
		console.log(line.trim());
		outputUpload[id] += line;
	});
	gdrive[id].stderr.on('data', function(data) {
		var line = data.toString();
		console.log(line.trim());
		outputUpload[id] += line;
	});
	gdrive[id].on('exit', function(code) {
		if (!code) {
			console.log('Upload success!');
		} else {
			console.error('Upload error!');
		}
		callback(outputUpload[id]);
	});
}

var file = {id: 1};
var filePath = 'E:\\www\\opensource\\nodejs\\envato\\download\\Adminto_v2.1-E85H4R.zip';
upload(file, filePath, function(data) {
	console.log('file: ', file);
	console.log('data: ', data);
});