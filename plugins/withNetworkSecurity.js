const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Cria o arquivo res/xml/network_security_config.xml permitindo HTTP em IPs privados
const withNetworkSecurityConfig = (config) => {
  // 1. Injeta o atributo networkSecurityConfig no AndroidManifest
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return mod;
  });

  // 2. Cria o arquivo XML
  config = withDangerousMod(config, [
    "android",
    (mod) => {
      const xmlDir = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`
      );
      return mod;
    },
  ]);

  return config;
};

module.exports = withNetworkSecurityConfig;
