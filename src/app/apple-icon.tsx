import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone PNG para "Adicionar à Tela de Início" no iOS (Safari ignora SVG aqui).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        MR
      </div>
    ),
    { ...size }
  );
}
