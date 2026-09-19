const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

/**
 * Extract text page-by-page from a PDF file.
 * @param {string} filePath Absolute or relative path to PDF file.
 * @returns {Promise<{pageCount: number, pages: Array<{pageNumber: number, text: string}>, totalTextLength: number, isScannedOrEmpty: boolean, warning: string|null}>}
 */
async function extractPDFText(filePath) {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
        throw new Error(`Path is a directory, not a PDF file: ${filePath}`);
    }

    if (stats.size === 0) {
        throw new Error(`PDF file is empty (0 bytes): ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(resolvedPath);

    // Validate PDF magic header (%PDF-)
    if (dataBuffer.length < 5 || dataBuffer.toString("ascii", 0, 5) !== "%PDF-") {
        throw new Error(`Invalid PDF file format: Missing '%PDF-' header in ${path.basename(filePath)}`);
    }

    let parser;
    try {
        parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getText();

        const pages = (result.pages || [])
            .map((p) => ({
                pageNumber: p.num,
                text: (p.text || "").trim(),
            }))
            .sort((a, b) => a.pageNumber - b.pageNumber);

        const totalPages = result.total || pages.length;
        const totalTextLength = pages.reduce((acc, p) => acc + p.text.length, 0);

        // Detect scanned / image-only / empty PDFs
        const isScannedOrEmpty = totalTextLength < 10;
        const warning = isScannedOrEmpty
            ? "⚠️ PDF text extraction returned no readable text. The PDF may be scanned (image-only) or empty."
            : null;

        return {
            pageCount: totalPages,
            pages,
            totalTextLength,
            isScannedOrEmpty,
            warning,
        };
    } catch (err) {
        if (
            err.name === "PasswordException" ||
            err.message?.toLowerCase().includes("password") ||
            err.message?.toLowerCase().includes("encrypted")
        ) {
            throw new Error(`PDF is password-protected or encrypted: ${path.basename(filePath)}`);
        }
        throw new Error(`PDF text extraction failed for ${path.basename(filePath)}: ${err.message}`);
    } finally {
        if (parser && typeof parser.destroy === "function") {
            try {
                await parser.destroy();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
}

module.exports = {
    extractPDFText,
};
