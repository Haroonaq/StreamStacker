import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// first we pull in the Next.js defaults…
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // …then we turn off the no-explicit-any rule project-wide:
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
