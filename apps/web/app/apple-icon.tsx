import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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
          background: "#004343",
          borderRadius: 40,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 200 200">
          <path
            fill="#90d2d1"
            d="M100,192 C64,146 30,112 30,78 A70,70 0 1,1 170,78 C170,112 136,146 100,192 Z"
          />
          <ellipse cx="100" cy="103" rx="27" ry="21" fill="#ffa454" />
          <ellipse cx="64" cy="58" rx="14" ry="18" transform="rotate(-18 64 58)" fill="#004343" />
          <ellipse cx="100" cy="42" rx="15" ry="19" fill="#004343" />
          <ellipse cx="136" cy="58" rx="14" ry="18" transform="rotate(18 136 58)" fill="#004343" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
