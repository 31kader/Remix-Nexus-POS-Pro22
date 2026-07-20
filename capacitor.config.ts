import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.pos.pro',
  appName: 'Nexus POS Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
