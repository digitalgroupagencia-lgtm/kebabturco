import Foundation
import PDFKit
import AppKit

guard CommandLine.arguments.count >= 4 else {
    fputs("Usage: extract-pdf-page.swift <pdf> <outdir> <pageIndex0based>\n", stderr)
    exit(1)
}

let pdfPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let pageIndex = Int(CommandLine.arguments[3]) ?? 0

guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)),
      pageIndex >= 0, pageIndex < doc.pageCount,
      let page = doc.page(at: pageIndex) else {
    fputs("Failed to open page\n", stderr)
    exit(2)
}

let base = (pdfPath as NSString).lastPathComponent.replacingOccurrences(of: ".pdf", with: "")
let bounds = page.bounds(for: .mediaBox)
let scale: CGFloat = 1.4
let w = Int(bounds.width * scale)
let h = Int(bounds.height * scale)

guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: w,
    pixelsHigh: h,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else { exit(3) }

rep.size = NSSize(width: bounds.width, height: bounds.height)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
ctx.setFillColor(NSColor.white.cgColor)
ctx.fill(CGRect(origin: .zero, size: bounds.size))
ctx.scaleBy(x: scale, y: scale)
page.draw(with: .mediaBox, to: ctx)
NSGraphicsContext.restoreGraphicsState()

let outPath = (outDir as NSString).appendingPathComponent("\(base)_p\(pageIndex + 1).jpg")
guard let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.55]) else { exit(4) }
try data.write(to: URL(fileURLWithPath: outPath))
print(outPath)
