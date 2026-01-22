import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "OpenAI API Key is missing" },
            { status: 500 }
        );
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Convert File to Buffer for OpenAI SDK if needed, 
        // but the latest SDK often handles File objects. 
        // However, to be safe in Node environment:
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // We need to pass a file-like object with name and type
        // OpenAI SDK 'toFile' helper or just a simple object with required props
        // The easiest way with 'openai' package in Node is usually:
        // await openai.audio.transcriptions.create({ file: fs.createReadStream(path), ... })
        // But here we have a buffer. We can use the 'toFile' helper from openai/uploads
        // or construct a File-like object.

        // Let's rely on standard File with cast, or simple workaround.
        // Actually, OpenAI SDK v4 accepts a 'file' argument that can be a Fetch API File.
        // Since Next.js Request uses Fetch API File, it should theoretically work directly.

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            language: "ja", // Force Japanese for better results
        });

        return NextResponse.json({ text: transcription.text });
    } catch (error: any) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: error.message || "Transcription failed" },
            { status: 500 }
        );
    }
}
