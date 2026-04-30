import { Suspense } from "react";
import { ProductCard } from "@/components/public/cards/ProductCard";
import { productsService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";

export const metadata = {
  title: "Tienda | Sonido Líquido Crew",
  description: "Mercancía oficial de Sonido Líquido Crew. Música, ropa y accesorios.",
};

export const dynamic = "force-dynamic";

async function ProductsGrid() {
  const products = await productsService.getAll({ isActive: true, limit: 50 });

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slc-card border border-slc-border flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-slc-muted" />
        </div>
        <h2 className="font-oswald text-2xl uppercase text-white mb-3">
          Próximamente
        </h2>
        <p className="text-slc-muted max-w-md mx-auto">
          Estamos preparando productos increíbles para ti.
          Suscríbete al newsletter para enterarte cuando estén disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TiendaPage() {
  return (
    <div className="py-12">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Tienda</h1>
          <p className="section-subtitle mt-2">
            Mercancía oficial de Sonido Líquido Crew
          </p>
          <div className="section-divider" />
        </div>

        {/* Products Grid */}
        <Suspense fallback={<ProductsGridSkeleton />}>
          <ProductsGrid />
        </Suspense>
      </div>
    </div>
  );
}
