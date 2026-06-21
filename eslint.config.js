module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        navigator: "readonly",
        FileReader: "readonly",
        ClipboardItem: "readonly",
        alert: "readonly",
        crypto: "readonly",
        fetch: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-constant-condition": "off",
      "no-empty": "off"
    }
  }
];
