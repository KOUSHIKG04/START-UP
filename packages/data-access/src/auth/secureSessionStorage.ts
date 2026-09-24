// SecureStore limits individual values on some devices. Split large session JSON
// so a normal Supabase refresh token can be persisted without truncation.
type SecureKeyValue = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const CHUNK_SIZE = 1400;

export function createSecureSessionStorage(secure: SecureKeyValue) {
  return {
    async getItem(key: string) {
      const countText = await secure.getItemAsync(`${key}.parts`);
      if (!countText) return null;
      const count = Number(countText);
      if (!Number.isInteger(count) || count < 1 || count > 100) return null;
      const parts = await Promise.all(
        Array.from({ length: count }, (_, index) => secure.getItemAsync(`${key}.${index}`))
      );
      return parts.some((part) => part === null) ? null : parts.join("");
    },
    async setItem(key: string, value: string) {
      const oldCount = Number(await secure.getItemAsync(`${key}.parts`)) || 0;
      const parts = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "gs")) ?? [""];
      for (let index = 0; index < parts.length; index++) {
        await secure.setItemAsync(`${key}.${index}`, parts[index]);
      }
      await secure.setItemAsync(`${key}.parts`, String(parts.length));
      for (let index = parts.length; index < oldCount; index++) {
        await secure.deleteItemAsync(`${key}.${index}`);
      }
    },
    async removeItem(key: string) {
      const count = Number(await secure.getItemAsync(`${key}.parts`)) || 0;
      await secure.deleteItemAsync(`${key}.parts`);
      for (let index = 0; index < count; index++) {
        await secure.deleteItemAsync(`${key}.${index}`);
      }
    },
  };
}
