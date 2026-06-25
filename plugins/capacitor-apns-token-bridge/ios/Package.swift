// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorApnsTokenBridge",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapacitorApnsTokenBridge", targets: ["ApnsTokenBridgePlugin"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
    ],
    targets: [
        .target(
            name: "ApnsTokenBridgePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
            ],
            path: "Sources/ApnsTokenBridgePlugin"
        ),
    ]
)
