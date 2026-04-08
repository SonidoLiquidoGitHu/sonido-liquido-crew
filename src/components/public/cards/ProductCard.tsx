import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  return (
    <div className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Image */}
      <Link href={`/tienda/${product.slug}`} className="block relative aspect-square">
        {product.imageUrl ? (
          <SafeImage
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-slc-dark flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-slc-border" />
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-primary rounded text-xs font-medium text-white">
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Badge */}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-sm font-medium text-white uppercase tracking-wider">
              Agotado
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4">
        <span className="text-xs text-primary uppercase tracking-wider">
          {product.category === "music" ? "Música" :
           product.category === "clothing" ? "Ropa" :
           product.category === "accessories" ? "Accesorios" : "Mercancía"}
        </span>

        <Link href={`/tienda/${product.slug}`}>
          <h3 className="font-oswald text-sm uppercase tracking-wide text-white mt-1 line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-2 flex items-center gap-2">
          <span className="font-oswald text-lg text-white">
            {formatCurrency(product.price, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-slc-muted line-through">
              {formatCurrency(product.compareAtPrice!, product.currency)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full mt-3"
          size="sm"
          disabled={product.stockQuantity === 0}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {product.stockQuantity === 0 ? "Agotado" : "Agregar"}
        </Button>
      </div>
    </div>
  );
}
