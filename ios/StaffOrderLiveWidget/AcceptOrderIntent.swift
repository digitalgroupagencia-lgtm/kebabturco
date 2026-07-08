import ActivityKit
import AppIntents
import Foundation

private let appGroupId = "group.net.kebabturco.app"
private let pendingDeepLinkKey = "pendingLiveActivityDeepLink"

@available(iOS 17.0, *)
struct OpenStaffOrderFromLiveActivityIntent: AppIntent {
    static var title: LocalizedStringResource = "Abrir pedido"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Order ID")
    var orderId: String

    @Parameter(title: "Store ID")
    var storeId: String

    init() {}

    init(orderId: String, storeId: String) {
        self.orderId = orderId
        self.storeId = storeId
    }

    func perform() async throws -> some IntentResult {
        if let url = LiveActivityAcceptAPI.openOrderDeepLink(orderId: orderId, storeId: storeId),
           let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(url.absoluteString, forKey: pendingDeepLinkKey)
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct AcceptOrderIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Aceitar pedido"
    static var description = IntentDescription("Aceita o pedido pendente no servidor Kebab Turco.")

    @Parameter(title: "Order ID")
    var orderId: String

    @Parameter(title: "Store ID")
    var storeId: String

    @Parameter(title: "Accept Token")
    var acceptToken: String

    @Parameter(title: "Accept URL")
    var acceptUrl: String

    @Parameter(title: "API Key")
    var apiKey: String

    init() {}

    init(orderId: String, storeId: String, acceptToken: String, acceptUrl: String, apiKey: String) {
        self.orderId = orderId
        self.storeId = storeId
        self.acceptToken = acceptToken
        self.acceptUrl = acceptUrl
        self.apiKey = apiKey
    }

    func perform() async throws -> some IntentResult {
        let result = await LiveActivityAcceptAPI.accept(
            acceptUrl: acceptUrl,
            orderId: orderId,
            storeId: storeId,
            acceptToken: acceptToken,
            apiKey: apiKey
        )

        if result.ok {
            await endMatchingActivities()
            return .result()
        }

        return .result(
            opensIntent: OpenStaffOrderFromLiveActivityIntent(orderId: orderId, storeId: storeId),
            dialog: IntentDialog(stringLiteral: result.message)
        )
    }

    @MainActor
    private func endMatchingActivities() async {
        for activity in Activity<GenericAttributes>.activities {
            if activity.attributes.id == orderId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
