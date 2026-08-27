import { describe, it, expect } from 'vitest';
import { onRequest } from '../../functions/api/upload.js';

describe('Phase 4 Security Patch — Fail-Closed Upload Authentication', () => {
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
    0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d,
    0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
    0x34, 0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe,
    0xfb, 0xfd, 0x50, 0x00
  ]);

  function createMockRequest(options: {
    method?: string;
    authHeader?: string;
    fileBuffer?: Buffer;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  }) {
    const {
      method = 'POST',
      authHeader,
      fileBuffer = validWebpBuffer,
      fileName = 'test.webp',
      fileType = 'image/webp',
      fileSize = fileBuffer.length,
    } = options;

    const headers = new Map<string, string>();
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }

    const mockFile = {
      name: fileName,
      type: fileType,
      size: fileSize,
      arrayBuffer: async () => fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
    };

    const mockFormData = new Map<string, any>();
    mockFormData.set('file', mockFile);
    mockFormData.set('role', 'hero');
    mockFormData.set('contextSlug', 'test-slug');

    return {
      method,
      headers: {
        get: (name: string) => headers.get(name) || null,
      },
      formData: async () => ({
        get: (name: string) => mockFormData.get(name) || null,
      }),
    };
  }

  describe('1. Fail-Closed Authentication Checks', () => {
    it('should reject uploads with HTTP 503 when UPLOAD_SECRET is missing/unconfigured', async () => {
      const mockEnv = {
        // UPLOAD_SECRET is intentionally undefined
        SITE_URL: 'https://blog.desioffers.com',
      };
      const req = createMockRequest({ authHeader: 'Bearer some-token' });

      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toContain('Upload service is not configured. Uploads are disabled.');
    });

    it('should reject requests with HTTP 401 when Authorization header is missing', async () => {
      const mockEnv = {
        UPLOAD_SECRET: 'super-secret-production-token-12345',
        SITE_URL: 'https://blog.desioffers.com',
      };
      const req = createMockRequest({ authHeader: undefined });

      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toContain('Unauthorized: Invalid or missing upload token.');
    });

    it('should reject requests with HTTP 401 when token is invalid', async () => {
      const mockEnv = {
        UPLOAD_SECRET: 'super-secret-production-token-12345',
        SITE_URL: 'https://blog.desioffers.com',
      };
      const req = createMockRequest({ authHeader: 'Bearer wrong-attacker-token' });

      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toContain('Unauthorized');
      // Verify the secret token is never reflected in the error
      expect(JSON.stringify(body)).not.toContain('super-secret-production-token-12345');
    });

    it('should accept requests and process upload when correct Bearer token is provided', async () => {
      const secret = 'super-secret-production-token-12345';
      let r2PutCalled = false;
      let storedKey = '';

      const mockEnv = {
        UPLOAD_SECRET: secret,
        SITE_URL: 'https://blog.desioffers.com',
        R2_BUCKET: {
          put: async (key: string, _data: any, _opts: any) => {
            r2PutCalled = true;
            storedKey = key;
          },
        },
      };

      const req = createMockRequest({ authHeader: `Bearer ${secret}` });
      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.key).toContain('articles/');
      expect(body.url).toContain('/cdn-cgi/image/');
      expect(r2PutCalled).toBe(true);
      expect(storedKey).toContain('test-slug');
    });
  });

  describe('2. Post-Authentication Security Rules', () => {
    const mockEnv = {
      UPLOAD_SECRET: 'valid-secret',
      SITE_URL: 'https://blog.desioffers.com',
      R2_BUCKET: {
        put: async () => {},
      },
    };

    it('should still reject invalid binary content after authentication succeeds', async () => {
      const maliciousExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const req = createMockRequest({
        authHeader: 'Bearer valid-secret',
        fileBuffer: maliciousExe,
      });

      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Executable binary file rejected');
    });

    it('should still enforce 5MB size limit after authentication succeeds', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer valid-secret',
        fileSize: 6 * 1024 * 1024, // 6 MB
      });

      const res = await onRequest({ request: req, env: mockEnv });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('exceeds maximum limit of 5MB');
    });
  });
});
