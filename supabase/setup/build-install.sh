#!/usr/bin/env bash
# Builds supabase/setup/install.sql: one script for the Supabase SQL Editor that applies
# only the migrations not yet in the database. Run: bash supabase/setup/build-install.sh > supabase/setup/install.sql
# When adding a migration, add its marker below.
set -euo pipefail
m="$(cd "$(dirname "$0")/../migrations" && pwd)"
markers=(
 "to_regtype('public.app_role') is null"
 "to_regclass('public.project_materials') is null"
 "to_regclass('public.guide_articles') is null"
 "not exists (select 1 from public.guide_articles where slug = 'ustanin-altin-kurallari')"
 "to_regclass('public.project_photos') is null"
 "to_regclass('public.pro_profiles') is null"
 "to_regclass('public.client_errors') is null"
 "to_regclass('public.consultations') is null"
)
echo "-- BoyaCep: eksik veritabanı parçalarını kurar. Daha önce kurulanları atlar, tekrar çalıştırmak güvenlidir."
echo "do \$boyacep\$"
echo "declare done text := '';"
echo "begin"
i=0
for f in "$m"/*.sql; do
  n=$((i+1))
  echo "  if ${markers[$i]} then"
  echo "    execute \$m${n}\$"
  cat "$f"
  echo "\$m${n}\$;"
  echo "    done := done || ' ${n}';"
  echo "  end if;"
  i=$n
done
echo "  raise notice 'BoyaCep kuruldu. Bu sefer eklenen parçalar:%', coalesce(nullif(done, ''), ' yok (hepsi zaten vardı)');"
echo "end"
echo "\$boyacep\$;"
cat <<'SQL'

select case when to_regclass('public.consultations') is not null
              and exists (select 1 from public.guide_articles where slug = 'ustanin-altin-kurallari')
            then 'TAMAM: BoyaCep veritabanı eksiksiz kuruldu'
            else 'EKSİK: bu ekranın görüntüsünü gönder' end as sonuc;
SQL
