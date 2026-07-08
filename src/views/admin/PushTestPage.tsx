import { useState } from "react";
import PushDiagnosticPanel from "@/components/admin/diagnostics/PushDiagnosticPanel";
import PushTestLabPanel from "@/components/admin/diagnostics/PushTestLabPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PushTestPage() {
  const [tab, setTab] = useState("lab");

  return (
    <div className="max-w-5xl">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="lab">Laboratório</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
        </TabsList>
        <TabsContent value="lab" className="mt-0">
          <PushTestLabPanel />
        </TabsContent>
        <TabsContent value="diagnostics" className="mt-0">
          <PushDiagnosticPanel embedded showStoreSwitcher={tab === "diagnostics"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
