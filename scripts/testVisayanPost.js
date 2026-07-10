import { chromium } from "playwright";

async function testScrapePost() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const url = "https://www.visayanelectric.com/post/service-interruption-july-12-july-18-2026";
    console.log(`Navigating to detail post: ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    await page.waitForTimeout(4000);
    
    console.log("Extracting article content...");
    const postData = await page.evaluate(() => {
      // Find all articles or post body sections
      const articleEl = document.querySelector("article");
      const richTextEls = Array.from(document.querySelectorAll("[data-testid='post-content'], article, [class*='post-content'], [class*='postBody']"));
      
      const paragraphs = Array.from(document.querySelectorAll("p, span")).map(el => el.innerText.trim()).filter(text => text.length > 15);

      return {
        title: document.title,
        articleHtmlSnippet: articleEl ? articleEl.innerHTML.slice(0, 3000) : "No article tag found",
        richTextContent: richTextEls.map(el => el.innerText.trim()).join("\n\n").slice(0, 3000),
        paragraphsSample: paragraphs.slice(0, 30)
      };
    });
    
    console.log("\n--- POST TITLE ---");
    console.log(postData.title);
    
    console.log("\n--- ARTICLE SNAPSHOT CONTENT ---");
    console.log(postData.richTextContent);
    
    console.log("\n--- PARAGRAPHS SAMPLE ---");
    console.log(JSON.stringify(postData.paragraphsSample, null, 2));
    
  } catch (err) {
    console.error("Error during detailed post test:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

testScrapePost();
