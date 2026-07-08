import ActivityKit
import SwiftUI
import WidgetKit

struct GenericAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var values: [String: String]
    }

    var id: String
    var staticValues: [String: String]
}

private let wine = Color(red: 58 / 255, green: 2 / 255, blue: 5 / 255)
private let wineLight = Color(red: 90 / 255, green: 8 / 255, blue: 12 / 255)

struct StaffOrderLiveWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GenericAttributes.self) { context in
            lockScreenView(context: context)
                .widgetURL(fallbackDeepLink(context: context))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("🥙")
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.values["timer"] ?? "")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.white.opacity(0.9))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.values["title"] ?? "Novo pedido")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    acceptButton(context: context)
                }
            } compactLeading: {
                Text("🥙")
            } compactTrailing: {
                Text(context.state.values["status"] ?? "!")
                    .font(.caption2.bold())
            } minimal: {
                Text("🥙")
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<GenericAttributes>) -> some View {
        let urgent = context.state.values["urgent"] == "1"
        let bg = urgent ? wineLight : wine

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(context.state.values["title"] ?? "Novo pedido")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(context.state.values["message"] ?? "Aceite no painel")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))
                    if let timer = context.state.values["timer"], !timer.isEmpty {
                        Text(timer)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                Spacer(minLength: 8)
                Text("🥙")
                    .font(.largeTitle)
            }
            acceptButton(context: context)
        }
        .padding(16)
        .activityBackgroundTint(bg)
        .activitySystemActionForegroundColor(.white)
    }

    @ViewBuilder
    private func acceptButton(context: ActivityViewContext<GenericAttributes>) -> some View {
        let statics = context.attributes.staticValues
        let orderId = statics["orderId"] ?? context.attributes.id
        let storeId = statics["storeId"] ?? ""
        let acceptToken = statics["acceptToken"] ?? ""
        let acceptUrl = statics["acceptUrl"] ?? ""
        let apiKey = statics["apiKey"] ?? ""

        if #available(iOS 17.0, *), !storeId.isEmpty, !acceptToken.isEmpty, !acceptUrl.isEmpty {
            Button(intent: AcceptOrderIntent(
                orderId: orderId,
                storeId: storeId,
                acceptToken: acceptToken,
                acceptUrl: acceptUrl,
                apiKey: apiKey
            )) {
                Text("ACEITAR PEDIDO")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(.white.opacity(0.25))
        } else {
            Text("Abra a app para aceitar")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.85))
        }
    }

    private func fallbackDeepLink(context: ActivityViewContext<GenericAttributes>) -> URL? {
        let orderId = context.attributes.staticValues["orderId"] ?? context.attributes.id
        let storeId = context.attributes.staticValues["storeId"] ?? ""
        guard !storeId.isEmpty else { return nil }
        return LiveActivityAcceptAPI.deepLink(orderId: orderId, storeId: storeId)
    }
}

@main
struct StaffOrderLiveWidgetBundle: WidgetBundle {
    var body: some Widget {
        StaffOrderLiveWidget()
    }
}
