import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { productsService } from "@/lib/services";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ShoppingBag,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Productos | Admin - Sonido Líquido Crew",
};

const categoryLabels: Record<string, string> = {
  music: "Música",
  clothing: "Ropa",
  accessories: "Accesorios",
  merchandise: "Mercancía",
};

export default async function AdminProductsPage() {
  const products = await productsService.getAll({ limit: 100 });

  const activeProducts = products.filter(p => p.isActive);
  const totalValue = products.reduce((acc, p) => acc + p.price, 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Productos</h1>
          <p className="text-slc-muted mt-1">
            Gestiona la tienda y mercancía oficial
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary">
          <option value="">Todas las categorías</option>
          <option value="music">Música</option>
          <option value="clothing">Ropa</option>
          <option value="accessories">Accesorios</option>
          <option value="merchandise">Mercancía</option>
        </select>
        <select className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{products.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">{activeProducts.length}</div>
          <div className="text-xs text-slc-muted uppercase">Activos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-yellow-500">
            {products.filter(p => p.stockQuantity === 0).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Agotados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">
            {formatCurrency(totalValue / products.length || 0, "MXN")}
          </div>
          <div className="text-xs text-slc-muted uppercase">Precio Promedio</div>
        </div>
      </div>

      {/* Products Table */}
      {products.length > 0 ? (
        <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Producto
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Categoría
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Precio
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Stock
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Estado
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slc-muted uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slc-border">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slc-card/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slc-card flex-shrink-0">
                          {product.imageUrl ? (
                            <SafeImage
                              src={product.imageUrl}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-slc-muted">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {categoryLabels[product.category] || product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-oswald">
                          {formatCurrency(product.price, product.currency)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-slc-muted line-through">
                            {formatCurrency(product.compareAtPrice, product.currency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.stockQuantity !== null ? (
                        <span className={`text-sm ${
                          product.stockQuantity === 0
                            ? "text-red-500"
                            : product.stockQuantity < 5
                              ? "text-yellow-500"
                              : "text-green-500"
                        }`}>
                          {product.stockQuantity === 0 ? "Agotado" : `${product.stockQuantity} unidades`}
                        </span>
                      ) : (
                        <span className="text-sm text-slc-muted">Ilimitado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-500 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slc-muted text-sm">
                          <XCircle className="w-4 h-4" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-slc-dark border border-slc-border rounded-xl">
          <ShoppingBag className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h3 className="font-oswald text-xl uppercase mb-2">No hay productos</h3>
          <p className="text-slc-muted mb-6">
            Agrega productos para tu tienda oficial.
          </p>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
