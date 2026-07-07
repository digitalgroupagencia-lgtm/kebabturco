import ActivityKit
import SwiftUI
import WidgetKit

private let wine = Color(red: 58 / 255, green: 2 / 255, blue: 5 / 255)
private let wineLight = Color(red: 90 / 255, green: 8 / 255, blue: 12 / 255)

@available(iOS 16.2, *)
struct StaffOrderLiveWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GenericAttributes.self) { context in
            lockScreenView(context: context)
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
                    Text(context.state.values["message"] ?? "Toque para abrir")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.85))
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
        .padding(16)
        .activityBackgroundTint(bg)
        .activitySystemActionForegroundColor(.white)
    }
}

@available(iOS 16.2, *)
@main
struct StaffOrderLiveWidgetBundle: WidgetBundle {
    var body: some Widget {
        StaffOrderLiveWidget()
    }
}
