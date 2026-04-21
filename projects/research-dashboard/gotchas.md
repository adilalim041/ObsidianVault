# Gotchas: research-dashboard

**Created:** 2026-04-21

<!-- Добавляй грабли по мере их обнаружения. Формат:
## Короткое название граблины
**Симптом:** ...
**Причина:** ...
**Решение:** ...
-->

## VITE_ prefix = секрет в публичном бандле

Любая переменная с префиксом `VITE_` в Vercel env автоматически попадает в JS-бандл,
который доступен любому посетителю дашборда через DevTools.
GITHUB_PAT и ADMIN_SECRET никогда не должны иметь этот префикс.

## GitHub PAT expiry = silent promote failure

Fine-grained PAT максимум 90 дней. После истечения PUT в Contents API вернёт 401,
но UI может показать generic ошибку. Следи за email от GitHub о скором истечении.

## Vercel env vars применяются только после redeploy

Добавил переменную в Vercel Dashboard — она не вступит в силу пока не будет нового деплоя.
Всегда делай Redeploy после изменения env vars.
