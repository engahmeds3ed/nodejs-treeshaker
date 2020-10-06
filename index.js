const puppeteer = require('puppeteer')
const fs = require("fs");

const projectname = "test-wp-media"
const urlToTest = [
    "https://wp-rocket.me/"
]

//Scroll to end of the page 
const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);  
                    resolve();
                }
            }, 100);
        });
    });
}

const run = async (url) => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setCacheEnabled(false);
    await page.setViewport({
        width: 1200,
        height: 800
    });

    await Promise.all([
        page.coverage.startJSCoverage(),
        page.coverage.startCSSCoverage()
    ]);
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    //await autoScroll(page);

    // Disable both JavaScript and CSS coverage
    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
    ]);
    
    await page.evaluate(() => {
        const sheets = [...document.getElementsByTagName('link')];

        sheets.forEach(x => {
            const type = x.getAttribute('type');
            !!type && type.toLowerCase() === 'text/css'
                && x.parentNode.removeChild(x);
        });

        const styles = [...document.getElementsByTagName('style')];
        styles.forEach(x => {
            x.parentNode.removeChild(x);
        });
    })
    
    let final_css = "";
    
    for (var i = 0; i < cssCoverage.length; i++) {
        final_css += cssCoverage[i]['text'];
    }

    await page.addStyleTag( {
        'content': final_css
    } );

    const main_html = await page.content();

    await fs.appendFile('results/' + projectname + '/style.css', final_css + '\r\n', function (err) {
        if (err) throw err;
    });

    await fs.appendFile('results/' + projectname + '/index.html', main_html, function (err) {
        if (err) throw err;
    });

    await browser.close()
}

//Start
const start = async () => {

    //Generate output file
    await fs.promises.mkdir('results/' + projectname, { recursive: true })
    if (fs.existsSync('results/' + projectname + '/style.css')) {
        await fs.unlink('results/' + projectname + '/style.css', function (err) {
            if (err) throw err;
        });
    }

    if (fs.existsSync('results/' + projectname + '/index.html')) {
        await fs.unlink('results/' + projectname + '/index.html', function (err) {
            if (err) throw err;
        });
    }

    //Look URL array
    for (let i = 0; i < urlToTest.length; i++) {
        await run(urlToTest[i])
    }
}

start()