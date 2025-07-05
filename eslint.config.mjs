import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ),
  {
    plugins: {
      "unused-imports": require("eslint-plugin-unused-imports"),
    },
    rules: {
      // 基础
      "no-console": "warn",
      "no-debugger": "warn",
      "no-alert": "warn",
      "no-var": "error",
      "prefer-const": "error",
      // 未使用变量/导入
      "no-unused-vars": "off", // 关闭原生，交给 unused-imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      // React 相关
      "react/react-in-jsx-scope": "off", // React 17+不需要import
      "react/prop-types": "off", // TypeScript项目可关闭
      // TypeScript 相关
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": "off", // 交给 unused-imports
      // 代码风格
      "prettier/prettier": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]; 