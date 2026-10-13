/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Usa la API del compilador instalada. Evita depender del stdout del CLI
    // de TypeScript, que algunos runners o envoltorios de npm contaminan.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
