"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Palette,
  CheckCircle,
  AlertTriangle,
  Square,
  RectangleHorizontal,
  Loader2,
  Copy,
  Check,
  Crop,
  X,
  Move,
  ImageIcon,
} from "lucide-react";

interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  isDark: boolean;
  percentage?: number;
}

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  isSquare: boolean;
  is16x9: boolean;
  is4x3: boolean;
  meetsMinResolution: boolean;
}

interface ImageAnalyzerProps {
  imageUrl: string | null | undefined;
  onColorExtracted?: (color: string) => void;
  onColorsExtracted?: (colors: ColorInfo[]) => void;
  onDimensionsValidated?: (valid: boolean, dimensions: ImageDimensions | null) => void;
  onImageCropped?: (croppedDataUrl: string) => void;
  expectedAspectRatio?: "square" | "16:9" | "4:3" | "any";
  minWidth?: number;
  minHeight?: number;
  showColorPicker?: boolean;
  showColorPalette?: boolean;
  showDimensionInfo?: boolean;
  showCropTool?: boolean;
  className?: string;
}

// Convert Dropbox URL to direct download URL
function getDirectUrl(imageUrl: string): string {
  if (imageUrl.includes("dropbox")) {
    return imageUrl
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "");
  }
  return imageUrl;
}

// Extract color palette from an image using canvas
function extractColorPalette(imageUrl: string, numColors: number = 6): Promise<ColorInfo[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};
        let totalPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 24) * 24;
          const g = Math.round(data[i + 1] / 24) * 24;
          const b = Math.round(data[i + 2] / 24) * 24;
          const a = data[i + 3];

          if (a < 128) continue;

          totalPixels++;
          const key = `${r},${g},${b}`;
          if (colorCounts[key]) {
            colorCounts[key].count++;
          } else {
            colorCounts[key] = { count: 1, r, g, b };
          }
        }

        const sortedColors = Object.values(colorCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, numColors * 2);

        const distinctColors: ColorInfo[] = [];
        const minColorDistance = 50;

        for (const color of sortedColors) {
          if (distinctColors.length >= numColors) break;

          const isDistinct = distinctColors.every((existing) => {
            const dr = Math.abs(color.r - existing.rgb.r);
            const dg = Math.abs(color.g - existing.rgb.g);
            const db = Math.abs(color.b - existing.rgb.b);
            return Math.sqrt(dr * dr + dg * dg + db * db) > minColorDistance;
          });

          if (isDistinct || distinctColors.length === 0) {
            const hex = `#${color.r.toString(16).padStart(2, "0")}${color.g.toString(16).padStart(2, "0")}${color.b.toString(16).padStart(2, "0")}`;
            const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;

            distinctColors.push({
              hex,
              rgb: { r: color.r, g: color.g, b: color.b },
              isDark: luminance < 0.5,
              percentage: Math.round((color.count / totalPixels) * 100),
            });
          }
        }

        resolve(distinctColors.length > 0 ? distinctColors : [{
          hex: "#808080",
          rgb: { r: 128, g: 128, b: 128 },
          isDark: false,
          percentage: 100,
        }]);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = getDirectUrl(imageUrl);
  });
}

// Get image dimensions with resolution validation
function getImageDimensions(imageUrl: string, minWidth: number = 1000, minHeight: number = 1000): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;

      const isSquare = Math.abs(aspectRatio - 1) < 0.05;
      const is16x9 = Math.abs(aspectRatio - 16 / 9) < 0.1;
      const is4x3 = Math.abs(aspectRatio - 4 / 3) < 0.05;
      const meetsMinResolution = width >= minWidth && height >= minHeight;

      resolve({ width, height, aspectRatio, isSquare, is16x9, is4x3, meetsMinResolution });
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = getDirectUrl(imageUrl);
  });
}

// Image Cropper Modal Component
function ImageCropperModal({
  imageUrl,
  targetAspectRatio,
  targetWidth,
  targetHeight,
  onCrop,
  onClose,
}: {
  imageUrl: string;
  targetAspectRatio?: "square" | "16:9" | "4:3" | "free";
  targetWidth?: number;
  targetHeight?: number;
  onCrop: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);

      const maxDisplaySize = 450;
      const scale = Math.min(maxDisplaySize / img.width, maxDisplaySize / img.height, 1);
      setDisplayScale(scale);

      let cropWidth = img.width;
      let cropHeight = img.height;

      if (targetAspectRatio === "square") {
        const size = Math.min(img.width, img.height);
        cropWidth = size;
        cropHeight = size;
      } else if (targetAspectRatio === "16:9") {
        if (img.width / img.height > 16 / 9) {
          cropWidth = img.height * (16 / 9);
        } else {
          cropHeight = img.width / (16 / 9);
        }
      } else if (targetAspectRatio === "4:3") {
        if (img.width / img.height > 4 / 3) {
          cropWidth = img.height * (4 / 3);
        } else {
          cropHeight = img.width / (4 / 3);
        }
      }

      setCropArea({
        x: (img.width - cropWidth) / 2,
        y: (img.height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    };
    img.src = getDirectUrl(imageUrl);
  }, [imageUrl, targetAspectRatio]);

  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width * displayScale;
    canvas.height = image.height * displayScale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cropX = cropArea.x * displayScale;
    const cropY = cropArea.y * displayScale;
    const cropW = cropArea.width * displayScale;
    const cropH = cropArea.height * displayScale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.strokeStyle = "#ff6b00";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    const handleSize = 8;
    ctx.fillStyle = "#ff6b00";
    [[cropX, cropY], [cropX + cropW, cropY], [cropX, cropY + cropH], [cropX + cropW, cropY + cropH]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    });

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(cropX + (cropW * i) / 3, cropY);
      ctx.lineTo(cropX + (cropW * i) / 3, cropY + cropH);
      ctx.moveTo(cropX, cropY + (cropH * i) / 3);
      ctx.lineTo(cropX + cropW, cropY + (cropH * i) / 3);
    }
    ctx.stroke();
  }, [image, cropArea, displayScale]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / displayScale;
    const y = (e.clientY - rect.top) / displayScale;
    setIsDragging(true);
    setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / displayScale;
    const y = (e.clientY - rect.top) / displayScale;

    let newX = Math.max(0, Math.min(x - dragStart.x, image.width - cropArea.width));
    let newY = Math.max(0, Math.min(y - dragStart.y, image.height - cropArea.height));

    setCropArea((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCrop = async () => {
    if (!image) return;
    setIsProcessing(true);

    try {
      const outputCanvas = document.createElement("canvas");
      const outputCtx = outputCanvas.getContext("2d");
      if (!outputCtx) return;

      const outputWidth = targetWidth || Math.round(cropArea.width);
      const outputHeight = targetHeight || Math.round(cropArea.height);
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;

      outputCtx.drawImage(
        image,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, outputWidth, outputHeight
      );

      const dataUrl = outputCanvas.toDataURL("image/jpeg", 0.92);
      onCrop(dataUrl);
    } catch (error) {
      console.error("Crop error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slc-dark border border-slc-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-slc-border">
          <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
            <Crop className="w-5 h-5 text-primary" />
            Recortar Imagen
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-move rounded-lg border border-slc-border"
            style={{ maxWidth: "100%", height: "auto" }}
          />

          <div className="flex items-center gap-2 text-sm text-slc-muted">
            <Move className="w-4 h-4" />
            Arrastra para mover el área de recorte
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slc-muted">Salida:</span>
            <span className="font-mono bg-slc-card px-2 py-1 rounded">
              {targetWidth || Math.round(cropArea.width)} × {targetHeight || Math.round(cropArea.height)}px
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slc-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCrop} disabled={isProcessing}>
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
            ) : (
              <><Crop className="w-4 h-4 mr-2" />Recortar y Aplicar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImageAnalyzer({
  imageUrl,
  onColorExtracted,
  onColorsExtracted,
  onDimensionsValidated,
  onImageCropped,
  expectedAspectRatio = "any",
  minWidth = 1000,
  minHeight = 1000,
  showColorPicker = true,
  showColorPalette = true,
  showDimensionInfo = true,
  showCropTool = false,
  className = "",
}: ImageAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [colors, setColors] = useState<ColorInfo[]>([]);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const lastAnalyzedUrl = useRef<string | null>(null);

  const analyzeImage = useCallback(async () => {
    if (!imageUrl || imageUrl === lastAnalyzedUrl.current) return;

    setIsLoading(true);
    setError(null);
    lastAnalyzedUrl.current = imageUrl;

    try {
      const [colorsResult, dimsResult] = await Promise.all([
        showColorPicker || showColorPalette ? extractColorPalette(imageUrl, 6) : null,
        showDimensionInfo ? getImageDimensions(imageUrl, minWidth, minHeight) : null,
      ]);

      if (colorsResult) {
        setColors(colorsResult);
        if (colorsResult[0]) onColorExtracted?.(colorsResult[0].hex);
        onColorsExtracted?.(colorsResult);
      }

      if (dimsResult) {
        setDimensions(dimsResult);

        let valid = dimsResult.meetsMinResolution;
        if (expectedAspectRatio === "square") valid = valid && dimsResult.isSquare;
        else if (expectedAspectRatio === "16:9") valid = valid && dimsResult.is16x9;
        else if (expectedAspectRatio === "4:3") valid = valid && dimsResult.is4x3;

        onDimensionsValidated?.(valid, dimsResult);
      }
    } catch (err) {
      console.error("Image analysis error:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, showColorPicker, showColorPalette, showDimensionInfo, expectedAspectRatio, minWidth, minHeight, onColorExtracted, onColorsExtracted, onDimensionsValidated]);

  useEffect(() => {
    if (imageUrl) {
      analyzeImage();
    } else {
      setColors([]);
      setDimensions(null);
      lastAnalyzedUrl.current = null;
    }
  }, [imageUrl, analyzeImage]);

  const copyColor = async (hex: string, index: number) => {
    await navigator.clipboard.writeText(hex);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCropComplete = (dataUrl: string) => {
    setShowCropper(false);
    onImageCropped?.(dataUrl);
  };

  const getAspectRatioIcon = () => {
    if (!dimensions) return null;
    if (dimensions.isSquare) return <Square className="w-4 h-4" />;
    return <RectangleHorizontal className="w-4 h-4" />;
  };

  const getAspectRatioLabel = () => {
    if (!dimensions) return null;
    if (dimensions.isSquare) return "1:1 (Cuadrada)";
    if (dimensions.is16x9) return "16:9 (Horizontal)";
    if (dimensions.is4x3) return "4:3";
    return `${dimensions.aspectRatio.toFixed(2)}:1`;
  };

  const isDimensionValid = () => {
    if (!dimensions) return true;
    if (!dimensions.meetsMinResolution) return false;
    if (expectedAspectRatio === "any") return true;
    if (expectedAspectRatio === "square") return dimensions.isSquare;
    if (expectedAspectRatio === "16:9") return dimensions.is16x9;
    if (expectedAspectRatio === "4:3") return dimensions.is4x3;
    return true;
  };

  if (!imageUrl) return null;

  return (
    <div className={`space-y-3 mt-3 ${className}`}>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slc-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analizando imagen...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-500">
          <AlertTriangle className="w-4 h-4" />
          No se pudo analizar la imagen
        </div>
      )}

      {/* Color Palette */}
      {showColorPalette && colors.length > 0 && !isLoading && (
        <div className="p-3 bg-slc-card rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Paleta de colores</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {colors.map((color, index) => (
              <button
                key={index}
                type="button"
                onClick={() => copyColor(color.hex, index)}
                className="group relative flex flex-col items-center gap-1"
                title={`${color.hex} (${color.percentage}%)`}
              >
                <div
                  className="w-10 h-10 rounded-lg border-2 border-slc-border shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                >
                  {copiedIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slc-muted group-hover:text-white transition-colors">
                  {color.hex.toUpperCase()}
                </span>
                {color.percentage && (
                  <span className="text-[9px] text-slc-muted">
                    {color.percentage}%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Primary color highlight */}
          {showColorPicker && colors[0] && (
            <div className="flex items-center gap-3 pt-2 border-t border-slc-border">
              <span className="text-xs text-slc-muted">Color dominante:</span>
              <div
                className="w-6 h-6 rounded border border-slc-border"
                style={{ backgroundColor: colors[0].hex }}
              />
              <code className="text-xs font-mono bg-slc-dark px-2 py-1 rounded">
                {colors[0].hex}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyColor(colors[0].hex, 0)}
              >
                {copiedIndex === 0 ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
              <span className="text-[10px] text-slc-muted">
                {colors[0].isDark ? "(oscuro)" : "(claro)"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dimension validation result */}
      {showDimensionInfo && dimensions && !isLoading && (
        <div className={`p-3 rounded-lg space-y-2 ${
          isDimensionValid()
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-yellow-500/10 border border-yellow-500/20"
        }`}>
          {/* Dimensions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getAspectRatioIcon()}
              <span className="text-sm font-medium">
                {dimensions.width} × {dimensions.height}px
              </span>
              <span className="text-sm text-slc-muted">
                ({getAspectRatioLabel()})
              </span>
            </div>

            {isDimensionValid() ? (
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Dimensiones correctas</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Ajustar imagen</span>
              </div>
            )}
          </div>

          {/* Resolution check */}
          {!dimensions.meetsMinResolution && (
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <AlertTriangle className="w-3 h-3" />
              Resolución mínima requerida: {minWidth} × {minHeight}px
            </div>
          )}

          {/* Aspect ratio check */}
          {expectedAspectRatio !== "any" && !isDimensionValid() && dimensions.meetsMinResolution && (
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <AlertTriangle className="w-3 h-3" />
              Se esperaba proporción {expectedAspectRatio === "square" ? "cuadrada (1:1)" : expectedAspectRatio}
            </div>
          )}

          {/* Crop button */}
          {showCropTool && !isDimensionValid() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCropper(true)}
              className="w-full mt-2"
            >
              <Crop className="w-4 h-4 mr-2" />
              Recortar imagen
            </Button>
          )}
        </div>
      )}

      {/* Crop Tool (always available if enabled) */}
      {showCropTool && imageUrl && !showCropper && isDimensionValid() && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCropper(true)}
          className="w-full"
        >
          <Crop className="w-4 h-4 mr-2" />
          Abrir herramienta de recorte
        </Button>
      )}

      {/* Cropper Modal */}
      {showCropper && imageUrl && (
        <ImageCropperModal
          imageUrl={imageUrl}
          targetAspectRatio={expectedAspectRatio === "any" ? "free" : expectedAspectRatio}
          targetWidth={expectedAspectRatio === "square" ? Math.max(minWidth, minHeight) : minWidth}
          targetHeight={expectedAspectRatio === "square" ? Math.max(minWidth, minHeight) : minHeight}
          onCrop={handleCropComplete}
          onClose={() => setShowCropper(false)}
        />
      )}
    </div>
  );
}

// Hook for extracting colors
export function useColorExtraction(imageUrl: string | null | undefined) {
  const [colors, setColors] = useState<ColorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setColors([]);
      return;
    }

    setIsLoading(true);
    extractColorPalette(imageUrl, 6)
      .then((result) => setColors(result))
      .catch(() => setColors([]))
      .finally(() => setIsLoading(false));
  }, [imageUrl]);

  return { colors, primaryColor: colors[0]?.hex || null, isLoading };
}

// Standalone functions for external use
export { extractColorPalette, getImageDimensions, getDirectUrl };

// Type exports
export type { ColorInfo, ImageDimensions };
