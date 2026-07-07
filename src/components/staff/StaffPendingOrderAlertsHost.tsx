import { useStaffPendingOrderAlerts } from "@/hooks/useStaffPendingOrderAlerts";

type Props = {
  storeId: string | null | undefined;
};

/** Vigia pedidos pendentes e mantém o som de alerta em todo o painel com login. */
const StaffPendingOrderAlertsHost = ({ storeId }: Props) => {
  useStaffPendingOrderAlerts(storeId);
  return null;
};

export default StaffPendingOrderAlertsHost;
