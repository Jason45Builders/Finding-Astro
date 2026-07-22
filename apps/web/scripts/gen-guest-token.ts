import { SignJWT } from "jose";

const secret = new TextEncoder().encode("change-me-in-prod-use-openssl-rand-hex-32");

(async () => {
  const token = await new SignJWT({
    sub: "00000000-0000-0000-0000-000000000001",
    email: "guest@test.local",
    role: "guest_system",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  console.log(token);
})();
