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
            "linear-gradient(140deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
          borderRadius: 36,
          position: "relative",
        }}
      >
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
