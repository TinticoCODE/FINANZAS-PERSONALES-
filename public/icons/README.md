# Íconos PWA — SharkMoney

Coloca aquí los íconos de la aplicación instalable. Tamaños requeridos:

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `icon-192x192.png` | 192×192 | Android, manifiesto, pantalla de inicio |
| `icon-512x512.png` | 512×512 | Splash Android, instalación |
| `apple-touch-icon.png` | 180×180 | iOS “Añadir a pantalla de inicio” |

Generados desde `public/logo.png` con fondo oscuro `#0a0a0a` (coherente con Dark Mode).

Para regenerar tras cambiar el logo:

```bash
python3 scripts/generate-pwa-icons.py
```

Referenciados en `src/app/manifest.ts` y `src/app/layout.tsx`.
