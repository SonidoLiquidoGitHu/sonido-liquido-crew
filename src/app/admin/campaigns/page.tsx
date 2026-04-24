"use client";

import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Campañas</h1>
        <p className="text-muted-foreground">
          Gestiona las campañas de email marketing
        </p>
      </div>
      <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            La gestión de campañas estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
