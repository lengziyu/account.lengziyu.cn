import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

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
          background:
            "linear-gradient(145deg, #08090a 0%, #1f1638 28%, #7c3aed 68%, #d8b4fe 100%)",
          borderRadius: 36,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 20,
            width: 62,
            height: 62,
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            filter: "blur(6px)",
          }}
        />
        <div
          style={{
            width: 98,
            height: 72,
            borderRadius: 14,
            border: "8px solid #f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            marginTop: 18,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -52,
              width: 56,
              height: 52,
              border: "8px solid #f8fafc",
              borderBottom: "none",
              borderRadius: "32px 32px 0 0",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
