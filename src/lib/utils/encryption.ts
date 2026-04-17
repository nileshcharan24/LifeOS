/**
 * Web Crypto API based encryption for Journal Entries
 */

const getKeyMaterial = async (password: string) => {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
};

const getKey = async (keyMaterial: CryptoKey, salt: Uint8Array) => {
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

const PASSWORD = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'super-secret-default-key';

export const encryptData = async (text: string): Promise<string> => {
  if (typeof window === 'undefined') return text; // Fallback for server-side if ever called
  
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await getKeyMaterial(PASSWORD);
  const key = await getKey(keyMaterial, salt);
  
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    enc.encode(text)
  );

  const encryptedBuffer = new Uint8Array(encrypted);
  const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.length);
  resultBuffer.set(salt, 0);
  resultBuffer.set(iv, salt.length);
  resultBuffer.set(encryptedBuffer, salt.length + iv.length);
  
  return btoa(String.fromCharCode(...resultBuffer));
};

export const decryptData = async (encryptedBase64: string): Promise<string> => {
  if (typeof window === 'undefined') return encryptedBase64;

  try {
    const encryptedStr = atob(encryptedBase64);
    const resultBuffer = new Uint8Array(encryptedStr.length);
    for (let i = 0; i < encryptedStr.length; i++) {
      resultBuffer[i] = encryptedStr.charCodeAt(i);
    }
    
    const salt = resultBuffer.slice(0, 16);
    const iv = resultBuffer.slice(16, 28);
    const encryptedData = resultBuffer.slice(28);
    
    const keyMaterial = await getKeyMaterial(PASSWORD);
    const key = await getKey(keyMaterial, salt);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      encryptedData.buffer as ArrayBuffer
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "Error: Could not decrypt data.";
  }
};
