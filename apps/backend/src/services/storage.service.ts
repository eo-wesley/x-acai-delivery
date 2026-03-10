import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

class StorageService {
    private s3: S3Client | null = null;
    private bucketName: string = process.env.CDN_BUCKET || "x-acai-media";

    constructor() {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.s3 = new S3Client({
                region: process.env.AWS_REGION || "us-east-1",
                endpoint: process.env.CDN_ENDPOINT, // Para Cloudflare R2 ou DigitalOcean Spaces
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });
            console.log("☁️ Storage Service (CDN) initialized.");
        } else {
            console.warn("⚠️ CDN credentials not found. Local storage mode active.");
        }
    }

    async uploadImage(buffer: Buffer, originalName: string, tenantId: string): Promise<string> {
        if (!this.s3) {
            // Mock para local dev: salvaria em pasta public/uploads
            return `/uploads/${tenantId}/${Date.now()}-${originalName}`;
        }

        const key = `restaurants/${tenantId}/${Date.now()}-${originalName}`;
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg",
            ACL: "public-read",
        });

        try {
            await this.s3.send(command);
            const baseUrl = process.env.CDN_PUBLIC_URL || `https://${this.bucketName}.s3.amazonaws.com`;
            return `${baseUrl}/${key}`;
        } catch (e) {
            console.error("❌ Error uploading to CDN:", e);
            throw e;
        }
    }
}

export const storageService = new StorageService();
