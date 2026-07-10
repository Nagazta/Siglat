import { chromium } from "playwright";

async function testScrape() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const url = "https://www.visayanelectric.com/customer-services/service-advisory";
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Give dynamic content a moment to load
    await page.waitForTimeout(4000);
    
    console.log("Analyzing page layout...");
    const pageData = await page.evaluate(() => {
      // Find all anchors in the page to inspect links
      const links = Array.from(document.querySelectorAll("a")).map(a => ({
        href: a.href,
        text: a.innerText.trim(),
        class: a.className
      }));

      // Find headings and paragraphs related to interruptions
      const headers = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5")).map(h => ({
        tag: h.tagName,
        text: h.innerText.trim(),
        class: h.className
      })).filter(h => h.text.length > 0);

      // Find any cards/grid elements that list advisories
      const articles = Array.from(document.querySelectorAll(".card, .advisory, article, [class*='post'], [class*='card'], [class*='item']")).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText.trim().slice(0, 100)
      })).slice(0, 15);

      return {
        title: document.title,
        linksCount: links.length,
        interestingLinks: links.filter(l => l.href.includes("advisory") || l.text.toLowerCase().includes("interruption") || l.href.includes("service-interruption")).slice(0, 15),
        headers: headers.slice(0, 20),
        articles
      };
    });
    
    console.log("\n--- PAGE METADATA ---");
    console.log("Title:", pageData.title);
    console.log("Total links:", pageData.linksCount);
    
    console.log("\n--- ADVISORY LINKS FOUND ---");
    console.log(JSON.stringify(pageData.interestingLinks, null, 2));
    
    console.log("\n--- HEADINGS FOUND ---");
    console.log(JSON.stringify(pageData.headers, null, 2));
    
    console.log("\n--- SUSPECTED CARDS FOUND ---");
    console.log(JSON.stringify(pageData.articles, null, 2));
    
  } catch (err) {
    console.error("Error during scratch test:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

testScrape();
