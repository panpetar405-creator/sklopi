#!/usr/bin/env bash
# Skida Unsplash slike za kartice "Popularne destinacije" u img/ (WebP, 500x375).
# Pokretanje (Termux / bash):  bash download-popular-images.sh
# Postojeći fajlovi se NE prepisuju. Stavke sa praznim ID-om samo ispišu gde da ga nađeš:
# otvori link, izaberi fotku, iz njenog URL-a uzmi deo posle "photo-" (npr. 1514896856000-91cb6de818e0)
# i upiši ga u treću kolonu. Dok slike nema, sajt za tu karticu sam koristi rezervni izvor slike.
set -u
cd "$(dirname "$0")"
mkdir -p img

# fajl (bez -500.webp) | Unsplash ID | traži na Unsplash-u
ITEMS=(
  "rim-koloseum|1514896856000-91cb6de818e0|rome-colosseum"
  "dubai-burdz-halifa||dubai-skyline"
  "bangkok-hram||bangkok-temple"
  "tokio-shibuya||tokyo-shibuya"
  "njujork-menhetn||new-york-manhattan"
  "kankun-plaza||cancun-beach"
  "marakes-medina||marrakech-medina"
  "kairo-piramide||giza-pyramids"
  "hurgada-more||hurghada-red-sea"
)

ok=0; skip=0; todo=0; fail=0
for it in "${ITEMS[@]}"; do
  IFS='|' read -r name id q <<< "$it"
  out="img/${name}-500.webp"
  if [ -f "$out" ]; then echo "= već postoji   $out"; skip=$((skip+1)); continue; fi
  if [ -z "$id" ]; then
    echo "? treba ID      $out"; echo "                traži: https://unsplash.com/s/photos/$q"; todo=$((todo+1)); continue
  fi
  url="https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&h=375&q=80&fm=webp"
  tmp="$(mktemp)"
  if curl -fsSL --max-time 30 "$url" -o "$tmp" \
     && [ "$(head -c 4 "$tmp")" = "RIFF" ] && [ "$(head -c 12 "$tmp" | tail -c 4)" = "WEBP" ] \
     && [ "$(wc -c < "$tmp")" -gt 8000 ]; then
    mv "$tmp" "$out"; echo "✓ preuzeto      $out ($(( $(wc -c < "$out") / 1024 )) KB)"; ok=$((ok+1))
  else
    rm -f "$tmp"; echo "✗ greška        $out — ID $id ne vraća ispravnu sliku (404?)"; fail=$((fail+1))
  fi
done
echo; echo "Preuzeto: $ok, već postojalo: $skip, čeka ID: $todo, greške: $fail"
