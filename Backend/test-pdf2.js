const fs = require('fs');
const https = require('https');
const pdfParse = require('pdf-parse');

const file = fs.createWriteStream("sample.pdf");
https.get("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", function(response) {
  response.pipe(file);
  file.on("finish", async () => {
    file.close();
    const buffer = fs.readFileSync('sample.pdf');
    try {
        console.log("Trying standard pdf-parse...");
        const data = await pdfParse(buffer);
        console.log("Standard success, length:", data.text.length);
    } catch(e) { console.log("Standard failed:", e.message) }

    try {
        console.log("Trying weird pdfParse syntax...");
        const data = await (new pdfParse.PDFParse(Uint8Array.from(buffer))).getText();
        console.log("Weird syntax success, typeof:", typeof data);
        if (data.text) console.log("Weird syntax has .text");
    } catch(e) { console.log("Weird syntax failed:", e.message) }
  });
});
