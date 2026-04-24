"use client";

import { ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminGalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Galería</h1>
        <p className="text-muted-foreground">
          Gestiona las imágenes de la galería
        </p>
      </div>
      <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            La gestión de galería estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
