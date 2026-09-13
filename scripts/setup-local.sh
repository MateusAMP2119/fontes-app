#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
command -v mkcert >/dev/null || { echo 'Install mkcert first: brew install mkcert'; exit 1; }
mkdir -p .certs
mkcert -cert-file .certs/local.fonteslabs.com.pem -key-file .certs/local.fonteslabs.com-key.pem local.fonteslabs.com
security add-trusted-cert -r trustRoot -k "$HOME/Library/Keychains/login.keychain-db" "$(mkcert -CAROOT)/rootCA.pem"
if ! awk '$1 == "127.0.0.1" { for (i = 2; i <= NF; i++) if ($i == "local.fonteslabs.com") found = 1 } END { exit !found }' /etc/hosts; then
  printf '\n127.0.0.1 local.fonteslabs.com\n' | sudo tee -a /etc/hosts >/dev/null
fi
printf 'Ready: npm run dev, then open https://local.fonteslabs.com:5173\n'
