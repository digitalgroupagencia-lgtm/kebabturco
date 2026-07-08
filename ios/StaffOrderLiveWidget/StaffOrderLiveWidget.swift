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
            let started = self.startedAtDate(context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("#\(context.state.values["orderNumber"] ?? "----")")
                            .font(.system(size: 20, weight: .heavy, design: .rounded))
                            .foregroundStyle(.white)
                        Text(context.state.values["orderType"] ?? "")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.75))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.values["total"] ?? "")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text(timerInterval: started...Date.distantFuture, countsDown: false, showsHours: false)
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white.opacity(0.85))
                            .monospacedDigit()
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    actionArea(context: context, compact: true)
                }
            } compactLeading: {
                Text("🥙")
            } compactTrailing: {
                Text(timerInterval: started...Date.distantFuture, countsDown: false, showsHours: false)
                    .font(.caption2.bold())
                    .monospacedDigit()
                    .frame(maxWidth: 44)
            } minimal: {
                Text("🥙")
            }
        }
    }

    private func backgroundColors(_ context: ActivityViewContext<GenericAttributes>) -> (Color, Color) {
        let normal = colorFromHex(context.state.values["colorNormal"], fallback: defaultWine)
        let urgent = colorFromHex(context.state.values["colorUrgent"], fallback: defaultWineLight)
        return (normal, urgent)
    }

    private func startedAtDate(_ context: ActivityViewContext<GenericAttributes>) -> Date {
        if let raw = context.state.values["startedAt"], let epoch = TimeInterval(raw) {
            return Date(timeIntervalSince1970: epoch)
        }
        return Date()
    }

    private func urgentAfterSeconds(_ context: ActivityViewContext<GenericAttributes>) -> TimeInterval {
        let mins = Double(context.state.values["urgentAfterMinutes"] ?? "5") ?? 5
        return max(60, mins * 60)
    }

    private func isUrgent(_ context: ActivityViewContext<GenericAttributes>) -> Bool {
        if context.state.values["urgent"] == "1" { return true }
        return Date().timeIntervalSince(startedAtDate(context)) >= urgentAfterSeconds(context)
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<GenericAttributes>) -> some View {
        let role = context.state.values["role"] ?? "staff"
        let colors = backgroundColors(context)
        let bg = isUrgent(context) ? colors.1 : colors.0

        VStack(alignment: .leading, spacing: 10) {
            if role == "customer" {
                customerCard(context: context)
            } else {
                staffCard(context: context)
                actionArea(context: context, compact: false)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .activityBackgroundTint(bg)
        .activitySystemActionForegroundColor(.white)
    }

    @ViewBuilder
    private func staffCard(context: ActivityViewContext<GenericAttributes>) -> some View {
        let started = startedAtDate(context)
        HStack(alignment: .top, spacing: 12) {
            // Logo/ícone Kebab Turco
            ZStack {
                Circle()
                    .fill(.white.opacity(0.15))
                    .frame(width: 44, height: 44)
                Text("🥙")
                    .font(.system(size: 24))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Kebab Turco · Novo pedido")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white.opacity(0.75))
                    .textCase(.uppercase)

                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("#\(context.state.values["orderNumber"] ?? "----")")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                    Text(context.state.values["total"] ?? "—")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.95))
                }

                HStack(spacing: 8) {
                    Text(context.state.values["orderType"] ?? "Balcão")
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.20))
                        .clipShape(Capsule())
                        .foregroundStyle(.white)

                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.85))
                        Text(timerInterval: started...Date.distantFuture, countsDown: false, showsHours: false)
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white)
                            .monospacedDigit()
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func customerCard(context: ActivityViewContext<GenericAttributes>) -> some View {
        let step = Int(context.state.values["step"] ?? "0") ?? 0

        VStack(alignment: .leading, spacing: 10) {
            Text(context.state.values["title"] ?? "O seu pedido")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
            Text(context.state.values["status"] ?? "A acompanhar")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            HStack(spacing: 6) {
                ForEach(0..<5, id: \.self) { idx in
                    Capsule()
                        .fill(idx <= step ? Color.white : Color.white.opacity(0.25))
                        .frame(height: 5)
                }
            }
        }
    }

    @ViewBuilder
    private func actionArea(context: ActivityViewContext<GenericAttributes>, compact: Bool) -> some View {
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

            if #available(iOS 17.0, *) {
                Button(intent: AcceptOrderIntent(
                    orderId: orderId,
                    storeId: storeId,
                    acceptToken: acceptToken,
                    acceptUrl: acceptUrl,
                    apiKey: apiKey
                )) {
                    Text("ACEITAR PEDIDO")
                        .font(.system(size: compact ? 14 : 16, weight: .heavy))
                        .foregroundStyle(defaultWine)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, compact ? 10 : 12)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
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
