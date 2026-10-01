declare module "npm:@supabase/server@1" {
  export * from "@supabase/server";
}

declare module "npm:@supabase/server" {
  export * from "@supabase/server";
}

declare module "npm:livekit-server-sdk@2.19.1" {
  export * from "livekit-server-sdk";
}

declare module "npm:livekit-server-sdk" {
  export * from "livekit-server-sdk";
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};
