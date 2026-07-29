const pdfParse = require("pdf-parse");
async function run() {
    try {
        const dummyBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Title (Dummy PDF)\n>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n50\n%%EOF");
        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(dummyBuffer))).getText();
        console.log(resumeContent);
    } catch (err) {
        console.error("FAILED:", err.message);
    }
}
run();
