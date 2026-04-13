import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <Construction className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Este módulo será implementado em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
