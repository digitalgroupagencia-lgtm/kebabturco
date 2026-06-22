// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorStripeTerminal",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapacitorStripeTerminal", targets: ["StripeTerminalPlugin"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(url: "https://github.com/stripe/stripe-terminal-ios", from: "4.0.0"),
    ],
    targets: [
        .target(
            name: "StripeTerminalPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "StripeTerminal", package: "stripe-terminal-ios"),
            ],
            path: "Sources/StripeTerminalPlugin"
        ),
    ]
)
