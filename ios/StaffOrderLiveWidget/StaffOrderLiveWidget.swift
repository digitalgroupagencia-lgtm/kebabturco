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
                    Text(emoji(context)).font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.values["timer"] ?? "")
                        .font(.caption.monospacedDigit())
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.values["title"] ?? "Pedido")
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    actionArea(context: context)
                }
            } compactLeading: {
                Text(emoji(context))
            } compactTrailing: {
                Text(context.state.values["total"] ?? "!")
                    .font(.caption2.bold())
            } minimal: {
                Text("🥙")
            }
        }
    }

    private func emoji(_ context: ActivityViewContext<GenericAttributes>) -> String {
        context.state.values["role"] == "customer" ? "📦" : "🥙"
    }

    private func backgroundColors(_ context: ActivityViewContext<GenericAttributes>) -> (Color, Color) {
        let normal = colorFromHex(context.state.values["colorNormal"], fallback: defaultWine)
        let urgent = colorFromHex(context.state.values["colorUrgent"], fallback: defaultWineLight)
        return (normal, urgent)
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<GenericAttributes>) -> some View {
        let role = context.state.values["role"] ?? "staff"
        let urgent = context.state.values["urgent"] == "1"
        let colors = backgroundColors(context)
        let bg = urgent ? colors.1 : colors.0

        VStack(alignment: .leading, spacing: 14) {
            if role == "customer" {
                customerCard(context: context)
            } else {
                staffCard(context: context)
            }
            actionArea(context: context)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 20)
        .activityBackgroundTint(bg)
        .activitySystemActionForegroundColor(.white)
    }

    @ViewBuilder
    private func staffCard(context: ActivityViewContext<GenericAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.values["title"] ?? "Novo pedido")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.92))
                        .textCase(.uppercase)
                    Text("#\(context.state.values["orderNumber"] ?? "----")")
                        .font(.system(size: 34, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                Text("🥙")
                    .font(.system(size: 36))
            }

            HStack(alignment: .center, spacing: 10) {
                Text(context.state.values["total"] ?? "—")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text(context.state.values["orderType"] ?? "Balcão")
                    .font(.system(size: 13, weight: .bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.18))
                    .clipShape(Capsule())
                    .foregroundStyle(.white)
            }

            HStack(spacing: 8) {
                Image(systemName: "clock.fill")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.85))
                Text("Aguardando \(context.state.values["timer"] ?? "0:00")")
                    .font(.system(size: 17, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.95))
            }

            if let message = context.state.values["message"], !message.isEmpty, context.state.values["urgent"] == "1" {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.yellow.opacity(0.95))
            }
        }
    }

    @ViewBuilder
    private func customerCard(context: ActivityViewContext<GenericAttributes>) -> some View {
        let step = Int(context.state.values["step"] ?? "0") ?? 0
        let steps = ["Recebido", "Preparação", "Pronto", "Entrega", "Entregue"]

        VStack(alignment: .leading, spacing: 12) {
            Text(context.state.values["title"] ?? "O seu pedido")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white.opacity(0.92))
            Text(context.state.values["status"] ?? "A acompanhar")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(context.state.values["message"] ?? "")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.9))

            HStack(spacing: 6) {
                ForEach(0..<5, id: \.self) { idx in
                    Capsule()
                        .fill(idx <= step ? Color.white : Color.white.opacity(0.25))
                        .frame(height: 5)
                }
            }
            .padding(.top, 4)

            HStack {
                ForEach(Array(steps.enumerated()), id: \.offset) { idx, label in
                    if idx == step {
                        Text(label)
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
                Spacer()
            }
        }
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
                        .font(.system(size: 17, weight: .heavy))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(.white)
                .foregroundStyle(defaultWine)
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
            return LiveActivityAcceptAPI.openOrderDeepLink(orderId: orderId, storeId: storeId, customer: true)
        }
        return LiveActivityAcceptAPI.openOrderDeepLink(orderId: orderId, storeId: storeId, customer: false)
    }
}

@main
struct StaffOrderLiveWidgetBundle: WidgetBundle {
    var body: some Widget {
        StaffOrderLiveWidget()
    }
}
