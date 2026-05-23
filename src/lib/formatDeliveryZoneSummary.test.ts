import { describe, expect, it } from "vitest";
import { formatDeliveryZoneSummary } from "./formatDeliveryZoneSummary";

describe("formatDeliveryZoneSummary", () => {
  it("formats Gandia zone", () => {
    expect(
      formatDeliveryZoneSummary({
        name: "Gandia",
        min_order: 12,
        delivery_fee: 0,
        is_default: false,
        is_active: true,
      }),
    ).toBe("Gandia • mínimo 12€ • entrega grátis");
  });

  it("formats outside zone", () => {
    expect(
      formatDeliveryZoneSummary({
        name: "Fora de Gandia",
        min_order: 18,
        delivery_fee: 3,
        is_default: true,
        is_active: true,
      }),
    ).toBe("Fora de Gandia • mínimo 18€ • taxa 3€");
  });
});
