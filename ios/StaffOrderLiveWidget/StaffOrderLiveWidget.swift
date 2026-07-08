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

private let defaultWine = Color(red: 58 / 255, green: 2 / 255, blue: 5 / 255)
private let defaultWineLight = Color(red: 90 / 255, green: 8 / 255, blue: 12 / 255)

private func colorFromHex(_ hex: String?, fallback: Color) -> Color {
    guard let hex, hex.hasPrefix("#"), hex.count == 7 else { return fallback }
    let r = Int(hex.dropFirst(1).prefix(2), radix: 16) ?? 58
    let g = Int(hex.dropFirst(3).prefix(2), radix: 16) ?? 2
    let b = Int(hex.dropFirst(5).prefix(2), radix: 16) ?? 5
    return Color(red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255)
}

struct StaffOrderLiveWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GenericAttributes.self) { context in
            lockScreenView(context: context)
                .widgetURL(fallbackDeepLink(context: context))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(emoji(context))
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.values["timer"] ?? "")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.white.opacity(0.9))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.values["title"] ?? "Pedido")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    actionArea(context: context)
                }
            } compactLeading: {
                Text(emoji(context))
            } compactTrailing: {
                Text(shortStatus(context))
                    .font(.caption2.bold())
            } minimal: {
                Text(emoji(context))
            }
        }
    }

    private func emoji(_ context: ActivityViewContext<GenericAttributes>) -> String {
        context.state.values["role"] == "customer" ? "📦" : "🥙"
    }

    private func shortStatus(_ context: ActivityViewContext<GenericAttributes>) -> String {
        if let status = context.state.values["status"], !status.isEmpty { return status.prefix(3).description }
        return context.state.values["role"] == "customer" ? "•" : "!"
    }

    private func backgroundColors(_ context: ActivityViewContext<GenericAttributes>) -> (Color, Color) {
        let normal = colorFromHex(context.state.values["colorNormal"], fallback: defaultWine)
        let urgent = colorFromHex(context.state.values["colorUrgent"], fallback: defaultWineLight)
        return (normal, urgent)
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<GenericAttributes>) -> some View {
        let urgent = context.state.values["urgent"] == "1"
        let colors = backgroundColors(context)
        let bg = urgent ? colors.1 : colors.0

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(context.state.values["title"] ?? "Pedido")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(context.state.values["message"] ?? "")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))
                    if let status = context.state.values["status"], !status.isEmpty {
                        Text(status)
                            .font(.caption.bold())
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    if let timer = context.state.values["timer"], !timer.isEmpty {
                        Text(timer)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                Spacer(minLength: 8)
                Text(emoji(context))
                    .font(.largeTitle)
            }
            actionArea(context: context)
        }
        .padding(16)
        .activityBackgroundTint(bg)
        .activitySystemActionForegroundColor(.white)
    }

    @ViewBuilder
    private func actionArea(context: ActivityViewContext<GenericAttributes>) -> some View {
        let statics = context.attributes.staticValues
        let role = statics["role"] ?? context.state.values["role"] ?? "staff"
        if role == "customer" {
            EmptyView()
        } else {
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
    }

    private func fallbackDeepLink(context: ActivityViewContext<GenericAttributes>) -> URL? {
        let statics = context.attributes.staticValues
        let role = statics["role"] ?? context.state.values["role"] ?? "staff"
        let orderId = statics["orderId"] ?? context.attributes.id
        let storeId = statics["storeId"] ?? ""
        if role == "customer" {
            var components = URLComponents()
            components.scheme = "kebabturco"
            components.host = "order"
            components.path = "/track"
            components.queryItems = [URLQueryItem(name: "order", value: orderId)]
            return components.url
        }
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
