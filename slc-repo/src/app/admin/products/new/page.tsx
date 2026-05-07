"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import {
  ArrowLeft,
  Save,
  ShoppingBag,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
  Upload,
} from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    category: "merchandise",
    imageUrl: "",
    stockQuantity: "",
    isActive: true,
    isFeatured: false,
    currency: "MXN",
  });

  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const addImage = () => {
    if (newImageUrl && !additionalImages.includes(newImageUrl)) {
      setAdditionalImages([...additionalImages, newImageUrl]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  // Handle Dropbox upload for main image
  const handleMainImageUpload = (fileUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl: fileUrl }));
  };

  // Handle Dropbox upload for additional images
  const handleAdditionalImageUpload = (fileUrl: string) => {
    if (!additionalImages.includes(fileUrl)) {
      setAdditionalImages(prev => [...prev, fileUrl]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      setMessage({ type: "error", text: "Por favor completa los campos requeridos" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
          stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
          additionalImages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Producto creado exitosamente" });
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Error al crear producto" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-oswald text-2xl sm:text-3xl uppercase">Nuevo Producto</h1>
          <p className="text-slc-muted mt-1 text-sm sm:text-base">
            Agrega un producto a la tienda
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-500"
            : "bg-red-500/10 border border-red-500/20 text-red-500"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información Básica</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Nombre del Producto *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del producto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="music">Música</option>
                    <option value="clothing">Ropa</option>
                    <option value="accessories">Accesorios</option>
                    <option value="merchandise">Mercancía</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del producto..."
                    rows={4}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Precio e Inventario</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Precio *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slc-muted">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="pl-8"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Precio Anterior</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slc-muted">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.compareAtPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, compareAtPrice: e.target.value }))}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-slc-muted mt-1">Para mostrar descuento</p>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Moneda</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="USD">USD - Dólar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Stock</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                    placeholder="Ilimitado"
                  />
                  <p className="text-xs text-slc-muted mt-1">Dejar vacío para ilimitado</p>
                </div>
              </div>
            </div>

            {/* Additional Images */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Imágenes Adicionales</h2>

              {/* Dropbox Upload for Additional Images */}
              <div className="mb-4">
                <DropboxUploadButton
                  onUploadComplete={handleAdditionalImageUpload}
                  folder="products"
                  accept="image/*"
                  buttonText="Subir imagen adicional"
                  className="w-full"
                />
              </div>

              {/* Manual URL Input */}
              <div className="flex gap-3 mb-4">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="O pega URL de imagen"
                  type="url"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addImage} disabled={!newImageUrl}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {additionalImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {additionalImages.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slc-card">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Submit Button */}
            <div className="lg:hidden">
              <Button
                type="submit"
                className="w-full h-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Crear Producto
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Imagen Principal</h2>
              <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-slc-muted" />
                  </div>
                )}
              </div>

              {/* Dropbox Upload for Main Image */}
              <div className="mb-3">
                <DropboxUploadButton
                  onUploadComplete={handleMainImageUpload}
                  folder="products"
                  accept="image/*"
                  buttonText="Subir imagen"
                  className="w-full"
                />
              </div>

              {/* Manual URL Input */}
              <div className="relative">
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="O pega URL de imagen"
                  type="url"
                />
              </div>
            </div>

            {/* Actions - Desktop only */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6 hidden lg:block">
              <h2 className="font-oswald text-lg uppercase mb-4">Acciones</h2>
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Crear Producto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/products")}
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Options */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Opciones</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Activo (visible en tienda)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Destacar en Home</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
