"use client";

import React from "react";
import { Composition } from "remotion";
import { MainVideo, VideoProps } from "./MainVideo";

export const RemotionRoot: React.FC = () => {
    const defaultProps: VideoProps = {
        title: "AI Video Project",
        scenes: [
            {
                duration: 3,
                avatar_script: "こんにちは。AIによる自動動画生成の世界へようこそ。",
                subtitle: "AI自動動画生成へようこそ",
                image_prompt: "Futuristic city landscape, high tech, blue lighting, photorealistic",
                imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
            }
        ]
    };

    return (
        <>
            <Composition
                id="MainVideo"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={MainVideo as any}
                durationInFrames={150} // 5 seconds at 30fps base
                fps={30}
                width={1920}
                height={1080}
                defaultProps={defaultProps}
            />
        </>
    );
};
