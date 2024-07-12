import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  writeAsyncIterableToWritable
} from "@remix-run/node";
import sharp from "sharp";
import { Writable } from "stream";
import { ulid } from "ulid";

const client = new S3Client({
  region: process.env.AWS_REGION
});

async function uploadToBuffer(
  data: AsyncIterable<Uint8Array>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });
    writable.on("error", reject);
    writable.on("finish", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    writeAsyncIterableToWritable(data, writable);
  });
}

function buildUrl(key: string) {
  return `https://${process.env.S3_IMAGE_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export const S3_ERROR_CODES = {
  HEIC_NOT_SUPPORTED: "HEIC_NOT_SUPPORTED"
};

export const s3UploadHandler = unstable_composeUploadHandlers(
  async function (args) {
    const { name, contentType, data, filename } = args;

    /** IGNORE HEIC IMAGE */
    if (!contentType?.startsWith("image") || contentType === "image/heic") {
      return null;
    }

    const key = `${ulid()}.webp`;
    const buffer = await uploadToBuffer(data);

    const resized = await sharp(buffer)
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 70 })
      .toBuffer();

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_IMAGE_BUCKET,
        Key: key,
        Body: resized,
        ContentType: contentType,
        ACL: "public-read"
      })
    );

    return buildUrl(key);
  },
  unstable_createMemoryUploadHandler({
    maxPartSize: 10 * 1024 * 1024 // 10MB
  })
);
