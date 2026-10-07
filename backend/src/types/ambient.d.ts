// Ambient declarations to ensure Express & Multer types are always present during production builds
declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      stream: import('stream').Readable;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
      secure_url?: string;
      publicId?: string;
      width?: number;
      height?: number;
    }
  }
}
