const {Builder, until} = require('selenium-webdriver');

const fs = require('fs');
let driver = new Builder()
    .forBrowser('firefox')
    //.usingServer(process.env.SELENIUM_REMOTE_URL || 'http://localhost:4444/wd/hub')
    .build();

let categoryUrl = "https://s.taobao.com/search?spm=a21wu.241046-global.6977698868.96.73b52f60D9FfWb&q=%E9%9E%8B%E5%8C%85&acm=lb-zebra-241046-2058600.1003.4.1797247&scm=1003.4.lb-zebra-241046-2058600.OTHER_14950684615043_1797247";

let argv_url = process.argv[2];
if (argv_url && argv_url.indexOf("taobao.com")) {
    categoryUrl = argv_url;
}

console.log({categoryUrl});
driver.get(categoryUrl)
    .then(() => driver.wait(until.titleContains('淘宝搜索'), 1000))
    .then(() => driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"))
    .then(() => driver.getPageSource())
    .then((source) => {
        const $ = require('cheerio').load(source);
        let prods = getProductElements($).map(ele => extractProductInfo(ele));
        saveText2File(`./temp/products_${process.argv[3] || Date.now()}.json`, JSON.stringify(prods));
    })
    .then(() => {
        driver.quit();
    });

const getProductElements = ($) => {
    let productEles = [];
    $('#mainsrp-itemlist').find('> div > div > div:nth-child(1) > div').each((_, ele) => {
        productEles.push($(ele));
    });
    return productEles;
};

const extractProductInfo = ($) => {
    let title = normalizeText($.find('.row.row-2.title > a').text());
    let price = normalizeText($.find('.price.g_price.g_price-highlight').text());
    let thumb = $.find('.pic > a > img').attr('src');
    let link = $.find('.pic > a').attr('href');
    return {
        title,
        price,
        thumb,
        link
    };
};

const normalizeText = (text) => {
    return text.replace(/\\n/g, '').trim();
};

const saveText2File = (filepath, text) => {
    fs.writeFile(filepath, text, 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
};
