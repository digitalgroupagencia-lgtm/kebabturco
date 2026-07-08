import ActivityKit
import AppIntents
import Foundation
import os.log
#if canImport(LiveActivityPlugin)
import LiveActivityPlugin
#endif

private let appGroupId = "group.net.kebabturco.app"
private let pendingDeepLinkKey = "pendingLiveActivityDeepLink"
private let laLog = OSLog(subsystem: "net.kebabturco.app.liveactivity", category: "AcceptIntent")

private func queuePendingStaffOrderDeepLink(orderId: String, storeId: String) {
    guard let url = LiveActivityAcceptAPI.openOrderDeepLink(orderId: orderId, storeId: storeId),
          let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(url.absoluteString, forKey: pendingDeepLinkKey)
    os_log("Queued deep-link fallback for order %{public}@", log: laLog, type: .info, orderId)
}

@available(iOS 17.0, *)
struct OpenStaffOrderFromLiveActivityIntent: AppIntent {
    static let title: LocalizedStringResource = "Abrir pedido"
    static let openAppWhenRun: Bool = true

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
        queuePendingStaffOrderDeepLink(orderId: orderId, storeId: storeId)
        return .result()
    }
}

@available(iOS 17.0, *)
struct AcceptOrderIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Aceitar pedido"
    static let description = IntentDescription("Aceita o pedido pendente no servidor Kebab Turco.")

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
        os_log("AcceptOrderIntent start order=%{public}@ store=%{public}@ tokenLen=%d urlLen=%d apiKeyLen=%d",
               log: laLog, type: .info,
               orderId, storeId, acceptToken.count, acceptUrl.count, apiKey.count)

        // Sem token nem URL: fallback imediato para deep link (abre a app no pedido).
        guard !acceptUrl.isEmpty, !storeId.isEmpty, !orderId.isEmpty else {
            os_log("Missing accept params — fallback to deep link", log: laLog, type: .error)
            await endMatchingActivities(reason: "missing-params")
            queuePendingStaffOrderDeepLink(orderId: orderId, storeId: storeId)
            _ = try? await OpenStaffOrderFromLiveActivityIntent(orderId: orderId, storeId: storeId).perform()
            return .result(dialog: IntentDialog(stringLiteral: "Abrir na app"))
        }

        let result = await LiveActivityAcceptAPI.accept(
            acceptUrl: acceptUrl,
            orderId: orderId,
            storeId: storeId,
            acceptToken: acceptToken,
            apiKey: apiKey,
            source: "live_activity"
        )

        os_log("AcceptOrderIntent result ok=%{public}@ msg=%{public}@",
               log: laLog, type: .info, String(result.ok), result.message)

        if result.ok {
            await endMatchingActivities(reason: "accepted")
            return .result(dialog: IntentDialog(stringLiteral: "Pedido aceite"))
        }

        // Falha: encerra o cartão e abre a app no pedido como fallback.
        await endMatchingActivities(reason: "failed")
        queuePendingStaffOrderDeepLink(orderId: orderId, storeId: storeId)
        _ = try? await OpenStaffOrderFromLiveActivityIntent(orderId: orderId, storeId: storeId).perform()
        return .result(dialog: IntentDialog(stringLiteral: result.message))
    }

    @MainActor
    private func endMatchingActivities(reason: String) async {
        var count = 0
        for activity in Activity<GenericAttributes>.activities {
            if activity.attributes.id == orderId
                || activity.attributes.staticValues["orderId"] == orderId {
                await activity.end(nil, dismissalPolicy: .immediate)
                count += 1
            }
        }
        os_log("Ended %d live activities for order %{public}@ (reason=%{public}@)",
               log: laLog, type: .info, count, orderId, reason)
    }
}
