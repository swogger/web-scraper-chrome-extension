const Queue = require('./extension/scripts/Queue')
const Sitemap = require('./extension/scripts/Sitemap')
const InMemoryStore = require('./extension/scripts/InMemoryStore')
const Scraper = require('./extension/scripts/Scraper') 
const ChromeHeadlessBrowser = require('./extension/scripts/ChromeHeadlessBrowser')

function createScraper (sitemapInfo, options = {}) {

  const q = new Queue()
  const store = new InMemoryStore(options.realtimeCallback)
  const sitemap = new Sitemap(sitemapInfo, {$: {}, document: {}, window: {}})
  const browser = new ChromeHeadlessBrowser({
    pageLoadDelay: options.pageLoadDelay || 2000
  })

  const s = new Scraper({
    queue: q,
    sitemap,
    browser,
    store,
    delay: options.delay || 500
  }, {})

  return s;
}

module.exports = function (sitemap, options) {

  const scraper = createScraper(sitemap, options);

  const scrape = ()=>{

    return new Promise((resolve, reject) => {
      scraper.run((err)=>{
        if(err) reject(err)
        else resolve(scraper.store.data);
      });
    });

  }

  return {
    scrape: scrape,  
    stop:()=>{scraper.stop();}
  }

}