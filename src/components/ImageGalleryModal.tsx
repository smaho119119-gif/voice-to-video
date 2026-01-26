"use client";

import { useState, useEffect } from "react";
import { X, Search, Image as ImageIcon, Loader2 } from "lucide-react";

interface Asset {
  id: string;
  file_url: string;
  asset_type: string;
  metadata?: {
    prompt?: string;
    width?: number;
    height?: number;
  };
  created_at: string;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export function ImageGalleryModal({ isOpen, onClose, onSelect }: ImageGalleryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch assets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/assets");
      const data = await response.json();
      if (data.success && data.assets) {
        // Filter to only show images
        const imageAssets = data.assets.filter(
          (asset: Asset) => asset.asset_type === "image"
        );
        setAssets(imageAssets);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter assets by search term
  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm) return true;
    const prompt = asset.metadata?.prompt?.toLowerCase() || "";
    return prompt.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (asset: Asset) => {
    onSelect(asset.file_url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            画像ギャラリー
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="プロンプトで検索..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2" />
              <p>画像がありません</p>
              <p className="text-sm">AIで画像を生成するか、アップロードしてください</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSelect(asset)}
                  className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <img
                    src={asset.file_url}
                    alt={asset.metadata?.prompt || "Gallery image"}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with prompt */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-xs text-white line-clamp-2">
                      {asset.metadata?.prompt || "No description"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-center text-sm text-gray-500">
          {filteredAssets.length} 件の画像
        </div>
      </div>
    </div>
  );
}
