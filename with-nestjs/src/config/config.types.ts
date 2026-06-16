export interface AppConfig {
  host: string;
  port: number;
  auth: { host: string; port: number; realm: string };
  audience: string;
}
