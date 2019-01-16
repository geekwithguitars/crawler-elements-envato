require('dotenv').config();

const knex = require('knex')(require('./knexfile'));
const exec = require('child_process').exec;
const _ = require('lodash');
const fs = require('fs');
const path = require("path");
const filesize = require("filesize");
const request = require('request');
const progress = require('request-progress');
const querystring = require('querystring');
const got = require('got');
const cookie = require('cookie');
const setCookie = require('set-cookie-parser');
const FormData = require('form-data');
const form = new FormData();

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

var cookies;
// Không thể xử lý tự đông login, bởi vì cần xác thực reCaptcha
// -> login qua browser -> copy cookie, token -> paste here
var headers = {
	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
	'content-type': 'application/json',
	'x-csrf-token': 'Bl0RVWS5T0auxhNkt3qZrYIMidvSzqmsXFLiot7Mt4A=',
	'cookie': '__cfduid=d676f246e25f609d178d6592a465cfb561547624929; original_landing_page_url=https://elements.envato.com/f-letter-logo-template-DY69DA; _csrf_3=Bl0RVWS5T0auxhNkt3qZrYIMidvSzqmsXFLiot7Mt4A%3D; _elements_session_3=88386b5da3dd448760f320aeedcd83fc'
}
var limit = 200;
const start = async () => {
  var csrf = ''; // await getCsrf();
  var token = true; // await getLogin(csrf);
  if(token) {
  	// var session = await getSession(token);
  	var files = await knex.select('*').from('files').where('uploaded', 0)
	  	.andWhere('type', 'web-templates')
		// .andWhere('categories', 'like', '%Admin Templates%')
		.orderBy('categories', 'asc')
		.limit(limit);
	console.log('Found : ', files.length, ' files');
  	await asyncForEach(files, async (file, index) => {
		console.log("\n", index, '. Start process file: ', file.title, ' (', file.file_id, ')');
		var file_id = file.file_id;
		var licenseInfo = await getLicense(file_id, null);
		//var licenseInfo = '';
		if(licenseInfo) {
			downloadUrl = await getDownloadUrl(file_id, null);
			//downloadUrl = 'https://www.copytrans.net/bin/Install_CopyTransControlCenter.exe';
			if(downloadUrl) {
				// var file_id = file.file_id;
				var filename = downloadUrl.split('/').pop().split('#')[0].split('?')[0];
				var fileInfo = path.parse(filename);
				filename = fileInfo.name + '-' + file_id + fileInfo.ext;
				var filePath = __dirname + '/download/' + filename;
				var headers = await download(downloadUrl, filePath);
				if(headers && headers["content-length"]) {
					var filesize = parseInt(headers["content-length"]);
					var filetype = headers["content-type"];
					knex('files').where('file_id', file_id).update({
						name: filename,
						size: filesize,
						mime: filetype,
						downloaded: 1,
						status: 1,
					}).then(function (data) {})
					.catch(function (error) {});

					// filePath = 'E:\\www\\opensource\\nodejs\\envato\\download\\Install_CopyTransControlCenter-VMYK5P4.exe';
					var googleFileId = await upload(file, filePath);//, function(googleFileId) {
						if(googleFileId) {
							knex('files').where('file_id', file_id).update({
								fileId: googleFileId,
								uploaded: 1,
							}).then(function (data) {
								console.log('Update fileId ', googleFileId, ' success!')
							})
							.catch(function (error) {console.error(error.message);});
						}
					//});

				} else {
					knex('files').where('file_id', file_id).update({
						status: 0,
					}).then(function (data) {})
					.catch(function (error) {});
				}
				console.log('Wait download done');
			} else {
				console.error('Cannot get download url!');
			}
			await waitFor(10000);
		} else {
			process.exit(1);
		}
	});
  }
}
start();

async function getCsrf() {
	const response = await got.get('https://elements.envato.com/')/* .then(response => {
		console.log(response);
		//=> '<!doctype html> ...'
	}).catch(error => {
		console.log(error.response ? error.response.body : error);
		//=> 'Internal server error ...'
	}) */;
	cookies = setCookie.parse(response);
	var csrf = _.find(cookies, ['name', '_csrf_3']).value;
	return csrf;
	// var session = _.find(cookies, ['name', '_elements_session_3']).value;
	// return {csrf: csrf, session: session};
}
async function getLogin(csrf) {
	/* form.append('username', process.env.ENVATO_USERNAME);
	form.append('password', process.env.ENVATO_PASSWORD);
	form.append('language_code', 'en');
	form.append('to', 'elements'); */
	var form = {
		username: process.env.ENVATO_USERNAME,
		password: process.env.ENVATO_PASSWORD,
		to: 'elements',
	};
	var formData = querystring.stringify(form);
	var contentLength = formData.length;

	const response = await got.post('https://account.envato.com/sign_in', {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			// 'Content-Length': formData.length,
			// 'x-csrf-token': csrf,
			'accept': 'application/json',
			// cookie: cookie.serialize(cookies)
		},
		// body: form,
		body: formData
	})/* .then(response => {
		console.log(response);
		//=> '<!doctype html> ...'
	}) */.catch(error => {
		console.error('Login fail: ', error.response ? error.response.body : error);
		//=> 'Internal server error ...'
	});
	var json = response ? JSON.parse(response.body) : {};
	var token = json.token;
	return token;
}
async function getSession(token) {
	const response = await got.post('https://elements.envato.com/api/v1/session.json', {
		headers: {
			'content-type': 'application/json',
			// 'x-csrf-token': '/CdvP3sT15ezJBZCCECcteB6HG2NtHXkW5mOI7O57Xw=',
		},
		//json: {token: token}
		body: JSON.stringify({token: token})
	})/* .then(response => {
		console.log(response);
		//=> '<!doctype html> ...'
	}).catch(error => {
		console.log(error.response ? error.response.body : error);
		//=> 'Internal server error ...'
	}) */;
	var cookies = setCookie.parse(response);
	var csrf = _.find(cookies, ['name', '_csrf_3']).value;
	var session = _.find(cookies, ['name', '_elements_session_3']).value;
	return {csrf: csrf, session: session};
}

async function getLicense(fileId, _headers) {
	//var str = cookie.serialize(option);
	var response = await got.post('https://elements.envato.com/api/v1/items/'+fileId+'/license.json', {
		headers: _headers ? _headers : headers,
		body: JSON.stringify({itemId: fileId, licenseType: 'trial'})
	})/* .then(response => {
		console.log(response);
		//=> '<!doctype html> ...'
	}) */.catch(error => {
		console.error('Error when getLicense: ', error.message ? error.message : error.response.body);
		process.exit(1);
	});
	var json = response ? JSON.parse(response.body) : true;
	return json;
}

async function getDownloadUrl(fileId, _headers) {
	const response = await got.post('https://elements.envato.com/api/v1/items/' + fileId + '/download.json', {
		headers: _headers ? _headers : headers,
		body: JSON.stringify({licenseType: 'trial'})
	})/* .then(response => {
		console.log(response);
		//=> '<!doctype html> ...'
	}) */.catch(error => {
		console.log('Error when getDownloadUrl: ', error.message ? error.message : error.response.body);
		//=> 'Internal server error ...'
	});
	var json = response ? JSON.parse(response.body) : null;
	var downloadUrl = json ? json.data.attributes.downloadUrl : null;
	return downloadUrl;
}

function download(url, filePath) {
	console.log('Start download: ', filePath);
	return new Promise(function(resolve, reject) {
		progress(request(url), {
			// throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
			// delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
			// lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
		})
		.on('progress', function (state) {
			// The state is an object that looks like this:
			// {
			//     percent: 0.5,               // Overall percent (between 0 to 1)
			//     speed: 554732,              // The download speed in bytes/sec
			//     size: {
			//         total: 90044871,        // The total payload size in bytes
			//         transferred: 27610959   // The transferred payload size in bytes
			//     },
			//     time: {
			//         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals)
			//         remaining: 81.403       // The remaining seconds to finish (3 decimals)
			//     }
			// }
			//console.log('progress', state);
			var stateSize = filesize(state.size.transferred) + ' / ' + filesize(state.size.total);
			console.log(stateSize);
		})
		.on('error', function (err) {
			reject(new Error(err));
		})
		.on('end', function () {
			var response = this.response.headers;
			console.log("Download done\n");
			resolve(response);
		})
		.pipe(fs.createWriteStream(filePath));
	});
}

var gdrive = {};
var outputUpload = {};
function upload(file, filePath, callback) {
	return new Promise(function(resolve, reject) {
		console.log('Start upload: ', filePath);
		var id = file.id;
		var args = [
			'gdrive', 
			'--refresh-token "' + process.env.GDRIVE_REFRESH_TOKEN +'"', 
			'upload "'+filePath+'"', 
			'-p "' + process.env.GDRIVE_FOLDER_ID + '"',
			'--share',
			'--delete',
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
			var result = outputUpload[id];
			if (!code) {
				console.log('Upload success!');
			} else {
				console.error('Upload error!');
			}
			var match = result.match(/(?:google|googledrive)\.com\/(?:a\/[^\/]+\/)?(?:open\?id=|uc\?id=|file\/d\/)([-\w]{25,})/i);
			if(match) {
				var fileId = match[1];
				// callback(fileId);
				resolve(fileId)
			} else {
				console.error('Cannot get url share: ', result);
			}
			// callback();
			reject();
		});
	});
}
