const express = require('express');
const { chromium } = require('playwright');

const app = express();
const port = 3000;

// Helper function to get followers count from a URL
async function getFollowers(url) {
  const browser = await chromium.launch({
    headless: true,  // Ensure the browser runs in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Disable sandboxing for cloud environments like Render
  });
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Wait for the page to load
  await page.waitForTimeout(5000);

  let followersCount = null;

  if (url.includes("youtube.com")) {
    try {
      // Scraping for YouTube
      const element = await page.waitForSelector('//span[contains(text(), "subscribers")]', { timeout: 10000 });
      let subscriberText = await element.evaluate(el => el.textContent.trim());

      // Extract subscriber number using regex
      let match = subscriberText.match(/([\d,.]+[MK]?)\s*subscribers/);
      if (match) {
        followersCount = match[1];  // Extract the number part of the subscriber count
      }
    } catch (error) {
      console.error("YouTube scraping failed:", error);
    }
  } else if (url.includes("instagram.com")) {
    try {
      await page.waitForTimeout(2000); // Wait for content to load

      // Click anywhere on the page to dismiss popups
      await page.click('body');

      // Use XPath to target the button containing the followers count
      const followersElement = await page.waitForSelector("//button[contains(., 'followers')]", { timeout: 10000 });

      // Extract and clean the follower count
      followersCount = await followersElement.evaluate(el => el.textContent.trim().split(" ")[0]);
    } catch (error) {
      console.error("Instagram scraping failed:", error);
    }
  } else if (url.includes("facebook.com")) {
    try {
      // Scraping for Facebook
      followersCount = await page.$eval(
        'a[href*="/followers/"]',
        (el) => el.textContent.trim().split('followers')[0].trim()
      );
    } catch (error) {
      console.error("Facebook scraping failed:", error);
    }
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    try {
      // Scraping for Twitter/X
      followersCount = await page.$eval(
        '.css-175oi2r a[href*="verified_followers"] span',
        (el) => el.textContent.trim().split(' ')[0]
      );
    } catch (error) {
      console.error("Twitter/X scraping failed:", error);
    }
  }

  // Close the browser
  await browser.close();

  // Return followers count or a default message if not found
  return followersCount || "Followers count not found";
}

// API endpoint to fetch followers count based on URL
app.get('/getFollowers', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL query parameter is required" });
  }

  try {
    const followers = await getFollowers(url);
    return res.json({ followers });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error fetching followers count' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
