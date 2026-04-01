const fetchHTML = async (targetUrl) => {
    try {
        const response = await fetch("https://scraper-api.decodo.com/v2/scrape", {
            method: "POST",
            body: JSON.stringify({
              url: targetUrl,
              proxy_pool: "premium",
              headless: "html"
            }),
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Basic VTAwMDAzNzg4NzU6UFdfMTFiZDM3MjlhZGI3NjRiNDVmOTZjZWNhNDM5ZWJmZDZm"
            }
        });
        const json = await response.json();
        console.log("Response:", json);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
console.log("Starting single request...");
fetchHTML("https://www.amazon.in/s?k=moto+g64");
