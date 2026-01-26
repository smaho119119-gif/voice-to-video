"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Avatar {
    id: string;
    user_id: string;
    name: string;
    image_url: string;
    original_url?: string;
    type: "uploaded" | "ai_generated";
    ai_provider?: "nanobanapro" | "dalle" | "stable_diffusion";
    prompt?: string;
    created_at: string;
    is_favorite: boolean;
}

interface AvatarManagerProps {
    onSelectAvatar?: (avatar: Avatar) => void;
    selectedAvatarId?: string;
}

export default function AvatarManager({ onSelectAvatar, selectedAvatarId }: AvatarManagerProps) {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadMode, setUploadMode] = useState<"photo" | "ai" | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [avatarName, setAvatarName] = useState("");
    const [selectedModel, setSelectedModel] = useState<string>("nanobanana-realistic");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Fetch avatars
    const fetchAvatars = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const response = await fetch("/api/avatars");
            if (response.ok) {
                const result = await response.json();
                setAvatars(result.avatars || []);
            }
        } catch (error) {
            console.error("Failed to fetch avatars:", error);
        }
    }, []);

    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload photo and convert to avatar
    const handlePhotoUpload = async () => {
        if (!uploadFile || !avatarName.trim()) {
            alert("写真とアバター名を入力してください");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("image", uploadFile);
            formData.append("name", avatarName.trim());
            formData.append("model", selectedModel);

            const response = await fetch("/api/avatars/convert", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "変換に失敗しました");
            }

            const result = await response.json();
            setAvatars(prev => [result.avatar, ...prev]);

            // Reset form
            setUploadMode(null);
            setUploadFile(null);
            setPreviewUrl(null);
            setAvatarName("");
            setSelectedModel("nanobanana-realistic");

            alert("アバターを作成しました！");
        } catch (error) {
            console.error("Photo upload failed:", error);
            alert(error instanceof Error ? error.message : "アバター作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Generate AI avatar
    const handleAIGenerate = async () => {
        if (!aiPrompt.trim() || !avatarName.trim()) {
            alert("プロンプトとアバター名を入力してください");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/avatars/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: aiPrompt.trim(),
                    name: avatarName.trim(),
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "生成に失敗しました");
            }

            const result = await response.json();
            setAvatars(prev => [result.avatar, ...prev]);

            // Reset form
            setUploadMode(null);
            setAiPrompt("");
            setAvatarName("");
            setSelectedModel("nanobanana-realistic");

            alert("AIアバターを生成しました！");
        } catch (error) {
            console.error("AI generation failed:", error);
            alert(error instanceof Error ? error.message : "AI生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Toggle favorite
    const handleToggleFavorite = async (avatarId: string, currentFavorite: boolean) => {
        try {
            const response = await fetch("/api/avatars", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    avatarId,
                    is_favorite: !currentFavorite,
                }),
            });

            if (response.ok) {
                setAvatars(prev =>
                    prev.map(a =>
                        a.id === avatarId ? { ...a, is_favorite: !currentFavorite } : a
                    )
                );
            }
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        }
    };

    // Delete avatar
    const handleDelete = async (avatarId: string) => {
        if (!confirm("このアバターを削除しますか？")) return;

        try {
            const response = await fetch(`/api/avatars?id=${avatarId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setAvatars(prev => prev.filter(a => a.id !== avatarId));
                alert("アバターを削除しました");
            }
        } catch (error) {
            console.error("Failed to delete avatar:", error);
            alert("削除に失敗しました");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">アバター管理</h2>
                {!uploadMode && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setUploadMode("photo")}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            📸 写真から作成
                        </button>
                        <button
                            onClick={() => setUploadMode("ai")}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            🤖 AIで生成
                        </button>
                    </div>
                )}
            </div>

            {/* Upload/Generate Form */}
            {uploadMode && (
                <div className="bg-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            {uploadMode === "photo" ? "写真からアバター作成" : "AIアバター生成"}
                        </h3>
                        <button
                            onClick={() => {
                                setUploadMode(null);
                                setUploadFile(null);
                                setPreviewUrl(null);
                                setAiPrompt("");
                                setAvatarName("");
                                setSelectedModel("nanobanana-realistic");
                            }}
                            className="text-slate-400 hover:text-white text-sm"
                        >
                            ✕ キャンセル
                        </button>
                    </div>

                    {/* Avatar Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            アバター名 *
                        </label>
                        <input
                            type="text"
                            value={avatarName}
                            onChange={(e) => setAvatarName(e.target.value)}
                            placeholder="例: 営業マン太郎"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {uploadMode === "photo" ? (
                        <>
                            {/* Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    変換スタイル *
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="nanobanana-realistic">リアル</option>
                                    <option value="nanobanana-anime">アニメ</option>
                                    <option value="nanobanana-3d">3D</option>
                                    <option value="nanobanana-illustration">イラスト</option>
                                    <option value="nanobanana-cartoon">カートゥーン</option>
                                </select>
                                <p className="mt-1 text-xs text-slate-400">
                                    写真を変換するスタイルを選択（nanobanapro使用）
                                </p>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    写真を選択 *
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                                />
                            </div>

                            {/* Preview */}
                            {previewUrl && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        プレビュー
                                    </label>
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-48 h-48 object-cover rounded-lg border-2 border-slate-600"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handlePhotoUpload}
                                disabled={loading || !uploadFile || !avatarName.trim()}
                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                                {loading ? "変換中..." : "アバターに変換"}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    モデル *
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <optgroup label="Gemini (Google AI)">
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-flash-3">Gemini Flash 3</option>
                                        <option value="gemini-pro">Gemini Pro</option>
                                    </optgroup>
                                    <optgroup label="nanobanapro">
                                        <option value="nanobanana-realistic">リアル</option>
                                        <option value="nanobanana-anime">アニメ</option>
                                        <option value="nanobanana-3d">3D</option>
                                        <option value="nanobanana-illustration">イラスト</option>
                                        <option value="nanobanana-cartoon">カートゥーン</option>
                                    </optgroup>
                                </select>
                                <p className="mt-1 text-xs text-slate-400">
                                    生成するアバターのモデルとスタイルを選択
                                </p>
                            </div>

                            {/* AI Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    プロンプト（アバターの説明）*
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="例: 30代男性、スーツ姿、笑顔、プロフェッショナル"
                                    rows={4}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    どんなアバターを生成したいか、詳しく説明してください
                                </p>
                            </div>

                            <button
                                onClick={handleAIGenerate}
                                disabled={loading || !aiPrompt.trim() || !avatarName.trim()}
                                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                                {loading ? "生成中..." : "AIで生成"}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Avatar Gallery */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                    マイアバター ({avatars.length})
                </h3>
                {avatars.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-xl">
                        <p className="text-slate-400 mb-4">アバターがまだありません</p>
                        <p className="text-sm text-slate-500">
                            写真をアップロードするか、AIで生成してください
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {avatars.map((avatar) => (
                            <div
                                key={avatar.id}
                                className={`relative bg-slate-800 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                    selectedAvatarId === avatar.id
                                        ? "border-blue-500 shadow-lg shadow-blue-500/50"
                                        : "border-slate-700 hover:border-slate-600"
                                }`}
                                onClick={() => onSelectAvatar?.(avatar)}
                            >
                                {/* Avatar Image */}
                                <div className="aspect-square relative">
                                    <img
                                        src={avatar.image_url}
                                        alt={avatar.name}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Favorite Badge */}
                                    {avatar.is_favorite && (
                                        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                            ★
                                        </div>
                                    )}

                                    {/* Type Badge */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                        {avatar.type === "ai_generated" ? "🤖 AI" : "📸 写真"}
                                    </div>
                                </div>

                                {/* Avatar Info */}
                                <div className="p-3">
                                    <h4 className="text-sm font-medium text-white truncate mb-1">
                                        {avatar.name}
                                    </h4>
                                    <p className="text-xs text-slate-400 truncate">
                                        {new Date(avatar.created_at).toLocaleDateString("ja-JP")}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 flex justify-between opacity-0 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite(avatar.id, avatar.is_favorite);
                                        }}
                                        className="text-white hover:text-yellow-400 text-sm"
                                        title={avatar.is_favorite ? "お気に入り解除" : "お気に入り追加"}
                                    >
                                        {avatar.is_favorite ? "★" : "☆"}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(avatar.id);
                                        }}
                                        className="text-white hover:text-red-400 text-sm"
                                        title="削除"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
