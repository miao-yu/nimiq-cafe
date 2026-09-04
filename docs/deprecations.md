# Deprecations

## v1 calculator and converter (2026-07-30)

`https://v1.nimiq.cafe/calculator` and `https://v1.nimiq.cafe/en/converter` were
rebuilt in this app and now live at:

- https://nimiq.cafe/calculator
- https://nimiq.cafe/converter

The reward math moved from the v1 repo's `public/javascripts/custom/calc.js`
into `client/src/utils/staking-rewards.ts`, unchanged. The two pages read the
existing `/api/calculator` and `/api/nim-price` endpoints.

### Redirects

The old URLs 301 to the new ones. The rules live in the **v1 vhost**, which is
not in this repo, so they are recorded here:

```nginx
# /etc/nginx/sites-available/v1.nimiq.cafe.conf, inside the v1.nimiq.cafe
# server block, above `location / { proxy_pass https://localhost:5920; }`.
# Regex locations take precedence over prefix locations, so these win.

location ~ ^/(?:en|zh)?/?calculator/?$ {
  return 301 https://nimiq.cafe/calculator;
}

location ~ ^/(?:en|zh)?/?converter/?$ {
  return 301 https://nimiq.cafe/converter;
}
```

This covers `/calculator`, `/calculator/`, `/en/calculator/`, `/zh/calculator/`
and the matching converter paths. Everything else on v1 still proxies to the
old app on port 5920.

Apply with `nginx -t && systemctl reload nginx`. A backup of the previous vhost
is in `/root/backups/` on the server.

### Notes

- The v1 pages were translated into 8 languages; the rebuilt pages are English
  only, matching the rest of this app.
- The redirects are permanent (301) and browsers cache them hard. Undoing this
  means users who already hit the old URLs keep being redirected until their
  cache expires.
