import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background:
            "linear-gradient(135deg,rgb(195, 65, 189) 0%, rgb(156, 8, 116) 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "8px",
          fontWeight: "bold",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Audio wave icon effect */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              width: "2px",
              height: "8px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "2px",
              height: "12px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "2px",
              height: "16px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "2px",
              height: "12px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "2px",
              height: "8px",
              background: "white",
              borderRadius: "1px",
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
